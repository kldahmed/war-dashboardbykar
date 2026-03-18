/**
 * worldStateEngine.js
 * Core engine: computes the unified "World State" from all intelligence layers.
 * Aggregates: events, patterns, forecasts, entities, signals, regional pressure.
 */

import { getIntelligenceMetrics } from "./intelligenceEngine";
import { getStore, getStoreStats } from "./intelligenceStore";
import { getGlobalEvents, getTopUrgentEvents, getEventsByRegion } from "./globalEventsEngine";
import { buildClusters } from "./eventLinker";
import { generateForecasts } from "./forecastEngine";
import { analyzePatterns } from "./agent/patternAgent";
import { computeAgentScore } from "./agent/scoringAgent";
import { agentMemory } from "./agent/memoryAgent";

// ─── Tension Index ───────────────────────────────────────────
function computeGlobalTensionIndex() {
  const events = getGlobalEvents();
  if (!events.length) return { value: 0, label: "مستقر", labelEn: "Stable", color: "#22c55e" };

  const severitySum = events.reduce((s, e) => s + (e.severity || 0), 0);
  const avgSeverity = severitySum / events.length;
  const highSeverityCount = events.filter(e => (e.severity || 0) >= 60).length;
  const raw = Math.min(100, avgSeverity * 0.5 + highSeverityCount * 4 + Math.min(events.length, 40) * 0.8);
  const value = Math.round(raw);

  if (value >= 75) return { value, label: "حرج", labelEn: "Critical", color: "#ef4444" };
  if (value >= 55) return { value, label: "مرتفع", labelEn: "High", color: "#f59e0b" };
  if (value >= 35) return { value, label: "متوسط", labelEn: "Moderate", color: "#38bdf8" };
  if (value >= 15) return { value, label: "منخفض", labelEn: "Low", color: "#22c55e" };
  return { value, label: "مستقر", labelEn: "Stable", color: "#22c55e" };
}

// ─── Economic Pressure Index ─────────────────────────────────
function computeEconomicPressureIndex() {
  const store = getStore();
  const econ = store.filter(i =>
    (i.derivedSignals || []).some(s => ["economic_pressure", "sanctions_pressure", "energy_signal"].includes(s))
  );
  const econImpactSum = econ.reduce((s, i) => s + (i.economicImpact || 0), 0);
  const raw = Math.min(100, econ.length * 3 + econImpactSum * 0.6);
  const value = Math.round(raw);

  if (value >= 70) return { value, label: "ضغط شديد", labelEn: "Severe Pressure", color: "#ef4444" };
  if (value >= 45) return { value, label: "ضغط مرتفع", labelEn: "High Pressure", color: "#f59e0b" };
  if (value >= 20) return { value, label: "ضغط معتدل", labelEn: "Moderate", color: "#38bdf8" };
  return { value, label: "مستقر", labelEn: "Stable", color: "#22c55e" };
}

// ─── Sports Activity Index ───────────────────────────────────
function computeSportsActivityIndex() {
  const store = getStore();
  const sports = store.filter(i =>
    (i.derivedSignals || []).some(s => ["sports_activity", "transfer_market"].includes(s)) ||
    i.category === "sports"
  );
  const sportsImpactSum = sports.reduce((s, i) => s + (i.sportsImpact || 0), 0);
  const raw = Math.min(100, sports.length * 2.5 + sportsImpactSum * 0.5);
  const value = Math.round(raw);

  if (value >= 70) return { value, label: "نشاط مكثف", labelEn: "Intense Activity", color: "#f59e0b" };
  if (value >= 40) return { value, label: "نشاط مرتفع", labelEn: "High Activity", color: "#38bdf8" };
  if (value >= 15) return { value, label: "نشاط عادي", labelEn: "Normal", color: "#22c55e" };
  return { value, label: "هادئ", labelEn: "Quiet", color: "#64748b" };
}

// ─── Most Active Region ──────────────────────────────────────
function findMostActiveRegion() {
  const patterns = analyzePatterns();
  const rp = patterns.regionalPressure || [];
  if (!rp.length) return { region: "—", count: 0, pressure: 0 };
  const sorted = [...rp].sort((a, b) => (b.pressure || b.count || 0) - (a.pressure || a.count || 0));
  return sorted[0];
}

// ─── Dominant Pattern ────────────────────────────────────────
function findDominantPattern() {
  const patterns = analyzePatterns();
  const rising = patterns.signalTrends?.rising || [];
  if (!rising.length) return { signal: "—", label: "لا أنماط", labelEn: "No patterns", count: 0 };
  const top = rising[0];
  return {
    signal: top.signal || top,
    label: top.label || top.signal || top,
    labelEn: top.signalEn || top.signal || top,
    count: top.count || 0
  };
}

// ─── Strongest Event ─────────────────────────────────────────
function findStrongestEvent() {
  const top = getTopUrgentEvents(1);
  if (!top.length) return null;
  return top[0];
}

// ─── AI Interpretation ───────────────────────────────────────
function generateWorldInterpretation(tension, economic, sports, activeRegion, dominantPattern, strongestEvent) {
  const parts = [];
  const partsEn = [];

  if (tension.value >= 55) {
    parts.push(`التوتر العالمي في مستوى ${tension.label}`);
    partsEn.push(`Global tension at ${tension.labelEn} level`);
  } else {
    parts.push("الوضع العام مستقر نسبياً");
    partsEn.push("Overall situation relatively stable");
  }

  if (economic.value >= 45) {
    parts.push(`الضغط الاقتصادي ${economic.label}`);
    partsEn.push(`Economic pressure: ${economic.labelEn}`);
  }

  if (activeRegion && activeRegion.region !== "—") {
    parts.push(`المنطقة الأكثر نشاطاً: ${activeRegion.region}`);
    partsEn.push(`Most active region: ${activeRegion.region}`);
  }

  if (dominantPattern && dominantPattern.signal !== "—") {
    parts.push(`النمط السائد: ${dominantPattern.label}`);
    partsEn.push(`Dominant pattern: ${dominantPattern.labelEn}`);
  }

  if (strongestEvent) {
    parts.push(`أقوى حدث: ${strongestEvent.title}`);
    partsEn.push(`Strongest event: ${strongestEvent.title}`);
  }

  return {
    ar: parts.join(" · ") || "جارٍ تحليل الوضع العالمي...",
    en: partsEn.join(" · ") || "Analyzing global state..."
  };
}

// ─── Regional Pressure Map ───────────────────────────────────
const REGION_KEYS = ["الشرق الأوسط", "أوروبا", "آسيا", "أفريقيا", "أمريكا الشمالية", "أمريكا الجنوبية"];
const REGION_EN = { "الشرق الأوسط": "Middle East", "أوروبا": "Europe", "آسيا": "Asia", "أفريقيا": "Africa", "أمريكا الشمالية": "N. America", "أمريكا الجنوبية": "S. America" };

function computeRegionalPressures() {
  return REGION_KEYS.map(region => {
    const events = getEventsByRegion(region);
    const sevSum = events.reduce((s, e) => s + (e.severity || 0), 0);
    const pressure = events.length ? Math.round(sevSum / events.length) : 0;
    return {
      region,
      regionEn: REGION_EN[region] || region,
      eventCount: events.length,
      pressure,
      color: pressure >= 60 ? "#ef4444" : pressure >= 40 ? "#f59e0b" : pressure >= 20 ? "#38bdf8" : "#22c55e"
    };
  }).sort((a, b) => b.pressure - a.pressure);
}

// ─── Event Clusters with Impact Ranking ──────────────────────
function getWorldEventClusters() {
  const clusters = buildClusters();
  return clusters
    .map(c => ({
      ...c,
      impactScore: Math.round(
        (c.confidence || 0) * 0.4 +
        (c.articleCount || 0) * 3 +
        (c.signalCount || 0) * 5
      )
    }))
    .sort((a, b) => b.impactScore - a.impactScore);
}

// ─── Top Ranked Events ───────────────────────────────────────
function getTopWorldEvents(n = 8) {
  const events = getGlobalEvents();
  return events
    .map(e => ({
      ...e,
      impactScore: Math.round(
        (e.severity || 0) * 0.5 +
        (e.confidence || 0) * 0.3 +
        (e.signalCount || 0) * 4
      )
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, n);
}

// ─── Pattern Summary ─────────────────────────────────────────
function getPatternSummary() {
  const patterns = analyzePatterns();
  return {
    strength: patterns.patternStrength || 0,
    strengthLabel: patterns.patternStrengthLabel || "—",
    rising: (patterns.signalTrends?.rising || []).slice(0, 5),
    falling: (patterns.signalTrends?.falling || []).slice(0, 3),
    geopolitical: patterns.geopolitical || {},
    market: patterns.market || {},
    sports: patterns.sports || {}
  };
}

// ─── Forecast Summary ────────────────────────────────────────
function getForecastSummary() {
  const forecasts = generateForecasts();
  return forecasts
    .sort((a, b) => (b.probability || 0) - (a.probability || 0))
    .slice(0, 5)
    .map(f => ({
      id: f.id,
      title: f.title,
      probability: f.probability,
      confidence: f.confidence,
      trend: f.trend,
      trendArrow: f.trendArrow,
      trendColor: f.trendColor,
      icon: f.icon,
      evidenceStrength: f.evidenceStrength
    }));
}

// ═══════════════════════════════════════════════════════════════
// MAIN: getWorldState()
// Returns the complete world state snapshot
// ═══════════════════════════════════════════════════════════════

let _cachedState = null;
let _lastComputeTime = 0;
const CACHE_TTL = 8000; // 8 seconds

export function getWorldState() {
  const now = Date.now();
  if (_cachedState && now - _lastComputeTime < CACHE_TTL) return _cachedState;

  const tension = computeGlobalTensionIndex();
  const economic = computeEconomicPressureIndex();
  const sports = computeSportsActivityIndex();
  const activeRegion = findMostActiveRegion();
  const dominantPattern = findDominantPattern();
  const strongestEvent = findStrongestEvent();
  const interpretation = generateWorldInterpretation(tension, economic, sports, activeRegion, dominantPattern, strongestEvent);
  const intelMetrics = getIntelligenceMetrics();
  const agentScore = computeAgentScore();

  _cachedState = {
    timestamp: now,
    // Core indices
    tension,
    economic,
    sports,
    // Key insights
    activeRegion,
    dominantPattern,
    strongestEvent,
    interpretation,
    // Intelligence metrics
    intelligence: intelMetrics,
    agentMaturity: agentScore,
    // Regional
    regionalPressures: computeRegionalPressures(),
    // Events
    topEvents: getTopWorldEvents(8),
    eventClusters: getWorldEventClusters(),
    // Patterns & forecasts
    patterns: getPatternSummary(),
    forecasts: getForecastSummary(),
    // Meta
    totalEvents: getGlobalEvents().length,
    totalIntelItems: (getStore() || []).length
  };

  _lastComputeTime = now;
  return _cachedState;
}

export function invalidateWorldState() {
  _cachedState = null;
  _lastComputeTime = 0;
}

// Subscribe to world state updates
let _listeners = [];
let _pollInterval = null;

export function subscribeWorldState(listener) {
  _listeners.push(listener);
  if (!_pollInterval) {
    _pollInterval = setInterval(() => {
      invalidateWorldState();
      const state = getWorldState();
      _listeners.forEach(fn => { try { fn(state); } catch {} });
    }, 10000);
  }
  return () => {
    _listeners = _listeners.filter(fn => fn !== listener);
    if (_listeners.length === 0 && _pollInterval) {
      clearInterval(_pollInterval);
      _pollInterval = null;
    }
  };
}
