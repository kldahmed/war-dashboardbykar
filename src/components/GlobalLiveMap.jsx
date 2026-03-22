import React, { useEffect, useMemo, useState, useRef, useCallback, lazy, Suspense } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./global-live-map.css";
import MapLegend from "./MapLegend";
import MapSignalLayer from "./MapSignalLayer";
import MapRegionOverlay from "./MapRegionOverlay";
import MapPlaybackBar from "./MapPlaybackBar";
import MapEventTooltip from "./MapEventTooltip";
import { getMotionSettings } from "../lib/map/mapAnimationEngine";
import { buildMapLayers, buildPlaybackFrame } from "../lib/map/mapSignalEngine";
import { MODE_CONFIG } from "../lib/map/mapRegionEngine";
import { useI18n } from "../i18n/I18nProvider";
import { getEventsForMap, subscribeEvents } from "../lib/globalEventsEngine";
import { getRadarForMap, subscribeRadar, getSignalArcs } from "../lib/radar/globalRadarEngine";

const Globe = lazy(() => import("react-globe.gl"));

const MAP_MODE_KEYS = ["live", "pressure", "clusters", "economic", "sports", "forecast", "entities", "radar"];
const MAP_ENDPOINT_FALLBACKS = ["/api/global-map-state", "/api/global-events", "/api/radar"];
const MAX_AUTO_RETRIES = 3;

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

function getCountryId(feature) {
  return String(
    feature?.properties?.ISO_A2 ||
      feature?.properties?.iso_a2 ||
      feature?.properties?.ADM0_A3 ||
      feature?.properties?.NAME ||
      ""
  )
    .toLowerCase()
    .slice(0, 2);
}

export default function GlobalLiveMap() {
  const { t, language, direction, formatDateTime } = useI18n();
  const [mode, setMode] = useState("live");
  const [mapState, setMapState] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | success | error
  const [loadError, setLoadError] = useState("");
  const [resolvedEndpoint, setResolvedEndpoint] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [range, setRange] = useState("30m");
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [useGlobe, setUseGlobe] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);
  const globeRef = useRef();
  const requestSeqRef = useRef(0);
  const autoRetryCountRef = useRef(0);

  const debugLog = useCallback((...args) => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
    console.info("[WorldState/GlobalLiveMap]", ...args);
  }, []);

  const debugWarn = useCallback((...args) => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
    console.warn("[WorldState/GlobalLiveMap]", ...args);
  }, []);

  const isMapStatePayload = useCallback((payload) => {
    return Boolean(
      payload &&
      Array.isArray(payload.countries) &&
      Array.isArray(payload.links) &&
      Array.isArray(payload.signals)
    );
  }, []);

  const normalizeFallbackPayload = useCallback((endpoint, payload) => {
    if (endpoint === "/api/global-map-state" && isMapStatePayload(payload)) {
      return payload;
    }

    if (endpoint === "/api/global-events" && Array.isArray(payload?.events)) {
      return {
        countries: [],
        links: [],
        signals: payload.events.map((event, idx) => ({
          id: event.id || `evt-${idx}`,
          title: event.title || "",
          summary: event.summary || "",
          source: event.source || "global-events",
          time: event.time || new Date().toISOString(),
          category: event.category || "news",
          impact: Number(event.severity || 0) / 100,
          confidence: Number(event.confidence || 50) / 100,
          urgency: event.urgency || "medium",
          country: event.country || "",
          zones: [],
        })),
        timeline: {},
      };
    }

    if (endpoint === "/api/radar") {
      const hasSignals = Array.isArray(payload?.signals);
      const hasAircraft = Array.isArray(payload?.aircraft);
      if (!hasSignals && !hasAircraft) return null;

      const normalizedSignals = hasSignals
        ? payload.signals.map((signal, idx) => ({
            id: signal.id || `rad-${idx}`,
            title: signal.title || signal.headline || "",
            summary: signal.summary || "",
            source: signal.source || "radar",
            time: signal.time || new Date().toISOString(),
            category: signal.category || "news",
            impact: Number(signal.impact || signal.score || 0) / 100,
            confidence: Number(signal.confidence || 50) / 100,
            urgency: signal.urgency || "medium",
            country: signal.country || "",
            zones: [],
          }))
        : payload.aircraft
            .filter((flight) => Array.isArray(flight?.position) && flight.position.length >= 2)
            .map((flight, idx) => {
              const lon = Number(flight.position[0]);
              const lat = Number(flight.position[1]);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              return {
                id: flight.id || `air-${idx}`,
                title: flight.callsign || flight.id || "Radar Track",
                summary: "Live radar aircraft track",
                source: "radar",
                time: flight.time || new Date().toISOString(),
                category: "air",
                impact: Number(flight.speed || 0) > 520 ? 0.72 : 0.5,
                confidence: 0.58,
                urgency: Number(flight.speed || 0) > 520 ? "high" : "medium",
                country: "",
                zones: [],
                lat,
                lon,
              };
            })
            .filter(Boolean);

      return {
        countries: [],
        links: [],
        signals: normalizedSignals,
        timeline: {},
      };
    }

    return null;
  }, [isMapStatePayload]);

  const fetchEndpointJson = useCallback(async (endpoint, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      debugLog("calling endpoint", endpoint);
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });

      debugLog("endpoint status", endpoint, response.status);
      if (!response.ok) throw new Error(`http_${response.status}`);

      try {
        const payload = await response.json();
        debugLog("parse success", endpoint);
        return payload;
      } catch (error) {
        debugWarn("parse failure", endpoint, error?.message || "unknown_parse_error");
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [debugLog, debugWarn]);

  const loadMapStateWithFallback = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoadState((prev) => (prev === "success" ? prev : "loading"));
    setLoadError("");

    for (const endpoint of MAP_ENDPOINT_FALLBACKS) {
      try {
        const payload = await fetchEndpointJson(endpoint);
        const normalized = normalizeFallbackPayload(endpoint, payload);
        if (!normalized) {
          debugWarn("response shape rejected", endpoint, payload ? Object.keys(payload) : "empty");
          throw new Error(`invalid_payload_${endpoint}`);
        }

        if (seq !== requestSeqRef.current) return;
        setMapState(normalized);
        setResolvedEndpoint(endpoint);
        setLoadState("success");
        autoRetryCountRef.current = 0;
        debugLog("endpoint selected", endpoint);
        if (!selectedNodeId && normalized?.countries?.length) {
          setSelectedNodeId(normalized.countries[0].id);
        }
        return;
      } catch (error) {
        debugWarn("endpoint failed", endpoint, error?.message || "unknown_error");
        if (seq !== requestSeqRef.current) return;
        // Continue trying the fallback chain.
      }
    }

    if (seq !== requestSeqRef.current) return;
    setLoadState("error");
    setLoadError("تعذر تحميل هذا القسم حالياً");
    setMapState((prev) => prev || { countries: [], links: [], signals: [], timeline: {} });
    debugWarn("all endpoints failed", MAP_ENDPOINT_FALLBACKS);
  }, [fetchEndpointJson, normalizeFallbackPayload, selectedNodeId]);

  // Global live events layer
  const [globalEvents, setGlobalEvents] = useState([]);
  const [radarMapSignals, setRadarMapSignals] = useState([]);
  const [radarArcs, setRadarArcs] = useState([]);
  useEffect(() => {
    setGlobalEvents(getEventsForMap());
    const unsub = subscribeEvents(() => setGlobalEvents(getEventsForMap()));
    return unsub;
  }, []);
  useEffect(() => {
    setRadarMapSignals(getRadarForMap());
    setRadarArcs(getSignalArcs());
    const unsub = subscribeRadar(() => {
      setRadarMapSignals(getRadarForMap());
      setRadarArcs(getSignalArcs());
    });
    return unsub;
  }, []);

  // Detect device capability
  useEffect(() => {
    const detected =
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      /iPhone|iPad|Android/.test(navigator.userAgent);
    setIsLowPower(detected);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setPrefersReducedMotion(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMapResources() {
      try {
        await loadMapStateWithFallback();

        if (!geoData) {
          try {
            const world = await fetchEndpointJson(WORLD_GEOJSON_URL, 15000);
            if (mounted) setGeoData(world);
          } catch {
            // Geo layer is optional; keep map operational without country polygons.
          }
        }
      } catch {
        if (mounted) {
          setLoadState("error");
          setLoadError("تعذر تحميل هذا القسم حالياً");
        }
      }
    }

    loadMapResources();
    const interval = setInterval(loadMapResources, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchEndpointJson, geoData, loadMapStateWithFallback]);

  useEffect(() => {
    if (loadState !== "error") return;
    if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) {
      debugWarn("auto retry cap reached", MAX_AUTO_RETRIES);
      return;
    }

    const retryTimer = setTimeout(() => {
      autoRetryCountRef.current += 1;
      debugLog("auto retry", autoRetryCountRef.current);
      setRetryTick((v) => v + 1);
    }, 5000);
    return () => clearTimeout(retryTimer);
  }, [debugLog, debugWarn, loadState]);

  useEffect(() => {
    if (retryTick === 0) return;
    loadMapStateWithFallback();
  }, [retryTick, loadMapStateWithFallback]);

  const motionSettings = useMemo(() => getMotionSettings(prefersReducedMotion), [prefersReducedMotion]);

  const layers = useMemo(() => buildMapLayers(mapState, mode), [mapState, mode]);

  const frameSignals = useMemo(
    () => buildPlaybackFrame(mapState, range, frameIndex, 24),
    [mapState, range, frameIndex]
  );

  useEffect(() => {
    if (!playing) return undefined;
    const ticker = setInterval(() => {
      setFrameIndex((prev) => (prev >= 23 ? 0 : prev + 1));
    }, prefersReducedMotion ? 1400 : 700);
    return () => clearInterval(ticker);
  }, [playing, prefersReducedMotion]);

  const selectedNode = layers.countryNodes.find((node) => node.id === selectedNodeId) || null;

  const countryColorMap = useMemo(() => {
    const map = new Map();
    layers.countryNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [layers.countryNodes]);

  // Globe data transformations
  const globePoints = useMemo(() => {
    return layers.countryNodes.map((node) => ({
      lat: node.centerCoordinates?.[0] || 0,
      lng: node.centerCoordinates?.[1] || 0,
      size: Math.max(0.15, (node.radius || 4) / 12),
      color: node.color || "#38bdf8",
      name: node.name,
      id: node.id,
      intensity: node.intensity || 0.5,
      pressureLevel: node.pressureLevel,
      signalCount: node.signalCount || 0
    }));
  }, [layers.countryNodes]);

  const globeArcs = useMemo(() => {
    return layers.linkLayer.map((link) => ({
      startLat: link.sourceCoordinates?.[0] || 0,
      startLng: link.sourceCoordinates?.[1] || 0,
      endLat: link.targetCoordinates?.[0] || 0,
      endLng: link.targetCoordinates?.[1] || 0,
      color: [link.color || "#22d3ee", link.color || "#22d3ee80"],
      stroke: 0.4 + (link.strength || 0.5) * 1.2,
      source: link.source,
      target: link.target,
      count: link.linkedEventCount || 0
    }));
  }, [layers.linkLayer]);

  const globeHexData = useMemo(() => {
    return layers.countryNodes
      .filter((n) => n.pressureLevel === "high" || n.signalCount >= 3)
      .map((node) => ({
        lat: node.centerCoordinates?.[0] || 0,
        lng: node.centerCoordinates?.[1] || 0,
        weight: node.intensity || 0.5
      }));
  }, [layers.countryNodes]);

  // Globe event handlers
  const handleGlobePointClick = useCallback((point) => {
    if (point?.id) setSelectedNodeId(point.id);
  }, []);

  const handleGlobePointHover = useCallback((point) => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = !point;
    }
  }, []);

  // Auto-rotate globe
  useEffect(() => {
    if (!globeRef.current || !useGlobe) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = !prefersReducedMotion;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
    }
  }, [useGlobe, prefersReducedMotion]);

  const modeLabels = useMemo(() => {
    return MAP_MODE_KEYS.map((id) => ({
      id,
      label: t(`map.mode.${id}`)
    }));
  }, [t]);

  const toggleGlobe = () => {
    if (isLowPower) return;
    setUseGlobe((v) => !v);
  };

  return (
    <section className="glm-shell section-frame" dir={direction}>
      <div className="glm-header">
        <div>
          <h2 className="glm-title">{t("map.title")}</h2>
          <p className="glm-subtitle">{t("map.subtitle")}</p>
        </div>
        <div className="glm-header-controls">
          {!isLowPower && (
            <button
              className={`glm-globe-toggle ${useGlobe ? "active" : ""}`}
              onClick={toggleGlobe}
              title={useGlobe ? t("map.flatMode") : t("map.globeMode")}
            >
              {useGlobe ? "🗺️" : "🌐"} {useGlobe ? t("map.flatMode") : t("map.globeMode")}
            </button>
          )}
          <div className="glm-mode-switch">
            {modeLabels.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={mode === m.id ? "glm-mode active" : "glm-mode"}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLowPower && (
        <div className="glm-performance-banner">
          {t("map.fallback2d")}
        </div>
      )}

      <div className={`glm-map-wrap ${useGlobe ? "glm-globe-active" : ""}`}>
        {loadState === "loading" && !mapState ? (
          <div className="glm-globe-loading">
            <div className="glm-globe-spinner" />
            <span>{t("app.loading")}</span>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="glm-globe-loading" dir={direction}>
            <div style={{ color: "#ef4444", fontWeight: 700 }}>{loadError || "تعذر تحميل هذا القسم حالياً"}</div>
            <button
              type="button"
              onClick={() => {
                autoRetryCountRef.current = 0;
                loadMapStateWithFallback();
              }}
              className="glm-globe-toggle"
              style={{ marginTop: 10 }}
            >
              {language === "ar" ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        ) : null}

        {loadState === "success" && resolvedEndpoint ? (
          <div className="glm-performance-banner">
            {language === "ar" ? `مصدر البيانات: ${resolvedEndpoint}` : `Data source: ${resolvedEndpoint}`}
          </div>
        ) : null}

        {loadState !== "error" ? (
          useGlobe ? (
          <Suspense
            fallback={
              <div className="glm-globe-loading">
                <div className="glm-globe-spinner" />
                <span>{t("app.loading")}</span>
              </div>
            }
          >
            <Globe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              atmosphereColor="#1e40af"
              atmosphereAltitude={0.22}
              showAtmosphere={true}
              animateIn={!prefersReducedMotion}
              width={undefined}
              height={520}
              polygonsData={geoData?.features || []}
              polygonCapColor={(d) => {
                const id = getCountryId(d);
                const node = countryColorMap.get(id);
                return node ? `${node.color}40` : "#1e293b18";
              }}
              polygonSideColor={() => "#0f172a50"}
              polygonStrokeColor={() => "#334155"}
              polygonAltitude={(d) => {
                const id = getCountryId(d);
                const node = countryColorMap.get(id);
                return node ? 0.005 + node.intensity * 0.015 : 0.003;
              }}
              pointsData={globePoints}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={(d) => 0.01 + d.size * 0.06}
              pointRadius={(d) => d.size * 0.5}
              pointsMerge={false}
              onPointClick={handleGlobePointClick}
              onPointHover={handleGlobePointHover}
              pointLabel={(d) =>
                `<div class="glm-globe-label" dir="${direction}">
                  <strong>${d.name}</strong><br/>
                  <span>${t("map.signals")}: ${d.signalCount}</span><br/>
                  <span>${t("map.pressure")}: ${t(`map.pressureLevel.${d.pressureLevel || "low"}`)}</span>
                </div>`
              }
              arcsData={globeArcs}
              arcStartLat="startLat"
              arcStartLng="startLng"
              arcEndLat="endLat"
              arcEndLng="endLng"
              arcColor="color"
              arcStroke="stroke"
              arcDashLength={0.5}
              arcDashGap={0.3}
              arcDashAnimateTime={prefersReducedMotion ? 0 : 2000}
              arcLabel={(d) =>
                `<div class="glm-globe-label" dir="${direction}">
                  ${t("map.linkTooltip", { source: d.source, target: d.target, count: d.count })}
                </div>`
              }
              hexBinPointsData={globeHexData}
              hexBinPointLat="lat"
              hexBinPointLng="lng"
              hexBinPointWeight="weight"
              hexAltitude={(d) => d.sumWeight * 0.04}
              hexBinResolution={3}
              hexTopColor={() => "#ef444460"}
              hexSideColor={() => "#ef444425"}
              hexBinMerge={true}
            />
          </Suspense>
        ) : (
          <MapContainer center={[25, 18]} zoom={2} minZoom={2} maxZoom={6} zoomControl={false} scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />

            {geoData && (
              <GeoJSON
                data={geoData}
                style={(feature) => {
                  const id = getCountryId(feature);
                  const node = countryColorMap.get(id);
                  const color = node?.color || "#1e293b";
                  const opacity = node ? 0.25 + node.intensity * motionSettings.glowStrength : 0.1;
                  return {
                    color: "rgba(148,163,184,0.22)",
                    weight: node ? 0.8 : 0.35,
                    fillColor: color,
                    fillOpacity: Math.min(0.7, opacity)
                  };
                }}
              />
            )}

            <MapRegionOverlay regions={layers.regionPressure} countryNodes={layers.countryNodes} />

            <MapSignalLayer
              countryNodes={layers.countryNodes}
              linkLayer={layers.linkLayer}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              motionSettings={motionSettings}
              globalEvents={globalEvents}
              radarSignals={mode === "radar" ? radarMapSignals : []}
              radarArcs={mode === "radar" ? radarArcs : []}
            />
          </MapContainer>
          )
        ) : null}
      </div>

      <div className="glm-footer-grid">
        <MapLegend stats={layers.stats} />

        <div className="glm-explain glass-panel">
          <div className="glm-explain-title">{t("map.explainTitle")}</div>
          {selectedNode ? (
            <>
              <h4>{selectedNode.name}</h4>
              <p>{selectedNode.explainability?.whyGlowing || t("map.why.baseline")}</p>
              <div className="glm-explain-grid">
                <span>{t("map.pressure")}: {t(`map.pressureLevel.${selectedNode.pressureLevel || "low"}`)}</span>
                <span>{t("map.signals")}: {selectedNode.signalCount}</span>
                <span>{t("map.confidence")}: {t(`map.confidenceBand.${selectedNode.explainability?.confidenceBand || "weak"}`)}</span>
                <span>{t("map.updated")}: {formatDateTime(selectedNode.lastUpdated)}</span>
              </div>
              <ul>
                {(selectedNode.explainability?.topDrivers || []).map((driver) => (
                  <li key={driver.driver}>
                    {driver.driver}: {driver.count}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>{t("map.noRegion")}</p>
          )}
        </div>
      </div>

      <MapPlaybackBar
        range={range}
        setRange={setRange}
        playing={playing}
        setPlaying={setPlaying}
        frameIndex={frameIndex}
        frameCount={24}
        signalCount={frameSignals.length}
      />
    </section>
  );
}
