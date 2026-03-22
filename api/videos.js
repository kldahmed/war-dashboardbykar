function safeText(value = "", fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function isValidYouTubeId(id = "") {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id).trim());
}

function normalizeCategory(category = "", title = "", channel = "") {
  const c = String(category || "").trim();
  if (["all", "regional", "politics", "military", "economy"].includes(c)) {
    return c;
  }

  const hay = `${title} ${channel}`.toLowerCase();

  if (/economy|business|cnbc|اقتصاد|أسواق|نفط|طاقة/.test(hay)) return "economy";
  if (/politic|policy|government|president|سياسة|حكومة|رئيس|وزير/.test(hay)) return "politics";
  if (/military|war|missile|drone|strike|عسكري|حرب|صاروخ|مسيرة|قصف/.test(hay)) return "military";
  if (/middle east|world|regional|الشرق الأوسط|إقليمي|عالمي/.test(hay)) return "regional";

  return "all";
}

function categoryMatches(videoCategory = "all", requestedCategory = "all") {
  if (requestedCategory === "all") return true;
  return videoCategory === requestedCategory || videoCategory === "all";
}

function priorityScore(item) {
  let score = 0;
  if (item.featured) score += 100;
  if (item.live) score += 50;
  score += Number(item.priority || 0);
  return score;
}

function dedupeVideos(items) {
  const seen = new Map();

  for (const item of items) {
    const key = String(item.youtubeId || "").trim();
    if (!key) continue;

    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, item);
      continue;
    }

    if (priorityScore(item) > priorityScore(prev)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

async function fetchOEmbed(youtubeId) {
  if (!isValidYouTubeId(youtubeId)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`
    )}&format=json`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();

    return {
      title: safeText(data?.title, ""),
      authorName: safeText(data?.author_name, ""),
      thumbnailUrl: safeText(data?.thumbnail_url, "")
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "all" } = req.query;

    const catalog = [
      {
        id: "v1",
        youtubeId: "gCNeDWCI0vo",
        fallbackTitle: "الجزيرة الإنجليزية - بث مباشر",
        fallbackChannel: "Al Jazeera English",
        category: "regional",
        featured: true,
        live: true,
        priority: 10
      },
      {
        id: "v2",
        youtubeId: "Ap-UM1O9RBU",
        fallbackTitle: "فرانس 24 الإنجليزية - بث مباشر",
        fallbackChannel: "France 24 English",
        category: "regional",
        featured: true,
        live: true,
        priority: 9
      },
      {
        id: "v3",
        youtubeId: "n7eQejkXbnM",
        fallbackTitle: "العربية مباشر",
        fallbackChannel: "العربية",
        category: "regional",
        featured: true,
        live: true,
        priority: 10
      },
      {
        id: "v4",
        youtubeId: "xWXpl7azI8k",
        fallbackTitle: "الحدث مباشر",
        fallbackChannel: "الحدث",
        category: "politics",
        featured: true,
        live: true,
        priority: 10
      },
      {
        id: "v5",
        youtubeId: "U--OjmpjF5o",
        fallbackTitle: "سكاي نيوز عربية مباشر",
        fallbackChannel: "Sky News Arabia",
        category: "regional",
        featured: true,
        live: true,
        priority: 9
      },
      {
        id: "v6",
        youtubeId: "3ursYA8HMeo",
        fallbackTitle: "فرانس 24 عربي مباشر",
        fallbackChannel: "France 24 Arabic",
        category: "regional",
        featured: false,
        live: true,
        priority: 8
      },
      {
        id: "v7",
        youtubeId: "e2RgSa1Wt5o",
        fallbackTitle: "العربي أخبار مباشر",
        fallbackChannel: "العربي",
        category: "politics",
        featured: false,
        live: true,
        priority: 8
      },
      {
        id: "v8",
        youtubeId: "O1pGmVtj2Y8",
        fallbackTitle: "BBC عربي مباشر",
        fallbackChannel: "BBC عربي",
        category: "regional",
        featured: false,
        live: true,
        priority: 8
      },
      {
        id: "v9",
        youtubeId: "jLlb3ryS-HM",
        fallbackTitle: "الميادين مباشر",
        fallbackChannel: "الميادين",
        category: "military",
        featured: false,
        live: true,
        priority: 8
      },
      {
        id: "v10",
        youtubeId: "4N5jTVWB7vA",
        fallbackTitle: "الغد مباشر",
        fallbackChannel: "الغد",
        category: "politics",
        featured: false,
        live: true,
        priority: 7
      },
      {
        id: "v11",
        youtubeId: "0YBF1h2oFcM",
        fallbackTitle: "TRT عربي مباشر",
        fallbackChannel: "TRT عربي",
        category: "regional",
        featured: false,
        live: true,
        priority: 7
      },
      {
        id: "v12",
        youtubeId: "pQSTFsOtrH0",
        fallbackTitle: "CNBC عربية مباشر",
        fallbackChannel: "CNBC عربية",
        category: "economy",
        featured: false,
        live: true,
        priority: 9
      },
      {
        id: "v13",
        youtubeId: "f6VpkfV7m4Y",
        fallbackTitle: "الشرق للأخبار مباشر",
        fallbackChannel: "الشرق للأخبار",
        category: "politics",
        featured: true,
        live: true,
        priority: 9
      },
      {
        id: "v14",
        youtubeId: "Pg2paSZ1byM",
        fallbackTitle: "الجديد مباشر",
        fallbackChannel: "الجديد",
        category: "regional",
        featured: false,
        live: true,
        priority: 7
      },
      {
        id: "v15",
        youtubeId: "ZN0aK3V0ds0",
        fallbackTitle: "تلفزيون سوريا مباشر",
        fallbackChannel: "تلفزيون سوريا",
        category: "military",
        featured: false,
        live: true,
        priority: 8
      }
    ];

    let videos = catalog
      .filter((item) => isValidYouTubeId(item.youtubeId))
      .map((item) => ({
        ...item,
        category: normalizeCategory(item.category, item.fallbackTitle, item.fallbackChannel)
      }));

    videos = dedupeVideos(videos);
    videos = videos.filter((item) => categoryMatches(item.category, category));

    const enriched = await Promise.all(
      videos.map(async (item) => {
        const meta = await fetchOEmbed(item.youtubeId);

        return {
          id: item.id,
          youtubeId: item.youtubeId,
          title: meta?.title || item.fallbackTitle,
          channel: meta?.authorName || item.fallbackChannel,
          thumbnail: meta?.thumbnailUrl || `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`,
          category: item.category,
          featured: !!item.featured,
          live: !!item.live,
          priority: item.priority || 0,
          url: `https://www.youtube.com/watch?v=${item.youtubeId}`
        };
      })
    );

    const sorted = enriched.sort((a, b) => {
      const p = priorityScore(b) - priorityScore(a);
      if (p !== 0) return p;

      return a.title.localeCompare(b.title, "ar");
    });

    return res.status(200).json({
      videos: sorted,
      live: true,
      source: "curated-youtube-oembed",
      updated: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch videos",
      videos: []
    });
  }
}
