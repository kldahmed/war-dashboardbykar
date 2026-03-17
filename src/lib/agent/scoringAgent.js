/**
 * Scoring Agent — computes the Agent Learning Score (0–100).
 *
 * The score is built exclusively from real memory metrics.
 * It is never inflated or fabricated.
 *
 * Score breakdown (total 100 pts):
 *   - Processed items volume       up to 20 pts
 *   - Source diversity             up to 15 pts
 *   - Tracked entities             up to 15 pts
 *   - Active patterns              up to 15 pts
 *   - Linked events                up to 10 pts
 *   - Repeated signals             up to 10 pts
 *   - Forecast feedback accuracy   up to 10 pts
 *   - Cross-domain coverage        up to  5 pts
 */

import { agentMemory } from "./memoryAgent";

/**
 * Compute the full Agent Learning Score.
 * @returns {{ score: number, breakdown: Object, label: string, color: string }}
 */
export function computeAgentScore() {
  const depth = agentMemory.getMemoryDepth();
  const items = agentMemory.getItems();

  // Category diversity (cross-domain)
  const cats = new Set(items.map(i => i.category).filter(Boolean));
  const crossDomain = Math.min(5, cats.size);

  // Volume score: logarithmic growth, saturates at 500 items
  const volumeScore = Math.min(20, Math.round(Math.log10(Math.max(1, depth.totalMemoryItems)) * 8));

  // Source diversity
  const sourceScore = Math.min(15, depth.sourceDiversity * 2);

  // Entities tracked
  const entityScore = Math.min(15, Math.round(Math.log10(Math.max(1, depth.trackedEntities)) * 7));

  // Active patterns
  const patternScore = Math.min(15, depth.activePatterns * 2);

  // Linked events
  const linkedScore = Math.min(10, Math.round(Math.log10(Math.max(1, depth.linkedEvents + 1)) * 5));

  // Repeated signals
  const signalScore = Math.min(10, depth.repeatedSignals);

  // Forecast accuracy feedback (only if resolved forecasts exist)
  let feedbackScore = 0;
  if (depth.forecastResolved >= 3 && depth.forecastAccuracy !== null) {
    feedbackScore = Math.min(10, Math.round(depth.forecastAccuracy / 10));
  }

  const total = volumeScore + sourceScore + entityScore + patternScore + linkedScore + signalScore + feedbackScore + crossDomain;
  const score = Math.min(100, total);

  return {
    score,
    breakdown: {
      volume:     { pts: volumeScore,   max: 20, label: "حجم البيانات المعالجة" },
      sources:    { pts: sourceScore,   max: 15, label: "تنوع المصادر" },
      entities:   { pts: entityScore,   max: 15, label: "الكيانات المرصودة" },
      patterns:   { pts: patternScore,  max: 15, label: "الأنماط النشطة" },
      linked:     { pts: linkedScore,   max: 10, label: "الأحداث المرتبطة" },
      signals:    { pts: signalScore,   max: 10, label: "الإشارات المتكررة" },
      feedback:   { pts: feedbackScore, max: 10, label: "دقة التوقعات" },
      crossDomain:{ pts: crossDomain,   max:  5, label: "التغطية متعددة المجالات" },
    },
    label:  scoreLabelAr(score),
    labelEn: scoreLabelEn(score),
    color:  scoreColor(score),
    maturityIndex: scoreMaturity(score),
  };
}

function scoreLabelAr(score) {
  if (score >= 80) return "وكيل ناضج — تحليل متقدم";
  if (score >= 60) return "وكيل متطور — نمط قوي";
  if (score >= 40) return "وكيل نشط — بناء الذاكرة";
  if (score >= 20) return "وكيل ناشئ — تغذية مبدئية";
  return "وكيل جديد — في انتظار البيانات";
}

function scoreLabelEn(score) {
  if (score >= 80) return "Mature Agent — Advanced Analysis";
  if (score >= 60) return "Advanced Agent — Strong Patterns";
  if (score >= 40) return "Active Agent — Memory Building";
  if (score >= 20) return "Emerging Agent — Initial Feed";
  return "New Agent — Awaiting Data";
}

function scoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#38bdf8";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function scoreMaturity(score) {
  if (score >= 80) return "mature";
  if (score >= 60) return "advanced";
  if (score >= 40) return "active";
  if (score >= 20) return "emerging";
  return "new";
}
