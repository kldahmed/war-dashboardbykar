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

function isLiteralArabicLike(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const arabicCount = (value.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCount = (value.match(/[A-Za-z]/g) || []).length;
  if (latinCount > arabicCount) return true;
  if (/\bthe\b|\band\b|\bor\b|\bwith\b|\bfrom\b|\bmarket\b|\bbreaking\b|\bconflict\b|\beconomy\b/i.test(value)) return true;
  return false;
}

function needsCleaning(text) {
  if (!text) return false;
  return /&[a-z#]+;|&#\d+;|&#x[0-9A-Fa-f]+;|<[^>]*>|[{}[\]<>]|\\[a-z]/i.test(text);
}

const BAD_TITLE_PATTERNS = [
  /\bايران\s+صاروخ\s+اسرائيل\b/i,
  /\bايران\s+حرب\s+مباشر\b/i,
  /\bحرب\s+مباشر\s+ايران\b/i,
  /\bترامب\s+سوق\s+عالي\s+اقتصاد\b/i,
  /\bتطور\s+امني\s+قيد\s+المتابعة\b/i,
  /^\s*[\u0600-\u06FF]{2,12}(\s+[\u0600-\u06FF]{2,12}){0,2}\s*$/,
];

const EVENT_WORDS = [
  "إطلاق", "ضرب", "ضربة", "هجوم", "قصف", "اعتراض", "استهداف", "تصاعد", "انخفاض", "ارتفاع", "إعلان", "اتفاق", "اجتماع",
  "محادثات", "فرض", "تحذير", "توقيع", "اندلاع", "مقتل", "إصابة", "تراجع", "صعود", "تشديد", "تعليق"
];

const LINKING_WORDS = ["بين", "في", "مع", "ضد", "إلى", "على", "بعد", "حول", "باتجاه"];

function tokenCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasAnyWord(text, words) {
  const value = String(text || "");
  return words.some((word) => value.includes(word));
}

function titleLooksStacked(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return true;
  const noEvent = !hasAnyWord(value, EVENT_WORDS);
  const noLink = !hasAnyWord(value, LINKING_WORDS);
  return noEvent && noLink && tokens.length <= 5;
}

function evaluateArabicQuality(title, summary) {
  const cleanTitle = sanitizeText(decodeHtmlEntities(title || ""));
  const cleanSummary = sanitizeText(decodeHtmlEntities(summary || ""));
  const titleTokens = tokenCount(cleanTitle);
  const summaryTokens = tokenCount(cleanSummary);
  const titleHasArabic = containsArabicChars(cleanTitle);
  const summaryHasArabic = containsArabicChars(cleanSummary);
  const titleHasEvent = hasAnyWord(cleanTitle, EVENT_WORDS);
  const titleHasContext = hasAnyWord(cleanTitle, LINKING_WORDS);

  let clarityScore = 25;
  clarityScore += titleHasArabic ? 20 : -20;
  clarityScore += titleHasEvent ? 20 : -15;
  clarityScore += titleHasContext ? 10 : 0;
  clarityScore += titleTokens >= 4 && titleTokens <= 14 ? 15 : -10;
  clarityScore += titleLooksStacked(cleanTitle) ? -25 : 0;
  clarityScore += BAD_TITLE_PATTERNS.some((rule) => rule.test(cleanTitle)) ? -35 : 0;
  clarityScore += isLiteralArabicLike(cleanTitle) ? -20 : 0;

  let completenessScore = 25;
  completenessScore += summaryHasArabic ? 15 : -20;
  completenessScore += summaryTokens >= 7 ? 20 : -15;
  completenessScore += cleanSummary.length >= 36 ? 15 : -10;
  completenessScore += /\b(قال|أكد|أعلن|أفاد|أوضح|ذكرت|أشارت|أعلنت)\b/.test(cleanSummary) ? 10 : 0;
  completenessScore += /[A-Za-z]/.test(cleanSummary) ? -10 : 0;

  let newsroomScore = 25;
  newsroomScore += isAcceptableQuality(cleanTitle) ? 15 : -20;
  newsroomScore += isAcceptableQuality(cleanSummary) ? 15 : -20;
  newsroomScore += /&[a-z#]+;|<[^>]+>/.test(`${title} ${summary}`) ? -20 : 10;
  newsroomScore += cleanTitle.endsWith(".") ? -4 : 6;
  newsroomScore += cleanTitle.length >= 18 ? 8 : -8;

  const bounded = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const scores = {
    clarityScore: bounded(clarityScore),
    completenessScore: bounded(completenessScore),
    newsroomScore: bounded(newsroomScore),
  };
  const pass = scores.clarityScore >= 68 && scores.completenessScore >= 60 && scores.newsroomScore >= 62;
  return { ...scores, pass };
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
  if (!cleaned) return "";

  const { category = "", source = "" } = options;
  const info = extractKeyInfo(cleaned);
  const entities = extractEntities(cleaned);

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "or", "is", "are", "was", "be", "as", "at", "by", "of", "in", "to", "a", "an"].includes(w.toLowerCase()))
    .slice(0, 5);

  const hasIran = /ايران|إيران|iran/i.test(cleaned);
  const hasIsrael = /اسرائيل|إسرائيل|israel/i.test(cleaned);
  const hasMissile = /صاروخ|صواريخ|missile|rocket|strike|attack/i.test(cleaned);
  const hasWar = /حرب|مواجهة|تصعيد|conflict|war/i.test(cleaned);

  if (hasIran && hasIsrael && hasMissile) {
    return "إطلاق صواريخ من إيران باتجاه إسرائيل";
  }

  if (hasIran && hasIsrael && hasWar) {
    return "تصاعد المواجهة المباشرة بين إيران وإسرائيل";
  }

  if (info.hasConflict) {
    if (entities.places.length > 0) {
      return `تطور أمني جديد في ${entities.places[0]} قيد المتابعة`;
    }
    if (words.length > 0) {
      return `${words[0]} يشهد تصعيدًا أمنيًا جديدًا`;
    }
    return "";
  }

  if (info.hasEconomics) {
    if (words.some((w) => w.toLowerCase().includes("oil") || w.toLowerCase().includes("نفط"))) {
      return "أسعار النفط تشهد تطورات جديدة";
    }
    if (words.some((w) => w.toLowerCase().includes("market") || w.toLowerCase().includes("أسواق"))) {
      return "الأسواق العالمية تتفاعل مع أنباء اقتصادية";
    }
    return "مستجدات اقتصادية مؤثرة في الأسواق العالمية";
  }

  if (info.hasDiplomacy) {
    if (entities.people.length > 0) {
      return `${entities.people[0]} يشارك في محادثات دبلوماسية`;
    }
    return "تحركات دبلوماسية جديدة بين الأطراف المعنية";
  }

  if (info.hasPolitics) {
    if (entities.places.length > 0) {
      return `تطور سياسي جديد في ${entities.places[0]}`;
    }
    return "تطور سياسي جديد على الساحة الدولية";
  }

  if (info.hasSports) {
    if (words.some((w) => w.toLowerCase().includes("transfer") || w.toLowerCase().includes("انتقال"))) {
      return "انتقال رياضي يشغل أسواق الكرة العالمية";
    }
    return "تطور رياضي جديد تحت المتابعة";
  }

  if (info.hasTechnology) {
    return "إعلان تقني جديد بتداعيات دولية";
  }

  if (info.hasEnvironment) {
    return "مستجدات بيئية جديدة في المشهد الدولي";
  }

  return "";
}

// ============================================
// JOURNALISTIC SUMMARY GENERATION
// ============================================
function generateJournalisticSummary(rawText, options = {}) {
  const cleaned = sanitizeText(rawText);
  if (!cleaned || cleaned.length < 10) {
    return "";
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

  if (/ايران|إيران|iran/i.test(cleaned) && /اسرائيل|إسرائيل|israel/i.test(cleaned) && /صاروخ|صواريخ|missile|attack|strike/i.test(cleaned)) {
    return "تشير المعلومات إلى تصعيد ميداني بعد تقارير عن إطلاق صواريخ من إيران باتجاه إسرائيل، مع متابعة انعكاساته الإقليمية.";
  }
  if (info.hasConflict) {
    return "تفيد المعطيات بحدوث تصعيد أمني جديد في المنطقة، مع استمرار المتابعة لتحديد حجم التطورات الميدانية.";
  }
  if (info.hasEconomics) {
    return "تشير البيانات إلى تحركات اقتصادية جديدة تؤثر على الأسواق العالمية، مع مراقبة تأثيرها خلال الساعات المقبلة.";
  }
  if (info.hasDiplomacy) {
    return "تتواصل المساعي الدبلوماسية عبر اتصالات واجتماعات جديدة بين الأطراف المعنية لاحتواء التوتر.";
  }
  if (info.hasPolitics) {
    return "يبرز تطور سياسي جديد قد ينعكس على توازنات المشهد الإقليمي والدولي خلال المدى القصير.";
  }

  return "";
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
      displayable: true,
      cleaned: true,
      language,
    };
  }

  const rawTitle = item.title || item.headline || "";
  const rawSummary = item.summary || item.description || item.text || "";
  const source = item.source || item.author || "";
  const category = item.category || item.type || "";

  // Stage 1: cleaning
  const decodedTitle = decodeHtmlEntities(rawTitle);
  const decodedSummary = decodeHtmlEntities(rawSummary);
  const sanitizedTitle = stripResidualLatin(sanitizeText(decodedTitle));
  const sanitizedSummary = stripResidualLatin(sanitizeText(decodedSummary));

  // Stage 2: quality evaluation
  const initialQuality = evaluateArabicQuality(sanitizedTitle, sanitizedSummary);

  let finalTitle = sanitizedTitle;
  let finalSummary = sanitizedSummary;

  // Stage 3: decision + rewrite or exclude
  if (!initialQuality.pass) {
    const rewrittenTitle = generateJournalisticHeadline(`${sanitizedTitle} ${sanitizedSummary}`, { category, source });
    const rewrittenSummary = generateJournalisticSummary(`${sanitizedSummary} ${sanitizedTitle}`, { category, source });
    finalTitle = stripResidualLatin(sanitizeText(rewrittenTitle || ""));
    finalSummary = stripResidualLatin(sanitizeText(rewrittenSummary || ""));
  }

  const finalQuality = evaluateArabicQuality(finalTitle, finalSummary);
  const displayable = finalQuality.pass && containsArabicChars(finalTitle) && containsArabicChars(finalSummary);

  return {
    ...item,
    _original: { title: rawTitle, summary: rawSummary },
    _decoded: { title: decodedTitle, summary: decodedSummary },
    _sanitized: { title: sanitizedTitle, summary: sanitizedSummary },
    title: displayable ? finalTitle : "",
    summary: displayable ? finalSummary : "",
    description: displayable ? finalSummary : "",
    source: source || "مصدر موثوق",
    category: category || "عام",
    cleaned: true,
    language: "ar",
    qualityScore: finalQuality.pass ? "high" : "low",
    clarityScore: finalQuality.clarityScore,
    completenessScore: finalQuality.completenessScore,
    newsroomScore: finalQuality.newsroomScore,
    isArabic: isArabicText(finalTitle) && isArabicText(finalSummary),
    displayable,
  };
}

// ============================================
// BATCH PROCESSING
// ============================================
export function processBatchNews(items, language = "ar") {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => processNewsItem(item, language))
    .filter((item) => Boolean(item) && (language !== "ar" || item.displayable !== false));
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
  return String(decodeHtmlEntities(text || ""))
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]*>/g, " ")
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

  if (options.kind === "title" || options.kind === "summary") {
    const processed = processNewsItem(
      {
        title: options.kind === "title" ? normalizedText : "",
        summary: options.kind === "summary" ? normalizedText : normalizedText,
        source: options.source || "",
        category: options.category || "",
      },
      "ar"
    );
    const strictText = options.kind === "title" ? processed?.title : processed?.summary;
    const out = processed?.displayable === false ? "" : normalizeText(strictText || "");
    writeCacheEntry(cacheKey, out);
    return out;
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

  if (isLiteralArabicLike(localized)) {
    localized = synthesizeArabicText(normalizedText, options);
  }

  localized = normalizeText(localized);
  localized = stripResidualLatin(localized);
  if (!containsArabicChars(localized)) {
    localized = synthesizeArabicText(normalizedText, options);
  }
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

  // Arabic mode: always enforce strict news quality gate
  const rawTitle = item.title || item.title_ar || item.titleAr || item.headline_ar || item.headline || "";
  const rawSummary = item.summary || item.summary_ar || item.summaryAr || item.description || "";
  const processed = processNewsItem(
    {
      title: rawTitle,
      summary: rawSummary,
      source: item.source || item.authorName || item.author || "",
      category: item.category || item.type || item.domain || item.queryDomain || "",
    },
    "ar"
  );

  const title = processed?.title || "";
  const summary = processed?.summary || "";
  const displayable = processed?.displayable !== false && Boolean(title) && Boolean(summary);

  return {
    ...item,
    title,
    summary,
    description: summary,
    source: localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
    sourceLabel: localizeSourceLabel(item.source || item.authorName || item.author || "", "ar"),
    category: localizeCategoryLabel(item.category || item.type || item.domain || item.queryDomain || "", "ar"),
    isArabicReady: containsArabicChars(title) && !containsLatinChars(title) && !containsLatinChars(summary),
    clarityScore: processed?.clarityScore,
    completenessScore: processed?.completenessScore,
    newsroomScore: processed?.newsroomScore,
    qualityScore: processed?.qualityScore,
    displayable,
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
