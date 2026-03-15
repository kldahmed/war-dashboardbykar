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

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|هجوم|قصف|صاروخ|صواريخ|انفجار|غارة|اشتباكات|حرب|استهداف|طائرة مسيرة|مسيرة|هجمات|توتر|ضربات|اعتراض|drone|missile|strike|raid|attack/i.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /تصريحات|بيان|اجتماع|تحذير|تحليل|حكومة|سياسة|وزير|اقتصاد|نفط|موانئ|أسواق|طاقة|مفاوضات|دبلوماسية/i.test(
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
  if (/google news/.test(s)) return 4;

  return 5;
}

function normalizeCategory(category = "", title = "", summary = "") {
  const c = String(category || "").trim();
  if (["all", "regional", "politics", "military", "economy"].includes(c)) {
    return c;
  }

  const hay = `${title} ${summary}`.toLowerCase();

  if (/اقتصاد|نفط|أسواق|طاقة|شحن|موانئ|بورصة|سعر/.test(hay)) return "economy";
  if (/سياسة|حكومة|وزير|رئيس|مفاوضات|بيان|دبلوماسية/.test(hay)) return "politics";
  if (/هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|اشتباكات|drone|missile|strike|raid|attack/.test(hay)) {
    return "military";
  }
  if (/إيران|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|الشرق الأوسط/.test(hay)) {
    return "regional";
  }

  return "all";
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

    const finalCategory = normalizeCategory(category, title, description);

    return {
      id: `gnews-${Date.now()}-${index}`,
      title,
      summary: description || "لا يوجد ملخص متاح.",
      source,
      time: pubDate || new Date().toISOString(),
      url: link || "#",
      category: finalCategory,
      urgency: scoreUrgency(`${title} ${description}`),
      image
    };
  });
}

function cleanBadArticles(items) {
  return items.filter((item) => {
    const title = stripHtml(item?.title || "");
    const summary = stripHtml(item?.summary || "");
    const source = stripHtml(item?.source || "");

    if (!title || title.length < 8) return false;
    if (!looksArabic(title) && !looksArabic(summary)) return false;

    const blocked =
      /pr newswire|business wire|globe newswire|accesswire|benzinga|yahoo finance|advertisement|sponsored/i;

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
    .slice(0, 160);
}

function dedupeArticles(items) {
  const seen = new Map();

  for (const item of items) {
    const key = canonicalTitle(item?.title || "");
    if (!key) continue;

    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const existingScore =
      urgencyWeight(existing.urgency) * 100 +
      sourceWeight(existing.source) * 10 +
      (new Date(existing.time).getTime() || 0) / 1e11;

    const nextScore =
      urgencyWeight(item.urgency) * 100 +
      sourceWeight(item.source) * 10 +
      (new Date(item.time).getTime() || 0) / 1e11;

    if (nextScore > existingScore) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

function sortArticles(items) {
  return items.sort((a, b) => {
    const urgencyDiff = urgencyWeight(b.urgency) - urgencyWeight(a.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;

    const sourceDiff = sourceWeight(b.source) - sourceWeight(a.source);
    if (sourceDiff !== 0) return sourceDiff;

    const tb = new Date(b.time).getTime() || 0;
    const ta = new Date(a.time).getTime() || 0;
    return tb - ta;
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
      const category = normalizeCategory(item?.category, title, summary);

      return {
        id: item?.id || `${field}-${Date.now()}-${index}`,
        title,
        summary,
        source,
        time: item?.time || new Date().toISOString(),
        url: item?.url || item?.link || "#",
        category,
        urgency:
          ["high", "medium", "low"].includes(item?.urgency)
            ? item.urgency
            : scoreUrgency(`${title} ${summary}`),
        image: item?.image || item?.imageUrl || item?.thumbnail || ""
      };
    });
  } catch {
    return [];
  }
}

async function fetchEventFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) return [];

    const data = await res.json();
    const arr = Array.isArray(data?.events) ? data.events : [];

    return arr.map((item, index) => {
      const title = stripHtml(item?.title || "بدون عنوان");
      const summary = stripHtml(item?.summary || item?.description || "لا يوجد ملخص متاح.");
      const source = stripHtml(item?.source || "Live Events");
      const category = normalizeCategory(item?.category, title, summary);

      return {
        id: item?.id || `event-${Date.now()}-${index}`,
        title,
        summary,
        source,
        time: item?.time || new Date().toISOString(),
        url: item?.url || item?.link || "#",
        category,
        urgency:
          ["high", "medium", "low"].includes(item?.urgency)
            ? item.urgency
            : scoreUrgency(`${title} ${summary}`),
        image: item?.image || item?.imageUrl || item?.thumbnail || ""
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

    const [googleNews, fastNews, intelNews, xIntelNews, liveEvents] = await Promise.all([
      fetchGoogleNews(category).catch(() => []),
      fetchJsonFeed(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/fastnews`, "news"),
      fetchJsonFeed(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/intelnews`, "news"),
      fetchJsonFeed(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/xintel`, "news"),
      fetchEventFeed(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/liveevents`)
    ]);

    let news = [
      ...googleNews,
      ...fastNews,
      ...intelNews,
      ...xIntelNews,
      ...liveEvents
    ];

    news = cleanBadArticles(news);
    news = dedupeArticles(news);
    news = sortArticles(news).slice(0, 40);

    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=360");

    return res.status(200).json({
      news,
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      live: true,
      source: "multi-source-arabic-news"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch Arabic live news"
    });
  }
}
