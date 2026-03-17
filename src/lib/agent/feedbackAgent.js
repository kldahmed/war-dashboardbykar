/**
 * Feedback Agent — tracks forecast accuracy and adjusts pattern confidence.
 *
 * If a forecast outcome is confirmed (success):
 *   → increases trust weight for similar signal patterns
 *
 * If a forecast fails:
 *   → reduces confidence weight for similar weak patterns
 *
 * Tracks:
 * - Prediction accuracy memory
 * - Pattern reliability map
 * - False signal rate
 * - Confirmed signal rate
 *
 * All adjustments are bounded (never inflated beyond real evidence).
 */

import { agentMemory } from "./memoryAgent";

const FEEDBACK_KEY = "kar_agent_feedback_v1";
const MAX_RECORDS  = 500;

// ── Persistence ───────────────────────────────────────────────────────────────
function readFeedback() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}"); }
  catch { return {}; }
}

function writeFeedback(data) {
  try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function defaultFeedback() {
  return {
    patternReliability: {},   // pattern_key → { weight, successes, failures }
    predictionLog:      [],   // [{id, category, probability, outcome, ts}]
    falseSignalRate:    0,
    confirmedSignalRate: 0,
  };
}

// ── Core feedback API ─────────────────────────────────────────────────────────
export const feedbackAgent = {
  /**
   * Record a new prediction for later outcome tracking.
   * @param {string} id - unique forecast id
   * @param {string} category - forecast domain
   * @param {number} probability - predicted probability (0-100)
   * @param {string[]} signals - driving signals for this forecast
   */
  recordPrediction(id, category, probability, signals = []) {
    const fb = readFeedback() || defaultFeedback();
    fb.predictionLog = fb.predictionLog || [];
    fb.predictionLog.push({ id, category, probability, signals, outcome: null, ts: Date.now() });
    if (fb.predictionLog.length > MAX_RECORDS) {
      fb.predictionLog = fb.predictionLog.slice(-MAX_RECORDS);
    }
    writeFeedback(fb);

    // Also record in agentMemory
    agentMemory.recordForecastSnapshot({ id, category, probability, confidence: probability });
  },

  /**
   * Mark the outcome of a prediction.
   * "success" → increase trust for its driving signals
   * "failure" → reduce confidence for its weak patterns
   */
  markOutcome(forecastId, outcome) {
    const fb = readFeedback() || defaultFeedback();
    fb.predictionLog = fb.predictionLog || [];

    const unresolved = fb.predictionLog.filter(p => p.id === forecastId && p.outcome === null);
    if (!unresolved.length) return;

    const prediction = unresolved[unresolved.length - 1];
    prediction.outcome = outcome;
    prediction.resolvedAt = Date.now();

    // Adjust pattern reliability for each driving signal
    (prediction.signals || []).forEach(signal => {
      fb.patternReliability = fb.patternReliability || {};
      if (!fb.patternReliability[signal]) {
        fb.patternReliability[signal] = { weight: 1.0, successes: 0, failures: 0 };
      }
      const p = fb.patternReliability[signal];
      if (outcome === "success") {
        p.successes++;
        p.weight = Math.min(2.0, p.weight + 0.1);  // increase trust, cap at 2.0
      } else {
        p.failures++;
        p.weight = Math.max(0.1, p.weight - 0.15); // reduce trust, floor at 0.1
      }
    });

    // Update aggregate rates
    const resolved = fb.predictionLog.filter(p => p.outcome !== null);
    const confirmed = resolved.filter(p => p.outcome === "success").length;
    const failed    = resolved.filter(p => p.outcome === "failure").length;
    const total     = confirmed + failed;
    fb.confirmedSignalRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    fb.falseSignalRate     = total > 0 ? Math.round((failed    / total) * 100) : 0;

    writeFeedback(fb);
    agentMemory.markForecastOutcome(forecastId, outcome);
  },

  /** Get pattern reliability weight for a signal (default 1.0). */
  getPatternWeight(signal) {
    const fb = readFeedback() || defaultFeedback();
    return fb.patternReliability?.[signal]?.weight ?? 1.0;
  },

  /** Get all feedback statistics. */
  getStats() {
    const fb = readFeedback() || defaultFeedback();
    const log = fb.predictionLog || [];
    const resolved = log.filter(p => p.outcome !== null);
    const confirmed = resolved.filter(p => p.outcome === "success").length;
    const failed    = resolved.filter(p => p.outcome === "failure").length;
    const pending   = log.filter(p => p.outcome === null).length;

    // Most reliable patterns
    const reliablePatterns = Object.entries(fb.patternReliability || {})
      .filter(([, p]) => p.successes + p.failures >= 2)
      .map(([signal, p]) => ({
        signal,
        weight: p.weight,
        successes: p.successes,
        failures: p.failures,
        total: p.successes + p.failures,
        reliability: p.successes / Math.max(1, p.successes + p.failures),
        label: p.weight >= 1.5 ? "موثوق عالياً" : p.weight >= 1.0 ? "موثوق" : "غير موثوق",
        color: p.weight >= 1.5 ? "#22c55e" : p.weight >= 1.0 ? "#38bdf8" : "#ef4444",
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);

    const overallAccuracy = resolved.length > 0
      ? Math.round((confirmed / resolved.length) * 100)
      : null;

    return {
      totalPredictions:   log.length,
      resolved:           resolved.length,
      confirmed,
      failed,
      pending,
      confirmedSignalRate: fb.confirmedSignalRate || 0,
      falseSignalRate:     fb.falseSignalRate || 0,
      overallAccuracy,
      accuracyLabel:      overallAccuracy !== null
        ? (overallAccuracy >= 70 ? "دقة عالية" : overallAccuracy >= 50 ? "دقة متوسطة" : "دقة منخفضة")
        : "لم يتم التقييم بعد",
      accuracyColor:      overallAccuracy !== null
        ? (overallAccuracy >= 70 ? "#22c55e" : overallAccuracy >= 50 ? "#f59e0b" : "#ef4444")
        : "#475569",
      reliablePatterns,
    };
  },

  /** Clear all feedback data. */
  clear() {
    localStorage.removeItem(FEEDBACK_KEY);
  },
};
