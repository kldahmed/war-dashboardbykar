import React from "react";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import MapEventTooltip from "./MapEventTooltip";
import { useI18n } from "../i18n/I18nProvider";

export default function MapSignalLayer({
  countryNodes,
  linkLayer,
  selectedNodeId,
  onSelectNode,
  motionSettings,
  globalEvents = []
}) {
  const { t } = useI18n();

  return (
    <>
      {linkLayer.map((link) => (
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
      ))}

      {countryNodes.map((node) => (
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

      {/* Global Live Events Layer */}
      {globalEvents.map((ev) => (
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
    </>
  );
}
