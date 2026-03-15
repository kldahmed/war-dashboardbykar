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

    const militaryRegex =
      /هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|طائرة مسيرة|انفجار|اعتراض|استهداف|ضربة|drone|missile|strike|attack|raid|intercept|explosion/i;

    const highRegex =
      /عاجل|breaking|urgent|missile|strike|attack|explosion|raid|drone/i;

    const mediumRegex =
      /توتر|تحرك|deployment|military|defense|warning|alert/i;

    const clean = (text = "") =>
      String(text)
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();

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

    let news = [];

    for (const account of accounts) {
      try {
        const xml = await fetchFirstWorkingUrl(account.urls);
        if (!xml) continue;

        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        items.slice(0, 6).forEach((it, i) => {
          const title = clean(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
          const link = clean(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
          const pubDate = clean(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");

          if (!title) return;
          if (!militaryRegex.test(title)) return;

          let urgency = "low";
          if (highRegex.test(title)) urgency = "high";
          else if (mediumRegex.test(title)) urgency = "medium";

          news.push({
            id: `x-${account.name}-${i}-${title.slice(0, 20)}`,
            title,
            summary: `رصد من ${account.name}`,
            source: `X / ${account.name}`,
            time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            urgency,
            category: "military",
            link
          });
        });
      } catch {}
    }

    news.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.status(200).json({
      news: news.slice(0, 20)
    });
  } catch (e) {
    res.status(500).json({ news: [] });
  }
}
