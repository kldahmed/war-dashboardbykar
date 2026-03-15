export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "all" } = req.query;

    const allNews = [
      {
        id: 1,
        title: "تصاعد المتابعة الإعلامية للتطورات الإقليمية",
        summary: "تشهد الساحة الإقليمية متابعة مكثفة مع صدور تقارير وتحليلات جديدة من عدة مصادر.",
        urgency: "high",
        source: "News Desk",
        time: new Date().toISOString(),
        category: "regional"
      },
      {
        id: 2,
        title: "تصريحات سياسية جديدة حول الوضع الراهن",
        summary: "مسؤولون أدلوا بتصريحات جديدة بشأن آخر التطورات مع توقعات باستمرار المتابعة خلال الساعات المقبلة.",
        urgency: "medium",
        source: "Political Monitor",
        time: new Date().toISOString(),
        category: "politics"
      },
      {
        id: 3,
        title: "قراءة عسكرية للمشهد الميداني",
        summary: "تحليلات جديدة تتناول التحركات والتقديرات المرتبطة بالمشهد العسكري الحالي.",
        urgency: "medium",
        source: "Defense Watch",
        time: new Date().toISOString(),
        category: "military"
      },
      {
        id: 4,
        title: "تأثيرات اقتصادية مرتبطة بالتطورات الأخيرة",
        summary: "الأسواق تتابع المستجدات وسط تقييمات مختلفة للتأثيرات الاقتصادية المحتملة.",
        urgency: "low",
        source: "Economic Brief",
        time: new Date().toISOString(),
        category: "economy"
      },
      {
        id: 5,
        title: "تحديث شامل لأبرز المستجدات",
        summary: "ملخص عام لأهم الأخبار والتطورات المتداولة خلال اليوم.",
        urgency: "high",
        source: "Live Updates",
        time: new Date().toISOString(),
        category: "all"
      }
    ];

    const filteredNews =
      category === "all"
        ? allNews
        : allNews.filter(
            (item) => item.category === category || item.category === "all"
          );

    return res.status(200).json({
      news: filteredNews,
      updated: new Date().toLocaleString("ar-AE", {
        timeZone: "Asia/Dubai"
      })
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch news" });
  }
}
