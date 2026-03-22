import React from "react";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import MapEventTooltip from "./MapEventTooltip";
import { useI18n } from "../i18n/I18nProvider";

const CATEGORY_STYLE = {
  conflict: { color: "#ef4444", ring: "#f87171" },
  political: { color: "#818cf8", ring: "#a5b4fc" },
  economy: { color: "#f59e0b", ring: "#fbbf24" },
  logistics: { color: "#22d3ee", ring: "#67e8f9" },
  aviation: { color: "#38bdf8", ring: "#7dd3fc" },
  maritime: { color: "#14b8a6", ring: "#2dd4bf" },
  sports: { color: "#a855f7", ring: "#c084fc" },
  news: { color: "#38bdf8", ring: "#7dd3fc" },
};

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isValidLatLngPair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return false;
  const lat = Number(pair[0]);
  const lng = Number(pair[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export default function MapSignalLayer({
  countryNodes,
  linkLayer,
  selectedNodeId,
  onSelectNode,
  motionSettings,
  globalEvents = [],
  radarSignals = [],
  radarArcs = [],
  signalPoints = [],
  hotspots = [],
  relationshipLines = [],
  showRelationshipLines = false,
  showBaseLinks = true,
  showLiveSignals = true,
  showHotspots = true,
  onSelectSignal,
  onSelectHotspot,
  selectedSignalId,
  selectedHotspotId,
}) {
  const { t } = useI18n();

  const safeLinks = Array.isArray(linkLayer)
    ? linkLayer.filter((link) => isValidLatLngPair(link?.sourceCoordinates) && isValidLatLngPair(link?.targetCoordinates))
    : [];

  const safeNodes = Array.isArray(countryNodes)
    ? countryNodes.filter((node) => isValidLatLngPair(node?.centerCoordinates) && isFiniteNumber(node?.radius))
    : [];

  const safeGlobalEvents = Array.isArray(globalEvents)
    ? globalEvents.filter((ev) => {
        if (!Array.isArray(ev?.coordinates) || ev.coordinates.length < 2) return false;
        const lng = Number(ev.coordinates[0]);
        const lat = Number(ev.coordinates[1]);
        return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      })
    : [];

  const safeRadarSignals = Array.isArray(radarSignals)
    ? radarSignals.filter((rs) => {
        if (!Array.isArray(rs?.coordinates) || rs.coordinates.length < 2) return false;
        const lng = Number(rs.coordinates[0]);
        const lat = Number(rs.coordinates[1]);
        return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      })
    : [];

  const safeRadarArcs = Array.isArray(radarArcs)
    ? radarArcs.filter((arc) => {
        if (!Array.isArray(arc?.from) || !Array.isArray(arc?.to)) return false;
        const fromLng = Number(arc.from[0]);
        const fromLat = Number(arc.from[1]);
        const toLng = Number(arc.to[0]);
        const toLat = Number(arc.to[1]);
        return [fromLat, fromLng, toLat, toLng].every((v) => Number.isFinite(v));
      })
    : [];

  const safeSignalPoints = Array.isArray(signalPoints)
    ? signalPoints.filter((signal) => isFiniteNumber(signal?.lat) && isFiniteNumber(signal?.lng))
    : [];

  const safeHotspots = Array.isArray(hotspots)
    ? hotspots.filter((spot) => isFiniteNumber(spot?.lat) && isFiniteNumber(spot?.lng))
    : [];

  const safeRelationshipLines = Array.isArray(relationshipLines)
    ? relationshipLines.filter((line) => isValidLatLngPair(line?.from) && isValidLatLngPair(line?.to))
    : [];

  const styleForCategory = (category) => {
    const key = String(category || "news").toLowerCase();
    return CATEGORY_STYLE[key] || CATEGORY_STYLE.news;
  };

  const severityToScale = (severity) => {
    if (severity === "critical") return 1.25;
    if (severity === "high") return 1.05;
    if (severity === "medium") return 0.9;
    return 0.75;
  };

  return (
    <>
      {showBaseLinks ? safeLinks.map((link) => (
        <Polyline
          key={link.id}
          positions={[link.sourceCoordinates, link.targetCoordinates]}
          pathOptions={{
            color: link.color,
            weight: 1.8 + link.strength * 2.1,
            opacity: 0.55,
            dashArray: motionSettings.arcDashDurationMs ? "7 7" : null,
            className: motionSettings.arcDashDurationMs ? "glm-arc-live" : ""
          }}
        >
          <Tooltip sticky>
            {t("map.linkTooltip", { source: link.source, target: link.target, count: link.linkedEventCount })}
          </Tooltip>
        </Polyline>
      )) : null}

      {showRelationshipLines ? safeRelationshipLines.map((line) => (
        <Polyline
          key={line.id}
          positions={[line.from, line.to]}
          pathOptions={{
            color: line.color || "#7dd3fc",
            weight: 0.9 + Math.min(1.8, (line.strength || 0.2) * 3),
            opacity: 0.28,
            dashArray: "4 7",
            className: "glm-relationship-line"
          }}
        >
          <Tooltip sticky>
            <div style={{ fontSize: 10 }}>
              {line.label || t("map.signals")} ({line.count || 0})
            </div>
          </Tooltip>
        </Polyline>
      )) : null}

      {safeNodes.map((node) => (
        <CircleMarker
          key={node.id}
          center={node.centerCoordinates}
          radius={selectedNodeId === node.id ? node.radius + 2 : node.radius}
          pathOptions={{
            color: node.color,
            fillColor: node.color,
            fillOpacity: 0.2 + node.intensity * 0.45,
            weight: selectedNodeId === node.id ? 2.1 : 1.2,
            className: selectedNodeId === node.id ? "glm-node-active" : ""
          }}
          eventHandlers={{ click: () => onSelectNode(node.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <MapEventTooltip node={node} />
          </Tooltip>
        </CircleMarker>
      ))}

      {showLiveSignals ? safeSignalPoints.map((signal) => {
        const style = styleForCategory(signal.category);
        const scale = severityToScale(signal.severity);
        const radius = Math.max(4, Math.round((signal.importanceScore || 40) / 16) * scale);
        const isCritical = signal.severity === "critical" || Number(signal.importanceScore || 0) >= 82;
        return (
          <CircleMarker
            key={`sig-${signal.id}`}
            center={[signal.lat, signal.lng]}
            radius={selectedSignalId === signal.id ? radius + 2 : radius}
            pathOptions={{
              color: style.ring,
              fillColor: style.color,
              fillOpacity: isCritical ? 0.72 : 0.48,
              weight: selectedSignalId === signal.id ? 2.2 : isCritical ? 1.8 : 1.2,
              className: isCritical ? "glm-signal-critical" : "glm-signal-point"
            }}
            eventHandlers={{ click: () => onSelectSignal?.(signal) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 260, direction: "rtl" }}>
                <div style={{ fontWeight: 800, marginBottom: 3 }}>{signal.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>
                  {signal.category} · {signal.region || signal.country || "Global"} · {signal.importanceScore || 0}
                </div>
                <div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>
                  {signal.timestamp || signal.time || ""}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      }) : null}

      {showHotspots ? safeHotspots.map((hotspot) => (
        <CircleMarker
          key={`hot-${hotspot.id}`}
          center={[hotspot.lat, hotspot.lng]}
          radius={selectedHotspotId === hotspot.id ? hotspot.radius + 2 : hotspot.radius}
          pathOptions={{
            color: hotspot.color || "#f3d38a",
            fillColor: hotspot.color || "#f3d38a",
            fillOpacity: 0.2,
            weight: selectedHotspotId === hotspot.id ? 2.3 : 1.5,
            dashArray: "3 6",
            className: "glm-hotspot"
          }}
          eventHandlers={{ click: () => onSelectHotspot?.(hotspot) }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 220, direction: "rtl" }}>
              <div style={{ fontWeight: 800, marginBottom: 3 }}>Hotspot • {hotspot.count}</div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>
                {hotspot.region || "Global"} · {hotspot.topCategory || "mixed"}
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      )) : null}

      {/* Global Live Events Layer */}
      {safeGlobalEvents.map((ev) => (
        <CircleMarker
          key={`gle-${ev.id}`}
          center={[ev.coordinates[1], ev.coordinates[0]]}
          radius={5 + Math.round((ev.severity / 100) * 8)}
          pathOptions={{
            color: ev.color || "#ef4444",
            fillColor: ev.color || "#ef4444",
            fillOpacity: 0.35 + (ev.severity / 100) * 0.4,
            weight: ev.severity >= 70 ? 2.5 : 1.5,
            className: ev.severity >= 70 ? "glm-node-active" : ""
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 220, direction: "rtl" }}>
              <div style={{ fontWeight: 800, marginBottom: 3 }}>{ev.icon} {ev.title}</div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>
                {ev.category} · خطورة {ev.severity}% · ثقة {ev.confidence}%
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Radar Signals Layer */}
      {safeRadarSignals.map((rs) => {
        const sevColors = {
          "حرج": "#ef4444", "مرتفع": "#f59e0b",
          "متوسط": "#38bdf8", "منخفض": "#64748b"
        };
        const color = sevColors[rs.severity] || "#38bdf8";
        const r = 4 + Math.round((rs.radarScore / 100) * 10);
        return (
          <CircleMarker
            key={`radar-${rs.id}`}
            center={[rs.coordinates[1], rs.coordinates[0]]}
            radius={r}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.15 + (rs.radarScore / 100) * 0.5,
              weight: rs.radarScore >= 70 ? 2.5 : 1.5,
              className: rs.radarScore >= 70 ? "glm-node-active" : ""
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 240, direction: "rtl" }}>
                <div style={{ fontWeight: 800, marginBottom: 3 }}>📡 {rs.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>
                  {rs.category} · رادار {rs.radarScore}/100 · {rs.severity}
                </div>
                {rs.trendDirection && (
                  <div style={{ color: rs.trendDirection === "صاعد" ? "#ef4444" : "#6b7280", fontSize: 10, marginTop: 2 }}>
                    {rs.trendDirection === "صاعد" ? "↑" : rs.trendDirection === "متراجع" ? "↓" : "→"} {rs.trendDirection}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Radar Inter-Signal Arcs */}
      {safeRadarArcs.map(arc => (
        <Polyline
          key={`rarc-${arc.id}`}
          positions={[
            [arc.from[1], arc.from[0]],
            [arc.to[1], arc.to[0]]
          ]}
          pathOptions={{
            color: arc.color || "#38bdf8",
            weight: 1.2 + arc.strength * 2,
            opacity: 0.35 + arc.strength * 0.3,
            dashArray: "6 8",
            className: "glm-arc-live"
          }}
        >
          <Tooltip sticky>
            <div style={{ padding: "3px 5px", fontSize: 10, direction: "rtl", maxWidth: 200 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>🔗 {t("map.linkTooltip", { source: "", target: "", count: arc.entities?.length || 0 })}</div>
              <div style={{ color: "#94a3b8", fontSize: 9 }}>
                {arc.entities?.slice(0, 3).join(" · ")}
              </div>
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}
