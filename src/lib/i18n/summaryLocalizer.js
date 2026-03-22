const TRANSLATION_CACHE = new Map();
const TRANSLATION_CACHE_STORAGE_KEY = "kar-summary-localization-cache";
const TRANSLATION_CACHE_LIMIT = 200;

const EN_TO_AR = [
  ["breaking", "عاجل"],
  ["conflict", "صراع"],
  ["tension", "توتر"],
  ["summit", "قمة"],
  ["ceasefire", "هدنة"],
  ["economy", "اقتصاد"],
  ["markets", "الأسواق"],
  ["oil", "النفط"],
  ["risk", "مخاطر"],
  ["impact", "أثر"],
  ["global", "عالمي"],
];

const AR_TO_EN = [
  ["عاجل", "breaking"],
  ["صراع", "conflict"],
  ["توتر", "tension"],
  ["قمة", "summit"],
  ["هدنة", "ceasefire"],
  ["اقتصاد", "economy"],
  ["الأسواق", "markets"],
  ["النفط", "oil"],
  ["مخاطر", "risk"],
  ["أثر", "impact"],
  ["عالمي", "global"],
];

function guessScript(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[A-Za-z]/.test(text)) return "en";
  return "unknown";
}

function mapTerms(text, language) {
  if (!text) return text;
  const entries = language === "ar" ? EN_TO_AR : AR_TO_EN;
  return entries.reduce((acc, [from, to]) => {
    const pattern = new RegExp(from, "gi");
    return acc.replace(pattern, to);
  }, text);
}

function ensureCacheHydrated() {
  if (TRANSLATION_CACHE.size > 0 || typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(TRANSLATION_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.slice(-TRANSLATION_CACHE_LIMIT).forEach(([key, value]) => {
      if (typeof key === "string" && typeof value === "string") {
        TRANSLATION_CACHE.set(key, value);
      }
    });
  } catch {
    // Ignore malformed persisted cache.
  }
}

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.from(TRANSLATION_CACHE.entries()).slice(-TRANSLATION_CACHE_LIMIT);
    window.sessionStorage.setItem(TRANSLATION_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage failures.
  }
}

function writeCacheEntry(key, value) {
  if (TRANSLATION_CACHE.size >= TRANSLATION_CACHE_LIMIT) {
    const oldestKey = TRANSLATION_CACHE.keys().next().value;
    if (oldestKey) {
      TRANSLATION_CACHE.delete(oldestKey);
    }
  }
  TRANSLATION_CACHE.set(key, value);
  persistCache();
}

export function localizeSummaryText(text, language) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return "";

  ensureCacheHydrated();

  const cacheKey = `${language}:${normalizedText}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey);
  }

  const script = guessScript(normalizedText);
  let localized = normalizedText;

  if (language === "ar" && script === "en") {
    localized = mapTerms(normalizedText, "ar");
  } else if (language === "en" && script === "ar") {
    localized = mapTerms(normalizedText, "en");
  }

  writeCacheEntry(cacheKey, localized);
  return localized;
}

export function clearSummaryLocalizationCache() {
  TRANSLATION_CACHE.clear();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TRANSLATION_CACHE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
