import React from "react";

/**
 * ForecastConfidencePanel — displays probability + confidence as twin gauges
 * plus evidence strength indicator and signal count.
 */
export default function ForecastConfidencePanel({ forecast }) {
  const { probability, confidence, evidenceStrength, signalCount, linkedEvents = [] } = forecast;

  const probColor = probability >= 60 ? "#ef4444"
                  : probability >= 45 ? "#f59e0b"
                  : "#38bdf8";

  const confColor = confidence >= 60 ? "#22c55e"
                  : confidence >= 40 ? "#f59e0b"
                  : "#ef4444";

  const evMeta = {
    strong:   { label: "أدلة قوية",    color: "#22c55e" },
    moderate: { label: "أدلة متوسطة",  color: "#f59e0b" },
    weak:     { label: "أدلة محدودة",  color: "#ef4444" },
  }[evidenceStrength || "weak"];

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "14px 16px",
    }}>
      {/* Twin gauges */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "14px" }}>
        <Gauge value={probability} color={probColor} label="الاحتمالية" />
        <Gauge value={confidence}  color={confColor}  label="الثقة" />
      </div>

      {/* Evidence badge + signal count */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px",
          background: `${evMeta.color}15`, border: `1px solid ${evMeta.color}30`, color: evMeta.color,
        }}>
          {evMeta.label}
        </span>
        <span style={{
          fontSize: "10px", padding: "2px 8px", borderRadius: "6px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#64748b",
        }}>
          {signalCount} إشارة مرصودة
        </span>
        <span style={{
          fontSize: "10px", padding: "2px 8px", borderRadius: "6px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#64748b",
        }}>
          {linkedEvents.length} حدث مرتبط
        </span>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: "10px", fontSize: "9px", color: "#1e2d3d", lineHeight: 1.5 }}>
        ⚠ توقع احتمالي — ليس تنبؤاً قاطعاً. القيم مستنبطة حصراً من بيانات فعلية مرصودة.
      </div>
    </div>
  );
}

function Gauge({ value, color, label }) {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flex: 1 }}>
      <div style={{ position: "relative", width: 54, height: 54 }}>
        <svg width="54" height="54" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${circ}`} strokeDashoffset={`${dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,0.61,0.36,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 900, color, lineHeight: 1 }}>{value}%</span>
        </div>
      </div>
      <div style={{ fontSize: "10px", color: "#475569", fontWeight: 600 }}>{label}</div>
    </div>
  );
}
