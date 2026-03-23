/**
 * sourceRegistry.js
 *
 * Comprehensive source trust management system.
 * Tracks trust score, response speed, historical accuracy, specialization,
 * geographic/linguistic sensitivity, and duplicate tendency per source.
 *
 * Data is layered:
 *  1. KNOWN_SOURCES — pre-seeded, high-fidelity known outlets.
 *  2. Runtime adjustment — degraded/boosted in-session based on content signals.
 *
 * All scores are [0, 1] unless noted otherwise.
 */

// ── Pre-seeded source catalogue ────────────────────────────────────────────────

const KNOWN_SOURCES = {
  // ── Global wire services ───
  Reuters: {
    trust: 0.97, speed: 0.94, accuracy: 0.96, specializations: ["politics", "economy", "finance", "general"],
    geoCoverage: ["global"], language: ["en", "ar"], duplicateTendency: 0.12,
  },
  AP: {
    trust: 0.96, speed: 0.95, accuracy: 0.96, specializations: ["politics", "economy", "sports", "general"],
    geoCoverage: ["global"], language: ["en"], duplicateTendency: 0.13,
  },
  AFP: {
    trust: 0.94, speed: 0.93, accuracy: 0.93, specializations: ["politics", "sports", "general"],
    geoCoverage: ["global", "europe", "africa"], language: ["en", "ar", "fr"], duplicateTendency: 0.15,
  },

  // ── Broadcast/digital global ───
  BBC: {
    trust: 0.93, speed: 0.82, accuracy: 0.94, specializations: ["politics", "technology", "culture", "health"],
    geoCoverage: ["global", "europe", "uk"], language: ["en", "ar"], duplicateTendency: 0.18,
  },
  "Al Jazeera": {
    trust: 0.90, speed: 0.88, accuracy: 0.88, specializations: ["politics", "regional", "human rights"],
    geoCoverage: ["global", "middleeast", "gulf"], language: ["ar", "en"], duplicateTendency: 0.16,
  },
  CNN: {
    trust: 0.86, speed: 0.88, accuracy: 0.84, specializations: ["politics", "economy", "sports"],
    geoCoverage: ["global", "usa"], language: ["en"], duplicateTendency: 0.22,
  },
  "Sky News": {
    trust: 0.85, speed: 0.88, accuracy: 0.84, specializations: ["politics", "economy", "general"],
    geoCoverage: ["global", "uk", "middleeast"], language: ["en", "ar"], duplicateTendency: 0.21,
  },
  "France 24": {
    trust: 0.84, speed: 0.84, accuracy: 0.83, specializations: ["politics", "culture", "africa", "middle east"],
    geoCoverage: ["global", "europe", "africa"], language: ["ar", "en", "fr"], duplicateTendency: 0.19,
  },

  // ── Gulf / Regional ───
  "Gulf News": {
    trust: 0.82, speed: 0.79, accuracy: 0.82, specializations: ["regional", "economy", "uae", "sports"],
    geoCoverage: ["gulf", "uae", "middleeast"], language: ["en", "ar"], duplicateTendency: 0.24,
  },
  "Saudi Gazette": {
    trust: 0.80, speed: 0.76, accuracy: 0.80, specializations: ["politics", "economy", "regional"],
    geoCoverage: ["gulf", "saudi"], language: ["en"], duplicateTendency: 0.25,
  },
  WAM: {
    trust: 0.88, speed: 0.82, accuracy: 0.90, specializations: ["uae", "politics", "economy", "official"],
    geoCoverage: ["uae", "gulf"], language: ["ar", "en"], duplicateTendency: 0.10,
  },
  SPA: {
    trust: 0.87, speed: 0.80, accuracy: 0.88, specializations: ["saudi", "politics", "economy", "official"],
    geoCoverage: ["saudi", "gulf"], language: ["ar"], duplicateTendency: 0.11,
  },
  "Al Arabiya": {
    trust: 0.85, speed: 0.87, accuracy: 0.84, specializations: ["politics", "regional", "economy"],
    geoCoverage: ["middleeast", "gulf", "global"], language: ["ar", "en"], duplicateTendency: 0.20,
  },
  "Sky News Arabia": {
    trust: 0.83, speed: 0.86, accuracy: 0.82, specializations: ["politics", "general", "regional"],
    geoCoverage: ["middleeast", "gulf"], language: ["ar"], duplicateTendency: 0.22,
  },

  // ── Financial / Economic ───
  Bloomberg: {
    trust: 0.95, speed: 0.90, accuracy: 0.94, specializations: ["finance", "economy", "technology", "markets"],
    geoCoverage: ["global"], language: ["en"], duplicateTendency: 0.14,
  },
  "Financial Times": {
    trust: 0.93, speed: 0.82, accuracy: 0.93, specializations: ["finance", "economics", "politics"],
    geoCoverage: ["global"], language: ["en"], duplicateTendency: 0.15,
  },
  "Wall Street Journal": {
    trust: 0.92, speed: 0.82, accuracy: 0.91, specializations: ["finance", "economy", "usa"],
    geoCoverage: ["global", "usa"], language: ["en"], duplicateTendency: 0.17,
  },

  // ── Technology ───
  TechCrunch: {
    trust: 0.80, speed: 0.84, accuracy: 0.80, specializations: ["technology", "startups"],
    geoCoverage: ["global", "usa"], language: ["en"], duplicateTendency: 0.26,
  },
  "The Verge": {
    trust: 0.79, speed: 0.82, accuracy: 0.80, specializations: ["technology", "culture"],
    geoCoverage: ["global", "usa"], language: ["en"], duplicateTendency: 0.27,
  },

  // ── Sports ───
  "BBC Sport": {
    trust: 0.90, speed: 0.84, accuracy: 0.91, specializations: ["sports"],
    geoCoverage: ["global", "uk"], language: ["en"], duplicateTendency: 0.18,
  },
  "Goal.com": {
    trust: 0.79, speed: 0.86, accuracy: 0.79, specializations: ["sports", "football"],
    geoCoverage: ["global"], language: ["en", "ar"], duplicateTendency: 0.32,
  },

  // ── Default fallback ───
  default: {
    trust: 0.60, speed: 0.60, accuracy: 0.60, specializations: ["general"],
    geoCoverage: ["unknown"], language: ["unknown"], duplicateTendency: 0.40,
  },
};

// ── Runtime adjustment store (in-memory, session-scoped) ───────────────────────

const _runtimeAdjustments = new Map();

function resolveSourceKey(rawSource = "") {
  const source = String(rawSource || "").trim();
  if (!source) return null;

  const exact = Object.keys(KNOWN_SOURCES).find((key) => key !== "default" && key === source);
  if (exact) return exact;

  const partial = Object.keys(KNOWN_SOURCES).find((key) => key !== "default" && source.includes(key));
  if (partial) return partial;

  const reverse = Object.keys(KNOWN_SOURCES).find((key) => key !== "default" && key.includes(source));
  if (reverse) return reverse;

  return null;
}

export function getSourceProfile(rawSource = "") {
  const key = resolveSourceKey(rawSource);
  const base = key ? KNOWN_SOURCES[key] : KNOWN_SOURCES.default;
  const adjustment = _runtimeAdjustments.get(key || rawSource) || {};

  return {
    name: key || rawSource || "Unknown",
    trust: Math.min(1, Math.max(0, Number(base.trust) + Number(adjustment.trustDelta || 0))),
    speed: Number(base.speed),
    accuracy: Math.min(1, Math.max(0, Number(base.accuracy) + Number(adjustment.accuracyDelta || 0))),
    specializations: Array.isArray(base.specializations) ? base.specializations : ["general"],
    geoCoverage: Array.isArray(base.geoCoverage) ? base.geoCoverage : ["unknown"],
    language: Array.isArray(base.language) ? base.language : ["unknown"],
    duplicateTendency: Math.min(1, Math.max(0, Number(base.duplicateTendency) + Number(adjustment.tendencyDelta || 0))),
    isKnown: Boolean(key),
    adjustments: Object.keys(adjustment).length > 0 ? adjustment : null,
  };
}

export function adjustSourceRuntime(rawSource = "", delta = {}) {
  const key = resolveSourceKey(rawSource) || rawSource;
  const current = _runtimeAdjustments.get(key) || {};
  _runtimeAdjustments.set(key, {
    trustDelta: Number(current.trustDelta || 0) + Number(delta.trustDelta || 0),
    accuracyDelta: Number(current.accuracyDelta || 0) + Number(delta.accuracyDelta || 0),
    tendencyDelta: Number(current.tendencyDelta || 0) + Number(delta.tendencyDelta || 0),
    lastAdjustedAt: Date.now(),
  });
}

export function getSourceTrustScore(rawSource = "") {
  return getSourceProfile(rawSource).trust;
}

export function isSpecializedInCategory(rawSource = "", category = "") {
  const profile = getSourceProfile(rawSource);
  const cat = String(category || "").toLowerCase();
  return profile.specializations.some((spec) => spec.toLowerCase().includes(cat) || cat.includes(spec.toLowerCase()));
}

export function rankSourcesByTrust(sourceList = []) {
  return [...new Set(sourceList.map(String))]
    .map((src) => ({ source: src, profile: getSourceProfile(src) }))
    .sort((a, b) => b.profile.trust - a.profile.trust);
}

export function getSourceDuplicateTendency(rawSource = "") {
  return getSourceProfile(rawSource).duplicateTendency;
}

export function getAllKnownSources() {
  return Object.keys(KNOWN_SOURCES).filter((k) => k !== "default");
}
