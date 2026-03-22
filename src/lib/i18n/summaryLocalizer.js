const TRANSLATION_CACHE = new Map();

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

export function localizeSummaryText(text, language) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return "";

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

  TRANSLATION_CACHE.set(cacheKey, localized);
  return localized;
}

export function clearSummaryLocalizationCache() {
  TRANSLATION_CACHE.clear();
}
