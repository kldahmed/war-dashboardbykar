const MAX_NEWS = 200;
const FETCH_TIMEOUT = 3500;
const CACHE_TTL = 60 * 1000;

const RSS_SOURCES = [
  {
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "world"
  },
  {
    name: "Reuters",
    url: "https://feeds.reuters.com/reuters/worldNews",
    category: "world"
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "markets"
  }
];

/* =========================
   CACHE
========================= */
const CATEGORY_CACHE = new Map();
const TRANSLATION_CACHE = new Map();

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/* =========================
   HELPERS
========================= */
function decodeHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(str = "") {
  return decodeHtml(String(str || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(str = "") {
  return decodeHtml(String(str || ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isArabicText(str = "") {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? m[1].trim() : "";
}

function extractImageFromDescription(str = "") {
  if (!str) return "";

  let match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  if (match?.[1]) return match[1];

  match = str.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/i);
  if (match?.[0]) return match[0];

  return "";
}

function makeId(source, url, title) {
  const base = `${source}|${url || ""}|${title || ""}`.toLowerCase().trim();
  return encodeURIComponent(base).slice(0, 180);
}

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|breaking|urgent|هجوم|قصف|غارة|صاروخ|انفجار|اشتباكات|drone|missile|strike|attack/i.test(
      t
    )
  ) {
    return "high";
  }

  if (/تصريحات|تحليل|سياسة|اقتصاد|government|minister|markets|economy/i.test(t)) {
    return "medium";
  }

  return "low";
}

function categoryQuery(category) {
  switch (category) {
    case "regional":
      return "الشرق الأوسط OR iran OR israel OR syria OR iraq OR gaza OR lebanon";
    case "politics":
      return "سياسة OR government OR diplomacy OR minister OR president";
    case "military":
      return "صاروخ OR drone OR missile OR strike OR military OR attack";
    case "economy":
      return "اقتصاد OR النفط OR markets OR economy OR oil";
    case "markets":
      return "stocks OR markets OR nasdaq OR dow OR oil OR economy";
    case "sports":
      return "football OR soccer OR match OR fifa OR nba";
    case "tourism":
      return "tourism OR travel OR airport OR flights";
    default:
      return "الشرق الأوسط OR iran OR israel OR war OR missile OR world";
  }
}

function normalizeCategory(category = "all") {
if (["tourism"].includes(category)) return "all";
  return category || "all";
}

function sourceMatchesCategory(sourceCategory, requestedCategory) {
  if (requestedCategory === "all") return true;
  if (sourceCategory === requestedCategory) return true;

  if (requestedCategory === "economy" && sourceCategory === "markets") return true;
  if (requestedCategory === "markets" && sourceCategory === "economy") return true;
  if (requestedCategory === "regional" && sourceCategory === "world") return true;
  if (requestedCategory === "politics" && sourceCategory === "world") return true;
  if (requestedCategory === "military" && sourceCategory === "world") return true;

  return false;
}

function rankNewsItem(item, nowTime) {
  let score = 0;
  const title = item.title || "";
  const summary = item.summary || "";
  const joined = `${title} ${summary}`;

  if (item.urgency === "high" || /breaking|urgent|عاجل/i.test(joined)) score += 50;
  else if (item.urgency === "medium") score += 20;

  const itemTime = new Date(item.time).getTime();
  if (!Number.isNaN(itemTime)) {
    const diff = nowTime - itemTime;
    if (diff < 3 * 60 * 60 * 1000) score += 30;
    else if (diff < 12 * 60 * 60 * 1000) score += 15;
  }

  if (["Reuters", "BBC"].includes(item.source)) score += 20;

  if (item.image) score += 5;

  return score;
}

function getFallbackNews() {
  return [
    {
      id: "fallback-demo-1",
      title: "تحديثات إقليمية مستمرة في عدد من المناطق",
      summary: "هذه بيانات احتياطية تظهر عند تعذر الوصول إلى الخادم.",
      urgency: "medium",
      source: "Fallback Feed",
      time: new Date().toISOString(),
      category: "regional",
      url: "#",
      image: ""
    },
    {
      id: "fallback-demo-2",
      title: "تحليل سياسي للتطورات الأخيرة",
      summary: "يمكن استبدال هذا المحتوى بالبيانات الحقيقية من نقطة النهاية الخاصة بالأخبار.",
      urgency: "low",
      source: "Fallback Feed",
      time: new Date().toISOString(),
      category: "politics",
      url: "#",
      image: ""
    }
  ];
}

async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================
   TRANSLATION
========================= */
async function translateToArabic(text) {
  const t = cleanText(text);
  if (!t) return "";
  if (isArabicText(t)) return t;

  if (TRANSLATION_CACHE.has(t)) {
    return TRANSLATION_CACHE.get(t);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(
      t
    )}`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) {
      TRANSLATION_CACHE.set(t, t);
      return t;
    }

    const data = await res.json();
    const translated =
      Array.isArray(data) && Array.isArray(data[0])
        ? data[0].map((chunk) => chunk[0] || "").join("")
        : t;

    const cleaned = cleanText(translated || t);
    TRANSLATION_CACHE.set(t, cleaned);
    return cleaned;
  } catch {
    TRANSLATION_CACHE.set(t, t);
    return t;
  }
}

/* =========================
   RSS PARSERS
========================= */
function parseGenericRss(xml, source, category) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = extractTag(item, "title");
    const rawDescription = extractTag(item, "description");
    const title = stripHtml(rawTitle) || "بدون عنوان";
    const description = stripHtml(rawDescription);
    const link = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const image = extractImageFromDescription(rawDescription);

    return {
      id: makeId(source, link, `${title}-${index}`),
      title,
      summary: description,
      source,
      time: pubDate || new Date().toISOString(),
      url: link || "#",
      category,
      urgency: scoreUrgency(`${title} ${description}`),
      image
    };
  });
}

function parseGoogleRss(xml, category) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = stripHtml(extractTag(item, "title"));
    let link = extractTag(item, "link");

    try {
      const googleMatch = link.match(/url=(https?:\/\/[^&]+)/);
      if (googleMatch) link = decodeURIComponent(googleMatch[1]);
    } catch {}

    const pubDate = extractTag(item, "pubDate");
    const rawDescription = extractTag(item, "description");
    const description = stripHtml(rawDescription);
    const image = extractImageFromDescription(rawDescription);

    let source = "Google News";
    let title = rawTitle || "بدون عنوان";

    const sourceMatch = rawTitle.match(/\s*-\s*([^-\n]+)$/);
    if (sourceMatch) {
      source = sourceMatch[1].trim();
      title = rawTitle.replace(/\s*-\s*([^-\n]+)$/, "").trim();
    }

    return {
      id: makeId(source, link, `${title}-${index}`),
      title,
      summary: description,
      source,
      time: pubDate || new Date().toISOString(),
      url: link || "#",
      category,
      urgency: scoreUrgency(`${title} ${description}`),
      image
    };
  });
}

/* =========================
   FETCHERS
========================= */
async function fetchRssSources(category) {
  const sources = RSS_SOURCES.filter((s) =>
    sourceMatchesCategory(s.category, category)
  );

  const results = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        const res = await fetchWithTimeout(src.url);
        if (!res.ok) return;

        const xml = await res.text();
        results.push(...parseGenericRss(xml, src.name, src.category));
      } catch {}
    })
  );

  return results;
}

async function fetchGoogleNews(category) {
  const q = encodeURIComponent(`${categoryQuery(category)} when:12h`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ar&gl=AE&ceid=AE:ar`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleRss(xml, category);
  } catch {
    return [];
  }
}

/* =========================
   MAIN HANDLER
========================= */
export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const requestedCategory = normalizeCategory(req.query?.category || "all");

  const cached = CATEGORY_CACHE.get(requestedCategory);
  if (cached && now - cached.time < CACHE_TTL) {
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(cached.payload);
  }

  let googleNews = [];
  let rssNews = [];
  let errors = [];

  try {
    googleNews = await fetchGoogleNews(requestedCategory);
  } catch (e) {
    errors.push("google");
  }

  try {
    rssNews = await fetchRssSources(requestedCategory);
  } catch (e) {
    errors.push("rss");
  }

  let allNews = [...googleNews, ...rssNews];

  // Dedupe by URL first, then fallback to normalized title
  const seen = new Set();
  allNews = allNews.filter((item) => {
    const key = cleanText((item.url && item.url !== "#" ? item.url : item.title) || "")
      .toLowerCase();

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Rank
  allNews = allNews
    .map((item) => ({
      ...item,
      _score: rankNewsItem(item, now)
    }))
    .sort(
      (a, b) =>
        b._score - a._score ||
        new Date(b.time).getTime() - new Date(a.time).getTime()
    );

  let finalNews = Array.isArray(allNews) ? allNews.slice(0, MAX_NEWS) : [];

  if (finalNews.length === 0) {
    finalNews = getFallbackNews();
  }

  // Translate only when needed
  finalNews = await Promise.all(
    finalNews.map(async (item) => {
      const title = cleanText(item.title);
      const summary = cleanText(item.summary);

      const needsTitleTranslation = !isArabicText(title);
      const needsSummaryTranslation = !isArabicText(summary);

      const [translatedTitle, translatedSummary] = await Promise.all([
        needsTitleTranslation ? translateToArabic(title) : title,
        needsSummaryTranslation ? translateToArabic(summary) : summary
      ]);

      return {
        ...item,
        title: translatedTitle || title,
        summary: translatedSummary || summary
      };
    })
  );

  // Remove internal score
  finalNews = finalNews.map(({ _score, ...rest }) => rest);

  const result = {
    news: finalNews,
    updated: new Date().toLocaleString("ar-AE", {
      timeZone: "Asia/Dubai"
    }),
    category: requestedCategory,
    source:
      errors.length === 0
        ? "ok"
        : errors.length === 1
        ? "partial-fallback"
        : "fallback"
  };

  CATEGORY_CACHE.set(requestedCategory, {
    time: now,
    payload: result
  });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json(result);
}
