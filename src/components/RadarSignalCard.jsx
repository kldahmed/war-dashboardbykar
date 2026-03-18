import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import { severityColor, trendIcon, trendColor, alertBadgeConfig } from "../lib/radar/radarClassifier";

/**
 * RadarSignalCard — renders a single radar signal
 * with full explainability panel.
 */
export default function RadarSignalCard({ signal, compact = false, onExpand }) {
  const { t, language } = useI18n();
  const [expanded, setExpanded] = React.useState(false);

  if (!signal) return null;

  const sevColor = severityColor(signal.severity);
  const tIcon = trendIcon(signal.trendDirection);
  const tColor = trendColor(signal.trendDirection);
  const badge = signal.alertBadge ? alertBadgeConfig(signal.alertBadge) : null;

  const timeAgo = (() => {
    try {
      const diff = Date.now() - new Date(signal.timestamp).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return language === "ar" ? "الآن" : "now";
      if (mins < 60) return language === "ar" ? `${mins} د` : `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return language === "ar" ? `${hrs} س` : `${hrs}h`;
      return language === "ar" ? `${Math.floor(hrs / 24)} ي` : `${Math.floor(hrs / 24)}d`;
    } catch { return ""; }
  })();

  if (compact) {
    return (
      <div
        onClick={() => onExpand?.(signal)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 14px", cursor: "pointer",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "10px",
          borderRight: `3px solid ${sevColor}`,
          transition: "background 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
      >
        <div style={{
          minWidth: 38, height: 38, borderRadius: "50%",
          background: `${sevColor}22`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "14px", fontWeight: 900, color: sevColor,
        }}>
          {signal.radarScore}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.85rem", fontWeight: 700, color: "#e8edf2",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {signal.title}
          </div>
          <div style={{ display: "flex", gap: "8px", fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>
            <span>{signal.category}</span>
            <span>•</span>
            <span>{signal.region}</span>
            <span>•</span>
            <span style={{ color: tColor }}>{tIcon} {signal.trendDirection}</span>
          </div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "#4b5563" }}>{timeAgo}</div>
        {badge && (
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: "6px", color: badge.color, background: badge.bg,
          }}>
            {badge.icon} {signal.alertBadge}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f1319, #131820)",
      border: `1px solid ${sevColor}33`,
      borderRadius: "14px",
      overflow: "hidden",
      transition: "border-color 0.3s",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: "12px",
        borderBottom: `1px solid ${sevColor}22`,
      }}>
        {/* Score circle */}
        <div style={{
          minWidth: 48, height: 48, borderRadius: "50%",
          background: `radial-gradient(circle, ${sevColor}33, ${sevColor}11)`,
          border: `2px solid ${sevColor}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", fontWeight: 900, color: sevColor,
          boxShadow: `0 0 12px ${sevColor}22`,
        }}>
          {signal.radarScore}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#e8edf2", lineHeight: 1.4 }}>
            {signal.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 6 }}>
            {/* Category badge */}
            <span style={{
              fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: "rgba(56,189,248,0.12)", color: "#38bdf8",
            }}>
              {signal.category}
            </span>
            {/* Severity badge */}
            <span style={{
              fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: `${sevColor}18`, color: sevColor,
            }}>
              {signal.severity}
            </span>
            {/* Trend */}
            <span style={{
              fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: `${tColor}18`, color: tColor,
            }}>
              {tIcon} {signal.trendDirection}
            </span>
            {/* Alert badge */}
            {badge && (
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: "6px", color: badge.color, background: badge.bg,
                animation: signal.alertBadge === "عاجل" || signal.alertBadge === "تصعيد حرج"
                  ? "radarPulse 2s infinite" : "none",
              }}>
                {badge.icon} {signal.alertBadge}
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: "end", flexShrink: 0 }}>
          <div style={{ fontSize: "0.7rem", color: "#4b5563" }}>{timeAgo}</div>
          <div style={{ fontSize: "0.68rem", color: "#6b7280", marginTop: 2 }}>{signal.source}</div>
        </div>
      </div>

      {/* Expandable explainability */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.015)",
          fontSize: "0.75rem", color: "#6b7280",
        }}
      >
        <span>{language === "ar" ? "لماذا هذه الإشارة مهمة؟" : "Why is this signal important?"}</span>
        <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
      </div>

      {expanded && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(255,255,255,0.02)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
            <ExplainRow
              label={language === "ar" ? "المنطقة" : "Region"}
              value={`${signal.region} — ${signal.country || ""}`}
            />
            <ExplainRow
              label={language === "ar" ? "عدد المصادر" : "Sources"}
              value={signal.sourceCount}
            />
            <ExplainRow
              label={language === "ar" ? "مستوى الثقة" : "Confidence"}
              value={`${signal.confidence}%`}
              color={signal.confidence >= 70 ? "#22c55e" : signal.confidence >= 45 ? "#f59e0b" : "#ef4444"}
            />
            <ExplainRow
              label={language === "ar" ? "نقاط الرادار" : "Radar Score"}
              value={signal.radarScore}
              color={sevColor}
            />
          </div>

          {/* Entities */}
          {signal.linkedEntities?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4 }}>
                {language === "ar" ? "أهم الكيانات" : "Key Entities"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {signal.linkedEntities.slice(0, 6).map(e => (
                  <span key={e} style={{
                    fontSize: "0.68rem", padding: "2px 8px", borderRadius: "6px",
                    background: "rgba(200,155,60,0.12)", color: "#c89b3c",
                  }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed vs Emerging */}
          <div style={{ marginTop: 10, fontSize: "0.75rem" }}>
            {signal.isEmerging ? (
              <span style={{ color: "#818cf8" }}>
                🔎 {language === "ar" ? "إشارة ناشئة — تحتاج تأكيد إضافي" : "Emerging signal — needs further confirmation"}
              </span>
            ) : (
              <span style={{ color: "#22c55e" }}>
                ✓ {language === "ar" ? "إشارة مؤكدة من عدة مصادر" : "Confirmed signal from multiple sources"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExplainRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || "#e8edf2" }}>{value}</span>
    </div>
  );
}
