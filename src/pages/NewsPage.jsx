import React, { lazy } from "react";
import NewsCard from "../components/NewsCard";
import { LazySection, PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

const SportsLiveChannels = lazy(() => import("../components/SportsLiveChannels"));
const XNewsFeed = lazy(() => import("../components/XNewsFeed"));

export default function NewsPage({
  language,
  categories,
  cat,
  setCat,
  sportsCompetitions,
  sportsCompetition,
  setSportsCompetition,
  displayedNews,
  loading,
  error,
  handleCardClick,
  uaeStandings,
  uaeStandingsUpdatedAt,
  isStandingsLoading,
}) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأخبار" : "NEWS"}
        title={language === "ar" ? "أخبار مختارة وتدفق موضوعي" : "Curated news and thematic feed"}
        description={language === "ar"
          ? "تم نقل الأخبار إلى صفحة مستقلة مع التصنيفات، الرياضة، وترتيب أوضح للمحتوى."
          : "News now lives in a dedicated page with categories, sports, and a clearer content flow."}
      />

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

      {cat === "sports" ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {sportsCompetitions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSportsCompetition(item.id)}
              style={{
                background: sportsCompetition === item.id ? "#f3d38a" : "#1a1f27",
                color: sportsCompetition === item.id ? "#222" : "#f3d38a",
                border: "1px solid rgba(243,211,138,0.3)",
                borderRadius: 10,
                padding: "7px 14px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {cat === "sports" && sportsCompetition === "uae" ? (
        <div style={{ ...panelStyle, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ padding: "16px 20px", background: "rgba(74,222,128,0.08)", borderBottom: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🇦🇪</span>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#4ade80" }}>{language === "ar" ? "ترتيب الدوري الإماراتي" : "UAE League Standings"}</span>
          </div>
          {isStandingsLoading && !uaeStandings.length ? (
            <div style={{ textAlign: "center", color: "#4ade80", padding: 24 }}>{language === "ar" ? "⏳ جارٍ تحميل الترتيب" : "Loading standings"}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", color: "#e2e8f0" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "0.78rem" }}>
                    {["#", language === "ar" ? "الفريق" : "Team", language === "ar" ? "لعب" : "P", language === "ar" ? "فاز" : "W", language === "ar" ? "تعادل" : "D", language === "ar" ? "خسر" : "L", language === "ar" ? "له" : "GF", language === "ar" ? "عليه" : "GA", language === "ar" ? "+/-" : "GD", language === "ar" ? "النقاط" : "Pts"].map((heading) => (
                      <th key={heading} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uaeStandings.map((row, index) => (
                    <tr key={row.rank ?? index} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{row.rank}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{row.team}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.played}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#4ade80" }}>{row.won}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24" }}>{row.drawn}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#f87171" }}>{row.lost}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsFor}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsAgainst}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalDifference}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#f3d38a", fontWeight: 900 }}>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uaeStandingsUpdatedAt ? (
                <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", padding: "8px 16px" }}>
                  {language === "ar" ? "آخر تحديث" : "Last update"}: {uaeStandingsUpdatedAt}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {loading ? <div style={{ textAlign: "center", color: "#38bdf8", padding: 30 }}>{language === "ar" ? "جارٍ التحميل" : "Loading"}</div> : null}
      {error ? <div style={{ textAlign: "center", color: "#e74c3c", padding: 30 }}>{error}</div> : null}

      {cat === "sports" && sportsCompetition === "live-channels" ? (
        <LazySection minHeight={420}>
          <SportsLiveChannels />
        </LazySection>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          {displayedNews.map((item, idx) => (
            <NewsCard key={item.id || idx} {...item} onClick={() => handleCardClick(item)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <LazySection minHeight={280}>
          <XNewsFeed />
        </LazySection>
      </div>
    </div>
  );
}
