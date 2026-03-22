async function fetchJSON(url) {
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function scoreUrgency(text="") {

  const t = text.toLowerCase();

  if(/missile|drone|attack|strike|raid|explosion|rocket|intercept|غارة|قصف|صاروخ|مسيرة|انفجار/.test(t))
    return "high";

  if(/military|deployment|naval|alert|تحرك|تعزيزات|توتر/.test(t))
    return "medium";

  return "low";
}

function normalize(news){

  return news.map(n=>{

    const text = (n.title || "") + " " + (n.description || "");

    return {
      id: Math.random().toString(36),
      title: n.title,
      summary: n.description || "",
      source: n.source || "OSINT",
      time: n.pubDate || new Date().toISOString(),
      urgency: scoreUrgency(text),
      url: n.link || "#"
    }

  });

}

export default async function handler(req,res){

  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try{

    const feeds = [

      "https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.com/xml/rss/all.xml",
      "https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml"

    ];

    let all=[];

    for(const f of feeds){

      const data = await fetchJSON(f);

      if(data?.items){

        const items = data.items.slice(0,8).map(i=>({

          title:i.title,
          description:i.description,
          pubDate:i.pubDate,
          link:i.link,
          source:data.feed?.title || "News"

        }));

        all.push(...items);
      }

    }

    const news = normalize(all);

    news.sort((a,b)=> new Date(b.time)-new Date(a.time));

    res.status(200).json({
      news:news.slice(0,25),
      updated:new Date().toISOString(),
      source:"intel-feed"
    });

  }catch(e){

    res.status(200).json({
      news:[],
      updated:new Date().toISOString(),
      source:"intel-feed"
    });

  }

}
