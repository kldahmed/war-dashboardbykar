/**
 * Scenario Forecast Agent — generates three strategic scenarios for each major event:
 *   A: Escalation
 *   B: Stalemate
 *   C: De-escalation
 *
 * Each scenario includes probability, expected timeframe, and estimated global impact.
 */

import { agentMemory } from "./memoryAgent";
import { analyzePatterns } from "./patternAgent";
import { getSourceCredibility } from "./credibilityAgent";

// ── Scenario template definitions ────────────────────────────────────────────
// For each major event category, define base priors for A/B/C
const SCENARIO_PRIORS = {
  conflict: {
    A: { baseProbability: 45, timeframe: "24–72 ساعة",     timeframeEn: "24–72 hours",  impact: "high",   impactLabel: "تأثير دولي مرتفع"  },
    B: { baseProbability: 35, timeframe: "أسابيع",         timeframeEn: "weeks",         impact: "medium", impactLabel: "تأثير إقليمي"      },
    C: { baseProbability: 20, timeframe: "أيام إلى أسابيع",timeframeEn: "days to weeks", impact: "medium", impactLabel: "تحسن نسبي"         },
  },
  politics: {
    A: { baseProbability: 30, timeframe: "أسابيع",         timeframeEn: "weeks",          impact: "medium", impactLabel: "تأثير سياسي" },
    B: { baseProbability: 45, timeframe: "أشهر",           timeframeEn: "months",         impact: "low",    impactLabel: "جمود سياسي"  },
    C: { baseProbability: 25, timeframe: "أسابيع إلى أشهر",timeframeEn: "weeks to months",impact: "medium", impactLabel: "استقرار سياسي" },
  },
  economy: {
    A: { baseProbability: 35, timeframe: "أيام إلى أسابيع",timeframeEn: "days to weeks",  impact: "high",   impactLabel: "صدمة اقتصادية"  },
    B: { baseProbability: 40, timeframe: "أشهر",           timeframeEn: "months",          impact: "medium", impactLabel: "تباطؤ مستمر"    },
    C: { baseProbability: 25, timeframe: "أشهر",           timeframeEn: "months",          impact: "medium", impactLabel: "تعافٍ تدريجي"   },
  },
  energy: {
    A: { baseProbability: 40, timeframe: "أيام",          timeframeEn: "days",            impact: "high",   impactLabel: "ارتفاع حاد في الأسعار" },
    B: { baseProbability: 35, timeframe: "أسابيع",        timeframeEn: "weeks",           impact: "medium", impactLabel: "تذبذب الأسعار"         },
    C: { baseProbability: 25, timeframe: "أسابيع",        timeframeEn: "weeks",           impact: "low",    impactLabel: "استقرار الأسواق"        },
  },
  regional: {
    A: { baseProbability: 35, timeframe: "أيام إلى أسابيع",timeframeEn: "days to weeks",  impact: "medium", impactLabel: "توتر إقليمي"   },
    B: { baseProbability: 40, timeframe: "أسابيع",         timeframeEn: "weeks",           impact: "low",    impactLabel: "حالة انتظار إقليمية" },
    C: { baseProbability: 25, timeframe: "أسابيع",         timeframeEn: "weeks",           impact: "medium", impactLabel: "تهدئة إقليمية" },
  },
  general: {
    A: { baseProbability: 30, timeframe: "أسابيع",timeframeEn: "weeks",  impact: "low", impactLabel: "غير محدد" },
    B: { baseProbability: 40, timeframe: "أشهر",  timeframeEn: "months", impact: "low", impactLabel: "غير محدد" },
    C: { baseProbability: 30, timeframe: "أشهر",  timeframeEn: "months", impact: "low", impactLabel: "غير محدد" },
  },
};

// Scenario labels
const SCENARIO_LABELS = {
  A: { ar: "سيناريو التصعيد",      en: "Escalation Scenario",    color: "#ef4444", icon: "↑" },
  B: { ar: "سيناريو الجمود",       en: "Stalemate Scenario",     color: "#f59e0b", icon: "→" },
  C: { ar: "سيناريو التهدئة",      en: "De-escalation Scenario", color: "#22c55e", icon: "↓" },
};

// ── Probability adjuster ─────────────────────────────────────────────────────
function adjustProbabilities(priors, patternContext, item) {
  const { A, B, C } = priors;
  let pA = A.baseProbability;
  let pB = B.baseProbability;
  let pC = C.baseProbability;

  // Geopolitical escalation signals → boost A
  if (patternContext?.geopolitical?.level === "high")    { pA += 15; pC -= 10; }
  if (patternContext?.geopolitical?.level === "medium")  { pA += 8;  pC -= 5;  }
  if (patternContext?.geopolitical?.level === "low")     { pC += 10; pA -= 8;  }

  // Source credibility → low credibility widens uncertainty (boost B)
  const cred = getSourceCredibility(item?.source);
  if (cred.tier === "low")          { pB += 15; pA -= 8; pC -= 7; }
  if (cred.tier === "very_high")    { pA += 5; pC += 3; pB -= 8; }

  // High urgency → boost A
  if (item?.urgency === "high")     { pA += 10; pB -= 5; pC -= 5; }
  if (item?.urgency === "low")      { pC += 8;  pA -= 5; pB -= 3; }

  // Market sensitivity → boost C (economic incentive for resolution)
  if (patternContext?.market?.sensitivity === "high") { pC += 5; pA -= 3; pB -= 2; }

  // Contradiction level → boost B (confusion = stalemate)
  // (passed in separately via patternContext.contradictionLevel)
  if (patternContext?.contradictionLevel === "high") { pB += 10; pA -= 5; pC -= 5; }

  // Normalize to sum to 100
  const total = pA + pB + pC;
  pA = Math.max(5, Math.round((pA / total) * 100));
  pB = Math.max(5, Math.round((pB / total) * 100));
  pC = 100 - pA - pB;
  pC = Math.max(5, pC);

  return { pA, pB, pC };
}

// ── Generate scenarios for a single item ─────────────────────────────────────
function generateScenariosForItem(item, patternContext) {
  const category = item.category || "general";
  const priors = SCENARIO_PRIORS[category] || SCENARIO_PRIORS.general;
  const { pA, pB, pC } = adjustProbabilities(priors, patternContext, item);
  const cred = getSourceCredibility(item.source);

  return {
    itemId:    item.id,
    itemTitle: item.title || item.text?.slice(0, 80) || "",
    category,
    region:    item.region?.[0] || "Global",
    source:    item.source || "unknown",
    credibilityTier: cred.tier,
    isUnconfirmed:   cred.tier === "low",
    scenarios: {
      A: {
        label:       SCENARIO_LABELS.A.ar,
        labelEn:     SCENARIO_LABELS.A.en,
        probability: pA,
        timeframe:   priors.A.timeframe,
        timeframeEn: priors.A.timeframeEn,
        impact:      priors.A.impact,
        impactLabel: priors.A.impactLabel,
        color:       SCENARIO_LABELS.A.color,
        icon:        SCENARIO_LABELS.A.icon,
      },
      B: {
        label:       SCENARIO_LABELS.B.ar,
        labelEn:     SCENARIO_LABELS.B.en,
        probability: pB,
        timeframe:   priors.B.timeframe,
        timeframeEn: priors.B.timeframeEn,
        impact:      priors.B.impact,
        impactLabel: priors.B.impactLabel,
        color:       SCENARIO_LABELS.B.color,
        icon:        SCENARIO_LABELS.B.icon,
      },
      C: {
        label:       SCENARIO_LABELS.C.ar,
        labelEn:     SCENARIO_LABELS.C.en,
        probability: pC,
        timeframe:   priors.C.timeframe,
        timeframeEn: priors.C.timeframeEn,
        impact:      priors.C.impact,
        impactLabel: priors.C.impactLabel,
        color:       SCENARIO_LABELS.C.color,
        icon:        SCENARIO_LABELS.C.icon,
      },
    },
    dominantScenario: pA >= pB && pA >= pC ? "A" : pB >= pA && pB >= pC ? "B" : "C",
    timestamp: item.timestamp,
  };
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate scenario forecasts for the top major events.
 * @returns {Object} { forecasts[], aggregateDominant, analysisTimestamp }
 */
export function generateScenarioForecasts() {
  const all = agentMemory.getItems();
  const recent = all
    .filter(i => {
      try { return (Date.now() - new Date(i.timestamp).getTime()) < 48 * 3600 * 1000; }
      catch { return false; }
    })
    .sort((a, b) => {
      const urgencyScore = v => v === "high" ? 3 : v === "medium" ? 2 : 1;
      return urgencyScore(b.urgency) - urgencyScore(a.urgency);
    })
    .slice(0, 12); // top 12 most urgent events

  // Get pattern context once for all items
  const patterns = analyzePatterns();
  const patternContext = {
    geopolitical: patterns.geopolitical,
    market:       patterns.market,
    contradictionLevel: null, // will be filled by forecastAgent if available
  };

  const forecasts = recent.map(item => generateScenariosForItem(item, patternContext));

  // ── Aggregate: what's the overall dominant scenario? ─────────────────────
  const dominantCounts = { A: 0, B: 0, C: 0 };
  forecasts.forEach(f => { dominantCounts[f.dominantScenario]++; });
  const aggregateDominant = Object.entries(dominantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "B";

  // Average probabilities
  const avgA = forecasts.length ? Math.round(forecasts.reduce((s, f) => s + f.scenarios.A.probability, 0) / forecasts.length) : 33;
  const avgB = forecasts.length ? Math.round(forecasts.reduce((s, f) => s + f.scenarios.B.probability, 0) / forecasts.length) : 34;
  const avgC = 100 - avgA - avgB;

  return {
    forecasts,
    aggregateDominant,
    aggregateProbabilities: { A: avgA, B: Math.max(5, avgB), C: Math.max(5, avgC) },
    aggregateLabel: SCENARIO_LABELS[aggregateDominant]?.ar || "غير محدد",
    aggregateColor: SCENARIO_LABELS[aggregateDominant]?.color || "#94a3b8",
    totalEvents:   forecasts.length,
    analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
