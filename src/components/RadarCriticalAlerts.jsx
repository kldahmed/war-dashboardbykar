import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import RadarSignalCard from "./RadarSignalCard";

/**
 * RadarCriticalAlerts — shows only highest severity radar signals
 */
export default function RadarCriticalAlerts({ signals }) {
  const { language } = useI18n();

  const critical = (signals || []).filter(
    s => s.severity === "حرج" || s.radarScore >= 75
  ).slice(0, 8);

  if (!critical.length) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f1319, #131820)",
        border: "1px solid rgba(34,197,94,0.2)",
        borderRadius: "14px", padding: "20px",
        textAlign: "center",
      }}>
        <span style={{ fontSize: "24px" }}>✅</span>
        <div style={{ color: "#22c55e", fontWeight: 700, marginTop: 8, fontSize: "0.9rem" }}>
          {language === "ar" ? "لا توجد تنبيهات حرجة حاليًا" : "No critical alerts at this time"}
        </div>
        <div style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: 4 }}>
          {language === "ar" ? "جميع المؤشرات ضمن الحدود الطبيعية" : "All indicators within normal range"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        marginBottom: 12,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#ef4444",
          animation: "radarPulse 1.5s infinite",
          boxShadow: "0 0 8px rgba(239,68,68,0.4)",
        }} />
        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#ef4444" }}>
          {language === "ar" ? `${critical.length} تنبيه حرج` : `${critical.length} Critical Alert${critical.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {critical.map(sig => (
          <RadarSignalCard key={sig.id} signal={sig} />
        ))}
      </div>
    </div>
  );
}
