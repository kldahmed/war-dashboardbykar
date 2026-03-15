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

  return match ? decodeHtml(match[1]) : "";
}

function looksArabic(text = "") {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

async function translateTextToArabic(text = "") {
  const cleanText = String(text || "").trim();

  if (!cleanText) return "";
  if (looksArabic(cleanText)) return cleanText;

  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(cleanText)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

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
}

function urgencyWeight(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
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

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }

    buckets.get(key).push(item);
  }

  const fused = [];

  for (const [, group] of buckets) {
    if (!group.length) continue;

    group.sort((a, b) => {
      const sa =
        urgencyWeight(b.urgency) * 100 +
        sourceWeight(b.source) * 10 +
        (new Date(b.time).getTime() || 0) / 1e11;
      const sb =
        urgencyWeight(a.urgency) * 100 +
        sourceWeight(a.source) * 10 +
        (new Date(a.time).getTime() || 0) / 1e11;
      return sa - sb;
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
  const joined = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();

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

  const lead = scenarios[0] || null;

  return {
    leadScenario: lead?.label || "لا يوجد سيناريو واضح",
    scenarios
  };
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

    if (!image) {
      const googleImg = rawDescription.match(
        /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/i
      );
      if (googleImg && googleImg[0]) {
        image = googleImg[0];
      }
    }

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

async function fetchJsonFeed(url, field = "news") {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

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
        confidence: item?.confidence || 0,
        sourceCount: item?.sourceCount || 1,
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

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Google RSS failed: ${res.status}`);
  }

  const xml = await res.text();
  return parseGoogleRss(xml, category);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "all" } = req.query;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const base = `${proto}://${host}`;

    const [googleNews, fastNews, intelNews, xIntelNews] = await Promise.all([
      fetchGoogleNews(category).catch(() => []),
      fetchJsonFeed(`${base}/api/fastnews`, "news"),
      fetchJsonFeed(`${base}/api/intelnews`, "news"),
      fetchJsonFeed(`${base}/api/xintel`, "news")
    ]);

let news = [...googleNews, ...fastNews, ...intelNews, ...xIntelNews];

news = cleanBadArticles(news);
news = eventFusion(news);
news = sortArticles(news).slice(0, 40);

// ابنِ السيناريو من النص الأصلي قبل الترجمة
const scenario = buildScenario(news);

// ترجمة العنوان والملخص فقط
news = await Promise.all(news.map((item) => translateNewsItemToArabic(item)));

res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=240");

return res.status(200).json({
  news,
  scenario,
  updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
  live: true,
  source: "fusion-arabic-intelligence-engine"
});
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch Arabic live news",
      news: []
    });
  }
}
