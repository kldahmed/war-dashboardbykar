import React from "react";
import { useI18n } from "../i18n/I18nProvider";

const CATEGORY_ITEMS = [
  { labelAr: "صراع", labelEn: "Conflict", color: "#ef4444" },
  { labelAr: "سياسي", labelEn: "Political", color: "#818cf8" },
  { labelAr: "اقتصادي", labelEn: "Economic", color: "#f59e0b" },
  { labelAr: "لوجستي", labelEn: "Logistics", color: "#22d3ee" },
  { labelAr: "طيران", labelEn: "Aviation", color: "#38bdf8" },
  { labelAr: "بحري", labelEn: "Maritime", color: "#14b8a6" }
];

const SEVERITY_ITEMS = [
  { labelAr: "حرج", labelEn: "Critical", color: "#ef4444" },
  { labelAr: "مرتفع", labelEn: "High", color: "#f59e0b" },
  { labelAr: "متوسط", labelEn: "Medium", color: "#38bdf8" },
  { labelAr: "منخفض", labelEn: "Low", color: "#64748b" }
];

export default function MapLegend({ stats, signalStats, layerToggles }) {
  const { t, language } = useI18n();
  const onLabel = (ar, en) => (language === "en" ? en : ar);

  return (
    <div className="glm-legend">
      <div className="glm-legend-title">{t("map.legendTitle")}</div>
      <div className="glm-legend-section-title">Signal Categories</div>
      <div className="glm-legend-grid">
        {CATEGORY_ITEMS.map((item) => (
          <div key={item.labelEn} className="glm-legend-item">
            <span className="glm-legend-dot" style={{ background: item.color }} />
            <span>{onLabel(item.labelAr, item.labelEn)}</span>
          </div>
        ))}
      </div>

      <div className="glm-legend-section-title">Severity</div>
      <div className="glm-legend-grid">
        {SEVERITY_ITEMS.map((item) => (
          <div key={item.labelEn} className="glm-legend-item">
            <span className="glm-legend-dot" style={{ background: item.color }} />
            <span>{onLabel(item.labelAr, item.labelEn)}</span>
          </div>
        ))}
      </div>

      <div className="glm-legend-stats">
        <span>{t("map.stats.countries")}: {stats.activeCountries}</span>
        <span>{t("map.stats.highPressure")}: {stats.highPressureCountries}</span>
        <span>{t("map.stats.links")}: {stats.activeLinks}</span>
        <span>Signals: {signalStats?.signals || 0}</span>
        <span>Hotspots: {signalStats?.hotspots || 0}</span>
        <span>Relations: {signalStats?.relations || 0}</span>
      </div>

      <div className="glm-legend-footnote">
        <span>{layerToggles?.hotspots ? "●" : "○"} Hotspots</span>
        <span>{layerToggles?.links ? "●" : "○"} Relationship lines</span>
        <span>{layerToggles?.regions ? "●" : "○"} Region overlay</span>
      </div>
    </div>
  );
}
