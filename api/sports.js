function stripHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceName(url = "") {
  if (url.includes("espn")) return "ESPN";
  if (url.includes("bbc")) return "BBC Sport";
  if (url.includes("skysports")) return "Sky Sports";
  if (url.includes("goal")) return "Goal";
  return "Sports";
}

export default async function handler(req, res) {
  try {
    const sources = [
      "https://www.espn.com/espn/rss/news",
      "https://feeds.bbci.co.uk/sport/rss.xml",
      "https://www.skysports.com/rss/12040",
      "https://www.goal.com/feeds/en/news"
    ];

    const results = await Promise.all(
      sources.map(async (src) => {
        try {
          const r = await fetch(src);
          if (!r.ok) return [];

          const xml = await r.text();
          const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

          return items.slice(0, 8).map((it, i) => {
            const title = stripHtml(it.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
            const url = stripHtml(it.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
            const description = stripHtml(
              it.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ""
            );
            const pubDate = stripHtml(
              it.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || new Date().toISOString()
            );

            return {
              id: encodeURIComponent(`${src}-${url || title}-${i}`),
              title: title || "بدون عنوان",
              summary: description || "خبر رياضي",
              source: sourceName(src),
              time: pubDate,
              category: "sports",
              url,
              urgency: "low",
              image: ""
            };
          });
        } catch {
          return [];
        }
      })
    );

    let news = results.flat();

    const seen = new Set();
    news = news.filter((item) => {
      const key = (item.url || item.title).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    news.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      news: news.slice(0, 30),
      updated: new Date().toISOString(),
      source: "sports-rss"
    });
  } catch {
    res.status(500).json({
      news: [],
      updated: new Date().toISOString(),
      source: "error"
    });
  }
}
