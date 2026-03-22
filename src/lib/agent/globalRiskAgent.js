/**
 * Global Risk Agent — continuously computes a global tension level.
 *
 * Based on:
 *  - Number of high-impact events
 *  - Military signals
 *  - Geopolitical actors involved
 *  - Regional escalation signals
 *
 * Outputs a global risk level: LOW / MODERATE / HIGH / CRITICAL
 */

import { agentMemory } from "./memoryAgent";

// ── Risk signal definitions ──────────────────────────────────────────────────
const MILITARY_SIGNALS = [
  "war","invasion","airstrike","missile","troops","military","bomb","nuclear","attack",
  "حرب","غزو","غارة","صاروخ","قوات","عسكري","قنبلة","نووي","هجوم",
];

const CRITICAL_ACTORS = [
  "NATO","UN Security Council","P5","nuclear","الناتو","مجلس الأمن","نووي",
  "Trump","Putin","Xi","Netanyahu","Khamenei",
  "ترامب","بوتين","تشي","نتنياهو","خامنئي",
];

const REGIONAL_HOTZONE_KEYS = [
  "Middle East","Gaza","Ukraine","Taiwan","Korean","Iran","Syria","Yemen",
  "الشرق الأوسط","غزة","أوكرانيا","تايوان","كوريا","إيران","سوريا","اليمن",
];

// Impact score per item
function computeItemImpact(item) {
  const text = `${item.title || ""} ${item.text || ""}`.toLowerCase();
  let score = 0;

  // Military signal
  if (MILITARY_SIGNALS.some(k => text.includes(k.toLowerCase()))) score += 15;

  // Critical actor
  if (CRITICAL_ACTORS.some(k => text.toLowerCase().includes(k.toLowerCase()))) score += 10;

  // Hotzone
  if (REGIONAL_HOTZONE_KEYS.some(k => text.toLowerCase().includes(k.toLowerCase()))) score += 8;

  // Category
  if (item.category === "conflict") score += 12;
  if (item.category === "energy")   score += 6;
  if (item.category === "politics") score += 4;

  // Urgency
  if (item.urgency === "high")   score += 10;
  if (item.urgency === "medium") score += 5;

  return score;
}

// ── Risk level from raw score ────────────────────────────────────────────────
function scoreToRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MODERATE";
  return "LOW";
}

const RISK_METADATA = {
  LOW:      { ar: "منخفض",       color: "#22c55e", icon: "🟢", description: "الوضع العالمي مستقر. لا إشارات تصعيد كبرى." },
  MODERATE: { ar: "متوسط",       color: "#f59e0b", icon: "🟡", description: "مؤشرات توتر معتدلة. حالات تستوجب المتابعة." },
  HIGH:     { ar: "مرتفع",       color: "#f97316", icon: "🟠", description: "توترات جيوسياسية مرتفعة. أحداث بالغة الأثر." },
  CRITICAL: { ar: "حرج",         color: "#ef4444", icon: "🔴", description: "خطر حرج. إشارات عسكرية ونزاعات متصاعدة." },
};

// ── Regional tension breakdown ───────────────────────────────────────────────
function computeRegionalTension(items) {
  const regionScores = {};
  items.forEach(item => {
    const imp = computeItemImpact(item);
    (item.region || ["Global"]).forEach(r => {
      regionScores[r] = (regionScores[r] || 0) + imp;
    });
  });
  return Object.entries(regionScores)
    .map(([region, score]) => ({
      region,
      score,
      level: scoreToRiskLevel(score),
      color: RISK_METADATA[scoreToRiskLevel(score)].color,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Compute the current global risk level.
 * @returns {Object} globalRisk assessment
 */
export function assessGlobalRisk() {
  const all = agentMemory.getItems();
  const recent = all.filter(i => {
    try { return (Date.now() - new Date(i.timestamp).getTime()) < 24 * 3600 * 1000; }
    catch { return false; }
  });

  if (recent.length === 0) {
    return {
      level: "LOW",
      score: 0,
      ...RISK_METADATA.LOW,
      regionalBreakdown: [],
      highImpactCount: 0,
      militarySignalCount: 0,
      criticalActorCount: 0,
      hotzoneCount: 0,
      analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
    };
  }

  // Per-item impact scores
  const impacts = recent.map(i => computeItemImpact(i));
  const totalImpact = impacts.reduce((a, b) => a + b, 0);
  const avgImpact = totalImpact / recent.length;
  const maxImpact = Math.max(...impacts);

  // Count specific signal types
  const militaryCount = recent.filter(i => {
    const t = `${i.title || ""} ${i.text || ""}`.toLowerCase();
    return MILITARY_SIGNALS.some(k => t.includes(k.toLowerCase()));
  }).length;

  const criticalActorCount = recent.filter(i => {
    const t = `${i.title || ""} ${i.text || ""} ${(i.entities || []).join(" ")}`;
    return CRITICAL_ACTORS.some(k => t.toLowerCase().includes(k.toLowerCase()));
  }).length;

  const hotzoneCount = recent.filter(i =>
    (i.region || []).some(r => REGIONAL_HOTZONE_KEYS.some(k => r.toLowerCase().includes(k.toLowerCase())))
  ).length;

  const highImpactCount = impacts.filter(s => s >= 20).length;

  // Global raw score (normalized 0-100)
  const rawScore = Math.min(100, Math.round(
    avgImpact * 1.5 +
    (militaryCount / Math.max(1, recent.length)) * 40 +
    (criticalActorCount / Math.max(1, recent.length)) * 20 +
    (hotzoneCount / Math.max(1, recent.length)) * 15 +
    (highImpactCount / Math.max(1, recent.length)) * 10
  ));

  const level = scoreToRiskLevel(rawScore);
  const meta = RISK_METADATA[level];
  const regionalBreakdown = computeRegionalTension(recent);

  // Trend: compare last 12h vs previous 12h
  const now = Date.now();
  const last12 = all.filter(i => {
    try { return (now - new Date(i.timestamp).getTime()) < 12 * 3600 * 1000; }
    catch { return false; }
  });
  const prev12 = all.filter(i => {
    try {
      const age = now - new Date(i.timestamp).getTime();
      return age >= 12 * 3600 * 1000 && age < 24 * 3600 * 1000;
    }
    catch { return false; }
  });

  const lastScore = last12.length > 0 ? last12.reduce((s, i) => s + computeItemImpact(i), 0) / last12.length : 0;
  const prevScore = prev12.length > 0 ? prev12.reduce((s, i) => s + computeItemImpact(i), 0) / prev12.length : 0;
  const trend = lastScore > prevScore * 1.2 ? "rising" : lastScore < prevScore * 0.8 ? "falling" : "stable";

  return {
    level,
    score: rawScore,
    ...meta,
    trend,
    trendLabel: trend === "rising" ? "مخاطر متصاعدة" : trend === "falling" ? "مخاطر تتراجع" : "مخاطر ثابتة",
    trendColor: trend === "rising" ? "#ef4444" : trend === "falling" ? "#22c55e" : "#94a3b8",
    regionalBreakdown,
    highImpactCount,
    militarySignalCount: militaryCount,
    criticalActorCount,
    hotzoneCount,
    totalRecentEvents: recent.length,
    analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
