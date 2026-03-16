import React, { useMemo } from "react";

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function calculateScore(news) {
  let score = 0;

  news.forEach((n) => {
    if (n.urgency === "high") score += 30;
    else if (n.urgency === "medium") score += 15;
    else score += 6;
  });

  return Math.min(score, 100);
}

function detectRegion(news) {
  const regions = {
    "الشرق الأوسط": /إيران|إسرائيل|غزة|لبنان|العراق|سوريا|الخليج|هرمز/i,
    "أوروبا الشرقية": /روسيا|أوكرانيا|كييف|موسكو/i,
    "آسيا والمحيط": /الصين|تايوان|كوريا|بحر الصين/i,
    "أمريكا": /واشنطن|الولايات المتحدة|ترامب|بايدن/i
  };

  const scores = {};

  Object.keys(regions).forEach((region) => {
    scores[region] = news.filter((n) =>
      regions[region].test(clean(n.title) + clean(n.summary))
    ).length;
  });

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "غير محدد";
}

export default function StrategicForecast({ news = [] }) {

  const score = useMemo(() => calculateScore(news), [news]);
  const region = useMemo(() => detectRegion(news), [news]);

  const riskLabel =
    score > 70
      ? "خطر تصعيد مرتفع"
      : score > 40
      ? "توتر متوسط"
      : "استقرار نسبي";

  const color =
    score > 70
      ? "#ef4444"
      : score > 40
      ? "#f59e0b"
      : "#22c55e";

  return (
    <div
      style={{
        margin: "40px auto",
        maxWidth: "1400px",
        padding: "24px",
        borderRadius: "20px",
        background: "linear-gradient(180deg,#171a20,#0f1319)",
        border: "1px solid rgba(255,255,255,.06)"
      }}
    >
      <div
        style={{
          fontSize: "28px",
          fontWeight: "900",
          marginBottom: "16px",
          color: "#f8fafc"
        }}
      >
        التوقع الاستراتيجي
      </div>

      <div style={{ color: "#94a3b8", marginBottom: "20px" }}>
        تحليل آلي مبني على آخر الأخبار والضغوط الجيوسياسية
      </div>

      <div
        style={{
          background: "#1b1f26",
          padding: "18px",
          borderRadius: "14px",
          marginBottom: "20px"
        }}
      >
        <div
          style={{
            fontSize: "22px",
            fontWeight: "900",
            color
          }}
        >
          {riskLabel}
        </div>

        <div style={{ marginTop: "8px", color: "#cbd5f5" }}>
          المنطقة الأكثر عرضة للتصعيد: <b>{region}</b>
        </div>
      </div>

      <div
        style={{
          background: "#222831",
          borderRadius: "999px",
          height: "14px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            transition: "width .5s"
          }}
        />
      </div>

      <div
        style={{
          marginTop: "10px",
          color: "#94a3b8"
        }}
      >
        مؤشر المخاطر العالمية: {score}%
      </div>

      <div
        style={{
          marginTop: "26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: "16px"
        }}
      >
        <div
          style={{
            background: "#1b1f26",
            padding: "16px",
            borderRadius: "12px"
          }}
        >
          <div style={{ fontWeight: "800", marginBottom: "6px" }}>
            خلال 24 ساعة
          </div>
          <div style={{ color: "#94a3b8" }}>
            احتمالية زيادة التوتر في المناطق الساخنة
          </div>
        </div>

        <div
          style={{
            background: "#1b1f26",
            padding: "16px",
            borderRadius: "12px"
          }}
        >
          <div style={{ fontWeight: "800", marginBottom: "6px" }}>
            خلال 72 ساعة
          </div>
          <div style={{ color: "#94a3b8" }}>
            مراقبة تحركات عسكرية أو ضغط اقتصادي
          </div>
        </div>

        <div
          style={{
            background: "#1b1f26",
            padding: "16px",
            borderRadius: "12px"
          }}
        >
          <div style={{ fontWeight: "800", marginBottom: "6px" }}>
            السيناريو المحتمل
          </div>
          <div style={{ color: "#94a3b8" }}>
            استمرار التوتر مع محاولات احتواء دبلوماسي
          </div>
        </div>
      </div>
    </div>
  );
}
