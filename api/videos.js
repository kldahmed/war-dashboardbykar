export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "all" } = req.query;

    const allVideos = [
      {
        id: 1,
        youtubeId: "gCNeDWCI0vo",
        title: "متابعة مباشرة للأحداث",
        channel: "Al Jazeera English",
        category: "all"
      },
      {
        id: 2,
        youtubeId: "Ap-UM1O9RBU",
        title: "قراءة عسكرية للمشهد الحالي",
        channel: "France 24 English",
        category: "military"
      },
      {
        id: 3,
        youtubeId: "gCNeDWCI0vo",
        title: "تحليل سياسي للتصريحات الأخيرة",
        channel: "Al Jazeera English",
        category: "politics"
      },
      {
        id: 4,
        youtubeId: "Ap-UM1O9RBU",
        title: "تقرير مرئي للتطورات الإقليمية",
        channel: "France 24 English",
        category: "regional"
      },
      {
        id: 5,
        youtubeId: "gCNeDWCI0vo",
        title: "مستجدات وتحليلات إخبارية",
        channel: "Al Jazeera English",
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
