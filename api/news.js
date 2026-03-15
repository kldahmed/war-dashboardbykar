const ANALYZE_LIMIT = 12;
const MAX_NEWS = 40;

const EXTRA_RSS_SOURCES = [
  // عالمي
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://feeds.skynews.com/feeds/rss/world.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://www.aljazeera.com/xml/rss/middleeast.xml",
  "https://www.france24.com/en/rss",
  "https://www.dw.com/en/top-stories/rss",
  "https://www.euronews.com/rss?level=theme&name=news",
  "https://www.rt.com/rss/news/",
  "https://tass.com/rss/v2.xml",

  // شرق أوسط
  "https://www.middleeasteye.net/rss",
  "https://www.middleeastmonitor.com/feed/",
  "https://www.al-monitor.com/rss",
  "https://www.newarab.com/rss.xml",
  "https://english.alarabiya.net/feed/rss2/en.xml",

  // دفاع / أمن
  "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
  "https://breakingdefense.com/feed/",
  "https://www.military.com/rss/news",
  "https://www.army-technology.com/feed/",
  "https://thedefensepost.com/feed/",
  "https://www.longwarjournal.org/feed",

  // اقتصاد / طاقة
  "https://www.ft.com/rss/world",
  "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  "https://www.spglobal.com/commodityinsights/en/rss",
  "https://www.offshore-technology.com/feed/",

  // تحليلات
  "https://www.iswresearch.org/feeds/posts/default",
  "https://www.crisisgroup.org/rss.xml",

  // استخبارات مفتوحة / خرائط
  "https://liveuamap.com/en/rss",
  "https://warnews247.gr/feed"
];

function decodeHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(str = "") {
  return decodeHtml(String(str || ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? m[1].trim() : "";
}

function extractImageFromDescription(str = "") {
  const match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  if (match?.[1]) return decodeHtml(match[1]);

  const googleImg = String(str || "").match(
    /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/i
  );

  return googleImg?.[0] || "";
}

function looksArabic(text = "") {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return v || fallback;
}

function clamp(n, min = 0, max = 100) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|breaking|urgent|هجوم|قصف|غارة|صاروخ|صواريخ|انفجار|اشتباكات|استهداف|ضربة|ضربات|اعتراض|طائرة مسيرة|مسيرة|هجمات|توتر|drone|missile|strike|raid|attack|intercept|rocket|explosion/i.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /تصريحات|بيان|اجتماع|تحذير|تحليل|حكومة|سياسة|وزير|اقتصاد|نفط|موانئ|أسواق|طاقة|مفاوضات|دبلوماسية|deployment|military|alert|warning/i.test(
      t
    )
  ) {
    return "medium";
  }

  return "low";
}

function urgencyWeight(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function detectEventType(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();

  if (/اعتراض|intercept|air defense|دفاع جوي/.test(hay)) return "interception";
  if (/مسيرة|طائرة مسيرة|drone|uav/.test(hay)) return "drone";
  if (/صاروخ|صواريخ|missile|rocket/.test(hay)) return "missile";
  if (/قصف|غارة|raid|airstrike|strike/.test(hay)) return "airstrike";
  if (/اشتباكات|clashes|firefight/.test(hay)) return "clashes";
  if (/انفجار|explosion|blast/.test(hay)) return "explosion";
  if (/تحرك|deployment|mobilization|تعزيزات/.test(hay)) return "military_movement";
  if (/ملاحة|شحن|سفن|ناقلات|shipping|tanker|maritime|naval/.test(hay)) return "maritime";
  if (/نفط|طاقة|غاز|oil|gas|energy/.test(hay)) return "energy";
  if (/تصريحات|بيان|statement/.test(hay)) return "statement";

  return "general";
}

function detectRegion(title = "", summary = "") {
  const hay = `${title} ${summary}`;

  const rules = [
    { name: "إيران", re: /إيران|ايران|iran/i },
    { name: "إسرائيل", re: /إسرائيل|اسرائيل|israel/i },
    { name: "غزة", re: /غزة|gaza/i },
    { name: "لبنان", re: /لبنان|lebanon/i },
    { name: "سوريا", re: /سوريا|syria/i },
    { name: "العراق", re: /العراق|iraq/i },
    { name: "اليمن", re: /اليمن|yemen/i },
    { name: "السعودية", re: /السعودية|saudi/i },
    { name: "قطر", re: /قطر|qatar/i },
    { name: "الأردن", re: /الأردن|jordan/i },
    { name: "البحر الأحمر", re: /البحر الأحمر|red sea/i },
    { name: "مضيق هرمز", re: /مضيق هرمز|هرمز|strait of hormuz/i },
    { name: "الشرق الأوسط", re: /الشرق الأوسط|middle east/i }
  ];

  for (const rule of rules) {
    if (rule.re.test(hay)) return rule.name;
  }

  return "غير محدد";
}

function normalizeCategory(category = "", title = "", summary = "", source = "") {
  const c = String(category || "").trim();
  if (["all", "regional", "politics", "military", "economy"].includes(c)) {
    return c;
  }

  const hay = `${title} ${summary} ${source}`.toLowerCase();

  if (/اقتصاد|نفط|أسواق|طاقة|شحن|موانئ|بورصة|سعر|oil|energy|market|shipping|gas/i.test(hay)) {
    return "economy";
  }
  if (/سياسة|حكومة|وزير|رئيس|مفاوضات|بيان|دبلوماسية|government|minister|president|diplomatic/i.test(hay)) {
    return "politics";
  }
  if (/هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|اشتباكات|drone|missile|strike|raid|attack|intercept|military|army/i.test(hay)) {
    return "military";
  }
  if (/إيران|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|الشرق الأوسط|middle east/i.test(hay)) {
    return "regional";
  }

  return "all";
}

function categoryQuery(category) {
  switch (category) {
    case "regional":
      return "الشرق الأوسط OR الخليج OR السعودية OR إيران OR العراق OR سوريا OR لبنان OR اليمن";
    case "politics":
      return "الشرق الأوسط سياسة OR دبلوماسية OR حكومة OR بيان OR وزير";
    case "military":
      return "الشرق الأوسط عسكري OR صاروخ OR مسيرة OR غارة OR هجوم OR اشتباكات";
    case "economy":
      return "الشرق الأوسط اقتصاد OR نفط OR شحن OR موانئ OR أسواق OR طاقة";
    default:
      return "الشرق الأوسط OR إيران OR إسرائيل OR لبنان OR سوريا OR العراق OR اليمن OR الخليج OR الحرب OR صواريخ OR غارات OR توتر عسكري";
  }
}

function sourceWeight(source = "") {
  const s = String(source || "").toLowerCase();

  if (/reuters|رويترز/.test(s)) return 10;
  if (/bbc|بي بي سي/.test(s)) return 9;
  if (/france ?24|فرنس ?24/.test(s)) return 8;
  if (/aljazeera|الجزيرة/.test(s)) return 8;
  if (/alarabiya|العربية/.test(s)) return 8;
  if (/sky ?news|سكاي نيوز/.test(s)) return 8;
  if (/cnn/.test(s)) return 7;
  if (/asharq|الشرق/.test(s)) return 7;
  if (/middle east|الشرق الأوسط/.test(s)) return 7;
  if (/osinttechnical/.test(s)) return 10;
  if (/auroraintel/.test(s)) return 9;
  if (/intelsky/.test(s)) return 9;
  if (/sentdefender/.test(s)) return 8;
  if (/google news/.test(s)) return 4;

  return 5;
}

function confidenceScore(item = {}, sourceCount = 1) {
  const base =
    sourceWeight(item.source) * 5 +
    urgencyWeight(item.urgency) * 10 +
    Math.min(20, sourceCount * 6);

  const hasRegion = item.region && item.region !== "غير محدد" ? 8 : 0;
  const hasEventType = item.eventType && item.eventType !== "general" ? 8 : 0;

  return Math.min(100, Math.round(base + hasRegion + hasEventType));
}

function cleanBadArticles(items) {
  return items.filter((item) => {
    const title = stripHtml(item?.title || "");
    const summary = stripHtml(item?.summary || "");
    const source = stripHtml(item?.source || "");

    if (!title || title.length < 8) return false;
    if (!looksArabic(title) && !looksArabic(summary) && !/[a-z]/i.test(title)) return false;

    const blocked =
      /pr newswire|business wire|globe newswire|accesswire|benzinga|yahoo finance|advertisement|sponsored|podcast|newsletter/i;

    if (blocked.test(title) || blocked.test(summary) || blocked.test(source)) {
      return false;
    }

    return true;
  });
}

function canonicalTitle(title = "") {
  return stripHtml(title)
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function eventFusion(items) {
  const buckets = new Map();

  for (const item of items) {
    const key = [
      canonicalTitle(item.title).slice(0, 70),
      item.region || "غير محدد",
      item.eventType || "general"
    ].join("|");

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const fused = [];

  for (const [, group] of buckets) {
    if (!group.length) continue;

    group.sort((a, b) => {
      const scoreB =
        urgencyWeight(b.urgency) * 100 +
        sourceWeight(b.source) * 10 +
        (new Date(b.time).getTime() || 0) / 1e11;
      const scoreA =
        urgencyWeight(a.urgency) * 100 +
        sourceWeight(a.source) * 10 +
        (new Date(a.time).getTime() || 0) / 1e11;
      return scoreB - scoreA;
    });

    const lead = group[0];
    const uniqueSources = [...new Set(group.map((x) => x.source).filter(Boolean))];
    const uniqueUrls = [...new Set(group.map((x) => x.url).filter(Boolean))];
    const confidence = confidenceScore(lead, uniqueSources.length);

    fused.push({
      ...lead,
      sourceCount: uniqueSources.length,
      relatedSources: uniqueSources,
      relatedUrls: uniqueUrls,
      confidence,
      isBreaking: lead.urgency === "high" || uniqueSources.length >= 3,
      fusionId: `fusion-${canonicalTitle(lead.title).slice(0, 40)}-${lead.region}`
    });
  }

  return fused;
}

function sortArticles(items) {
  return [...items].sort((a, b) => {
    const breakingDiff = Number(!!b.isBreaking) - Number(!!a.isBreaking);
    if (breakingDiff !== 0) return breakingDiff;

    const warDiff = (b.regional_war_score || 0) - (a.regional_war_score || 0);
    if (warDiff !== 0) return warDiff;

    const escalationDiff = (b.escalation_score || 0) - (a.escalation_score || 0);
    if (escalationDiff !== 0) return escalationDiff;

    const confidenceDiff = (b.confidence || 0) - (a.confidence || 0);
    if (confidenceDiff !== 0) return confidenceDiff;

    const urgencyDiff = urgencyWeight(b.urgency) - urgencyWeight(a.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;

    const sourceDiff = sourceWeight(b.source) - sourceWeight(a.source);
    if (sourceDiff !== 0) return sourceDiff;

    const tb = new Date(b.time).getTime() || 0;
    const ta = new Date(a.time).getTime() || 0;
    return tb - ta;
  });
}

function buildScenario(news) {
  let missile = 0;
  let drone = 0;
  let naval = 0;
  let regional = 0;

  news.forEach((n) => {
    const t = `${n.title} ${n.summary}`.toLowerCase();

    if (/صاروخ|صواريخ|missile|rocket|strike/.test(t)) missile += 2;
    if (/مسيرة|طائرة مسيرة|drone|uav/.test(t)) drone += 2;
    if (/هرمز|hormuz|ship|shipping|naval|بحر|red sea|البحر الأحمر/.test(t)) naval += 2;
    if (/إيران|ايران|israel|اسرائيل|إسرائيل|lebanon|لبنان|gaza|غزة/.test(t)) regional += 1;
  });

  const scenarios = [
    { key: "air_strikes", label: "ضربات جوية إضافية", value: Math.min(100, missile * 8 + 18) },
    { key: "drone_wave", label: "موجة مسيّرات", value: Math.min(100, drone * 9 + 10) },
    { key: "naval_crisis", label: "توتر بحري/ملاحي", value: Math.min(100, naval * 10 + 8) },
    { key: "regional_escalation", label: "اتساع التصعيد الإقليمي", value: Math.min(100, regional * 7 + 15) }
  ].sort((a, b) => b.value - a.value);

  return {
    leadScenario: scenarios[0]?.label || "لا يوجد سيناريو واضح",
    scenarios
  };
}

async function translateTextToArabic(text = "") {
  const cleanText = String(text || "").trim();

  if (!cleanText) return "";
  if (looksArabic(cleanText)) return cleanText;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(cleanText)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return cleanText;

    const data = await res.json();

    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return cleanText;
    }

    const translated = data[0]
      .map((part) => (Array.isArray(part) ? part[0] : ""))
      .join("")
      .trim();

    return translated || cleanText;
  } catch {
    return cleanText;
  }
}

async function translateNewsItemToArabic(item = {}) {
  const originalTitle = item.title || "";
  const originalSummary = item.summary || "";

  const [translatedTitle, translatedSummary] = await Promise.all([
    translateTextToArabic(originalTitle),
    translateTextToArabic(originalSummary)
  ]);

  return {
    ...item,
    originalTitle,
    originalSummary,
    title: translatedTitle || originalTitle,
    summary: translatedSummary || originalSummary
  };
}

function parseGenericRss(xml, fallbackCategory = "all", fallbackSource = "RSS") {
  const items = String(xml || "").match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = stripHtml(extractTag(item, "title"));
    const link = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const rawDescription = extractTag(item, "description") || extractTag(item, "content:encoded");
    const description = stripHtml(rawDescription);
    const image = extractImageFromDescription(rawDescription);

    let source =
      stripHtml(extractTag(item, "source")) ||
      stripHtml(extractTag(item, "dc:creator")) ||
      fallbackSource;

    let title = rawTitle || "بدون عنوان";

    if (!source || source === fallbackSource) {
      const sourceMatch = rawTitle.match(/\s*-\s*([^-\n]+)$/);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
        title = rawTitle.replace(/\s*-\s*([^-\n]+)$/, "").trim();
      }
    }

    const finalCategory = normalizeCategory(fallbackCategory, title, description, source);
    const urgency = scoreUrgency(`${title} ${description}`);
    const eventType = detectEventType(title, description);
    const region = detectRegion(title, description);

    return {
      id: `rss-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      summary: description || "لا يوجد ملخص متاح.",
      source,
      time: pubDate || new Date().toISOString(),
      url: link || "#",
      category: finalCategory,
      urgency,
      image,
      eventType,
      region,
      confidence: 0,
      sourceCount: 1,
      isBreaking: urgency === "high"
    };
  });
}

function parseGoogleRss(xml, category) {
  const items = String(xml || "").match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = stripHtml(extractTag(item, "title"));

    let link = extractTag(item, "link");

    try {
      const googleMatch = link.match(/url=(https?:\/\/[^&]+)/);
      if (googleMatch && googleMatch[1]) {
        link = decodeURIComponent(googleMatch[1]);
      }
    } catch {}

    const pubDate = extractTag(item, "pubDate");
    const rawDescription = extractTag(item, "description");
    const description = stripHtml(rawDescription);

    let image = extractImageFromDescription(rawDescription);

    let source = "Google News";
    let title = rawTitle || "بدون عنوان";

    const sourceMatch = rawTitle.match(/\s*-\s*([^-\n]+)$/);
    if (sourceMatch) {
      source = sourceMatch[1].trim();
      title = rawTitle.replace(/\s*-\s*([^-\n]+)$/, "").trim();
    }

    const finalCategory = normalizeCategory(category, title, description, source);
    const urgency = scoreUrgency(`${title} ${description}`);
    const eventType = detectEventType(title, description);
    const region = detectRegion(title, description);

    return {
      id: `gnews-${Date.now()}-${index}`,
      title,
      summary: description || "لا يوجد ملخص متاح.",
      source,
      time: pubDate || new Date().toISOString(),
      url: link || "#",
      category: finalCategory,
      urgency,
      image,
      eventType,
      region,
      confidence: 0,
      sourceCount: 1,
      isBreaking: urgency === "high"
    };
  });
}

async function safeFetchJsonFeed(url, field = "news") {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const arr = Array.isArray(data?.[field]) ? data[field] : [];

    return arr.map((item, index) => {
      const title = stripHtml(item?.title || "بدون عنوان");
      const summary = stripHtml(item?.summary || item?.description || "لا يوجد ملخص متاح.");
      const source = stripHtml(item?.source || "مصدر غير معروف");
      const category = normalizeCategory(item?.category, title, summary, source);
      const urgency =
        ["high", "medium", "low"].includes(item?.urgency)
          ? item.urgency
          : scoreUrgency(`${title} ${summary}`);
      const eventType = item?.eventType || detectEventType(title, summary);
      const region = item?.region || detectRegion(title, summary);

      return {
        id: item?.id || `${field}-${Date.now()}-${index}`,
        title,
        summary,
        source,
        time: item?.time || new Date().toISOString(),
        url: item?.url || item?.link || "#",
        category,
        urgency,
        image: item?.image || item?.imageUrl || item?.thumbnail || "",
        eventType,
        region,
        confidence: Number(item?.confidence || 0),
        sourceCount: Number(item?.sourceCount || 1),
        isBreaking: !!item?.isBreaking || urgency === "high"
      };
    });
  } catch {
    return [];
  }
}

async function fetchGoogleNews(category) {
  const q = encodeURIComponent(`${categoryQuery(category)} when:12h`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ar&gl=AE&ceid=AE:ar`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    },
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Google RSS failed: ${res.status}`);
  }

  const xml = await res.text();
  return parseGoogleRss(xml, category);
}

async function fetchExtraSources() {
  const results = await Promise.allSettled(
    EXTRA_RSS_SOURCES.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/rss+xml, application/xml, text/xml" },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) return [];

        const xml = await res.text();
        return parseGenericRss(xml, "all", new URL(url).hostname.replace("www.", ""));
      } catch {
        clearTimeout(timeout);
        return [];
      }
    })
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function analyzeOneNews(base, item) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        title: item.originalTitle || item.title,
        summary: item.originalSummary || item.summary,
        source: item.source,
        time: item.time,
        category: item.category
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return item;

    const data = await res.json();
    const analysis = data?.analysis;

    if (!analysis || typeof analysis !== "object") {
      return item;
    }

    return {
      ...item,
      ai_type: analysis.type || item.ai_type || "mixed",
      eventType: analysis.event_type || item.eventType,
      category: analysis.category || item.category,
      actors: Array.isArray(analysis.actors) ? analysis.actors : [],
      locations: Array.isArray(analysis.locations) ? analysis.locations : [],
      risk_score: clamp(analysis.risk_score, 0, 100),
      confidence: clamp(analysis.confidence, 0, 100) || item.confidence || 0,
      escalation_score: clamp(analysis.escalation_score, 0, 100),
      regional_war_score: clamp(analysis.regional_war_score, 0, 100),
      impact: analysis.impact || "regional",
      time_sensitivity: analysis.time_sensitivity || "short_term",
      ai_summary_ar: safeText(analysis.ai_summary_ar, ""),
      why_important_ar: safeText(analysis.why_important_ar, ""),
      next_scenario_ar: safeText(analysis.next_scenario_ar, ""),
      narrative_ar: safeText(analysis.narrative_ar, ""),
      operational_recommendation_ar: safeText(analysis.operational_recommendation_ar, ""),
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 8) : []
    };
  } catch {
    return item;
  }
}

async function analyzeNewsBatch(base, news) {
  const first = news.slice(0, ANALYZE_LIMIT);
  const rest = news.slice(ANALYZE_LIMIT);

  const analyzed = await Promise.all(first.map((item) => analyzeOneNews(base, item)));

  return [...analyzed, ...rest];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", news: [] });
  }

  try {
    const { category = "all" } = req.query;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const base = `${proto}://${host}`;

    const settled = await Promise.allSettled([
      fetchGoogleNews(category),
      safeFetchJsonFeed(`${base}/api/fastnews`, "news"),
      safeFetchJsonFeed(`${base}/api/intelnews`, "news"),
      safeFetchJsonFeed(`${base}/api/xintel`, "news"),
      fetchExtraSources()
    ]);

    const googleNews = settled[0].status === "fulfilled" ? settled[0].value : [];
    const fastNews = settled[1].status === "fulfilled" ? settled[1].value : [];
    const intelNews = settled[2].status === "fulfilled" ? settled[2].value : [];
    const xIntelNews = settled[3].status === "fulfilled" ? settled[3].value : [];
    const extraNews = settled[4].status === "fulfilled" ? settled[4].value : [];

    let news = [
      ...googleNews,
      ...fastNews,
      ...intelNews,
      ...xIntelNews,
      ...extraNews
    ];

    news = cleanBadArticles(news);
    news = eventFusion(news);
    news = sortArticles(news).slice(0, MAX_NEWS);

    news = await Promise.all(news.map((item) => translateNewsItemToArabic(item)));
    news = await analyzeNewsBatch(base, news);

    news = sortArticles(news);

    const scenario = buildScenario(news);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=240");

    return res.status(200).json({
      news,
      scenario,
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      live: true,
      source: "fusion-ai-intelligence-engine-expanded"
    });
  } catch (error) {
    console.error("NEWS API ERROR:", error);

    return res.status(200).json({
      news: [],
      scenario: {
        leadScenario: "لا يوجد سيناريو واضح",
        scenarios: []
      },
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      live: false,
      source: "fallback-empty",
      error: "Failed to fetch Arabic live news"
    });
  }
}
