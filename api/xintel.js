export default async function handler(req, res) {
  try {

    const accounts = [
      "sentdefender",
      "OSINTdefender",
      "ELINTNews",
      "IntelCrab",
      "WarMonitors"
    ];

    const results = [];

    for (const acc of accounts) {

      const url = `https://rsshub.app/twitter/user/${acc}`;

      const r = await fetch(url);
      const text = await r.text();

      const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];

      for (const item of items.slice(0,3)) {

        const title = item[1].match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = item[1].match(/<link>(.*?)<\/link>/)?.[1] || "";

        results.push({
          id: link,
          title: title,
          summary: "",
          source: "X",
          urgency: "medium",
          time: new Date().toISOString(),
          url: link
        });

      }
    }

    res.status(200).json({
      news: results,
      updated: new Date().toISOString(),
      source: "x-intel-feed"
    });

  } catch (e) {

    res.status(200).json({
      news: [],
      updated: new Date().toISOString(),
      source: "x-intel-feed"
    });

  }
}
