const TRANSLATION_CACHE = new Map();
const TRANSLATION_CACHE_STORAGE_KEY = "kar-summary-localization-cache";
const TRANSLATION_CACHE_LIMIT = 300;

// ============================================
// HTML ENTITIES DECODER
// ============================================
function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return "";

  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&nbsp;": " ",
    "&iexcl;": "¡",
    "&iquest;": "¿",
    "&cent;": "¢",
    "&pound;": "£",
    "&yen;": "¥",
    "&euro;": "€",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&deg;": "°",
    "&micro;": "µ",
    "&para;": "¶",
    "&times;": "×",
    "&divide;": "÷",
    "&plusmn;": "±",
  };

  let decoded = text;
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.split(entity).join(char);
  });

  decoded = decoded.replace(/&#(\d+);/g, (match, code) => {
    try {
      return String.fromCharCode(parseInt(code, 10));
    } catch {
      return match;
    }
  });

  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });

  return decoded;
}

// ============================================
// TEXT SANITIZATION & QUALITY CHECKS
// ============================================
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";

  let clean = text
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\S+@\S+/g, " ")
    .replace(/([!?.])\1{2,}/g, "$1")
    .replace(/[{}[\]<>]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  clean = clean.replace(/^[^\u0600-\u06FFA-Za-z0-9]+/, "").replace(/[^\u0600-\u06FFA-Za-z0-9]+$/, "");

  return clean;
}

function isArabicText(text) {
  if (!text) return false;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  return arabicChars > latinChars;
}

function isAcceptableQuality(text) {
  if (!text || text.length < 3) return false;

  const specialChars = (text.match(/[^\u0600-\u06FFA-Za-z0-9\s،؛:\-.—]/g) || []).length;
  if (specialChars > text.length * 0.3) return false;

  if (isArabicText(text)) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[A-Za-z]/g) || []).length;
    if (latinChars > text.length * 0.3) return false;
  }

  return true;
}

function needsCleaning(text) {
  if (!text) return false;
  return /&[a-z#]+;|&#\d+;|&#x[0-9A-Fa-f]+;|<[^>]*>|[{}[\]<>]|\\[a-z]/i.test(text);
}

// ============================================
// KEY INFORMATION EXTRACTION
// ============================================
function extractKeyInfo(text) {
  const normalized = text.toLowerCase();

  const conflicts = ["غزة", "إسرائيل", "إيران", "أوكرانيا", "روسيا", "صاروخ", "صواريخ", "هجوم", "هجمات", "ضربة", "ضربات", "قصف", "قتال", "حرب", "جندي", "جنود", "قتلى"];
  const economics = ["نفط", "أسعار", "أسواق", "تضخم", "اقتصاد", "اقتصادي", "بنك", "بنوك", "دولار", "يورو", "استثمار", "سهم", "صفقة"];
  const diplomacy = ["محادثات", "اجتماع", "قمة", "سفير", "الأمم المتحدة", "اتفاق", "معاهدة", "نقاش"];
  const politics = ["رئيس", "وزير", "حكومة", "برلمان", "انتخابات", "حملة", "سياسة"];
  const sports = ["كرة", "فوتبول", "كرة قدم", "انتقال", "بطولة", "فريق", "لاعب", "مباراة"];
  const technology = ["تقنية", "ذكاء اصطناعي", "برنامج", "كمبيوتر", "إنترنت", "تطبيق"];
  const environment = ["بيئة", "مناخ", "تغير مناخي", "انحباس حراري", "تلوث"];

  const hasConflict = conflicts.some((word) => normalized.includes(word));
  const hasEconomics = economics.some((word) => normalized.includes(word));
  const hasDiplomacy = diplomacy.some((word) => normalized.includes(word));
  const hasPolitics = politics.some((word) => normalized.includes(word));
  const hasSports = sports.some((word) => normalized.includes(word));
  const hasTechnology = technology.some((word) => normalized.includes(word));
  const hasEnvironment = environment.some((word) => normalized.includes(word));

  return { hasConflict, hasEconomics, hasDiplomacy, hasPolitics, hasSports, hasTechnology, hasEnvironment };
}

function extractEntities(text) {
  const entities = { people: [], places: [], organizations: [] };

  const peoplePatterns = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const matches = text.match(peoplePatterns) || [];
  entities.people = matches.slice(0, 3);

  const locationKeywords = ["أمريكا", "روسيا", "الصين", "أوروبا", "الشرق الأوسط", "إيران", "إسرائيل", "أوكرانيا", "تايوان", "كوريا", "الهند"];
  entities.places = locationKeywords.filter((loc) => text.includes(loc));

  const orgPatterns = /(?:Bank|Fund|United Nations|NATO|WHO|ICC|Reuters|BBC|AP|AFP)/gi;
  entities.organizations = ((text.match(orgPatterns) || []).map((o) => o.toLowerCase()).map((o) => {
    const translations = {
      reuters: "رويترز",
      bbc: "بي بي سي",
      ap: "أسوشيتد برس",
      afp: "فرانس برس",
      nato: "حلف الناتو",
      who: "منظمة الصحة العالمية",
      "united nations": "الأمم المتحدة",
      bank: "بنك",
      fund: "صندوق",
    };
    return translations[o] || o;
  }));

  return entities;
}

// ============================================
// JOURNALISTIC HEADLINE GENERATION
// ============================================
function generateJournalisticHeadline(rawText, options = {}) {
  const cleaned = sanitizeText(rawText);
  if (!cleaned) return "تطور خبري جديد";

  const { category = "", source = "" } = options;
  const info = extractKeyInfo(cleaned);
  const entities = extractEntities(cleaned);

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "or", "is", "are", "was", "be", "as", "at", "by", "of", "in", "to", "a", "an"].includes(w.toLowerCase()))
    .slice(0, 5);

  if (info.hasConflict) {
    if (entities.places.length > 0) {
      return `تطور أمني جديد في ${entities.places[0]}`;
    }
    if (words.length > 0) {
      return `${words[0]} يشهد تصعيدًا عسكريًا جديدًا`;
    }
    return "تطور عسكري هام تحت المتابعة";
  }

  if (info.hasEconomics) {
    if (words.some((w) => w.toLowerCase().includes("oil") || w.toLowerCase().includes("نفط"))) {
      return "أسعار النفط تشهد تطورات جديدة";
    }
    if (words.some((w) => w.toLowerCase().includes("market") || w.toLowerCase().includes("أسواق"))) {
      return "الأسواق العالمية تتفاعل مع أنباء اقتصادية";
    }
    return "تطور اقتصادي هام يستحق المتابعة";
  }

  if (info.hasDiplomacy) {
    if (entities.people.length > 0) {
      return `${entities.people[0]} يشارك في محادثات دبلوماسية`;
    }
    return "جهود دبلوماسية جديدة على الطاولة";
  }

  if (info.hasPolitics) {
    if (entities.places.length > 0) {
      return `تطور سياسي جديد في ${entities.places[0]}`;
    }
    return "تحرك سياسي يشغل الساحة الدولية";
  }

  if (info.hasSports) {
    if (words.some((w) => w.toLowerCase().includes("transfer") || w.toLowerCase().includes("انتقال"))) {
      return "انتقال رياضي يشغل أسواق الكرة العالمية";
    }
    return "خبر رياضي جديد يثير الاهتمام";
  }

  if (info.hasTechnology) {
    return "انجاز تقني جديد يُعيد تعريف المستقبل";
  }

  if (info.hasEnvironment) {
    return "تطور بيئي يستحق الانتباه الجاد";
  }

  return "تطور خبري جديد على الساحة الدولية";
}

// ============================================
// JOURNALISTIC SUMMARY GENERATION
// ============================================
function generateJournalisticSummary(rawText, options = {}) {
  const cleaned = sanitizeText(rawText);
  if (!cleaned || cleaned.length < 10) {
    return "تطور جديد يستحق متابعة دقيقة";
  }

  const info = extractKeyInfo(cleaned);
  const maxLength = 180;

  if (cleaned.length <= maxLength && isArabicText(cleaned)) {
    return cleaned;
  }

  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 5).slice(0, 1);

  if (sentences.length > 0) {
    let summary = sentences[0].trim();
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + "...";
    }
    return summary;
  }

  if (info.hasConflict) {
    return "أنباء عن تطورات عسكرية جديدة تستدعي متابعة دقيقة.";
  }
  if (info.hasEconomics) {
    return "تحركات سوقية جديدة يتابعها المستثمرون حول العالم.";
  }
  if (info.hasDiplomacy) {
    return "خطوات دبلوماسية جديدة في مساعي دولية للتصريحات.";
  }
  if (info.hasPolitics) {
    return "تطورات سياسية هامة تؤثر على المشهد الدولي.";
  }

  return "خبر جديد يستحق اهتمامك الآن.";
}

// ============================================
// MAIN NEWS PROCESSOR FUNCTION
// ============================================
export function processNewsItem(item, language = "ar") {
  if (!item || typeof item !== "object") return null;

  if (language !== "ar") {
    return {
      ...item,
      title: sanitizeText(item.title || item.headline || ""),
      summary: sanitizeText(item.summary || item.description || ""),
      source: item.source || item.author || "",
      cleaned: true,
      language,
    };
  }

  const rawTitle = item.title || item.headline || "";
  const rawSummary = item.summary || item.description || item.text || "";
  const source = item.source || item.author || "";
  const category = item.category || item.type || "";

  const decodedTitle = decodeHtmlEntities(rawTitle);
  const decodedSummary = decodeHtmlEntities(rawSummary);

  const sanitizedTitle = sanitizeText(decodedTitle);
  const sanitizedSummary = sanitizeText(decodedSummary);

  let finalTitle = "";
  let finalSummary = "";

  if (isArabicText(sanitizedTitle) && isAcceptableQuality(sanitizedTitle)) {
    finalTitle = sanitizedTitle;
  } else {
    finalTitle = generateJournalisticHeadline(sanitizedTitle || sanitizedSummary || rawTitle || rawSummary, {
      category,
      source,
    });
  }

  if (isArabicText(sanitizedSummary) && isAcceptableQuality(sanitizedSummary) && sanitizedSummary.length > 10) {
    finalSummary = sanitizedSummary;
  } else {
    finalSummary = generateJournalisticSummary(sanitizedSummary || sanitizedTitle || rawSummary || rawTitle, {
      category,
      source,
    });
  }

  return {
    ...item,
    _original: { title: rawTitle, summary: rawSummary },
    _decoded: { title: decodedTitle, summary: decodedSummary },
    _sanitized: { title: sanitizedTitle, summary: sanitizedSummary },
    title: finalTitle,
    summary: finalSummary,
    description: finalSummary,
    source: source || "مصدر موثوق",
    category: category || "عام",
    cleaned: true,
    language: "ar",
    qualityScore: isAcceptableQuality(finalTitle) && isAcceptableQuality(finalSummary) ? "high" : "medium",
    isArabic: isArabicText(finalTitle) && isArabicText(finalSummary),
  };
}

// ============================================
// BATCH PROCESSING
// ============================================
export function processBatchNews(items, language = "ar") {
  if (!Array.isArray(items)) return [];
  return items.map((item) => processNewsItem(item, language)).filter(Boolean);
}

// ============================================
// EXPORTS FOR NEWS PROCESSOR COMPATIBILITY
// ============================================
export { decodeHtmlEntities, sanitizeText, isArabicText, isAcceptableQuality, needsCleaning, extractKeyInfo, extractEntities, generateJournalisticHeadline, generateJournalisticSummary };

const EN_TO_AR_TERMS = [
  ["breaking", "عاجل"],
  ["live", "مباشر"],
  ["conflict", "صراع"],
  ["tension", "توتر"],
  ["summit", "قمة"],
  ["ceasefire", "هدنة"],
  ["economy", "اقتصاد"],
  ["economic", "اقتصادي"],
  ["markets", "الأسواق"],
  ["market", "السوق"],
  ["oil", "النفط"],
  ["energy", "الطاقة"],
  ["risk", "مخاطر"],
  ["impact", "أثر"],
  ["global", "عالمي"],
  ["regional", "إقليمي"],
  ["politics", "سياسة"],
  ["political", "سياسي"],
  ["military", "عسكري"],
  ["war", "حرب"],
  ["security", "أمن"],
  ["attack", "هجوم"],
  ["strike", "ضربة"],
  ["drone", "طائرة مسيّرة"],
  ["missile", "صاروخ"],
  ["talks", "محادثات"],
  ["agreement", "اتفاق"],
  ["government", "الحكومة"],
  ["president", "الرئيس"],
  ["minister", "الوزير"],
  ["election", "انتخابات"],
  ["trade", "تجارة"],
  ["sanctions", "عقوبات"],
  ["inflation", "تضخم"],
  ["supply", "إمدادات"],
  ["ship", "سفينة"],
  ["shipping", "الشحن"],
  ["aircraft", "طائرة"],
  ["track", "مسار"],
  ["sports", "رياضة"],
  ["football", "كرة القدم"],
  ["transfer", "انتقال"],
  ["source", "المصدر"],
  ["summary", "ملخص"],
  ["confidence", "الموثوقية"],
  ["signals", "مؤشرات مهمة"],
  ["signal", "مؤشر مهم"],
  ["pattern", "اتجاه متكرر"],
  ["region", "المنطقة"],
  ["country", "الدولة"],
  ["related events", "أحداث مرتبطة"],
  ["last update", "آخر تحديث"],
];

const SOURCE_LABELS_AR = {
  bbc: "بي بي سي",
  reuters: "رويترز",
  "google news": "أخبار غوغل",
  google: "غوغل",
  ap: "أسوشيتد برس",
  "associated press": "أسوشيتد برس",
  npr: "إن بي آر",
  "sky news": "سكاي نيوز",
  "al jazeera": "الجزيرة",
  cnbc: "سي إن بي سي",
  "yahoo finance": "ياهو فاينانس",
  "world bank": "البنك الدولي",
  x: "إكس",
  twitter: "إكس",
  news: "الأخبار",
  sports: "رياضة",
  live: "مباشر",
  "live-intake": "التجميع المباشر",
  "live-intake-open-source": "التجميع المباشر من مصادر مفتوحة",
  intelnews: "الأخبار التحليلية",
  "x-feed": "إشارات إكس",
  "global-events": "الأحداث العالمية",
  "global-map-state": "حالة الخريطة العالمية",
  radar: "الرادار",
  "fallback feed": "المصدر الاحتياطي",
  "open source": "مصدر مفتوح",
  system: "النظام",
};

const CATEGORY_LABELS_AR = {
  all: "الكل",
  regional: "إقليمي",
  politics: "سياسة",
  political: "سياسي",
  military: "عسكري",
  economy: "اقتصاد",
  economic: "اقتصادي",
  sports: "رياضة",
  conflict: "صراع",
  diplomacy: "دبلوماسية",
  market: "أسواق",
  energy: "طاقة",
  humanitarian: "إنساني",
  technology: "تقنية",
  environment: "بيئة",
  breaking: "عاجل",
  emerging: "ناشئ",
  air: "جوي",
  aviation: "طيران",
  maritime: "بحري",
  logistics: "إمداد",
  geopolitics: "جيوسياسي",
  uae: "الإمارات",
};

const ENTITY_LABELS_AR = [
  ["middle east", "الشرق الأوسط"],
  ["europe", "أوروبا"],
  ["asia-pacific", "آسيا والمحيط الهادئ"],
  ["asia", "آسيا"],
  ["north america", "أمريكا الشمالية"],
  ["americas", "الأمريكتان"],
  ["global", "عالمي"],
  ["international", "دولي"],
  ["israel", "إسرائيل"],
  ["gaza", "غزة"],
  ["iran", "إيران"],
  ["saudi", "السعودية"],
  ["uae", "الإمارات"],
  ["ukraine", "أوكرانيا"],
  ["russia", "روسيا"],
  ["china", "الصين"],
  ["taiwan", "تايوان"],
  ["united states", "الولايات المتحدة"],
  ["america", "أمريكا"],
  ["red sea", "البحر الأحمر"],
  ["oil", "النفط"],
  ["gas", "الغاز"],
  ["opec", "أوبك"],
];

function guessScript(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[A-Za-z]/.test(text)) return "en";
  return "unknown";
}

function normalizeText(text) {
  return String(text || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\[\]{}<>]/g, " ")
    .replace(/[|_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function replaceKnownTerms(text) {
  let localized = text;

  EN_TO_AR_TERMS.forEach(([from, to]) => {
    localized = localized.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
  });

  ENTITY_LABELS_AR.forEach(([from, to]) => {
    localized = localized.replace(new RegExp(from, "gi"), to);
  });

  return localized;
}

function stripResidualLatin(text) {
  return String(text || "")
    .replace(/[A-Za-z][A-Za-z0-9+&@#'./:-]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function synthesizeArabicText(originalText, { kind = "summary", category = "", source = "" } = {}) {
  const localizedCategory = localizeCategoryLabel(category, "ar") || "عام";
  const localizedSource = localizeSourceLabel(source, "ar") || "المصدر";
  const body = normalizeText(originalText);
  const hasConflict = /غزة|إسرائيل|إيران|صاروخ|هجوم|ضربة|attack|strike|missile|war|conflict/i.test(body);
  const hasEconomy = /نفط|أسواق|تضخم|اقتصاد|oil|market|economy|inflation/i.test(body);

  if (kind === "title") {
    if (hasConflict) return "تطور أمني قيد المتابعة";
    if (hasEconomy) return "تطور اقتصادي قيد المتابعة";
    if (localizedCategory && localizedCategory !== "عام") return `تطور ${localizedCategory} قيد المتابعة`;
    return "تطور خبري قيد المتابعة";
  }

  if (hasConflict) return `ملخص عربي موجز لخبر أمني من ${localizedSource} حول تطورات قيد المتابعة.`;
  if (hasEconomy) return `ملخص عربي موجز لخبر اقتصادي من ${localizedSource} يتعلق بحركة الأسواق والطاقة.`;
  return `ملخص عربي موجز لخبر من ${localizedSource} ضمن تصنيف ${localizedCategory}.`;
}

export function containsLatinChars(text) {
  return /[A-Za-z]/.test(String(text || ""));
}

export function containsArabicChars(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

export function localizeSourceLabel(source, language = "ar") {
  const normalized = normalizeText(source).toLowerCase();
  if (!normalized) return language === "ar" ? "مصدر غير محدد" : "Unknown source";
  if (language !== "ar") return source;

  const direct = SOURCE_LABELS_AR[normalized];
  if (direct) return direct;

  for (const [key, value] of Object.entries(SOURCE_LABELS_AR)) {
    if (normalized.includes(key)) return value;
  }

  const replaced = stripResidualLatin(replaceKnownTerms(normalized));
  return containsArabicChars(replaced) ? replaced : "مصدر مفتوح";
}

export function localizeCategoryLabel(category, language = "ar") {
  const normalized = normalizeText(category).toLowerCase();
  if (!normalized) return language === "ar" ? "عام" : "General";
  if (language !== "ar") return category;
  return CATEGORY_LABELS_AR[normalized] || stripResidualLatin(replaceKnownTerms(normalized)) || "عام";
}

export function localizeSummaryText(text, language, options = {}) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return "";

  ensureCacheHydrated();

  const cacheKey = `${language}:${options.kind || "text"}:${options.category || ""}:${normalizedText}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey);
  }

  if (language !== "ar") {
    writeCacheEntry(cacheKey, normalizedText);
    return normalizedText;
  }

  const script = guessScript(normalizedText);
  let localized = normalizedText;

  if (script === "en" || containsLatinChars(normalizedText)) {
    localized = replaceKnownTerms(normalizedText);
    localized = stripResidualLatin(localized);
  }

  if (!containsArabicChars(localized)) {
    localized = synthesizeArabicText(normalizedText, options);
  }

  localized = normalizeText(localized);
  writeCacheEntry(cacheKey, localized);
  return localized;
}

export function localizeDisplayItem(item, language = "ar") {
  if (!item || typeof item !== "object") return item;

  if (language !== "ar") {
    return {
      ...item,
      title: normalizeText(item.title || item.title_en || item.headline || item.label || item.translated || item.text || ""),
      summary: normalizeText(item.summary || item.summary_en || item.description || item.explanation || item.text || ""),
      source: normalizeText(item.source || item.authorName || item.author || ""),
      category: normalizeText(item.category || item.type || item.domain || item.queryDomain || ""),
    };
  }

  // Arabic mode: Use improved news processor for better quality
  const rawTitle = item.title || item.title_ar || item.titleAr || item.headline_ar || item.headline || "";
  const rawSummary = item.summary || item.summary_ar || item.summaryAr || item.description || "";
  
  const needsProcessing = needsCleaning(rawTitle) || needsCleaning(rawSummary);
  
  if (needsProcessing) {
    // Use new processor for better quality Arabic output
    const processed = processNewsItem({
      title: rawTitle,
      summary: rawSummary,
      source: item.source || item.authorName || item.author || "",
      category: item.category || item.type || item.domain || item.queryDomain || "",
    }, "ar");
    
    return {
      ...item,
      title: processed.title,
      summary: processed.summary,
      description: processed.summary,
      source: processed.source || localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
      sourceLabel: processed.source || localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
      category: processed.category || localizeCategoryLabel(item.category || item.type || item.domain || item.queryDomain || "", "ar"),
      isArabicReady: processed.isArabic,
      qualityScore: processed.qualityScore,
    };
  }

  // Fallback to original implementation for safe content
  const title = localizeSummaryText(
    item.title_ar || item.titleAr || item.headline_ar || item.translatedTitle || item.title || item.headline || item.label || item.translated || item.text || "",
    "ar",
    {
      kind: "title",
      category: item.category || item.type,
      source: item.source || item.authorName || item.author,
    }
  );

  const summary = localizeSummaryText(
    item.summary_ar || item.summaryAr || item.description_ar || item.translatedSummary || item.summary || item.description || item.explanation || item.text || title,
    "ar",
    {
      kind: "summary",
      category: item.category || item.type,
      source: item.source || item.authorName || item.author,
    }
  );

  return {
    ...item,
    title,
    summary,
    description: summary,
    source: localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
    sourceLabel: localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
    category: localizeCategoryLabel(item.category || item.type || item.domain || item.queryDomain || "", "ar"),
    isArabicReady: containsArabicChars(title) && !containsLatinChars(title) && !containsLatinChars(summary),
  };
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
