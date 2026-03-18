import React, { useEffect, useState, useRef } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { useI18n } from "../i18n/I18nProvider";

const P = {
  bg: "#070b11",
  surface: "#0c1220",
  surfaceAlt: "#0e1630",
  border: "rgba(56,189,248,0.08)",
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

const SIGNAL_LABELS = {
  conflict_escalation: { ar: "تصعيد نزاع", en: "Conflict escalation", icon: "⚔️", color: "#ef4444" },
  economic_pressure: { ar: "ضغط اقتصادي", en: "Economic pressure", icon: "📉", color: "#f59e0b" },
  sports_activity: { ar: "نشاط رياضي", en: "Sports activity", icon: "⚽", color: "#38bdf8" },
  transfer_market: { ar: "سوق انتقالات", en: "Transfer market", icon: "🔁", color: "#a78bfa" },
  sanctions_pressure: { ar: "عقوبات", en: "Sanctions pressure", icon: "🚫", color: "#ef4444" },
  peace_signal: { ar: "إشارة سلام", en: "Peace signal", icon: "🕊️", color: "#22c55e" },
  political_transition: { ar: "تحول سياسي", en: "Political shift", icon: "🏛️", color: "#f59e0b" },
  energy_signal: { ar: "طاقة", en: "Energy signal", icon: "⚡", color: "#fbbf24" }
};

function generateLiveNarrative(ws, isAr) {
  if (!ws) return [];
  const lines = [];

  // Tension narrative
  if (ws.tension.value >= 60) {
    lines.push({
      icon: "🔴",
      text: isAr
        ? `التوتر العالمي مرتفع عند ${ws.tension.value}%. هذا يعني أن هناك أحداثاً بارزة تؤثر على استقرار المنطقة.`
        : `Global tension is elevated at ${ws.tension.value}%. Significant events are affecting regional stability.`,
      severity: "high"
    });
  } else if (ws.tension.value >= 35) {
    lines.push({
      icon: "🟡",
      text: isAr
        ? `التوتر العالمي في مستوى متوسط (${ws.tension.value}%). لا يوجد تصعيد حاد لكن يجب المراقبة.`
        : `Global tension moderate (${ws.tension.value}%). No escalation but monitoring needed.`,
      severity: "moderate"
    });
  } else {
    lines.push({
      icon: "🟢",
      text: isAr
        ? `الوضع العالمي مستقر نسبياً بمؤشر توتر ${ws.tension.value}%.`
        : `Global situation relatively stable with tension at ${ws.tension.value}%.`,
      severity: "low"
    });
  }

  // Economic narrative
  if (ws.economic.value >= 40) {
    lines.push({
      icon: "📊",
      text: isAr
        ? `الضغط الاقتصادي في ارتفاع (${ws.economic.value}%). ${ws.economic.label}.`
        : `Economic pressure rising (${ws.economic.value}%). ${ws.economic.labelEn}.`,
      severity: ws.economic.value >= 60 ? "high" : "moderate"
    });
  }

  // Most active region
  if (ws.activeRegion && ws.activeRegion.region !== "—") {
    lines.push({
      icon: "📍",
      text: isAr
        ? `المنطقة الأكثر نشاطاً الآن: ${ws.activeRegion.region} — ${ws.activeRegion.count || ws.activeRegion.pressure || 0} إشارة.`
        : `Most active region: ${ws.activeRegion.region} — ${ws.activeRegion.count || ws.activeRegion.pressure || 0} signals.`,
      severity: "info"
    });
  }

  // Dominant pattern
  if (ws.dominantPattern && ws.dominantPattern.signal !== "—") {
    const sig = SIGNAL_LABELS[ws.dominantPattern.signal];
    lines.push({
      icon: sig?.icon || "📈",
      text: isAr
        ? `النمط الأبرز: ${sig?.ar || ws.dominantPattern.label} — يتكرر بصورة ملحوظة في البيانات.`
        : `Dominant pattern: ${sig?.en || ws.dominantPattern.labelEn} — recurring across data.`,
      severity: "info"
    });
  }

  // Strongest event
  if (ws.strongestEvent) {
    lines.push({
      icon: "⚡",
      text: isAr
        ? `أقوى حدث مرصود: "${ws.strongestEvent.title}" — شدة ${ws.strongestEvent.severity || "عالية"}.`
        : `Strongest tracked event: "${ws.strongestEvent.title}" — severity ${ws.strongestEvent.severity || "high"}.`,
      severity: "high"
    });
  }

  // Forecast highlights
  if (ws.forecasts && ws.forecasts.length > 0) {
    const topF = ws.forecasts[0];
    lines.push({
      icon: "🔮",
      text: isAr
        ? `أعلى تنبؤ: ${topF.title} — احتمال ${topF.probability}% بقوة أدلة ${topF.evidenceStrength === "strong" ? "قوية" : topF.evidenceStrength === "moderate" ? "متوسطة" : "ضعيفة"}.`
        : `Top forecast: ${topF.title} — ${topF.probability}% probability, evidence: ${topF.evidenceStrength}.`,
      severity: "info"
    });
  }

  return lines;
}

export default function AIWorldInterpreter() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  const narrative = generateLiveNarrative(ws, isAr);

  // Auto-cycle through narrative lines
  useEffect(() => {
    if (narrative.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx(i => (i + 1) % narrative.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [narrative.length]);

  if (!ws) return null;

  const agentState = ws.agentMaturity;
  const sevColors = { high: P.red, moderate: P.amber, low: P.green, info: P.blue };

  return (
    <section style={{
      maxWidth: 1400,
      margin: "0 auto",
      padding: "0 16px"
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${P.bg}, ${P.surface})`,
        border: `1px solid ${P.border}`,
        borderRadius: 18,
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${P.blue}, ${P.purple})`,
          opacity: 0.4
        }} />

        {/* Agent Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px 8px",
          flexWrap: "wrap", gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${P.blue}, ${P.purple})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 0 12px rgba(56,189,248,0.3)`
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: P.text }}>
                {isAr ? "المفسّر الذكي" : "AI World Interpreter"} 
              </div>
              <div style={{ fontSize: 11, color: P.textDim, fontWeight: 600 }}>
                {isAr ? "يقرأ العالم لك الآن" : "Reading the world for you now"}
              </div>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(56,189,248,0.06)",
            borderRadius: 8, padding: "4px 12px"
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: agentState?.color || P.green,
              boxShadow: `0 0 6px ${agentState?.color || P.green}`
            }} />
            <span style={{ fontSize: 11, color: P.textDim, fontWeight: 700 }}>
              {isAr ? (agentState?.label || "نشط") : (agentState?.labelEn || "Active")}
            </span>
            <span style={{ fontSize: 11, color: P.muted }}>
              {agentState?.score || 0}/100
            </span>
          </div>
        </div>

        {/* Live Narrative Feed */}
        <div ref={scrollRef} style={{
          padding: "6px 20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}>
          {narrative.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 12px",
                background: i === activeIdx ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.01)",
                borderRadius: 10,
                borderLeft: `3px solid ${i === activeIdx ? (sevColors[line.severity] || P.blue) : "transparent"}`,
                transition: "all 0.4s ease",
                opacity: i === activeIdx ? 1 : 0.6
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{line.icon}</span>
              <span style={{
                fontSize: 13, color: P.text, fontWeight: i === activeIdx ? 600 : 400,
                lineHeight: 1.6
              }}>
                {line.text}
              </span>
            </div>
          ))}
        </div>

        {/* Cycle Indicator */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 4,
          padding: "0 20px 12px"
        }}>
          {narrative.map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveIdx(i)}
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === activeIdx ? P.blue : "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
