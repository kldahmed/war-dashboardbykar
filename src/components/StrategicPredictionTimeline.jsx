import React from "react";
import { TIME_HORIZON_LABELS, CATEGORY_META } from "../lib/strategicForecastEngine";
import { formatDisplayTime } from "../AppHelpers";

/**
 * StrategicPredictionTimeline — horizontal timeline showing forecasts
 * plotted by probability across time horizons.
 * Also shows the trend arrow and evidence strength for each forecast.
 */
export default function StrategicPredictionTimeline({ forecasts = [], timeHorizon = "24h" }) {
  if (!forecasts.length) return null;

  // Only show top 6 forecasts with evidence
  const visible = forecasts.filter(f => f.signalCount > 0).slice(0, 6);
  if (!visible.length) return null;

  const horizonLabel = TIME_HORIZON_LABELS[timeHorizon] || timeHorizon;
  const now = formatDisplayTime(new Date().toISOString());

  return (
    <div style={{
      background: "linear-gradient(145deg, #0b0f1a, #0f1722)",
      border: "1px solid rgba(56,189,248,0.1)",
      borderRadius: "16px",
      padding: "20px 24px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "20px", flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "#f3d38a" }}>
            📅 خط زمن التوقعات
          </div>
          <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px" }}>
            Strategic Prediction Timeline — {horizonLabel}
          </div>
        </div>
        <div style={{ marginInlineStart: "auto", fontSize: "10px", color: "#334155" }}>
          {now}
        </div>
      </div>

      {/* Timeline rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {visible.map((fc, i) => {
          const meta = CATEGORY_META[fc.category] || { icon: "🔭", color: "#38bdf8" };
          const trend = fc.trendDirection || {};
          const trendColor = trend.color || "#94a3b8";
          const trendArrow = trend.arrow || "→";
          const barWidth = `${fc.probability}%`;
          const evColor = fc.evidenceStrength === "strong" ? "#22c55e"
                        : fc.evidenceStrength === "moderate" ? "#f59e0b" : "#ef4444";

          return (
            <div key={fc.id} style={{
              display: "grid",
              gridTemplateColumns: "26px 1fr 52px",
              gap: "10px",
              alignItems: "center",
            }}>
              {/* Icon */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: `${meta.color}18`,
                border: `1px solid ${meta.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", flexShrink: 0,
              }}>
                {meta.icon}
              </div>

              {/* Bar section */}
              <div>
                <div style={{
                  fontSize: "11px", color: "#94a3b8", marginBottom: "4px",
                  display: "flex", alignItems: "center", gap: "6px",
                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{fc.topic}</span>
                  <span style={{ fontSize: "11px", color: trendColor, fontWeight: 800, flexShrink: 0 }}>
                    {trendArrow} {trend.dir}
                  </span>
                </div>
                <div style={{
                  height: "6px", background: "rgba(255,255,255,0.04)",
                  borderRadius: "99px", overflow: "hidden",
                }}>
                  <div style={{
                    width: barWidth, height: "100%",
                    background: `linear-gradient(90deg, ${meta.color}55, ${meta.color})`,
                    borderRadius: "99px",
                    transition: `width ${0.8 + i * 0.15}s ease`,
                  }} />
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "9px", color: "#1e2d3d", marginTop: "3px",
                }}>
                  <span style={{ color: evColor }}>{
                    fc.evidenceStrength === "strong" ? "أدلة قوية" :
                    fc.evidenceStrength === "moderate" ? "أدلة متوسطة" : "أدلة محدودة"
                  }</span>
                  <span>{fc.signalCount} إشارة</span>
                </div>
              </div>

              {/* Probability label */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color: meta.color, lineHeight: 1 }}>
                  {fc.probability}%
                </div>
                <div style={{ fontSize: "9px", color: "#334155" }}>احتمالية</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time horizon reference */}
      <div style={{
        marginTop: "16px",
        padding: "8px 12px",
        background: "rgba(56,189,248,0.04)",
        border: "1px solid rgba(56,189,248,0.1)",
        borderRadius: "8px",
        fontSize: "10px",
        color: "#334155",
        textAlign: "center",
      }}>
        أُفق التوقع: <span style={{ color: "#38bdf8", fontWeight: 700 }}>{horizonLabel}</span>
        &nbsp;·&nbsp; جميع التوقعات مستنبطة من إشارات فعلية — ليست تنبؤات قاطعة
      </div>
    </div>
  );
}
