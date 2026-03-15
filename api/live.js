async function searchLiveVideo(query, apiKey) {
  const url =
    "https://www.googleapis.com/youtube/v3/search?" +
    new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      eventType: "live",
      maxResults: "1",
      order: "relevance",
      videoEmbeddable: "true",
      key: apiKey
    }).toString();

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("YouTube live search failed");
  }

  const data = await response.json();
  const item = Array.isArray(data.items) ? data.items[0] : null;

  if (!item?.id?.videoId) return null;

  return {
    youtubeId: item.id.videoId,
    title: item?.snippet?.title || query
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing YOUTUBE_API_KEY"
      });
    }

    const sources = [
      { id: "aj", name: "Al Jazeera Live", flag: "🌍", query: "Al Jazeera English live" },
      { id: "fr24", name: "France 24 Live", flag: "🇫🇷", query: "France 24 English live" },
      { id: "sky", name: "Sky News Live", flag: "🇬🇧", query: "Sky News live" }
    ];

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const live = await searchLiveVideo(source.query, apiKey);
          if (!live) return null;

          return {
            id: source.id,
            name: source.name,
            flag: source.flag,
            youtubeId: live.youtubeId,
            title: live.title
          };
        } catch {
          return null;
        }
      })
    );

    const channels = results.filter(Boolean);

    return res.status(200).json({ channels });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch live channels"
    });
  }
}
