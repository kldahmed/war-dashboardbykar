/**
 * worldStateEngine.js
 * Core engine: computes the unified "World State" from all intelligence layers.
 * Uses believable weighted scoring — no fake extremes.
 */

import { getIntelligenceMetrics } from "./intelligenceEngine";
import { getStore, getStoreStats } from "./intelligenceStore";
import { getGlobalEvents, getTopUrgentEvents, getEventsByRegion } from "./globalEventsEngine";
import { buildClusters } from "./eventLinker";
import { generateForecasts } from "./forecastEngine";
import { analyzePatterns } from "./agent/patternAgent";
import { computeAgentScore } from "./agent/scoringAgent";
import { agentMemory } from "./agent/memoryAgent";
import { getStrategicIntelligenceAnalysis } from "./agent/strategicIntelligenceLayer";
import { computeTension, computeEconomicPressure, computeSportsActivity, computeIntelligenceLevel, computeEventIntensity } from "./world/pressureScoring";
import { generateEventPulses } from "./world/eventPulseEngine";
import { detectLinkedDynamics } from "./world/linkedDynamics";
import { determineAgentState, generateAgentLines } from "./world/agentInterpretation";

// ─── Most Active Region ──────────────────────────────────────
function findMostActiveRegion() {
  const patterns = analyzePatterns();
  const rp = patterns.regionalPressure || [];
  if (!rp.length) return { region: "—", count: 0, pressure: 0 };
  const sorted = [...rp].sort((a, b) => (b.pressure || b.count || 0) - (a.pressure || a.count || 0));
  return sorted[0];
}

// ─── Dominant Pattern ────────────────────────────────────────
const SIGNAL_DISPLAY = {
  conflict_escalation: { label: "تصعيد نزاع", labelEn: "Conflict Escalation" },
  economic_pressure: { label: "ضغط اقتصادي", labelEn: "Economic Pressure" },
  sports_activity: { label: "نشاط رياضي", labelEn: "Sports Activity" },
  transfer_market: { label: "سوق انتقالات", labelEn: "Transfer Market" },
  sanctions_pressure: { label: "عقوبات", labelEn: "Sanctions" },
  peace_signal: { label: "إشارة سلام", labelEn: "Peace Signal" },
  political_transition: { label: "تحول سياسي", labelEn: "Political Shift" },
  energy_signal: { label: "طاقة", labelEn: "Energy" },
};

function findDominantPattern() {
  const patterns = analyzePatterns();
  const rising = patterns.signalTrends?.rising || [];
  if (!rising.length) return { signal: "—", label: "لا أنماط", labelEn: "No patterns", count: 0 };
  const top = rising[0];
  const key = top.key || top.signal || top;
  const display = SIGNAL_DISPLAY[key] || {};
  return {
    signal: key,
    label: display.label || top.label || key,
    labelEn: display.labelEn || top.signalEn || key,
    count: top.recentCount || top.count || 0
  };
}

// ─── Strongest Event ─────────────────────────────────────────
function findStrongestEvent() {
  const top = getTopUrgentEvents(1);
  if (!top.length) return null;
  return top[0];
}

// ─── AI Interpretation (now uses agentInterpretation engine) ─
function generateWorldInterpretation(tension, economic, sports, activeRegion, dominantPattern, strongestEvent, patterns, forecasts, regionalPressures) {
  const worldMock = { tension, economic, sports, activeRegion, dominantPattern, strongestEvent, patterns, forecasts, regionalPressures };
  const agentLines = generateAgentLines(worldMock);
  const agentState = determineAgentState(tension, economic, patterns, strongestEvent);

  // Build summary from top 3 agent lines
  const topAr = agentLines.slice(0, 3).map(l => l.ar).join(" · ");
  const topEn = agentLines.slice(0, 3).map(l => l.en).join(" · ");

  return {
    ar: topAr || "جارٍ تحليل الوضع العالمي...",
    en: topEn || "Analyzing global state...",
    lines: agentLines,
    agentState,
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

  const events = getGlobalEvents();
  const store = getStore();

  // Use believable scoring engine
  const tension = computeTension(events);
  const economic = computeEconomicPressure(store);
  const sports = computeSportsActivity(store);
  const eventIntensity = computeEventIntensity(events);
  const activeRegion = findMostActiveRegion();
  const dominantPattern = findDominantPattern();
  const strongestEvent = findStrongestEvent();
  const intelMetrics = getIntelligenceMetrics();
  const intelligence = computeIntelligenceLevel(intelMetrics);
  const agentScore = computeAgentScore();
  const patternsSummary = getPatternSummary();
  const forecastsSummary = getForecastSummary();
  const regPressures = computeRegionalPressures();
  const strategic = getStrategicIntelligenceAnalysis(agentMemory.getItems());

  // Rich interpretation from agent engine
  const interpretation = generateWorldInterpretation(
    tension, economic, sports, activeRegion, dominantPattern,
    strongestEvent, patternsSummary, forecastsSummary, regPressures
  );

  // Event pulse system
  const pulseData = generateEventPulses(events, store);

  // Linked dynamics
  const linkedDynamics = detectLinkedDynamics(store, events);

  _cachedState = {
    timestamp: now,
    // Core indices (believable scoring)
    tension,
    economic,
    sports,
    eventIntensity,
    // Key insights
    activeRegion,
    dominantPattern,
    strongestEvent,
    interpretation,
    // Intelligence metrics
    intelligence,
    intelligenceRaw: intelMetrics,
    agentMaturity: agentScore,
    agentState: interpretation.agentState,
    agentLines: interpretation.lines || [],
    // Regional
    regionalPressures: regPressures,
    // Events
    topEvents: getTopWorldEvents(8),
    eventClusters: getWorldEventClusters(),
    // Pulse & links
    pulseData,
    linkedDynamics,
    // Patterns & forecasts
    patterns: patternsSummary,
    forecasts: forecastsSummary,
    strategicGlobalRisk: strategic.globalRisk,
    strategicSummary: strategic.strategicSummary,
    strategicEventGraph: strategic.eventGraph,
    strategicCausalLinks: strategic.causalLinks,
    strategicHotspots: strategic.regionalTension,
    // Meta
    totalEvents: events.length,
    totalIntelItems: (store || []).length
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
