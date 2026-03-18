import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import { severityColor, alertBadgeConfig } from "../lib/radar/radarClassifier";

/**
 * RadarCriticalAlerts — shows only highest severity radar signals
 * with enhanced urgency visuals and entity display.
 */
export default function RadarCriticalAlerts({ signals }) {
  const { language } = useI18n();

  const critical = (signals || []).filter(
    s => s.severity === "حرج" || s.radarScore >= 75
  ).slice(0, 8);

  if (!critical.length) {
    return (
      <div style={{
        background: "rgba(34,197,94,0.04)",
        border: "1px solid rgba(34,197,94,0.15)",
        borderRadius: "12px", padding: "20px",
        textAlign: "center",
      }}>
        <span style={{ fontSize: "22px" }}>✅</span>
        <div style={{ color: "#22c55e", fontWeight: 700, marginTop: 8, fontSize: "0.85rem" }}>
          {language === "ar" ? "لا توجد تنبيهات حرجة حاليًا" : "No critical alerts at this time"}
        </div>
        <div style={{ color: "#374151", fontSize: "0.72rem", marginTop: 4 }}>
          {language === "ar" ? "جميع المؤشرات ضمن الحدود الطبيعية" : "All indicators within normal range"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        marginBottom: 10,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#ef4444",
          animation: "radarPulse 1.5s infinite",
          boxShadow: "0 0 8px rgba(239,68,68,0.4)",
        }} />
        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ef4444" }}>
          {language === "ar" ? `${critical.length} تنبيه حرج` : `${critical.length} Critical Alert${critical.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {critical.map(sig => {
          const badge = sig.alertBadge ? alertBadgeConfig(sig.alertBadge) : null;
          const sevColor = severityColor(sig.severity);
          return (
            <div key={sig.id} style={{
              background: "rgba(239,68,68,0.03)",
              border: `1px solid ${sevColor}25`,
              borderRadius: "10px",
              padding: "10px 12px",
              borderRight: `3px solid ${sevColor}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <div style={{
                  minWidth: 36, height: 36, borderRadius: "50%",
                  background: `${sevColor}15`, border: `1.5px solid ${sevColor}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 900, color: sevColor,
                  ...(sig.radarScore >= 80 ? { animation: "radarPulse 2s infinite" } : {}),
                }}>
                  {sig.radarScore}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.82rem", fontWeight: 700, color: "#e8edf2",
                    lineHeight: 1.3, marginBottom: 4,
                  }}>
                    {sig.title}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontSize: "0.62rem", color: "#6b7280" }}>
                      {sig.category}
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#374151" }}>·</span>
                    <span style={{ fontSize: "0.62rem", color: "#6b7280" }}>
                      {sig.region}
                    </span>
                    {badge && (
                      <>
                        <span style={{ fontSize: "0.62rem", color: "#374151" }}>·</span>
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px",
                          borderRadius: "4px", color: badge.color, background: badge.bg,
                          ...(sig.alertBadge === "عاجل" || sig.alertBadge === "تصعيد حرج"
                            ? { animation: "radarPulse 2s infinite" } : {}),
                        }}>
                          {badge.icon} {sig.alertBadge}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Key entities */}
              {sig.linkedEntities?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
                  {sig.linkedEntities.slice(0, 4).map(e => (
                    <span key={e} style={{
                      fontSize: "0.6rem", padding: "1px 6px", borderRadius: "4px",
                      background: "rgba(200,155,60,0.1)", color: "#c89b3c",
                    }}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
