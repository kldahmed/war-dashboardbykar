/**
 * pressureScoring.js — Believable, weighted scoring engine.
 * All scores are derived from real data with dampening to avoid fake extremes.
 */

// Sigmoid-like dampener: prevents scores from clustering at 100
function dampen(raw, ceiling = 85) {
  if (raw <= 0) return 0;
  const k = ceiling / 50;
  return Math.round(ceiling * (1 - Math.exp(-raw / (ceiling / k))));
}

// Weighted clamp with floor
function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Compute tension index from events.
 * Formula: weighted average severity + high-severity bonus + volume factor
 * Dampened to never hit 100 unless truly catastrophic.
 */
export function computeTension(events) {
  if (!events || !events.length) return { value: 5, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 0 };

  const severities = events.map(e => e.severity || 0);
  const avgSev = severities.reduce((a, b) => a + b, 0) / severities.length;
  const highCount = severities.filter(s => s >= 60).length;
  const critCount = severities.filter(s => s >= 80).length;

  // Raw: average severity contributes 40%, high-severity events 35%, volume 25%
  const raw = avgSev * 0.4 + highCount * 3.5 + critCount * 6 + Math.min(events.length, 30) * 0.6;
  const value = clamp(dampen(raw, 88));

  if (value >= 72) return { value, label: "حرج", labelEn: "Critical", color: "#ef4444", level: 4 };
  if (value >= 52) return { value, label: "مرتفع", labelEn: "High", color: "#f59e0b", level: 3 };
  if (value >= 32) return { value, label: "متوسط", labelEn: "Moderate", color: "#38bdf8", level: 2 };
  if (value >= 14) return { value, label: "منخفض", labelEn: "Low", color: "#22c55e", level: 1 };
  return { value, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 0 };
}

/**
 * Compute economic pressure from intelligence store items.
 */
export function computeEconomicPressure(items) {
  if (!items || !items.length) return { value: 3, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 0 };

  const econItems = items.filter(i =>
    (i.derivedSignals || []).some(s => ["economic_pressure", "sanctions_pressure", "energy_signal"].includes(s))
  );
  if (!econItems.length) return { value: 3, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 0 };

  const impactSum = econItems.reduce((s, i) => s + (i.economicImpact || 0), 0);
  const avgImpact = impactSum / econItems.length;

  // Raw: average impact * weight + item count * scale
  const raw = avgImpact * 5 + econItems.length * 2.5;
  const value = clamp(dampen(raw, 82));

  if (value >= 65) return { value, label: "ضغط شديد", labelEn: "Severe Pressure", color: "#ef4444", level: 4 };
  if (value >= 42) return { value, label: "ضغط مرتفع", labelEn: "High Pressure", color: "#f59e0b", level: 3 };
  if (value >= 20) return { value, label: "ضغط معتدل", labelEn: "Moderate", color: "#38bdf8", level: 2 };
  return { value, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 0 };
}

/**
 * Compute sports activity index.
 */
export function computeSportsActivity(items) {
  if (!items || !items.length) return { value: 2, label: "هادئ", labelEn: "Quiet", color: "#64748b", level: 0 };

  const sportsItems = items.filter(i =>
    (i.derivedSignals || []).some(s => ["sports_activity", "transfer_market"].includes(s)) ||
    i.category === "sports"
  );
  if (!sportsItems.length) return { value: 2, label: "هادئ", labelEn: "Quiet", color: "#64748b", level: 0 };

  const impactSum = sportsItems.reduce((s, i) => s + (i.sportsImpact || 0), 0);
  const avgImpact = impactSum / sportsItems.length;
  const raw = avgImpact * 4 + sportsItems.length * 2;
  const value = clamp(dampen(raw, 80));

  if (value >= 60) return { value, label: "نشاط مكثف", labelEn: "Intense Activity", color: "#f59e0b", level: 3 };
  if (value >= 35) return { value, label: "نشاط مرتفع", labelEn: "High Activity", color: "#38bdf8", level: 2 };
  if (value >= 15) return { value, label: "نشاط عادي", labelEn: "Normal", color: "#22c55e", level: 1 };
  return { value, label: "هادئ", labelEn: "Quiet", color: "#64748b", level: 0 };
}

/**
 * Compute intelligence level from metrics.
 */
export function computeIntelligenceLevel(metrics) {
  if (!metrics) return { value: 3, label: "—", labelEn: "—", color: "#64748b" };
  const raw = (metrics.score || 0);
  const value = clamp(dampen(raw, 90));
  return {
    value,
    label: metrics.confidenceLabel || "—",
    labelEn: metrics.evidenceStrength || "—",
    color: metrics.confidenceColor || "#38bdf8"
  };
}

/**
 * Compute event intensity from global events.
 */
export function computeEventIntensity(events) {
  if (!events || !events.length) return { value: 3, label: "هادئ", labelEn: "Quiet", color: "#64748b" };

  const raw = Math.min(events.length * 1.8, 80) +
    (events.filter(e => (e.severity || 0) >= 50).length * 3);
  const value = clamp(dampen(raw, 85));

  if (value >= 60) return { value, label: "مكثف", labelEn: "Intense", color: "#ef4444" };
  if (value >= 35) return { value, label: "نشط", labelEn: "Active", color: "#f59e0b" };
  if (value >= 15) return { value, label: "عادي", labelEn: "Normal", color: "#38bdf8" };
  return { value, label: "هادئ", labelEn: "Quiet", color: "#64748b" };
}
