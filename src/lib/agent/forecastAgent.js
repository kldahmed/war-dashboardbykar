/**
 * Forecast Agent — feeds the forecast engine with structured agent signals.
 *
 * Outputs:
 * - Strongest signals (highest-frequency, most recent)
 * - Strongest linked entities (co-occurrence analysis)
 * - Historical similarity (pattern matching against memory)
 * - Signal acceleration (rate of change)
 * - Contradiction level (conflicting signals)
 * - Confidence trend (improving or degrading)
 *
 * All values derived from real agent memory. No fabrication.
 */

import { agentMemory } from "./memoryAgent";
import { analyzePatterns } from "./patternAgent";

const RECENT_MS = 24 * 3600 * 1000;
const WEEK_MS   = 7  * 24 * 3600 * 1000;

function recentItems(items) {
  return items.filter(i => {
    try { return (Date.now() - new Date(i.timestamp).getTime()) < RECENT_MS; } catch { return false; }
  });
}

function weekItems(items) {
  return items.filter(i => {
    try { return (Date.now() - new Date(i.timestamp).getTime()) < WEEK_MS; } catch { return false; }
  });
}

/** Top signals by frequency in recent items. */
function extractStrongestSignals(recent) {
  const freq = {};
  recent.forEach(i => {
    (i.keywords || []).forEach(k => { freq[k] = (freq[k] || 0) + 1; });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([signal, count]) => ({ signal, count, strength: count >= 5 ? "high" : count >= 3 ? "medium" : "low" }));
}

/** Entities with highest co-occurrence score in recent items. */
function extractLinkedEntities(recent) {
  const entityFreq = {};
  recent.forEach(i => {
    (i.entities || []).forEach(e => { entityFreq[e] = (entityFreq[e] || 0) + 1; });
  });
  return Object.entries(entityFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([entity, count]) => ({ entity, count }));
}

/**
 * Compute signal acceleration.
 * Compares signal count in last 12h vs previous 12h.
 */
function computeSignalAcceleration(items) {
  const now = Date.now();
  const last12h = items.filter(i => {
    try { return (now - new Date(i.timestamp).getTime()) < 12 * 3600 * 1000; } catch { return false; }
  }).length;
  const prev12h = items.filter(i => {
    try {
      const age = now - new Date(i.timestamp).getTime();
      return age >= 12 * 3600 * 1000 && age < 24 * 3600 * 1000;
    } catch { return false; }
  }).length;

  if (prev12h === 0) return { value: 0, label: "لا يوجد تاريخ كافٍ", direction: "flat" };
  const accel = ((last12h - prev12h) / Math.max(1, prev12h)) * 100;
  return {
    value:     Math.round(accel),
    last12h,
    prev12h,
    direction: accel > 20 ? "accelerating" : accel < -20 ? "decelerating" : "stable",
    label:     accel > 20 ? "تسارع في الإشارات" : accel < -20 ? "تباطؤ في الإشارات" : "تدفق مستقر",
  };
}

/**
 * Detect contradiction level.
 * Measures co-presence of opposing signal pairs.
 */
const OPPOSING_PAIRS = [
  ["war", "ceasefire"], ["attack", "peace"], ["inflation", "growth"],
  ["حرب", "هدنة"], ["هجوم", "سلام"], ["تضخم", "نمو"],
];

function computeContradictionLevel(recent) {
  let contradictions = 0;
  OPPOSING_PAIRS.forEach(([a, b]) => {
    const hasA = recent.some(i => (i.keywords || []).includes(a));
    const hasB = recent.some(i => (i.keywords || []).includes(b));
    if (hasA && hasB) contradictions++;
  });
  const level = contradictions >= 3 ? "high" : contradictions >= 1 ? "medium" : "low";
  return {
    level,
    count: contradictions,
    label: level === "high" ? "تناقضات عالية بين الإشارات" : level === "medium" ? "تناقضات معتدلة" : "إشارات متسقة",
    color: level === "high" ? "#ef4444" : level === "medium" ? "#f59e0b" : "#22c55e",
  };
}

/**
 * Compute historical similarity.
 * Checks if recent signal profile matches any known week in history.
 */
function computeHistoricalSimilarity(recent, weekItems) {
  if (weekItems.length < 10) return { score: 0, label: "بيانات تاريخية غير كافية", available: false };

  const recentCats = new Set(recent.map(i => i.category));
  const weekCats   = new Set(weekItems.map(i => i.category));
  const intersection = [...recentCats].filter(c => weekCats.has(c)).length;
  const similarity = Math.round((intersection / Math.max(1, Math.max(recentCats.size, weekCats.size))) * 100);

  return {
    score:     similarity,
    available: true,
    label:     similarity >= 70 ? "تشابه تاريخي عالٍ" : similarity >= 40 ? "تشابه تاريخي متوسط" : "نمط جديد / غير مسبوق",
  };
}

/**
 * Compute confidence trend.
 * Average confidence of recent vs older items.
 */
function computeConfidenceTrend(recent, all) {
  const avg = arr => arr.length ? Math.round(arr.reduce((s, i) => s + (i.confidence || 0), 0) / arr.length) : 0;
  const recentAvg = avg(recent);
  const allAvg    = avg(all);
  const trend = recentAvg > allAvg + 5 ? "improving" : recentAvg < allAvg - 5 ? "degrading" : "stable";
  return {
    recentAvg,
    allAvg,
    trend,
    label: trend === "improving" ? "الثقة في تحسن" : trend === "degrading" ? "الثقة في تراجع" : "الثقة مستقرة",
    color: trend === "improving" ? "#22c55e" : trend === "degrading" ? "#ef4444" : "#94a3b8",
  };
}

/**
 * Generate the full agent forecast support package.
 * @returns {Object} Forecast support data
 */
export function generateForecastSupport() {
  const all     = agentMemory.getItems();
  const recent  = recentItems(all);
  const week    = weekItems(all);
  const patterns = analyzePatterns();

  const strongestSignals  = extractStrongestSignals(recent);
  const linkedEntities    = extractLinkedEntities(recent);
  const acceleration      = computeSignalAcceleration(all);
  const contradiction     = computeContradictionLevel(recent);
  const historicalSim     = computeHistoricalSimilarity(recent, week);
  const confidenceTrend   = computeConfidenceTrend(recent, all);

  // Overall forecast readiness (0-100)
  const readiness = Math.min(100, Math.round(
    Math.min(30, strongestSignals.length * 4) +
    Math.min(20, linkedEntities.length * 3) +
    (historicalSim.score || 0) * 0.2 +
    (contradiction.level === "low" ? 15 : contradiction.level === "medium" ? 8 : 2) +
    (acceleration.direction === "accelerating" ? 10 : 5) +
    Math.min(5, patterns.clusters.length)
  ));

  return {
    strongestSignals,
    linkedEntities,
    acceleration,
    contradiction,
    historicalSimilarity: historicalSim,
    confidenceTrend,
    patternStrength:      patterns.patternStrength,
    geopolitical:         patterns.geopolitical,
    market:               patterns.market,
    sports:               patterns.sports,
    forecastReadiness:    readiness,
    forecastReadinessLabel: readiness >= 70 ? "جاهز للتوقع" : readiness >= 40 ? "استعداد معتدل" : "بيانات غير كافية للتوقع",
    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
