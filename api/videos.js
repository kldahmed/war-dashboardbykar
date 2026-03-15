export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "all" } = req.query;

    const allVideos = [
      {
        id: 1,
        youtubeId: "aqz-KE-bpKQ",
        title: "تقرير مرئي للتطورات الإقليمية",
        channel: "Global News",
        category: "regional"
      },
      {
        id: 2,
        youtubeId: "dQw4w9WgXcQ",
        title: "تحليل سياسي للتصريحات الأخيرة",
        channel: "Political Monitor",
        category: "politics"
      },
      {
        id: 3,
        youtubeId: "Ap-UM1O9RBU",
        title: "قراءة عسكرية للمشهد الحالي",
        channel: "Defense Watch",
        category: "military"
      },
      {
        id: 4,
        youtubeId: "gCNeDWCI0vo",
        title: "متابعة مباشرة للأحداث",
        channel: "Live Updates",
        category: "all"
      },
      {
        id: 5,
        youtubeId: "9Auq9mYxFEE",
        title: "مستجدات وتحليلات إخبارية",
        channel: "News Live",
        category: "all"
      }
    ];

    const videos =
      category === "all"
        ? allVideos
        : allVideos.filter(
            (item) => item.category === category || item.category === "all"
          );

    return res.status(200).json({ videos });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch videos" });
  }
}
