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
      { source: "Sky News Arabia", url: "https://www.skynewsarabia.com/web/rss/2-1" }
    ];

    const settled = await Promise.allSettled(
      feeds.map(async ({ source, url }) => {
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/rss+xml, application/xml, text/xml"
          }
        });

        if (!r.ok) {
          throw new Error(`Failed feed: ${source}`);
        }

        const xml = await r.text();
        return parseRSS(xml, source);
      })
    );

    const items = settled
      .filter((x) => x.status === "fulfilled")
      .flatMap((x) => x.value);

    const unique = dedupeByTitle(items)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 40)
      .map(normalizeNewsItem);

    return res.status(200).json({
      ok: true,
      items: unique,
      count: unique.length,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to fetch news"
    });
  }
};

function parseRSS(xml, source) {
  const entries = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const entryRegex = /<entry\b[\s\S]*?<\/entry>/gi;
  const rssItems = xml.match(itemRegex) || [];
  const atomItems = xml.match(entryRegex) || [];
  const matches = rssItems.length ? rssItems : atomItems;

  for (const raw of matches) {
    const title =
      cleanText(decodeHtml(stripCDATA(getTag(raw, "title")))) ||
      cleanText(decodeHtml(stripCDATA(getTag(raw, "media:title"))));

    const description =
      cleanText(decodeHtml(stripHtml(stripCDATA(getTag(raw, "description"))))) ||
      cleanText(decodeHtml(stripHtml(stripCDATA(getTag(raw, "summary"))))) ||
      cleanText(decodeHtml(stripHtml(stripCDATA(getTag(raw, "content")))));

    let link = getTag(raw, "link");
    if (!link) {
      const hrefMatch = raw.match(/<link[^>]+href="([^"]+)"/i);
      link = hrefMatch ? hrefMatch[1] : "";
    }

    const pubDate =
      getTag(raw, "pubDate") ||
      getTag(raw, "published") ||
      getTag(raw, "updated") ||
      new Date().toISOString();

    if (!title) continue;

    entries.push({
      source,
      title,
      description,
      link: cleanText(link),
      pubDate
    });
  }

  return entries;
}

function getTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function stripCDATA(text) {
  return String(text || "").replace(/<!\[CDATA\[|\]\]>/g, "");
}

function stripHtml(text) {
  return String(text || "")
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
    if (!key || seen.has(key)) return false;
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
    pubDate: item.pubDate
  };
}

function detectCategory(text) {
  const t = String(text || "").toLowerCase();

  if (
    t.includes("ايران") || t.includes("إيران") ||
    t.includes("طهران") || t.includes("الحرس الثوري") ||
    t.includes("نطنز") || t.includes("اليورانيوم")
  ) return "iran";

  if (
    t.includes("الخليج") || t.includes("الامارات") || t.includes("الإمارات") ||
    t.includes("السعودية") || t.includes("قطر") || t.includes("البحرين") ||
    t.includes("الكويت") || t.includes("عمان") || t.includes("دبي") ||
    t.includes("أبوظبي") || t.includes("ابوظبي") || t.includes("الرياض")
  ) return "gulf";

  if (
    t.includes("امريكا") || t.includes("أمريكا") ||
    t.includes("واشنطن") || t.includes("الولايات المتحدة") ||
    t.includes("البنتاغون") || t.includes("البيت الأبيض") || t.includes("البيت الابيض")
  ) return "usa";

  if (
    t.includes("اسرائيل") || t.includes("إسرائيل") ||
    t.includes("تل ابيب") || t.includes("تل أبيب") ||
    t.includes("الجيش الاسرائيلي") || t.includes("الجيش الإسرائيلي")
  ) return "israel";

  return "all";
}

function detectUrgency(text) {
  const t = String(text || "");

  if (
    t.includes("عاجل") ||
    t.includes("هجوم") ||
    t.includes("قصف") ||
    t.includes("انفجار") ||
    t.includes("ضربة") ||
    t.includes("صواريخ") ||
    t.includes("مسيرات") ||
    t.includes("اعتراض") ||
    t.includes("اغتيال")
  ) return "high";

  if (
    t.includes("توتر") ||
    t.includes("مناورات") ||
    t.includes("تحذير") ||
    t.includes("تصعيد") ||
    t.includes("محادثات") ||
    t.includes("اجتماع")
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
