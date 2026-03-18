import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import { classifyRegion, pressureColor, trendIcon, trendColor } from "../lib/radar/radarClassifier";
import { formatCount, valueToStateLabel } from "../lib/radar/stateIndicators";

/**
 * RadarRegionStrip — horizontal scrollable strip showing
 * each region's radar pressure, signal count, and trend.
 */
export default function RadarRegionStrip({ regions }) {
  const { t, language } = useI18n();

  if (!regions || !regions.length) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px",
        }}>
          {["الشرق الأوسط", "أوروبا", "أمريكا الشمالية", "آسيا والمحيط الهادئ", "أفريقيا"].map(region => {
            const meta = classifyRegion(region);
            const rl = regionLabels[region]?.[language] || region;
            return (
              <div key={region} style={{
                minWidth: "150px", flex: "0 0 auto",
                background: "linear-gradient(135deg, #0f1319, #131820)",
                border: "1px solid rgba(100,116,139,0.15)",
                borderRadius: "12px",
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: 8 }}>
                  <span style={{ fontSize: "16px" }}>{meta.icon}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e8edf2" }}>{rl}</span>
                </div>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px",
                  borderRadius: "6px", color: "#64748b", background: "rgba(100,116,139,0.12)",
                }}>
                  {language === "ar" ? "جاري الرصد" : "Scanning"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const regionLabels = {
    "الشرق الأوسط":       { ar: "الشرق الأوسط", en: "Middle East" },
    "أوروبا":             { ar: "أوروبا", en: "Europe" },
    "أمريكا الشمالية":    { ar: "أمريكا الشمالية", en: "North America" },
    "آسيا والمحيط الهادئ": { ar: "آسيا والمحيط الهادئ", en: "Asia Pacific" },
    "أفريقيا":            { ar: "أفريقيا", en: "Africa" },
    "أمريكا اللاتينية":   { ar: "أمريكا اللاتينية", en: "Latin America" },
    "الأسواق العالمية":   { ar: "الأسواق العالمية", en: "Global Markets" },
    "الرياضة":           { ar: "الرياضة", en: "Sports" },
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", gap: "10px",
        overflowX: "auto", paddingBottom: "6px",
        scrollbarWidth: "thin",
        scrollbarColor: "#27303a #11151a",
      }}>
        {regions.map(r => {
          const meta = classifyRegion(r.region);
          const pColor = pressureColor(r.pressure);
          const tI = trendIcon(r.trend);
          const tC = trendColor(r.trend);
          const label = regionLabels[r.region]?.[language] || r.region;

          return (
            <div key={r.region} style={{
              minWidth: "150px", flex: "0 0 auto",
              background: "linear-gradient(135deg, #0f1319, #131820)",
              border: `1px solid ${pColor}33`,
              borderRadius: "12px",
              padding: "12px 14px",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Pressure glow */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                background: `linear-gradient(90deg, transparent, ${pColor}, transparent)`,
                opacity: r.pressure === "حرج" ? 0.9 : r.pressure === "مرتفع" ? 0.6 : 0.3,
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: 8 }}>
                <span style={{ fontSize: "16px" }}>{meta.icon}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e8edf2" }}>
                  {label}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "6px",
                  color: pColor, background: `${pColor}18`,
                }}>
                  {r.pressure}
                </span>
                <span style={{ fontSize: "0.7rem", color: tC, fontWeight: 600 }}>
                  {tI} {r.trend}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 900, color: pColor }}>
                  {(() => {
                    const fc = formatCount(r.signalCount, "signals", language);
                    return fc.isZero ? fc.display : fc.display;
                  })()}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#6b7280" }}>
                  {r.signalCount > 0 ? (language === "ar" ? "إشارة" : "signals") : ""}
                </span>
              </div>

              {/* Max score bar */}
              <div style={{
                marginTop: 8, height: 3, borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  width: `${Math.min(100, r.maxScore)}%`, height: "100%",
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${pColor}88, ${pColor})`,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
