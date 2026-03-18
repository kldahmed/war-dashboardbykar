/**
 * Radar Scoring System
 *
 * Scores each radar signal based on multiple weighted dimensions:
 *   - urgency (20%)
 *   - strategic impact (15%)
 *   - source credibility (10%)
 *   - multi-source confirmation (15%)
 *   - event linkage (10%)
 *   - forecast relevance (5%)
 *   - regional sensitivity (10%)
 *   - market sensitivity (5%)
 *   - sports importance (10% when applicable)
 *
 * Output: radarScore 0-100
 */

// ── Category Strategic Weights ─────────────────────────────────────
const CATEGORY_WEIGHT = {
  "صراع / تصعيد":    0.95,
  "دبلوماسية":       0.60,
  "اقتصاد / أسواق":  0.70,
  "طاقة / نفط / شحن": 0.80,
  "رياضة":           0.40,
  "انتقالات":        0.35,
  "أحداث عالمية":    0.75,
  "إشارات ناشئة":    0.30,
};

// ── Region Sensitivity ─────────────────────────────────────────────
const REGION_SENSITIVITY = {
  "الشرق الأوسط":       1.0,
  "أوروبا":             0.75,
  "آسيا والمحيط الهادئ": 0.70,
  "أمريكا الشمالية":    0.65,
  "أفريقيا":            0.60,
  "أمريكا اللاتينية":   0.50,
  "الأسواق العالمية":   0.80,
  "الممرات البحرية":    0.90,
  "دولي":               0.55,
};

// ── Source Type Credibility ────────────────────────────────────────
const SOURCE_CREDIBILITY = {
  breaking:     0.90,
  global_event: 0.85,
  live_event:   0.80,
  news:         0.70,
  x_signal:     0.50,
  sports:       0.60,
  unknown:      0.40,
};

// ── Urgency Score ──────────────────────────────────────────────────
function urgencyScore(urgency) {
  if (urgency === "high") return 90;
  if (urgency === "medium") return 55;
  return 25;
}

// ── Entity Impact (strategic weight of linked entities) ────────────
function entityImpactScore(entities) {
  if (!entities || !entities.length) return 10;
  const maxWeight = Math.max(...entities.map(e => e.weight || 0));
  const diversity = Math.min(entities.length, 5);
  return Math.min(100, (maxWeight / 10) * 60 + diversity * 8);
}

// ── Source Count Confirmation ──────────────────────────────────────
function sourceConfirmationScore(sourceCount) {
  if (sourceCount >= 5) return 100;
  if (sourceCount >= 3) return 75;
  if (sourceCount >= 2) return 50;
  return 20;
}

// ── Event Linkage ──────────────────────────────────────────────────
function eventLinkageScore(linkedEvents) {
  if (!linkedEvents || !linkedEvents.length) return 10;
  return Math.min(100, linkedEvents.length * 30 + 20);
}

// ── Sports Importance ──────────────────────────────────────────────
function sportsImportanceScore(signal) {
  if (signal.category !== "رياضة" && signal.category !== "انتقالات") return 0;
  const text = (signal.text || signal.title || "").toLowerCase();
  let score = 30;
  // Major match
  if (/final|نهائي|كلاسيكو|ديربي|derby/i.test(text)) score += 30;
  // Title race
  if (/title|لقب|صدارة|بطولة/i.test(text)) score += 20;
  // Major transfer
  if (/million|مليون|record|رقم قياسي/i.test(text)) score += 25;
  // Injury to key player
  if (/injury|إصابة|torn|تمزق/i.test(text)) score += 15;
  // UAE clubs
  if (/الشارقة|العين|شباب الأهلي|الوصل|الجزيرة|الوحدة/i.test(text)) score += 15;
  return Math.min(100, score);
}

// ── Market Sensitivity ─────────────────────────────────────────────
function marketSensitivityScore(signal) {
  const text = (signal.text || signal.title || "").toLowerCase();
  let score = 0;
  if (/oil|نفط|crude|بترول/i.test(text)) score += 40;
  if (/sanctions|عقوبات/i.test(text)) score += 30;
  if (/gold|ذهب/i.test(text)) score += 20;
  if (/dollar|دولار|inflation|تضخم/i.test(text)) score += 25;
  if (/shipping|شحن|strait|مضيق/i.test(text)) score += 35;
  if (/opec|أوبك/i.test(text)) score += 30;
  return Math.min(100, score);
}

/**
 * Score a radar signal → radarScore 0-100
 */
export function scoreRadarSignal(signal) {
  const isSports = signal.category === "رياضة" || signal.category === "انتقالات";

  const u = urgencyScore(signal.urgency);
  const catWeight = CATEGORY_WEIGHT[signal.category] || 0.5;
  const strategic = catWeight * 100;
  const credibility = SOURCE_CREDIBILITY[signal.sourceType] || SOURCE_CREDIBILITY.unknown;
  const credScore = credibility * 100;
  const confirm = sourceConfirmationScore(signal.sourceCount);
  const linkage = eventLinkageScore(signal.linkedEvents);
  const regionSens = (REGION_SENSITIVITY[signal.region] || 0.5) * 100;
  const marketSens = marketSensitivityScore(signal);
  const sportsImp = sportsImportanceScore(signal);
  const entityImp = entityImpactScore(signal.entities);

  // Forecast relevance bonus: high-urgency items in strategic categories
  const forecastRel = (signal.urgency === "high" && catWeight > 0.6) ? 80 : 30;

  let score;
  if (isSports) {
    // Sports weighting (sports importance gets larger share)
    score =
      u * 0.15 +
      strategic * 0.10 +
      credScore * 0.08 +
      confirm * 0.10 +
      linkage * 0.05 +
      forecastRel * 0.02 +
      regionSens * 0.05 +
      marketSens * 0.05 +
      sportsImp * 0.30 +
      entityImp * 0.10;
  } else {
    score =
      u * 0.20 +
      strategic * 0.15 +
      credScore * 0.10 +
      confirm * 0.15 +
      linkage * 0.10 +
      forecastRel * 0.05 +
      regionSens * 0.10 +
      marketSens * 0.05 +
      entityImp * 0.10;
  }

  // Confidence boost: assign confidence on signal
  signal.confidence = Math.round(
    25 +
    Math.min(25, signal.sourceCount * 8) +
    (credibility * 20) +
    Math.min(20, (signal.linkedEvents?.length || 0) * 10)
  );
  signal.confidence = Math.min(95, signal.confidence);

  return Math.round(Math.min(97, Math.max(5, score)));
}
