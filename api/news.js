const MAX_NEWS = 200;
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
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "world"
  },
  {
    name: "CNN",
    url: "http://rss.cnn.com/rss/edition_world.rss",
    category: "world"
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "markets"
  }
];
function parseGenericRss(xml, source, category) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  return items.map((item, index) => {
    const title = stripHtml(extractTag(item, "title")) || "بدون عنوان";
    const link = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const description = stripHtml(extractTag(item, "description"));
    const image = extractImageFromDescription(extractTag(item, "description"));
    return {
      id: `${source}-${Date.now()}-${index}`,
      title,
      summary: description,
      source,
      time: pubDate || new Date().toISOString(),
      url: link,
      category,
      urgency: scoreUrgency(`${title} ${description}`),
      image
    };
  });
}
async function fetchRssSources(category) {
  // Filter sources by category
  const sources = RSS_SOURCES.filter(s => category === "all" || s.category === category || categoryQuery(category).includes(s.category));
  const results = [];
  await Promise.all(sources.map(async (src) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(src.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return;
      const xml = await res.text();
      results.push(...parseGenericRss(xml, src.name, src.category));
    } catch {}
  }));
  return results;
}

/* ⚡ CACHE سريع */
let CACHE = {
  data: null,
  time: 0
};

function decodeHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

  if(!str) return "";

  // صورة داخل img
  let match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  if (match?.[1]) return match[1];

  // صور Google News
  match = str.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/i);

  if (match?.[0]) return match[0];

  return "";
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

  if (/تصريحات|تحليل|سياسة|اقتصاد|government|minister/i.test(t)) {
    return "medium";
  }

  return "low";
}

function categoryQuery(category) {
  switch (category) {
    case "regional":
      return "الشرق الأوسط OR iran OR israel OR syria OR iraq";
    case "politics":
      return "سياسة OR government OR diplomacy";
    case "military":
      return "صاروخ OR drone OR missile OR strike OR military";
    case "economy":
      return "اقتصاد OR النفط OR markets OR economy";
    case "sports":
      return "football OR soccer OR match OR fifa OR nba";
    case "tourism":
      return "tourism OR travel OR airport OR flights";
    case "markets":
      return "stocks OR markets OR nasdaq OR dow";
    default:
      return "الشرق الأوسط OR iran OR israel OR war OR missile";
  }
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
      id: `gnews-${Date.now()}-${index}`,
      title,
      summary: description,
      source,
      time: pubDate || new Date().toISOString(),
      url: link,
      category,
      urgency: scoreUrgency(`${title} ${description}`),
      image
    };
  });
}

async function fetchGoogleNews(category) {
  const q = encodeURIComponent(`${categoryQuery(category)} when:12h`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ar&gl=AE&ceid=AE:ar`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  let xml = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    clearTimeout(timeout);
    return [];
  }
  return parseGoogleRss(xml, category);
}

export default async function handler(req, res) {
  const now = Date.now();

  // Always fallback unsupported categories to 'all'
  let { category = "all" } = req.query;
  if (["sports", "tourism", "markets"].includes(category)) {
    category = "all";
  }

  // Cache for 1 minute, per category
  if (CACHE.data && now - CACHE.time < 60000 && CACHE.data.category === category) {
    return res.status(200).json(CACHE.data);
  }

  try {
    // Fetch Google News and all RSS sources
    const googleNews = await fetchGoogleNews(category);
    const rssNews = await fetchRssSources(category);
    let allNews = [...googleNews, ...rssNews];

    // Smart ranking
    const trustedSources = ["Reuters", "BBC", "CNN"];
    const now = Date.now();
    allNews = allNews.map(item => {
      let score = 0;
      // Breaking news
      if (item.urgency === "high" || /breaking|urgent|عاجل/i.test(item.title)) score += 50;
      // Recent news (last 3h)
      const t = new Date(item.time).getTime();
      if (now - t < 3 * 60 * 60 * 1000) score += 30;
      // Trusted sources
      if (trustedSources.includes(item.source)) score += 20;
      item._score = score;
      return item;
    });
    // Remove duplicated titles
    const seenTitles = new Set();
    allNews = allNews.filter(item => {
      const key = item.title.trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
    // Sort by score desc, then time desc
    allNews.sort((a, b) => b._score - a._score || new Date(b.time).getTime() - new Date(a.time).getTime());
    // Limit to 200 items
    const finalNews = Array.isArray(allNews) ? allNews.slice(0, MAX_NEWS) : [];
    const result = {
      news: finalNews,
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      category
    };
    CACHE.data = { ...result, category };
    CACHE.time = Date.now();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(result);
  } catch (error) {
    return res.status(200).json({
      news: [],
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" })
    });
  }
}
