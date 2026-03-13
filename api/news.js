module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const feeds = [
      { source: "Al Jazeera Arabic", url: "https://www.aljazeera.net/aljazeerarss/ar/home.xml" },
      { source: "BBC Arabic", url: "https://feeds.bbci.co.uk/arabic/rss.xml" },
      { source: "France24 Arabic", url: "https://www.france24.com/ar/rss" },
      { source: "Sky News Arabia", url: "https://www.skynewsarabia.com/web/rss/2-1" },
      { source: "Al Arabiya", url: "https://www.alarabiya.net/.mrss/ar.xml" }
    ];

    const results = await Promise.allSettled(
      feeds.map(async ({ source, url }) => {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/rss+xml, application/xml, text/xml",
          },
        });

        if (!response.ok) {
          throw new Error(`Feed failed: ${source}`);
        }

        const xml = await response.text();
        return parseRSS(xml, source);
      })
    );

    const allItems = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const unique = dedupeByTitle(allItems)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 30);

    const normalized = unique.map(normalizeNewsItem);

    return res.status(200).json({
      ok: true,
      items: normalized,
      count: normalized.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to fetch news",
    });
  }
};

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const entryRegex = /<entry\b[\s\S]*?<\/entry>/gi;

  const rssMatches = xml.match(itemRegex) || [];
  const atomMatches = xml.match(entryRegex) || [];
  const matches = rssMatches.length ? rssMatches : atomMatches;

  for (const itemXml of matches) {
    const title =
      decodeHtml(getTag(itemXml, "title")) ||
      decodeHtml(getTag(itemXml, "media:title"));

    const description =
      decodeHtml(stripHtml(getTag(itemXml, "description"))) ||
      decodeHtml(stripHtml(getTag(itemXml, "summary"))) ||
      decodeHtml(stripHtml(getTag(itemXml, "content")));

    let link = getTag(itemXml, "link");
    if (!link) {
      const hrefMatch = itemXml.match(/<link[^>]+href="([^"]+)"/i);
      link = hrefMatch ? hrefMatch[1] : "";
    }

    const pubDate =
      getTag(itemXml, "pubDate") ||
      getTag(itemXml, "published") ||
      getTag(itemXml, "updated") ||
      new Date().toISOString();

    if (!title) continue;

    items.push({
      source,
      title: cleanText(title),
      description: cleanText(description),
      link: cleanText(link),
      pubDate,
    });
  }

  return items;
}

function getTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeKey(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\w\s\u0600-\u06FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNewsItem(item) {
  const combined = `${item.title} ${item.description}`;
  const category = detectCategory(combined);
  const urgency = detectUrgency(combined);

  return {
    title: item.title,
    summary: item.description || `خبر من ${item.source}`,
    category,
    urgency,
    time: timeAgoArabic(item.pubDate),
    link: item.link,
    source: item.source,
    pubDate: item.pubDate,
  };
}

function detectCategory(text) {
  const t = String(text || "").toLowerCase();

  if (
    t.includes("إيران") || t.includes("ايران") ||
    t.includes("طهران") || t.includes("الحرس الثوري") ||
    t.includes("نووي") || t.includes("نطنز")
  ) return "iran";

  if (
    t.includes("الإمارات") || t.includes("الامارات") ||
    t.includes("السعودية") || t.includes("الخليج") ||
    t.includes("قطر") || t.includes("البحرين") ||
    t.includes("الكويت") || t.includes("عمان") ||
    t.includes("أبوظبي") || t.includes("ابوظبي") ||
    t.includes("دبي") || t.includes("الرياض")
  ) return "gulf";

  if (
    t.includes("أمريكا") || t.includes("امريكا") ||
    t.includes("الولايات المتحدة") || t.includes("واشنطن") ||
    t.includes("البنتاغون") || t.includes("ترامب") ||
    t.includes("البيت الأبيض") || t.includes("البيت الابيض")
  ) return "usa";

  if (
    t.includes("إسرائيل") || t.includes("اسرائيل") ||
    t.includes("تل أبيب") || t.includes("تل ابيب") ||
    t.includes("الجيش الإسرائيلي") || t.includes("الجيش الاسرائيلي")
  ) return "israel";

  return "all";
}

function detectUrgency(text) {
  const t = String(text || "");

  if (
    t.includes("عاجل") ||
    t.includes("قصف") ||
    t.includes("هجوم") ||
    t.includes("انفجار") ||
    t.includes("ضربة") ||
    t.includes("اغتيال") ||
    t.includes("صواريخ") ||
    t.includes("مسيرات") ||
    t.includes("اعتراض")
  ) return "high";

  if (
    t.includes("توتر") ||
    t.includes("تحذير") ||
    t.includes("محادثات") ||
    t.includes("مناورات") ||
    t.includes("اجتماع") ||
    t.includes("تصعيد")
  ) return "medium";

  return "low";
}

function timeAgoArabic(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;

  if (Number.isNaN(date.getTime())) return "الآن";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}
