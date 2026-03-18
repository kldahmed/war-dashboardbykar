/**
 * agentInterpretation.js — Generates rich, contextual Arabic-first agent interpretations.
 * The agent doesn't just display numbers — it explains, links, and warns.
 */

// Agent states with Arabic labels
const AGENT_STATES = {
  observing:    { ar: "يراقب", en: "Observing", icon: "👁️", color: "#38bdf8" },
  analyzing:    { ar: "يحلل", en: "Analyzing", icon: "🔬", color: "#a78bfa" },
  linking:      { ar: "يربط", en: "Linking", icon: "🔗", color: "#22c55e" },
  forecasting:  { ar: "يستشرف", en: "Forecasting", icon: "🔮", color: "#f3d38a" },
  escalation:   { ar: "يرصد تصعيدًا", en: "Detecting Escalation", icon: "🔴", color: "#ef4444" },
  weakSignals:  { ar: "يراجع إشارات ضعيفة", en: "Reviewing Weak Signals", icon: "📡", color: "#64748b" },
  confirming:   { ar: "يؤكد نمطًا ناشئًا", en: "Confirming Pattern", icon: "✅", color: "#22c55e" },
};

/**
 * Determine agent state from world data.
 */
export function determineAgentState(tension, economic, patterns, strongestEvent) {
  if (tension.value >= 65) return AGENT_STATES.escalation;
  if (strongestEvent && (strongestEvent.severity || 0) >= 70) return AGENT_STATES.escalation;
  if (patterns?.rising?.length >= 3) return AGENT_STATES.confirming;
  if (economic.value >= 50) return AGENT_STATES.analyzing;
  if (patterns?.rising?.length >= 1) return AGENT_STATES.linking;
  if (tension.value >= 30) return AGENT_STATES.observing;
  return AGENT_STATES.weakSignals;
}

/**
 * Generate rich agent interpretation lines.
 * Each line is a complete Arabic analytical sentence.
 */
export function generateAgentLines(worldState) {
  if (!worldState) return [{
    priority: 3,
    ar: "الوكيل الذكي نشط — يجري مسح المصادر وجمع الإشارات الأولية لبناء صورة الوضع العالمي.",
    en: "AI agent active — scanning sources and collecting initial signals to build global situation picture.",
    icon: "📡",
    type: "stable",
  }];
  const { tension, economic, sports, activeRegion, dominantPattern, strongestEvent, patterns, forecasts, regionalPressures } = worldState;
  const lines = [];

  // 1. Core tension analysis
  if (tension.value >= 60) {
    lines.push({
      priority: 1,
      ar: `يرصد الوكيل تصاعدًا في التوتر العالمي إلى ${tension.value}% — مستوى ${tension.label}. تتراكم الإشارات من عدة مناطق.`,
      en: `Agent detects global tension rising to ${tension.value}% — ${tension.labelEn} level. Signals accumulating from multiple regions.`,
      icon: "🔴",
      type: "critical",
    });
  } else if (tension.value >= 35) {
    lines.push({
      priority: 2,
      ar: `التوتر العالمي عند ${tension.value}% (${tension.label}). لا يوجد تصعيد حاد لكن المراقبة مستمرة.`,
      en: `Global tension at ${tension.value}% (${tension.labelEn}). No sharp escalation but monitoring continues.`,
      icon: "🟡",
      type: "warning",
    });
  } else {
    lines.push({
      priority: 3,
      ar: `الوضع العالمي مستقر نسبيًا بمؤشر توتر ${tension.value}%. لا تُرصد إشارات تصعيد كبيرة.`,
      en: `Global situation relatively stable at ${tension.value}% tension. No major escalation signals detected.`,
      icon: "🟢",
      type: "stable",
    });
  }

  // 2. Economic linkage
  if (economic.value >= 40) {
    lines.push({
      priority: 2,
      ar: `ترتبط حساسية الأسواق بإشارات الطاقة والعقوبات — الضغط الاقتصادي عند ${economic.value}% (${economic.label}).`,
      en: `Market sensitivity linked to energy and sanctions signals — economic pressure at ${economic.value}% (${economic.labelEn}).`,
      icon: "📊",
      type: "economic",
    });
  }

  // 3. Regional pressure analysis
  if (activeRegion && activeRegion.region !== "—") {
    const rp = (regionalPressures || []).find(r => r.region === activeRegion.region);
    const pressure = rp?.pressure || 0;
    lines.push({
      priority: 2,
      ar: `المنطقة الأكثر نشاطًا: ${activeRegion.region} بضغط ${pressure}% و${rp?.eventCount || 0} أحداث مرصودة.`,
      en: `Most active region: ${activeRegion.region} at ${pressure}% pressure with ${rp?.eventCount || 0} tracked events.`,
      icon: "📍",
      type: "regional",
    });
  }

  // 4. Pattern detection
  if (dominantPattern && dominantPattern.signal !== "—") {
    lines.push({
      priority: 2,
      ar: `يظهر نمط متكرر: ${dominantPattern.label} — يتكرر ${dominantPattern.count} مرات عبر مصادر متعددة.`,
      en: `Recurring pattern detected: ${dominantPattern.labelEn} — appearing ${dominantPattern.count} times across sources.`,
      icon: "📈",
      type: "pattern",
    });
  }

  // 5. Strongest event impact
  if (strongestEvent) {
    lines.push({
      priority: 1,
      ar: `أقوى حدث مرصود: "${strongestEvent.title}" — يؤثر على الاستقرار الإقليمي وقد يولّد تداعيات.`,
      en: `Strongest event: "${strongestEvent.title}" — affecting regional stability with potential cascading effects.`,
      icon: "⚡",
      type: "event",
    });
  }

  // 6. Cross-domain linkage (tension + economic)
  if (tension.value >= 40 && economic.value >= 35) {
    lines.push({
      priority: 2,
      ar: "يرصد الوكيل ارتباطًا بين التوتر الجيوسياسي والضغط الاقتصادي — نمط يشير إلى حساسية سوقية متزايدة.",
      en: "Agent detects correlation between geopolitical tension and economic pressure — a pattern indicating rising market sensitivity.",
      icon: "🔗",
      type: "linkage",
    });
  }

  // 7. Sports context (when relevant)
  if (sports.value >= 30) {
    lines.push({
      priority: 3,
      ar: `النشاط الرياضي عند ${sports.value}% (${sports.label}). الطبقة الرياضية نشطة دون تأثير استراتيجي مباشر.`,
      en: `Sports activity at ${sports.value}% (${sports.labelEn}). Sports layer active without direct strategic impact.`,
      icon: "⚽",
      type: "sports",
    });
  }

  // 8. Forecast highlight
  if (forecasts && forecasts.length > 0) {
    const top = forecasts[0];
    const evStr = top.evidenceStrength === "strong" ? "قوية" : top.evidenceStrength === "moderate" ? "متوسطة" : "ضعيفة";
    lines.push({
      priority: 3,
      ar: `أعلى تنبؤ: ${top.title} — احتمال ${top.probability}% بأدلة ${evStr}.`,
      en: `Top forecast: ${top.title} — ${top.probability}% probability with ${top.evidenceStrength} evidence.`,
      icon: "🔮",
      type: "forecast",
    });
  }

  // 9. Ensure lines never empty — always communicate meaningful state
  if (lines.length < 2) {
    lines.push({
      priority: 4,
      ar: "الوكيل يواصل الرصد المستمر — كل مصدر يُحلل ويُقيّم في الوقت الحقيقي.",
      en: "Agent continues continuous monitoring — every source is analyzed and assessed in real-time.",
      icon: "📡",
      type: "monitoring",
    });
  }

  return lines.sort((a, b) => a.priority - b.priority);
}

export { AGENT_STATES };
