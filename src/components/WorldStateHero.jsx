import React, { useEffect, useState, useMemo } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { useI18n } from "../i18n/I18nProvider";

const P = {
  bg: "#070b11",
  surface: "#0c1220",
  surfaceAlt: "#0e1630",
  border: "rgba(56,189,248,0.08)",
  borderGold: "rgba(243,211,138,0.15)",
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

function IndexCard({ label, value, sublabel, color, icon, pulse }) {
  return (
    <div style={{
      flex: "1 1 140px",
      minWidth: 140,
      maxWidth: 200,
      background: `linear-gradient(135deg, ${P.surface}, ${P.surfaceAlt})`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "16px 14px 13px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Glow top edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.6
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: P.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          fontSize: 28, fontWeight: 900, color,
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1
        }}>
          {value}
        </span>
        {pulse && (
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
            display: "inline-block",
            animation: "pulse-dot 2s ease-in-out infinite"
          }} />
        )}
      </div>
      <span style={{ fontSize: 12, color: P.textDim, fontWeight: 600, lineHeight: 1.3 }}>{sublabel}</span>
    </div>
  );
}

function InsightRow({ icon, text, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      borderLeft: `3px solid ${color || P.blue}`
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: P.text, fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

export default function WorldStateHero() {
  const { t, language } = useI18n();
  const isAr = language === "ar";
  const [worldState, setWorldState] = useState(null);

  useEffect(() => {
    setWorldState(getWorldState());
    const unsub = subscribeWorldState(s => setWorldState(s));
    return unsub;
  }, []);

  if (!worldState) {
    return (
      <div style={{
        textAlign: "center", color: P.blue, padding: "40px 20px",
        fontSize: 14, fontWeight: 600
      }}>
        {isAr ? "جارٍ تحميل حالة العالم..." : "Loading world state..."}
      </div>
    );
  }

  const { tension, economic, sports, activeRegion, dominantPattern, strongestEvent, interpretation, intelligence, totalEvents, totalIntelItems } = worldState;
  const interp = isAr ? interpretation.ar : interpretation.en;
  const timeStr = new Date(worldState.timestamp).toLocaleTimeString(isAr ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });

  return (
    <section style={{
      maxWidth: 1400,
      margin: "0 auto",
      padding: "0 16px 8px"
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${P.bg}, ${P.surface})`,
        border: `1px solid ${P.borderGold}`,
        borderRadius: 20,
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Accent top glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${P.gold}, ${P.blue}, ${P.purple}, ${P.gold})`,
          opacity: 0.5
        }} />

        {/* Header bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px 10px",
          flexWrap: "wrap", gap: 10
        }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: 3,
              color: P.gold, textTransform: "uppercase",
              marginBottom: 2
            }}>
              {isAr ? "حالة العالم" : "WORLD STATE"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: P.text, lineHeight: 1.2 }}>
              {isAr ? "مركز الوعي العالمي" : "Global Awareness Center"}
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 10, padding: "6px 14px"
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: P.green,
              boxShadow: `0 0 8px ${P.green}`,
              animation: "pulse-dot 2s ease-in-out infinite"
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: P.green }}>
              {isAr ? "مباشر" : "LIVE"}
            </span>
            <span style={{ fontSize: 11, color: P.textDim, fontWeight: 600 }}>{timeStr}</span>
          </div>
        </div>

        {/* Index Cards Row */}
        <div style={{
          display: "flex", gap: 10, padding: "6px 20px 12px",
          overflowX: "auto", flexWrap: "wrap"
        }}>
          <IndexCard
            label={isAr ? "التوتر" : "TENSION"}
            value={tension.value}
            sublabel={isAr ? tension.label : tension.labelEn}
            color={tension.color}
            icon="🔥"
            pulse={tension.value >= 55}
          />
          <IndexCard
            label={isAr ? "الاقتصاد" : "ECONOMY"}
            value={economic.value}
            sublabel={isAr ? economic.label : economic.labelEn}
            color={economic.color}
            icon="📊"
            pulse={economic.value >= 45}
          />
          <IndexCard
            label={isAr ? "الرياضة" : "SPORTS"}
            value={sports.value}
            sublabel={isAr ? sports.label : sports.labelEn}
            color={sports.color}
            icon="⚽"
          />
          <IndexCard
            label={isAr ? "الأحداث" : "EVENTS"}
            value={totalEvents}
            sublabel={isAr ? "حدث مرصود" : "Tracked events"}
            color={P.blue}
            icon="🌍"
          />
          <IndexCard
            label={isAr ? "الاستخبارات" : "INTEL"}
            value={intelligence?.score || 0}
            sublabel={isAr ? (intelligence?.confidenceLabel || "—") : (intelligence?.evidenceStrength || "—")}
            color={intelligence?.confidenceColor || P.blue}
            icon="🧠"
          />
        </div>

        {/* Key Insights Strip */}
        <div style={{
          display: "flex", gap: 8, padding: "4px 20px 16px",
          flexWrap: "wrap"
        }}>
          {activeRegion && activeRegion.region !== "—" && (
            <InsightRow
              icon="📍"
              text={isAr ? `المنطقة الأكثر نشاطاً: ${activeRegion.region}` : `Most active: ${activeRegion.region}`}
              color={P.amber}
            />
          )}
          {dominantPattern && dominantPattern.signal !== "—" && (
            <InsightRow
              icon="📈"
              text={isAr ? `النمط السائد: ${dominantPattern.label}` : `Pattern: ${dominantPattern.labelEn}`}
              color={P.purple}
            />
          )}
          {strongestEvent && (
            <InsightRow
              icon="⚡"
              text={isAr ? `أقوى حدث: ${strongestEvent.title}` : `Top event: ${strongestEvent.title}`}
              color={P.red}
            />
          )}
        </div>

        {/* AI Interpretation Bar */}
        <div style={{
          margin: "0 20px 16px",
          background: "rgba(56,189,248,0.04)",
          border: `1px solid ${P.border}`,
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex", alignItems: "flex-start", gap: 10
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: P.blue, letterSpacing: 2, marginBottom: 3, textTransform: "uppercase" }}>
              {isAr ? "تفسير الذكاء الاصطناعي" : "AI INTERPRETATION"}
            </div>
            <div style={{ fontSize: 13, color: P.text, fontWeight: 500, lineHeight: 1.6 }}>
              {interp}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </section>
  );
}
