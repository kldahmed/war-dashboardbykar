import React from "react";
import { CATEGORY_META } from "../lib/strategicForecastEngine";

const SIGNAL_LABELS = {
  conflict_escalation:  "تصعيد نزاعات",
  economic_pressure:    "ضغط اقتصادي",
  sports_activity:      "نشاط رياضي",
  transfer_market:      "سوق الانتقالات",
  sanctions_pressure:   "ضغط العقوبات",
  peace_signal:         "إشارات سلام",
  political_transition: "تحول سياسي",
  energy_signal:        "إشارات الطاقة",
};

/**
 * LinkedDriversPanel — shows the drivers (signals), entities, and linked events
 * for a given forecast in a structured intel-style layout.
 */
export default function LinkedDriversPanel({ forecast }) {
  const meta = CATEGORY_META[forecast.category] || { color: "#38bdf8" };
  const { drivers = [], entities = [], linkedEvents = [], risks = [] } = forecast;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Drivers */}
      {drivers.length > 0 && (
        <Section title="المحركات الرئيسية" icon="📡">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {drivers.map(d => (
              <Chip key={d} label={SIGNAL_LABELS[d] || d.replace(/_/g, " ")} color={meta.color} />
            ))}
          </div>
        </Section>
      )}

      {/* Entities */}
      {entities.length > 0 && (
        <Section title="الكيانات المرتبطة" icon="🏛️">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {entities.map(e => (
              <Chip key={e} label={e} color="#a78bfa" />
            ))}
          </div>
        </Section>
      )}

      {/* Linked events */}
      {linkedEvents.length > 0 && (
        <Section title="أحداث مرتبطة" icon="🔗">
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {linkedEvents.map(ev => (
              <div key={ev.id} style={{
                display: "flex", alignItems: "flex-start", gap: "8px",
                padding: "7px 10px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "8px",
              }}>
                <span style={{ fontSize: "10px", color: "#334155", flexShrink: 0, marginTop: "1px" }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "11px", color: "#94a3b8", lineHeight: 1.4,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {ev.title}
                  </div>
                  {ev.source && (
                    <div style={{ fontSize: "9px", color: "#334155", marginTop: "2px" }}>{ev.source}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Risk tags */}
      {risks.length > 0 && (
        <Section title="المخاطر المرتبطة" icon="⚠️">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {risks.map(r => (
              <Chip key={r} label={r.replace(/_/g, " ")} color="#f87171" />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div style={{
        fontSize: "10px", color: "#334155", fontWeight: 700,
        letterSpacing: "0.5px", marginBottom: "6px",
        display: "flex", alignItems: "center", gap: "4px",
      }}>
        <span>{icon}</span>
        <span style={{ textTransform: "uppercase" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{
      fontSize: "10px", padding: "2px 8px", borderRadius: "6px",
      background: `${color}12`, border: `1px solid ${color}28`, color,
      fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
