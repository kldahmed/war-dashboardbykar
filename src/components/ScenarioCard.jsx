import React from "react";
import { CATEGORY_META } from "../lib/strategicForecastEngine";

/**
 * ScenarioCard — displays base / upside / downside scenarios for a forecast.
 * Premium intelligence card with color-coded scenario rows.
 */
export default function ScenarioCard({ forecast }) {
  const meta = CATEGORY_META[forecast.category] || { icon: "🔭", color: "#38bdf8", bg: "rgba(56,189,248,0.06)" };

  const scenarios = [
    {
      key: "base",
      label: "السيناريو الأساسي",
      text:  forecast.baseCase,
      icon:  "→",
      color: "#94a3b8",
      border: "rgba(148,163,184,0.2)",
      bg:    "rgba(148,163,184,0.04)",
    },
    {
      key: "upside",
      label: "السيناريو الإيجابي",
      text:  forecast.upsideCase,
      icon:  "↑",
      color: "#22c55e",
      border: "rgba(34,197,94,0.2)",
      bg:    "rgba(34,197,94,0.04)",
    },
    {
      key: "downside",
      label: "السيناريو السلبي",
      text:  forecast.downsideCase,
      icon:  "↓",
      color: "#ef4444",
      border: "rgba(239,68,68,0.2)",
      bg:    "rgba(239,68,68,0.04)",
    },
  ];

  return (
    <div style={{
      background: "linear-gradient(145deg, #0c1018, #111827)",
      border: `1px solid ${meta.color}22`,
      borderRadius: "14px",
      overflow: "hidden",
    }}>
      {/* Card header */}
      <div style={{
        padding: "14px 16px",
        background: meta.bg,
        borderBottom: `1px solid ${meta.color}18`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{ fontSize: "18px" }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "13px", color: "#e2e8f0", lineHeight: 1.3 }}>
            {forecast.topic}
          </div>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
            {forecast.region} · {forecast.category}
          </div>
        </div>
        <div style={{
          fontSize: "11px",
          fontWeight: 800,
          color: meta.color,
          background: `${meta.color}15`,
          borderRadius: "6px",
          padding: "3px 8px",
          whiteSpace: "nowrap",
        }}>
          {forecast.probability}%
        </div>
      </div>

      {/* Scenarios */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {scenarios.map(s => (
          <div key={s.key} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "10px",
            padding: "10px 12px",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}>
            <div style={{
              width: "22px", height: "22px",
              borderRadius: "50%",
              background: `${s.color}18`,
              border: `1px solid ${s.color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              fontSize: "12px", fontWeight: 900, color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "10px", color: s.color, fontWeight: 700, marginBottom: "3px" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
                {s.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Explanation */}
      {forecast.explanation && (
        <div style={{
          margin: "0 12px 12px",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "8px",
          fontSize: "11px",
          color: "#64748b",
          lineHeight: 1.7,
        }}>
          <span style={{ color: "#475569", fontWeight: 700 }}>التحليل: </span>
          {forecast.explanation}
        </div>
      )}
    </div>
  );
}
