/**
 * Forecast Engine — generates probabilistic outlooks from ingested intelligence.
 * All probability estimates are derived from real signal counts — never invented.
 *
 * Rules:
 * - Probability = f(signal frequency, sentiment balance, recency weight)
 * - Confidence = f(evidence count, source diversity, signal consistency)
 * - No forecast claims certainty (max 78%)
 * - Weak evidence → explicitly flagged
 */

import { getStore, getByCategory, getBySignal } from "./intelligenceStore";
import { getGlobalEvents, getEventsByCategory as getGlobalByCategory } from "./globalEventsEngine";

const RECENT_WINDOW_MS = 48 * 3600 * 1000; // 48 hours

function recentItems(items) {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  return items.filter(i => {
    try { return new Date(i.timestamp).getTime() > cutoff; } catch { return false; }
  });
}

/** Convert raw signal counts to a bounded probability (30-78%). */
function signalsToProbability(signalCount, total) {
  if (total === 0 || signalCount === 0) return 30;
  const ratio = signalCount / total;
  return Math.min(78, Math.round(30 + ratio * 48));
}

/** Confidence: based on evidence count and source diversity. */
function evidenceToConfidence(evidenceCount, sourceDiversity) {
  const base = Math.min(40, evidenceCount * 4);
  const div  = Math.min(25, sourceDiversity * 5);
  return Math.min(75, base + div);
}

/** Count negative-sentiment items in a set. */
function countNegative(items) {
  return items.filter(i => i.sentiment === "negative").length;
}

/** Collect supporting signal strings for display. */
function topSignals(items, max = 4) {
  const freq = {};
  items.forEach(i => (i.derivedSignals || []).forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([s, c]) => ({ signal: s, count: c }));
}

/** Human-readable Arabic signal labels. */
const SIGNAL_LABELS = {
  conflict_escalation:  "تصعيد النزاعات",
  economic_pressure:    "ضغط اقتصادي",
  sports_activity:      "نشاط رياضي",
  transfer_market:      "سوق الانتقالات",
  sanctions_pressure:   "ضغط العقوبات",
  peace_signal:         "إشارات سلام",
  political_transition: "تحول سياسي",
  energy_signal:        "إشارات الطاقة",
};

function labelSignals(raw) {
  return raw.map(({ signal, count }) => ({
    signal,
    label: SIGNAL_LABELS[signal] || signal,
    count,
  }));
}

function trendDirection(recent, older) {
  if (recent > older * 1.3) return { dir: "تصاعد",  arrow: "↑", color: "#ef4444" };
  if (recent < older * 0.7) return { dir: "تراجع",  arrow: "↓", color: "#22c55e" };
  return                           { dir: "استقرار", arrow: "→", color: "#94a3b8" };
}

// ── Category-specific forecast builders ─────────────────────────

function buildConflictForecast(store) {
  const all    = getBySignal("conflict_escalation");
  const recent = recentItems(all);
  const older  = all.filter(i => !recentItems([i]).length);
  const sources = new Set(recent.map(i => i.source)).size;
  const prob   = signalsToProbability(recent.length, Math.max(1, store.length));
  const conf   = evidenceToConfidence(recent.length, sources);
  const trend  = trendDirection(recent.length, older.length);

  return {
    id: "conflict",
    title: "التصعيد الأمني والعسكري",
    icon: "⚔️",
    probability: prob,
    confidence: conf,
    trend: trend.dir,
    trendArrow: trend.arrow,
    trendColor: trend.color,
    signals: labelSignals(topSignals(recent)),
    evidenceCount: recent.length,
    sourceCount: sources,
    evidenceStrength: recent.length >= 5 ? "strong" : recent.length >= 2 ? "moderate" : "weak",
    summary: recent.length >= 3
      ? `رُصدت ${recent.length} إشارة تصعيد خلال الـ 48 ساعة الأخيرة من ${sources} مصدر. الاتجاه: ${trend.dir}.`
      : "إشارات التصعيد محدودة حالياً. البيانات غير كافية لتوقع قاطع.",
  };
}

function buildEconomicForecast(store) {
  const energyItems  = getBySignal("energy_signal");
  const sanctItems   = getBySignal("sanctions_pressure");
  const econCat      = getByCategory("economy");
  const combined     = [...new Map([...energyItems, ...sanctItems, ...econCat].map(i => [i.id, i])).values()];
  const recent       = recentItems(combined);
  const sources      = new Set(recent.map(i => i.source)).size;
  const negCount     = countNegative(recent);
  const prob         = signalsToProbability(negCount, Math.max(1, recent.length));
  const conf         = evidenceToConfidence(recent.length, sources);

  return {
    id: "economy",
    title: "الاقتصاد والطاقة",
    icon: "📊",
    probability: prob,
    confidence: conf,
    trend: negCount > recent.length / 2 ? "ضغط" : "استقرار",
    trendArrow: negCount > recent.length / 2 ? "↓" : "→",
    trendColor: negCount > recent.length / 2 ? "#f59e0b" : "#94a3b8",
    signals: labelSignals(topSignals(recent)),
    evidenceCount: recent.length,
    sourceCount: sources,
    evidenceStrength: recent.length >= 5 ? "strong" : recent.length >= 2 ? "moderate" : "weak",
    summary: recent.length >= 3
      ? `${recent.length} تقرير اقتصادي وطاقوي في 48 ساعة من ${sources} مصدر. ${negCount > recent.length / 2 ? "المشاعر سلبية بشكل طاغٍ." : "المشاعر متوازنة."}`
      : "بيانات اقتصادية محدودة. يُنصح بالحذر في التفسير.",
  };
}

function buildPoliticsForecast(store) {
  const political = getBySignal("political_transition");
  const conflict  = getBySignal("conflict_escalation");
  const combined  = [...new Map([...political, ...conflict].map(i => [i.id, i])).values()];
  const recent    = recentItems(combined);
  const sources   = new Set(recent.map(i => i.source)).size;
  const prob      = signalsToProbability(recent.length, Math.max(1, store.length));
  const conf      = evidenceToConfidence(recent.length, sources);

  return {
    id: "politics",
    title: "السياسة والدبلوماسية",
    icon: "🏛️",
    probability: prob,
    confidence: conf,
    trend: recent.length > 5 ? "توتر" : "استقرار",
    trendArrow: recent.length > 5 ? "↑" : "→",
    trendColor: recent.length > 5 ? "#f59e0b" : "#94a3b8",
    signals: labelSignals(topSignals(recent)),
    evidenceCount: recent.length,
    sourceCount: sources,
    evidenceStrength: recent.length >= 5 ? "strong" : recent.length >= 2 ? "moderate" : "weak",
    summary: recent.length >= 3
      ? `${recent.length} حدث سياسي ودبلوماسي في 48 ساعة من ${sources} مصدر.`
      : "نشاط سياسي محدود في قاعدة البيانات الحالية.",
  };
}

function buildSportsForecast(store) {
  const sports  = getByCategory("sports");
  const recent  = recentItems(sports);
  const transfers = recent.filter(i => (i.derivedSignals || []).includes("transfer_market"));
  const sources = new Set(recent.map(i => i.source)).size;

  // UAE clubs mentioned
  const uaeClubMentions = {};
  recent.forEach(i => (i.uaeClubs || []).forEach(c => {
    uaeClubMentions[c] = (uaeClubMentions[c] || 0) + 1;
  }));
  const topUaeClub = Object.entries(uaeClubMentions).sort((a, b) => b[1] - a[1])[0];

  const prob = signalsToProbability(recent.length, Math.max(1, store.length));
  const conf = evidenceToConfidence(recent.length, sources);

  let summary = recent.length >= 3
    ? `${recent.length} خبر رياضي في 48 ساعة من ${sources} مصدر.`
    : "أخبار رياضية محدودة في القاعدة الحالية.";

  if (topUaeClub) {
    summary += ` النادي الأكثر ذكراً: ${topUaeClub[0]} (${topUaeClub[1]} إشارات).`;
  }
  if (transfers.length) {
    summary += ` ${transfers.length} إشارة انتقالات رُصدت.`;
  }

  return {
    id: "sports",
    title: "الرياضة والدوريات",
    icon: "⚽",
    probability: prob,
    confidence: conf,
    trend: recent.length > 8 ? "نشاط مرتفع" : "نشاط عادي",
    trendArrow: recent.length > 8 ? "↑" : "→",
    trendColor: recent.length > 8 ? "#38bdf8" : "#94a3b8",
    signals: labelSignals(topSignals(recent)),
    evidenceCount: recent.length,
    sourceCount: sources,
    evidenceStrength: recent.length >= 5 ? "strong" : recent.length >= 2 ? "moderate" : "weak",
    topUaeClub: topUaeClub ? topUaeClub[0] : null,
    transferSignals: transfers.length,
    summary,
  };
}

function buildRegionalForecast(store) {
  const me = store.filter(i => (i.regions || []).includes("الشرق الأوسط"));
  const recent = recentItems(me);
  const sources = new Set(recent.map(i => i.source)).size;
  const negCount = countNegative(recent);
  const prob = signalsToProbability(negCount, Math.max(1, recent.length));
  const conf = evidenceToConfidence(recent.length, sources);

  return {
    id: "regional",
    title: "الأمن الإقليمي — الشرق الأوسط",
    icon: "🌍",
    probability: prob,
    confidence: conf,
    trend: negCount > recent.length / 2 ? "توتر" : "هدوء نسبي",
    trendArrow: negCount > recent.length / 2 ? "↑" : "→",
    trendColor: negCount > recent.length / 2 ? "#ef4444" : "#94a3b8",
    signals: labelSignals(topSignals(recent)),
    evidenceCount: recent.length,
    sourceCount: sources,
    evidenceStrength: recent.length >= 5 ? "strong" : recent.length >= 2 ? "moderate" : "weak",
    summary: recent.length >= 3
      ? `${recent.length} حدث في منطقة الشرق الأوسط خلال 48 ساعة. ${negCount} منها ذات طابع سلبي.`
      : "تغطية الشرق الأوسط محدودة في البيانات الحالية.",
  };
}

/**
 * Generate all forecasts from current store + global events engine.
 * Returns array of forecast objects, sorted by evidence strength.
 */
export function generateForecasts() {
  const store = getStore();
  if (!store.length) return [];

  const forecasts = [
    buildConflictForecast(store),
    buildEconomicForecast(store),
    buildPoliticsForecast(store),
    buildSportsForecast(store),
    buildRegionalForecast(store),
  ];

  // Enrich forecasts with global events engine data
  try {
    const globalEvents = getGlobalEvents();
    if (globalEvents.length) {
      for (const fc of forecasts) {
        const catMap = {
          conflict: ["conflict", "military", "terrorism"],
          economy: ["economic", "market", "energy"],
          politics: ["political", "diplomacy"],
          sports: ["sports"],
          regional: ["conflict", "military", "diplomacy", "political"],
        };
        const matchCats = catMap[fc.id] || [];
        const matching = globalEvents.filter(e => matchCats.includes(e.category));
        if (matching.length) {
          fc.globalEventCount = matching.length;
          fc.avgGlobalSeverity = Math.round(matching.reduce((s, e) => s + e.severity, 0) / matching.length);
          // Boost confidence when global events engine has corroborating data
          fc.confidence = Math.min(78, fc.confidence + Math.min(10, matching.length * 2));
          // Enrich summary
          fc.summary += ` (محرك الأحداث: ${matching.length} حدث عالمي مرصود بمتوسط خطورة ${fc.avgGlobalSeverity}%)`;
        }
      }
    }
  } catch { /* non-critical enrichment */ }

  // Sort by evidence count (most evidence first)
  return forecasts.sort((a, b) => b.evidenceCount - a.evidenceCount);
}

/** Generate a single category forecast. */
export function generateForecast(category) {
  const store = getStore();
  if (!store.length) return null;
  const map = {
    conflict: buildConflictForecast,
    economy:  buildEconomicForecast,
    politics: buildPoliticsForecast,
    sports:   buildSportsForecast,
    regional: buildRegionalForecast,
  };
  return map[category] ? map[category](store) : null;
}
