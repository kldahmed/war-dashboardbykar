import React, { useEffect, useState } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { useI18n } from "../i18n/I18nProvider";

const P = {
  bg: "#070b11",
  surface: "#0c1220",
  surfaceAlt: "#0e1630",
  border: "rgba(56,189,248,0.08)",
  borderGold: "rgba(243,211,138,0.12)",
  gold: "#f3d38a",
  blue: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a78bfa",
  muted: "#475569",
  text: "#e2e8f0",
  textDim: "#64748b"
};

function ProbabilityRing({ value, color, size = 48 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, value / 100));
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={12} fontWeight={900} fontFamily="Inter, system-ui">
        {value}%
      </text>
    </svg>
  );
}

function ForecastCard({ f, isAr }) {
  const evColor = f.evidenceStrength === "strong" ? P.green
    : f.evidenceStrength === "moderate" ? P.amber : P.muted;
  const evLabel = f.evidenceStrength === "strong"
    ? (isAr ? "أدلة قوية" : "Strong evidence")
    : f.evidenceStrength === "moderate"
    ? (isAr ? "أدلة متوسطة" : "Moderate evidence")
    : (isAr ? "أدلة ضعيفة" : "Weak evidence");

  return (
    <div style={{
      flex: "1 1 280px",
      minWidth: 260,
      background: `linear-gradient(135deg, ${P.surface}, ${P.surfaceAlt})`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }}>
      <ProbabilityRing value={f.probability} color={f.trendColor || P.blue} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: P.text, lineHeight: 1.4,
          marginBottom: 4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
        }}>
          {f.icon} {f.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: evColor }}>
            {evLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: f.trendColor || P.blue
          }}>
            {f.trendArrow} {f.trend}
          </span>
          <span style={{ fontSize: 10, color: P.muted }}>
            {isAr ? "ثقة" : "conf"}: {f.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

function PatternBadge({ pattern, isAr }) {
  const name = isAr ? (pattern.label || pattern.signal) : (pattern.signalEn || pattern.signal);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700,
      color: P.text,
      background: "rgba(167,139,250,0.08)",
      border: "1px solid rgba(167,139,250,0.15)",
      borderRadius: 8,
      padding: "4px 10px"
    }}>
      📈 {name}
      {pattern.count > 0 && (
        <span style={{
          fontSize: 9, fontWeight: 800, color: P.purple,
          background: "rgba(167,139,250,0.15)",
          borderRadius: 4, padding: "1px 5px"
        }}>×{pattern.count}</span>
      )}
    </span>
  );
}

export default function PatternForecastSummary() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  if (!ws) return null;

  const { patterns, forecasts } = ws;
  const hasPatterns = patterns && (patterns.rising?.length > 0 || patterns.strength > 0);
  const hasForecasts = forecasts && forecasts.length > 0;

  if (!hasPatterns && !hasForecasts) return null;

  const geoLevel = patterns?.geopolitical?.level || 0;
  const geoLabel = patterns?.geopolitical?.label || (isAr ? "—" : "—");
  const geoColor = patterns?.geopolitical?.color || P.muted;
  const mktLabel = patterns?.market?.label || (isAr ? "—" : "—");
  const mktColor = patterns?.market?.color || P.muted;

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      <div style={{
        background: `linear-gradient(135deg, ${P.bg}, ${P.surface})`,
        border: `1px solid ${P.borderGold}`,
        borderRadius: 18,
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${P.purple}, ${P.gold})`,
          opacity: 0.4
        }} />

        {/* Header */}
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 3,
            color: P.purple, textTransform: "uppercase", marginBottom: 2
          }}>
            {isAr ? "أنماط وتنبؤات" : "PATTERNS & FORECASTS"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "ماذا قد يحدث بعد ذلك؟" : "What may happen next?"}
          </div>
        </div>

        {/* Pattern indicators */}
        {hasPatterns && (
          <div style={{ padding: "4px 20px 12px" }}>
            <div style={{
              display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
              marginBottom: 8
            }}>
              {/* Pattern strength */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8, padding: "4px 12px"
              }}>
                <span style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
                  {isAr ? "قوة الأنماط" : "PATTERN STR."}
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: P.gold }}>
                  {patterns.strength}/100
                </span>
              </div>

              {/* Geopolitical level */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8, padding: "4px 12px"
              }}>
                <span style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
                  {isAr ? "جيوسياسي" : "GEO"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: geoColor }}>
                  {geoLabel}
                </span>
              </div>

              {/* Market sensitivity */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8, padding: "4px 12px"
              }}>
                <span style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
                  {isAr ? "الأسواق" : "MARKET"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: mktColor }}>
                  {mktLabel}
                </span>
              </div>
            </div>

            {/* Rising patterns */}
            {patterns.rising?.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: P.muted, fontWeight: 700, padding: "5px 0" }}>
                  {isAr ? "صاعدة:" : "Rising:"}
                </span>
                {patterns.rising.map((p, i) => (
                  <PatternBadge key={i} pattern={p} isAr={isAr} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forecast cards */}
        {hasForecasts && (
          <div style={{
            display: "flex", gap: 10, padding: "4px 20px 18px",
            overflowX: "auto", flexWrap: "wrap"
          }}>
            {forecasts.map((f, i) => (
              <ForecastCard key={f.id || i} f={f} isAr={isAr} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
