/**
 * Credibility Agent — assigns trust weights to news sources
 * and flags low-credibility signals as "unconfirmed".
 *
 * Credibility scale:
 *   very_high → Reuters, BBC, AP, AFP
 *   high      → Al Jazeera, The Guardian, Financial Times, Deutsche Welle
 *   medium_high → Sky News, CNN, Euronews, France24
 *   medium    → local newspapers, regional outlets
 *   low       → social media, blogs, unknown
 */

// ── Source credibility map ────────────────────────────────────────────────────
export const SOURCE_CREDIBILITY = {
  // Very high
  reuters:        { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً",   labelEn: "Very High",    color: "#22c55e" },
  bbc:            { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً",   labelEn: "Very High",    color: "#22c55e" },
  ap:             { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً",   labelEn: "Very High",    color: "#22c55e" },
  afp:            { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً",   labelEn: "Very High",    color: "#22c55e" },
  "associated press": { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً", labelEn: "Very High",  color: "#22c55e" },
  "bbc news":     { weight: 1.0, tier: "very_high", label: "موثوقية عالية جداً",   labelEn: "Very High",    color: "#22c55e" },

  // High
  aljazeera:        { weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  "al jazeera":     { weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  guardian:         { weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  "the guardian":   { weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  ft:               { weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  "financial times":{ weight: 0.88, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  dw:               { weight: 0.85, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  "deutsche welle": { weight: 0.85, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  nytimes:          { weight: 0.87, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  "new york times": { weight: 0.87, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },
  washingtonpost:   { weight: 0.86, tier: "high", label: "موثوقية عالية",    labelEn: "High",        color: "#38bdf8" },

  // Medium-high
  skynews:          { weight: 0.75, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  "sky news":       { weight: 0.75, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  cnn:              { weight: 0.74, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  euronews:         { weight: 0.73, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  france24:         { weight: 0.75, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  arabianews:       { weight: 0.72, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  "arab news":      { weight: 0.72, tier: "medium_high", label: "موثوقية متوسطة-عالية", labelEn: "Medium-High", color: "#a78bfa" },
  rt:               { weight: 0.55, tier: "medium_high", label: "موثوقية متوسطة",        labelEn: "Medium",      color: "#f59e0b" },

  // Medium (local/regional)
  khaleej:          { weight: 0.65, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
  "khaleej times":  { weight: 0.65, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
  gulfnews:         { weight: 0.65, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
  "gulf news":      { weight: 0.65, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
  thenational:      { weight: 0.68, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
  "the national":   { weight: 0.68, tier: "medium", label: "موثوقية متوسطة", labelEn: "Medium", color: "#f59e0b" },
};

const DEFAULT_CREDIBILITY = { weight: 0.45, tier: "low", label: "إشارة غير مؤكدة", labelEn: "Unconfirmed Signal", color: "#ef4444" };

// ── Lookup ───────────────────────────────────────────────────────────────────
export function getSourceCredibility(sourceName) {
  if (!sourceName) return DEFAULT_CREDIBILITY;
  const key = sourceName.toLowerCase().trim();
  // Exact match
  if (SOURCE_CREDIBILITY[key]) return SOURCE_CREDIBILITY[key];
  // Partial match
  for (const [k, v] of Object.entries(SOURCE_CREDIBILITY)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return DEFAULT_CREDIBILITY;
}

/**
 * Compute an adjusted confidence score using source credibility.
 * @param {number} rawConfidence - base confidence (0–100)
 * @param {string} sourceName - source name string
 * @returns {number} adjusted confidence (0–100)
 */
export function adjustConfidenceByCredibility(rawConfidence, sourceName) {
  const cred = getSourceCredibility(sourceName);
  return Math.round(Math.min(100, rawConfidence * cred.weight + cred.weight * 10));
}

/**
 * Flag whether an item should be labeled "unconfirmed signal".
 */
export function isUnconfirmedSignal(item) {
  const cred = getSourceCredibility(item?.source);
  return cred.tier === "low";
}

/**
 * Evaluate a batch of items and attach credibility metadata.
 * @param {Array} items - array of agent items
 * @returns {Array} items enriched with credibilityWeight, credibilityTier, isUnconfirmed
 */
export function evaluateBatchCredibility(items) {
  return items.map(item => {
    const cred = getSourceCredibility(item.source);
    return {
      ...item,
      credibilityWeight: cred.weight,
      credibilityTier:   cred.tier,
      credibilityLabel:  cred.label,
      credibilityColor:  cred.color,
      isUnconfirmed:     cred.tier === "low",
      adjustedConfidence: adjustConfidenceByCredibility(item.confidence || 50, item.source),
    };
  });
}

/**
 * Get a credibility distribution summary for a set of items.
 */
export function getCredibilityDistribution(items) {
  const dist = { very_high: 0, high: 0, medium_high: 0, medium: 0, low: 0 };
  items.forEach(item => {
    const tier = getSourceCredibility(item.source).tier;
    dist[tier] = (dist[tier] || 0) + 1;
  });
  const total = items.length || 1;
  return {
    counts: dist,
    percentages: Object.fromEntries(
      Object.entries(dist).map(([k, v]) => [k, Math.round((v / total) * 100)])
    ),
    dominantTier: Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] || "low",
    unconfirmedCount: dist.low,
    unconfirmedPct: Math.round((dist.low / total) * 100),
  };
}
