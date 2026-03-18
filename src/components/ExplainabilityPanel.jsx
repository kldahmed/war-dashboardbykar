import React, { useEffect, useState } from "react";
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

function generateExplanations(ws, isAr) {
  if (!ws) return [];
  const explanations = [];

  // Explain tension
  if (ws.tension.value >= 40) {
    const eventCount = ws.topEvents?.length || 0;
    const highSev = (ws.topEvents || []).filter(e => (e.severity || 0) >= 60).length;
    explanations.push({
      category: isAr ? "التوتر العالمي" : "Global Tension",
      icon: "🔥",
      color: ws.tension.color,
      what: isAr
        ? `مستوى التوتر العالمي الآن عند ${ws.tension.value}% (${ws.tension.label})`
        : `Global tension is at ${ws.tension.value}% (${ws.tension.labelEn})`,
      why: isAr
        ? `بسبب ${eventCount} حدث مرصود، منها ${highSev} بشدة عالية`
        : `Due to ${eventCount} tracked events, ${highSev} at high severity`,
      next: isAr
        ? ws.tension.value >= 60
          ? "احتمال تصعيد إضافي في المنطقة الأكثر نشاطاً"
          : "الوضع يتطلب مراقبة مستمرة"
        : ws.tension.value >= 60
          ? "Further escalation possible in the most active region"
          : "Continuous monitoring recommended"
    });
  }

  // Explain economic pressure
  if (ws.economic.value >= 30) {
    explanations.push({
      category: isAr ? "الضغط الاقتصادي" : "Economic Pressure",
      icon: "📊",
      color: ws.economic.color,
      what: isAr
        ? `مؤشر الضغط الاقتصادي: ${ws.economic.value}% (${ws.economic.label})`
        : `Economic pressure index: ${ws.economic.value}% (${ws.economic.labelEn})`,
      why: isAr
        ? "إشارات عقوبات وضغوط طاقوية وتحركات اقتصادية مرصودة"
        : "Sanctions signals, energy pressures, and economic movements detected",
      next: isAr
        ? ws.economic.value >= 50
          ? "قد تتأثر أسواق المنطقة في الفترة القادمة"
          : "الأسواق مستقرة نسبياً مع حذر"
        : ws.economic.value >= 50
          ? "Regional markets may be affected in the near term"
          : "Markets relatively stable with caution"
    });
  }

  // Explain dominant pattern
  if (ws.dominantPattern && ws.dominantPattern.signal !== "—") {
    explanations.push({
      category: isAr ? "النمط السائد" : "Dominant Pattern",
      icon: "📈",
      color: P.purple,
      what: isAr
        ? `النمط الأبرز: ${ws.dominantPattern.label} (تكرار: ${ws.dominantPattern.count})`
        : `Dominant pattern: ${ws.dominantPattern.labelEn} (count: ${ws.dominantPattern.count})`,
      why: isAr
        ? "هذا النمط يظهر بشكل متكرر عبر مصادر ومناطق متعددة"
        : "This pattern appears repeatedly across multiple sources and regions",
      next: isAr
        ? "استمرار هذا النمط قد يشير إلى تحول هيكلي"
        : "Continued pattern may indicate structural shift"
    });
  }

  // Explain strongest event
  if (ws.strongestEvent) {
    explanations.push({
      category: isAr ? "أقوى حدث" : "Strongest Event",
      icon: "⚡",
      color: P.red,
      what: ws.strongestEvent.title,
      why: isAr
        ? `شدة: ${ws.strongestEvent.severity || "—"} · ثقة: ${ws.strongestEvent.confidence || "—"}% · منطقة: ${ws.strongestEvent.region || "—"}`
        : `Severity: ${ws.strongestEvent.severity || "—"} · Confidence: ${ws.strongestEvent.confidence || "—"}% · Region: ${ws.strongestEvent.region || "—"}`,
      next: isAr
        ? "يؤثر على الاستقرار الإقليمي وقد يولّد أحداثاً متتابعة"
        : "Affects regional stability and may trigger cascading events"
    });
  }

  // Explain most active region
  if (ws.activeRegion && ws.activeRegion.region !== "—") {
    const regionPressure = (ws.regionalPressures || []).find(r => r.region === ws.activeRegion.region);
    explanations.push({
      category: isAr ? "المنطقة الأنشط" : "Most Active Region",
      icon: "📍",
      color: P.amber,
      what: isAr
        ? `${ws.activeRegion.region} — ضغط: ${regionPressure?.pressure || 0}%`
        : `${ws.activeRegion.region} — Pressure: ${regionPressure?.pressure || 0}%`,
      why: isAr
        ? `${regionPressure?.eventCount || 0} حدث في هذه المنطقة مع تصاعد في الإشارات`
        : `${regionPressure?.eventCount || 0} events in this region with rising signals`,
      next: isAr
        ? "المراقبة المكثفة مطلوبة لهذه المنطقة"
        : "Intensive monitoring recommended for this region"
    });
  }

  return explanations;
}

function ExplanationCard({ item }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${P.surface}, ${P.surfaceAlt})`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: item.color, opacity: 0.4
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{item.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: item.color, letterSpacing: 1 }}>
          {item.category}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: P.text, lineHeight: 1.5 }}>
        {item.what}
      </div>

      <div style={{
        fontSize: 12, color: P.textDim, lineHeight: 1.5,
        paddingLeft: 6, borderLeft: `2px solid ${P.muted}`
      }}>
        <strong style={{ color: P.blue }}>↳ </strong>{item.why}
      </div>

      <div style={{
        fontSize: 12, color: P.amber, fontWeight: 600, lineHeight: 1.5,
        background: "rgba(245,158,11,0.05)",
        borderRadius: 8, padding: "6px 10px"
      }}>
        🔮 {item.next}
      </div>
    </div>
  );
}

export default function ExplainabilityPanel() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  const explanations = generateExplanations(ws, isAr);
  if (!explanations.length) return null;

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, padding: "0 4px"
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 3,
            color: P.blue, textTransform: "uppercase", marginBottom: 2
          }}>
            {isAr ? "لماذا هذا مهم؟" : "WHY IT MATTERS"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "تفسير الوضع العالمي" : "World State Explained"}
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12
      }}>
        {explanations.map((item, i) => (
          <ExplanationCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
