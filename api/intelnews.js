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
  return decodeHtml(str)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? m[1].trim() : "";
}

function extractImage(block = "") {
  const media =
    block.match(/<media:content[^>]+url="([^"]+)"/i) ||
    block.match(/<media:thumbnail[^>]+url="([^"]+)"/i);

  if (media?.[1]) return decodeHtml(media[1]);

  const img =
    block.match(/<img[^>]+src="([^"]+)"/i) ||
    block.match(/<img[^>]+src='([^']+)'/i);

  if (img?.[1]) return decodeHtml(img[1]);

  return "";
}

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|هجوم|قصف|غارة|صاروخ|صواريخ|انفجار|اشتباكات|استهداف|ضربة|ضربات|اعتراض|حرب|توتر|طائرة مسيرة|مسيرة|drone|missile|strike|raid|attack|intercept|explosion|war/i.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /سياسة|بيان|اجتماع|تصريحات|تحليل|حكومة|وزير|رئيس|مفاوضات|دبلوماسية|اقتصاد|نفط|طاقة|أسواق|موانئ|shipping|oil|energy|market/i.test(
      t
    )
  ) {
    return "medium";
  }

  return "low";
}

function normalizeCategory(title = "", summary = "", source = "") {
  const hay = `${title} ${summary} ${source}`.toLowerCase();

  if (/economy|business|market|oil|gas|energy|shipping|نفط|اقتصاد|طاقة|أسواق|شحن|موانئ/i.test(hay)) {
    return "economy";
  }

  if (/politics|government|minister|president|diplomatic|بيان|سياسة|حكومة|وزير|رئيس|دبلوماسية/i.test(hay)) {
    return "politics";
  }

  if (/attack|strike|raid|drone|missile|military|army|war|قصف|غارة|هجوم|صاروخ|صواريخ|مسيرة|عسكري|اشتباكات/i.test(hay)) {
    return "military";
  }

  return "regional";
}

function isUsefulArticle(title = "", summary = "") {
  const text = `${title} ${summary}`.trim();

  if (!text || text.length < 12) return false;

  const blocked =
    /podcast|newsletter|opinion|advertisement|sponsored|listen|watch live/i;

  return !blocked.test(text);
}

function dedupeArticles(items) {
  const seen = new Map();

  for (const item of items) {
    const key = stripHtml(item.title || "")
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    if (!key) continue;

    const prev = seen.get(key);

    if (!prev) {
      seen.set(key, item);
      continue;
    }

    const prevTime = new Date(prev.time).getTime() || 0;
    const nextTime = new Date(item.time).getTime() || 0;

    if (nextTime > prevTime) {
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

function sourceWeight(source = "") {
  const s = String(source || "").toLowerCase();

  if (/reuters/.test(s)) return 10;
  if (/bbc/.test(s)) return 9;
  if (/sky news/.test(s)) return 8;
  if (/al jazeera/.test(s)) return 8;
  if (/nytimes|new york times/.test(s)) return 8;

  return 5;
}

function sortArticles(items) {
  return [...items].sort((a, b) => {
    const urgencyDiff = urgencyWeight(b.urgency) - urgencyWeight(a.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;

    const sourceDiff = sourceWeight(b.source) - sourceWeight(a.source);
    if (sourceDiff !== 0) return sourceDiff;

    const tb = new Date(b.time).getTime() || 0;
    const ta = new Date(a.time).getTime() || 0;
    return tb - ta;
  });
}

export default async function handler(req, res) {
  try {
    const feeds = [
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC" },
      { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NYTimes" },
      { url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best", source: "Reuters" },
      { url: "https://feeds.skynews.com/feeds/rss/world.xml", source: "Sky News" }
    ];

    let news = [];

    for (const feed of feeds) {
      try {
        const r = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
          }
        });

        if (!r.ok) continue;

        const xml = await r.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

        items.slice(0, 8).forEach((it, i) => {
          const title = stripHtml(extractTag(it, "title")) || "بدون عنوان";
          const link = extractTag(it, "link") || "#";
          const rawDesc = extractTag(it, "description");
          const summary = stripHtml(rawDesc).slice(0, 280) || "خبر عالمي مباشر";
          const pubDate = extractTag(it, "pubDate") || new Date().toISOString();
          const image = extractImage(it);
          const urgency = scoreUrgency(`${title} ${summary}`);
          const category = normalizeCategory(title, summary, feed.source);

          news.push({
            id: `${feed.source}-${i}-${Date.now()}`,
            title,
            summary,
            source: feed.source,
            time: pubDate,
            urgency,
            category,
            url: link,
            image
          });
        });
      } catch {}
    }

    news = news.filter((item) => isUsefulArticle(item.title, item.summary));
    news = dedupeArticles(news);
    news = sortArticles(news).slice(0, 30);

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");

    return res.status(200).json({
      news,
      updated: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ news: [] });
  }
}
