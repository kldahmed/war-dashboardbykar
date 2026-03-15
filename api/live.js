export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const channels = [
      {
        id: "aj",
        name: "Al Jazeera English",
        flag: "🌍",
        youtubeId: "gCNeDWCI0vo",
        title: "Al Jazeera English - Live"
      },
      {
        id: "fr24",
        name: "France 24 English",
        flag: "🇫🇷",
        youtubeId: "Ap-UM1O9RBU",
        title: "France 24 English - Live"
      }
    ];

    return res.status(200).json({
      channels,
      live: false,
      source: "Static live channels"
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch live channels" });
  }
}
