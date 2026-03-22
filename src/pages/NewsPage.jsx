import React from "react";
import NewsCard from "../components/NewsCard";
import { localizeSummaryText } from "../lib/i18n/summaryLocalizer";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

export default function NewsPage({
  language,
  categories,
  cat,
  setCat,
  displayedNews,
  loading,
  error,
  feedStatus,
  retryNews,
  handleCardClick,
}) {
  const healthySources = Number(feedStatus?.stats?.healthySources || 0);
  const totalSources = Number(feedStatus?.stats?.totalSources || 0);
  const breakingCount = Number(feedStatus?.stats?.breakingCount || 0);
  const avgQuality = Number(feedStatus?.stats?.averageQuality || 0);
  const quarantinedSources = Number(feedStatus?.stats?.quarantinedSources || 0);
  const featuredAlert = feedStatus?.featuredAlert || null;

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأخبار" : "NEWS"}
        title={language === "ar" ? "الأخبار الأساسية الآن" : "Core News Now"}
        description={language === "ar"
          ? "الإشارات الفارقة فقط: عاجل، جودة المصادر، والقصص الأهم."
          : "Only high-signal output: breaking, source quality, and top stories."}
      />

      <section style={{ ...panelStyle, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 800 }}>
            {language === "ar" ? `المصادر الجاهزة ${healthySources}/${totalSources}` : `Healthy sources ${healthySources}/${totalSources}`}
          </span>
          <span style={{ color: "#f87171", fontSize: 12, fontWeight: 800 }}>
            {language === "ar" ? `عاجل الآن ${breakingCount}` : `Breaking now ${breakingCount}`}
          </span>
          <span style={{ color: quarantinedSources > 0 ? "#fca5a5" : "#94a3b8", fontSize: 12, fontWeight: 800 }}>
            {language === "ar" ? `معزول مؤقتا ${quarantinedSources}` : `Quarantined ${quarantinedSources}`}
          </span>
          <span style={{ color: "#67e8f9", fontSize: 12, fontWeight: 800 }}>
            {language === "ar" ? `متوسط الجودة ${avgQuality}/100` : `Average quality ${avgQuality}/100`}
          </span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            {language === "ar"
              ? localizeSummaryText(feedStatus?.sourceMode || "", "ar", { kind: "label" })
              : (feedStatus?.sourceMode || "")}
          </span>
        </div>
      </section>

      {featuredAlert?.title ? (
        <section style={{ ...panelStyle, padding: "12px 14px", marginBottom: 14, border: "1px solid rgba(248,113,113,0.35)", background: "linear-gradient(145deg, rgba(127,29,29,0.14), rgba(30,41,59,0.5))" }}>
          <div style={{ color: "#fecaca", fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
            {language === "ar" ? "تنبيه عاجل" : "Breaking alert"}
          </div>
          <div style={{ color: "#f8fafc", fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>
            {featuredAlert.title}
          </div>
          <button
            type="button"
            onClick={() => handleCardClick(featuredAlert)}
            style={{ border: "1px solid rgba(56,189,248,0.55)", background: "rgba(56,189,248,0.16)", color: "#bae6fd", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            {language === "ar" ? "فتح الخبر" : "Open story"}
          </button>
        </section>
      ) : null}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCat(item.id)}
            style={{
              background: cat === item.id ? "#38bdf8" : "#222",
              color: cat === item.id ? "#fff" : "#38bdf8",
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", color: "#38bdf8", padding: 30 }}>{language === "ar" ? "جارٍ التحميل" : "Loading"}</div> : null}
      {error ? (
        <div style={{ textAlign: "center", color: "#e74c3c", padding: 20 }}>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button
            type="button"
            onClick={retryNews}
            style={{ border: "1px solid rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.12)", color: "#7dd3fc", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}
          >
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        {(displayedNews || []).map((item, idx) => (
          <NewsCard key={item.id || idx} {...item} onClick={() => handleCardClick(item)} />
        ))}
      </div>

      {!loading && !error && (displayedNews || []).length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
          {language === "ar" ? "لا توجد أخبار متاحة حاليا." : "No stories available right now."}
        </div>
      ) : null}
    </div>
  );
}
