function clean(text = "") {
  return String(text || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

  if (media?.[1]) return clean(media[1]);

  const img =
    block.match(/<img[^>]+src="([^"]+)"/i) ||
    block.match(/<img[^>]+src='([^']+)'/i);

  if (img?.[1]) return clean(img[1]);

  return "";
}

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|breaking|urgent|missile|strike|attack|explosion|raid|drone|intercept|ballistic|rocket|airstrike|قصف|غارة|صاروخ|صواريخ|انفجار|اعتراض|هجوم|استهداف/i.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /توتر|تحرك|deployment|military|defense|warning|alert|air defense|naval|تحذير|استنفار|تعزيزات|دفاع/i.test(
      t
    )
  ) {
    return "medium";
  }

  return "low";
}

function normalizeCategory(text = "") {
  const t = String(text || "").toLowerCase();

  if (/oil|energy|market|shipping|نفط|طاقة|أسواق|ملاحة|شحن/i.test(t)) {
    return "economy";
  }

  if (/government|minister|president|diplomatic|سياسة|حكومة|وزير|رئيس|دبلوماسية/i.test(t)) {
    return "politics";
  }

  if (/missile|strike|attack|raid|drone|military|army|rocket|air defense|قصف|غارة|هجوم|صاروخ|صواريخ|مسيرة|عسكري|اعتراض|استهداف/i.test(t)) {
    return "military";
  }

  return "regional";
}

function isIntelRelevant(title = "", summary = "") {
  const text = `${title} ${summary}`.trim();

  if (!text || text.length < 12) return false;

  const blocked =
    /thread|subscribe|follow|merch|podcast|newsletter|spaces|live audio|giveaway/i;

  if (blocked.test(text)) return false;

  const intelRegex =
    /هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|طائرة مسيرة|انفجار|اعتراض|استهداف|ضربة|هجمات|توتر|تحرك عسكري|drone|missile|strike|attack|raid|intercept|explosion|military|air defense|naval|rocket/i;

  return intelRegex.test(text);
}

function dedupeItems(items) {
  const seen = new Map();

  for (const item of items) {
    const key = clean(item.title || "")
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);

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

  if (/osinttechnical/.test(s)) return 10;
  if (/auroraintel/.test(s)) return 9;
  if (/intelsky/.test(s)) return 9;
  if (/sentdefender/.test(s)) return 8;

  return 5;
}

function sortItems(items) {
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

async function fetchFirstWorkingUrl(urls = []) {
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "application/rss+xml, application/xml, text/xml"
        }
      });

      if (!r.ok) continue;

      const xml = await r.text();
      if (xml && xml.includes("<item>")) {
        return xml;
      }
    } catch {}
  }
  return "";
}

export default async function handler(req, res) {
  try {
    const accounts = [
      {
        name: "Osinttechnical",
        urls: [
          "https://nitter.poast.org/Osinttechnical/rss",
          "https://nitter.privacydev.net/Osinttechnical/rss",
          "https://nitter.net/Osinttechnical/rss"
        ]
      },
      {
        name: "IntelSky",
        urls: [
          "https://nitter.poast.org/IntelSky/rss",
          "https://nitter.privacydev.net/IntelSky/rss",
          "https://nitter.net/IntelSky/rss"
        ]
      },
      {
        name: "AuroraIntel",
        urls: [
          "https://nitter.poast.org/AuroraIntel/rss",
          "https://nitter.privacydev.net/AuroraIntel/rss",
          "https://nitter.net/AuroraIntel/rss"
        ]
      },
      {
        name: "sentdefender",
        urls: [
          "https://nitter.poast.org/sentdefender/rss",
          "https://nitter.privacydev.net/sentdefender/rss",
          "https://nitter.net/sentdefender/rss"
        ]
      }
    ];

    let news = [];

    for (const account of accounts) {
      try {
        const xml = await fetchFirstWorkingUrl(account.urls);
        if (!xml) continue;

        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        items.slice(0, 8).forEach((it, i) => {
          const title = clean(extractTag(it, "title"));
          const link = clean(extractTag(it, "link")) || "#";
          const pubDate = clean(extractTag(it, "pubDate"));
          const rawDescription = extractTag(it, "description");
          const summary = clean(rawDescription) || `رصد من ${account.name}`;
          const image = extractImage(it);

          if (!title) return;
          if (!isIntelRelevant(title, summary)) return;

          const urgency = scoreUrgency(`${title} ${summary}`);
          const category = normalizeCategory(`${title} ${summary}`);

          news.push({
            id: `x-${account.name}-${i}-${Date.now()}`,
            title,
            summary,
            source: `X / ${account.name}`,
            time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            urgency,
            category,
            url: link,
            image
          });
        });
      } catch {}
    }

    news = dedupeItems(news);
    news = sortItems(news).slice(0, 24);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=240");

    return res.status(200).json({
      news,
      updated: new Date().toISOString(),
      source: "x-intel-feed"
    });
  } catch (e) {
    return res.status(500).json({ news: [] });
  }
}
