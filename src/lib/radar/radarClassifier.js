/**
 * Radar Classifier
 *
 * Classifies each radar signal into:
 *   - severity: منخفض | متوسط | مرتفع | حرج
 *   - trend: صاعد | مستقر | متراجع
 *   - alertBadge: عاجل | تحت المراقبة | إشارة ناشئة | أثر اقتصادي | أثر رياضي | تصعيد حرج
 *   - isEmerging: boolean
 *
 * Also provides region classification helper.
 */

// ── Severity Thresholds ────────────────────────────────────────────
const SEVERITY_THRESHOLDS = {
  critical: 75,  // حرج
  high: 50,      // مرتفع
  medium: 25,    // متوسط
};

/**
 * Classify a radar signal → { severity, alertBadge, isEmerging }
 */
export function classifySignal(signal) {
  const score = signal.radarScore || 0;
  const cat = signal.category || "";
  const urgency = signal.urgency || "low";
  const confidence = signal.confidence || 50;
  const sourceCount = signal.sourceCount || 1;

  // Severity
  let severity;
  if (score >= SEVERITY_THRESHOLDS.critical) severity = "حرج";
  else if (score >= SEVERITY_THRESHOLDS.high) severity = "مرتفع";
  else if (score >= SEVERITY_THRESHOLDS.medium) severity = "متوسط";
  else severity = "منخفض";

  // Is emerging?
  const isEmerging = sourceCount <= 2 && confidence < 50 && score < 50 && score >= 15;

  // Alert badge
  let alertBadge = null;
  if (score >= 80 && (cat === "صراع / تصعيد")) {
    alertBadge = "تصعيد حرج";
  } else if (urgency === "high" && score >= 65) {
    alertBadge = "عاجل";
  } else if (cat === "اقتصاد / أسواق" || cat === "طاقة / نفط / شحن") {
    if (score >= 50) alertBadge = "أثر اقتصادي";
  } else if (cat === "رياضة" || cat === "انتقالات") {
    if (score >= 40) alertBadge = "أثر رياضي";
  } else if (isEmerging) {
    alertBadge = "إشارة ناشئة";
  } else if (score >= 40 && score < 65) {
    alertBadge = "تحت المراقبة";
  }

  return { severity, alertBadge, isEmerging };
}

/**
 * Classify a region → { icon, color, pressureLabel }
 */
export function classifyRegion(region) {
  const MAP = {
    "الشرق الأوسط":       { icon: "🌍", color: "#ef4444" },
    "أوروبا":             { icon: "🇪🇺", color: "#38bdf8" },
    "أمريكا الشمالية":    { icon: "🌎", color: "#818cf8" },
    "آسيا والمحيط الهادئ": { icon: "🌏", color: "#f59e0b" },
    "أفريقيا":            { icon: "🌍", color: "#22c55e" },
    "أمريكا اللاتينية":   { icon: "🌎", color: "#f97316" },
    "الأسواق العالمية":   { icon: "📊", color: "#eab308" },
    "الرياضة":           { icon: "⚽", color: "#22c55e" },
  };
  return MAP[region] || { icon: "🌐", color: "#64748b" };
}

// ── Severity Color Map ─────────────────────────────────────────────
export function severityColor(severity) {
  switch (severity) {
    case "حرج": return "#ef4444";
    case "مرتفع": return "#f59e0b";
    case "متوسط": return "#38bdf8";
    case "منخفض": return "#64748b";
    default: return "#64748b";
  }
}

// ── Trend Icon ─────────────────────────────────────────────────────
export function trendIcon(trend) {
  switch (trend) {
    case "صاعد": return "↑";
    case "متراجع": return "↓";
    default: return "→";
  }
}

export function trendColor(trend) {
  switch (trend) {
    case "صاعد": return "#ef4444";
    case "متراجع": return "#22c55e";
    default: return "#64748b";
  }
}

// ── Alert Badge Config ─────────────────────────────────────────────
export function alertBadgeConfig(badge) {
  const MAP = {
    "عاجل":        { color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: "🔴" },
    "تحت المراقبة": { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: "👁️" },
    "إشارة ناشئة":  { color: "#818cf8", bg: "rgba(129,140,248,0.15)", icon: "🔎" },
    "أثر اقتصادي":  { color: "#eab308", bg: "rgba(234,179,8,0.15)", icon: "💰" },
    "أثر رياضي":    { color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: "⚽" },
    "تصعيد حرج":    { color: "#dc2626", bg: "rgba(220,38,38,0.2)", icon: "⚠️" },
  };
  return MAP[badge] || { color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "📌" };
}

// ── Pressure Color ─────────────────────────────────────────────────
export function pressureColor(pressure) {
  switch (pressure) {
    case "حرج": return "#ef4444";
    case "مرتفع": return "#f59e0b";
    case "متوسط": return "#38bdf8";
    case "منخفض": return "#22c55e";
    default: return "#64748b";
  }
}
