import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../i18n/I18nProvider";
import "../styles/OrbitalMap.css";

const MAP_MODES = {
  LIVE_SIGNALS: "live_signals",
  REGIONAL_PRESSURE: "regional_pressure",
  EVENT_CLUSTERS: "event_clusters",
  ECONOMIC_PRESSURE: "economic_pressure",
  SPORTS_LAYER: "sports_layer",
  FORECAST_ZONES: "forecast_zones",
  ENTITY_RELATIONS: "entity_relations",
};

const SIGNAL_TYPES = {
  conflict: { color: "#ef4444", intensity: 1.0 },
  pressure: { color: "#f97316", intensity: 0.85 },
  attention: { color: "#eab308", intensity: 0.7 },
  stable: { color: "#6366f1", intensity: 0.5 },
  positive: { color: "#10b981", intensity: 0.4 },
  sports: { color: "#ec4899", intensity: 0.6 },
  flow: { color: "#06b6d4", intensity: 0.65 },
};

export function OrbitalMap({ data = {}, mode = MAP_MODES.LIVE_SIGNALS, onRegionSelect = () => {} }) {
  const { t, direction, isArabic } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const linesRef = useRef([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [stats, setStats] = useState({ countries: 0, highPressure: 0, links: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);

  // Detect device capability
  useEffect(() => {
    const detected =
      navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2 ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      /iPhone|iPad|Android/.test(navigator.userAgent);
    setIsLowPower(detected);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    // Orbital/dark tile layer with premium styling
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: "",
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    // Add custom zoom controls positioned premium-like
    const ZoomControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const container = L.DomUtil.create("div", "orbital-zoom-control");
        const zoomIn = L.DomUtil.create("button", "zoom-btn", container);
        const zoomOut = L.DomUtil.create("button", "zoom-btn", container);
        zoomIn.innerHTML = "+";
        zoomOut.innerHTML = "−";
        zoomIn.title = t("map.zoom_in");
        zoomOut.title = t("map.zoom_out");
        L.DomEvent.on(zoomIn, "click", () => map.zoomIn());
        L.DomEvent.on(zoomOut, "click", () => map.zoomOut());
        return container;
      },
    });
    new ZoomControl().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [t]);

  // Render signals/regions dynamically based on mode
  useEffect(() => {
    if (!mapInstanceRef.current || !data.regions) return;

    // Clear existing markers and lines
    Object.values(markersRef.current).forEach((marker) => {
      if (marker) mapInstanceRef.current.removeLayer(marker);
    });
    linesRef.current.forEach((line) => {
      if (line) mapInstanceRef.current.removeLayer(line);
    });
    markersRef.current = {};
    linesRef.current = [];

    // Render regions as pulsing/glowing markers
    data.regions.forEach((region) => {
      if (!region.lat || !region.lng) return;

      const signalType = region.signalType || "stable";
      const color = SIGNAL_TYPES[signalType]?.color || SIGNAL_TYPES.stable.color;
      const intensity = SIGNAL_TYPES[signalType]?.intensity || 0.5;

      // Create custom marker with glow effect
      const glowMarker = L.circleMarker([region.lat, region.lng], {
        radius: 8 + intensity * 4,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.7 + intensity * 0.3,
        fillOpacity: 0.4 + intensity * 0.3,
        className: `orbital-marker signal-${signalType}`,
      });

      glowMarker.bindPopup(
        `<div class="orbital-popup" dir="${isArabic ? "rtl" : "ltr"}">
          <div class="popup-title">${region.name}</div>
          <div class="popup-stat">
            <span>${t("map.pressure")}:</span>
            <strong>${region.pressure || "N/A"}</strong>
          </div>
          <div class="popup-stat">
            <span>${t("map.signals")}:</span>
            <strong>${region.signalCount || 0}</strong>
          </div>
          <div class="popup-stat">
            <span>${t("map.confidence")}:</span>
            <strong>${region.confidence || "N/A"}</strong>
          </div>
          <div class="popup-stat">
            <span>${t("map.updated")}:</span>
            <strong>${region.updated || "N/A"}</strong>
          </div>
        </div>`,
        { maxWidth: 250, className: "orbital-popup-container" }
      );

      glowMarker.on("click", () => {
        setSelectedRegion(region);
        onRegionSelect(region);
      });

      glowMarker.addTo(mapInstanceRef.current);
      markersRef.current[region.id] = glowMarker;
    });

    // Render event links as arcs if available
    if (data.links && data.links.length > 0) {
      data.links.forEach((link) => {
        const from = data.regions.find((r) => r.id === link.source);
        const to = data.regions.find((r) => r.id === link.target);

        if (from && to && from.lat && from.lng && to.lat && to.lng) {
          const polyline = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
            color: "#60a5fa",
            weight: 2,
            opacity: 0.3,
            dashArray: "5, 5",
            className: "orbital-link",
          });

          polyline.bindTooltip(t("map.linkTooltip", { source: from.name, target: to.name, count: link.count || 1 }), {
            sticky: true,
            direction: "center",
            className: "orbital-tooltip",
          });

          polyline.addTo(mapInstanceRef.current);
          linesRef.current.push(polyline);
        }
      });
    }

    // Update statistics
    setStats({
      countries: data.regions.length,
      highPressure: data.regions.filter((r) => r.pressure === "High").length,
      links: data.links?.length || 0,
    });
  }, [data, mode, t, isArabic, onRegionSelect]);

  // Handle legend
  const legendItems = useMemo(() => {
    return Object.entries(SIGNAL_TYPES).map(([key, { color }]) => ({
      key,
      color,
      label: t(`map.legend.${key}`),
    }));
  }, [t]);

  // Region explainability panel
  const explainerContent = useMemo(() => {
    if (!selectedRegion) {
      return { title: t("map.explainTitle"), content: t("map.noRegion") };
    }

    const dominantSignal = SIGNAL_TYPES[selectedRegion.signalType] ? t(`map.legend.${selectedRegion.signalType}`) : selectedRegion.signalType;
    const explanation = t("map.why.dominant", { driver: dominantSignal, count: selectedRegion.signalCount || 0 });

    return {
      title: t("map.explainTitle"),
      region: selectedRegion.name,
      pressure: selectedRegion.pressure || "N/A",
      signals: selectedRegion.signalCount || 0,
      confidence: selectedRegion.confidence || "N/A",
      updated: selectedRegion.updated || "N/A",
      dominantSignal,
      topEntities: selectedRegion.entities?.join(", ") || "N/A",
      explanation,
    };
  }, [selectedRegion, t]);

  return (
    <div className={`orbital-map-container ${isArabic ? "rtl" : "ltr"}`} dir={direction}>
      <div className={`orbital-map ${isLowPower ? "low-power-mode" : ""}`} ref={mapRef} />

      {isLowPower && (
        <div className="performance-banner">
          <p>{t("map.fallback2d")}</p>
        </div>
      )}

      {/* Top Controls */}
      <div className="orbital-controls top-controls">
        <div className="mode-selector">
          <label>{t("map.mode.live_signals")}</label>
          <select
            value={mode}
            onChange={(e) => {
              // Dispatch mode change if needed
            }}
            className="mode-dropdown"
          >
            {Object.entries(MAP_MODES).map(([key, value]) => (
              <option key={value} value={value}>
                {t(`map.mode.${value.replace(/_/g, "")}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-buttons">
          <button className="control-btn" onClick={() => setShowLegend(!showLegend)} title={t("map.legend")}>
            ◇
          </button>
          <button className="control-btn" onClick={() => setShowExplain(!showExplain)} title={t("map.details")}>
            ⓘ
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="stats-panel">
        <div className="stat">
          <span className="stat-label">{t("map.stats.countries")}</span>
          <strong className="stat-value">{stats.countries}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">{t("map.stats.highPressure")}</span>
          <strong className="stat-value">{stats.highPressure}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">{t("map.stats.links")}</span>
          <strong className="stat-value">{stats.links}</strong>
        </div>
      </div>

      {/* Legend Overlay */}
      {showLegend && (
        <div className="legend-panel">
          <h3>{t("map.legendTitle")}</h3>
          <div className="legend-items">
            {legendItems.map((item) => (
              <div key={item.key} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: item.color }} />
                <span className="legend-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explainability Panel */}
      {showExplain && (
        <div className="explain-panel">
          <h3>{explainerContent.title}</h3>
          {selectedRegion && (
            <div className="explain-content">
              <div className="explain-row">
                <span className="explain-label">{t("map.regionName")}:</span>
                <strong>{explainerContent.region}</strong>
              </div>
              <div className="explain-row">
                <span className="explain-label">{t("map.pressure")}:</span>
                <strong>{explainerContent.pressure}</strong>
              </div>
              <div className="explain-row">
                <span className="explain-label">{t("map.signals")}:</span>
                <strong>{explainerContent.signals}</strong>
              </div>
              <div className="explain-row">
                <span className="explain-label">{t("map.confidence")}:</span>
                <strong>{explainerContent.confidence}</strong>
              </div>
              <div className="explain-row">
                <span className="explain-label">{t("map.dominantSignal")}:</span>
                <strong>{explainerContent.dominantSignal}</strong>
              </div>
              <div className="explain-row">
                <span className="explain-label">{t("map.topEntities")}:</span>
                <strong>{explainerContent.topEntities}</strong>
              </div>
              <div className="explain-reason">{explainerContent.explanation}</div>
            </div>
          )}
          {!selectedRegion && <p className="no-selection">{explainerContent.content}</p>}
        </div>
      )}
    </div>
  );
}
