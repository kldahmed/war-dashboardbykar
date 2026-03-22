/**
 * News Processing Pipeline
 * Cleans raw news data, decodes entities, and produces clean Arabic content
 * WITHOUT literal translation - producing journalistic Arabic instead
 */

// HTML Entities decoder
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
  // Replace named entities
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.split(entity).join(char);
  });

  // Replace numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, code) => {
    try {
      return String.fromCharCode(parseInt(code, 10));
    } catch {
      return match;
    }
  });

  // Replace hexadecimal entities
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });

  return decoded;
}

// Remove noisy characters and normalize whitespace
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";

  let clean = text
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Remove URLs
    .replace(/https?:\/\/\S+/g, " ")
    // Remove email addresses
    .replace(/\S+@\S+/g, " ")
    // Remove excessive punctuation
    .replace(/([!?.])\1{2,}/g, "$1")
    // Remove curly braces and brackets
    .replace(/[{}[\]<>]/g, " ")
    // Remove special unicode characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Remove repeated spaces
    .replace(/\s+/g, " ")
    .trim();

  // Remove leading/trailing punctuation
  clean = clean.replace(/^[^\u0600-\u06FFA-Za-z0-9]+/, "").replace(/[^\u0600-\u06FFA-Za-z0-9]+$/, "");

  return clean;
}

// Detect if text is primarily in Arabic
function isArabicText(text) {
  if (!text) return false;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  return arabicChars > latinChars;
}

// Check if text quality is acceptable
function isAcceptableQuality(text) {
  if (!text || text.length < 3) return false;

  // Too many special characters
  const specialChars = (text.match(/[^\u0600-\u06FFA-Za-z0-9\s،؛:\-.—]/g) || []).length;
  if (specialChars > text.length * 0.3) return false;

  // Mixed languages (more than 30% non-Arabic when in Arabic)
  if (isArabicText(text)) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[A-Za-z]/g) || []).length;
    if (latinChars > text.length * 0.3) return false;
  }

  return true;
}

/**
 * Extract key information from raw text for journalistic headline
 * Returns keywords, subjects, verbs, etc.
 */
function extractKeyInfo(text) {
  const normalized = text.toLowerCase();

  const conflicts = ["غزة", "إسرائيل", "إيران", "أوكرانيا", "روسيا", "صاروخ", "صواريخ", "هجوم", "هجمات", "ضربة", "ضربات", "قصف", "قتتال", "حرب", "جندي", "جنود", "군군", "قتلى"];
  const economics = ["نفط", "أسعار", "أسواق", "تضخم", "اقتصاد", "اقتصادي", "بنك", "بنوك", "دولار", "يورو", "استثمار", "سهم", "صفقة"];
  const diplomacy = ["محادثات", "اجتماع", "قمة", "سفير", "الأم المتحدة", "اتفاق", "معاهدة", "نقاش"];
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

  return {
    hasConflict,
    hasEconomics,
    hasDiplomacy,
    hasPolitics,
    hasSports,
    hasTechnology,
    hasEnvironment,
  };
}

/**
 * Extract entities (people, places, organizations) from text
 */
function extractEntities(text) {
  const entities = {
    people: [],
    places: [],
    organizations: [],
  };

  // Extract people names (simple heuristic: capitalized words before action verbs)
  const peoplePatterns = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const matches = text.match(peoplePatterns) || [];
  entities.people = matches.slice(0, 3); // Top 3

  // Extract locations
  const locationKeywords = ["أمريكا", "روسيا", "الصين", "أوروبا", "الشرق الأوسط", "إيران", "إسرائيل", "أوكرانيا", "تايوان", "كوريا", "الهند"];
  entities.places = locationKeywords.filter((loc) => text.includes(loc));

  // Extract organizations
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

/**
 * Generate a journalistic Arabic headline (NOT a literal translation)
 * Produces clean, professional news-style Arabic
 */
function generateJournalisticHeadline(rawText, options = {}) {
  const cleaned = sanitizeText(rawText);
  if (!cleaned) return "تطور خبري جديد";

  const { category = "", source = "" } = options;
  const info = extractKeyInfo(cleaned);
  const entities = extractEntities(cleaned);

  // Extract key words from text (first 5-7 significant words)
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "or", "is", "are", "was", "be", "as", "at", "by", "of", "in", "to", "a", "an"].includes(w.toLowerCase()))
    .slice(0, 5);

  // Build headline based on detected category
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

  // Generic fallback
  return "تطور خبري جديد على الساحة الدولية";
}

/**
 * Generate a clean Arabic summary (NOT a literal translation)
 * Short, professional, journalistic style
 */
function generateJournalisticSummary(rawText, options = {}) {
  const cleaned = sanitizeText(rawText);
  if (!cleaned || cleaned.length < 10) {
    return "تطور جديد يستحق متابعة دقيقة";
  }

  const info = extractKeyInfo(cleaned);
  const maxLength = 180; // Arabic character limit for summary

  // For short text, return as-is if quality is good
  if (cleaned.length <= maxLength && isArabicText(cleaned)) {
    return cleaned;
  }

  // Extract first significant sentence
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 5).slice(0, 1);

  if (sentences.length > 0) {
    let summary = sentences[0].trim();
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + "...";
    }
    return summary;
  }

  // Fallback: build a generic summary based on category
  if (info.hasConflict) {
    return "أنباء عن تطورات عسكرية جديدة تستدعي عن كثب.";
  }
  if (info.hasEconomics) {
    return "تحركات سوقية جديدة يتابعها المستثمرون حول العالم.";
  }
  if (info.hasDiplomacy) {
    return "خطوات دبلوماسية جديدة في سشاركتن دولية للتصريحات.";
  }
  if (info.hasPolitics) {
    return "تطورات سياسية هامة تؤثر على المشهد الدولي.";
  }

  return "خبر جديد يستحق اهتمامك الآن.";
}

/**
 * Main function: Clean and process a news item into displayable format
 * Returns object with cleaned and Arabic-ready content
 */
export function processNewsItem(item, language = "ar") {
  if (!item || typeof item !== "object") return null;

  // If not Arabic mode, return as-is with minimal cleaning
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

  // Arabic processing
  const rawTitle = item.title || item.headline || "";
  const rawSummary = item.summary || item.description || item.text || "";
  const source = item.source || item.author || "";
  const category = item.category || item.type || "";

  // Step 1: Decode HTML entities
  const decodedTitle = decodeHtmlEntities(rawTitle);
  const decodedSummary = decodeHtmlEntities(rawSummary);

  // Step 2: Sanitize text
  const sanitizedTitle = sanitizeText(decodedTitle);
  const sanitizedSummary = sanitizeText(decodedSummary);

  // Step 3: Quality check
  let finalTitle = "";
  let finalSummary = "";

  // If title is already Arabic and acceptable, use it
  if (isArabicText(sanitizedTitle) && isAcceptableQuality(sanitizedTitle)) {
    finalTitle = sanitizedTitle;
  } else {
    // Otherwise generate journalistic headline
    finalTitle = generateJournalisticHeadline(sanitizedTitle || sanitizedSummary || rawTitle || rawSummary, {
      category,
      source,
    });
  }

  // If summary is already Arabic and acceptable, use it
  if (isArabicText(sanitizedSummary) && isAcceptableQuality(sanitizedSummary) && sanitizedSummary.length > 10) {
    finalSummary = sanitizedSummary;
  } else {
    // Otherwise generate journalistic summary
    finalSummary = generateJournalisticSummary(sanitizedSummary || sanitizedTitle || rawSummary || rawTitle, {
      category,
      source,
    });
  }

  return {
    ...item,
    // Original fields (unchanged)
    _original: {
      title: rawTitle,
      summary: rawSummary,
    },
    // Decoded but raw (for reference)
    _decoded: {
      title: decodedTitle,
      summary: decodedSummary,
    },
    // Sanitized (cleaned from HTML/noise)
    _sanitized: {
      title: sanitizedTitle,
      summary: sanitizedSummary,
    },
    // Final ready for display
    title: finalTitle,
    summary: finalSummary,
    description: finalSummary,
    source: source || "مصدر موثوق",
    category: category || "عام",
    // Metadata
    cleaned: true,
    language: "ar",
    qualityScore: isAcceptableQuality(finalTitle) && isAcceptableQuality(finalSummary) ? "high" : "medium",
    isArabic: isArabicText(finalTitle) && isArabicText(finalSummary),
  };
}

/**
 * Batch process multiple news items
 */
export function processBatchNews(items, language = "ar") {
  if (!Array.isArray(items)) return [];
  return items.map((item) => processNewsItem(item, language)).filter(Boolean);
}

/**
 * Check if text needs cleaning (has entities or suspicious characters)
 */
export function needsCleaning(text) {
  if (!text) return false;
  return /&[a-z#]+;|&#\d+;|&#x[0-9A-Fa-f]+;|<[^>]*>|[{}[\]<>]|\\[a-z]/i.test(text);
}

/**
 * Export utility functions for internal use
 */
export const _internals = {
  decodeHtmlEntities,
  sanitizeText,
  isArabicText,
  isAcceptableQuality,
  extractKeyInfo,
  extractEntities,
};
