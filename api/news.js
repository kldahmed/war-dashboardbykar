function extractImageFromDescription(str = "") {
  const match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  return match ? decodeHtml(match[1]) : "";
}
function decodeHtml(str = "") {
  return str
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(str = "") {
  return decodeHtml(str)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function looksArabic(text = "") {
  return /[\u0600-\u06FF]/.test(text);
}

function scoreUrgency(text = "") {
  const t = text.toLowerCase();

  if (
    /عاجل|هجوم|قصف|صاروخ|انفجار|غارة|اشتباكات|حرب|استهداف|طائرة مسيرة|هجمات|توتر|ضربات/.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /تصريحات|بيان|اجتماع|تحذير|تحليل|حكومة|سياسة|وزير|اقتصاد|نفط|موانئ|أسواق|طاقة/.test(
      t
    )
  ) {
    return "medium";
  }

  return "low";
}

function categoryQuery(category) {
  switch (category) {
    case "regional":
      return "الشرق الأوسط OR الخليج OR الإمارات OR السعودية OR إيران OR العراق OR سوريا OR لبنان OR اليمن";
    case "politics":
      return "الشرق الأوسط سياسة OR دبلوماسية OR حكومة OR بيان OR وزير";
    case "military":
      return "الشرق الأوسط عسكري OR صاروخ OR مسيرة OR غارة OR هجوم OR اشتباكات";
    case "economy":
      return "الشرق الأوسط اقتصاد OR نفط OR شحن OR موانئ OR أسواق OR طاقة";
    default:
      return "الشرق الأوسط آخر الأخبار";
  }
}
function extractImageFromDescription(str = "") {
  const match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  return match ? decodeHtml(match[1]) : "";
}
function parseGoogleRss(xml, category) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = stripHtml(extractTag(item, "title"));
    const link = extractTag(item, "link");
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
  id: `news-${Date.now()}-${index}`,
  title,
  summary: description || "لا يوجد ملخص متاح.",
  source,
  time: pubDate || new Date().toISOString(),
  url: link,
  category,
  urgency: scoreUrgency(`${title} ${description}`),
  image
};  

function cleanBadArticles(items) {
  return items.filter((item) => {
    const title = stripHtml(item.title || "");
    const summary = stripHtml(item.summary || "");
    const source = stripHtml(item.source || "");

    if (!title || title.length < 8) return false;
    if (!looksArabic(title) && !looksArabic(summary)) return false;

    const blocked = /pr newswire|business wire|globe newswire|accesswire|benzinga|yahoo finance/i;
    if (blocked.test(title) || blocked.test(summary) || blocked.test(source)) return false;

    return true;
  });
}

function dedupeArticles(items) {
  const seen = new Map();

  for (const item of items) {
    const key = stripHtml(item.title || "")
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);

    if (!key) continue;

    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const existingTime = new Date(existing.time).getTime() || 0;
    const nextTime = new Date(item.time).getTime() || 0;

    if (nextTime > existingTime) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

function urgencyWeight(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function sortArticles(items) {
  return items.sort((a, b) => {
    const u = urgencyWeight(b.urgency) - urgencyWeight(a.urgency);
    if (u !== 0) return u;

    const tb = new Date(b.time).getTime() || 0;
    const ta = new Date(a.time).getTime() || 0;
    return tb - ta;
  });
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

    let news = await fetchGoogleNews(category);
    news = cleanBadArticles(news);
    news = dedupeArticles(news);
    news = sortArticles(news).slice(0, 24);

    res.setHeader("Cache-Control", "s-maxage=90, stale-while-revalidate=180");

    return res.status(200).json({
      news,
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      live: true,
      source: "Google News RSS Arabic"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch Arabic live news"
    });
  }
}
