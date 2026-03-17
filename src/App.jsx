import React, { useEffect, useMemo, useState, useRef } from "react";
import NewsCard from "./components/NewsCard";
import BreakingNewsTicker from "./components/BreakingNewsTicker";
import ArticleModal from "./components/ArticleModal";
import WarRiskPanel from "./components/WarRiskPanel";
import StatsPanel from "./components/StatsPanel";
import LiveConflictMap from "./components/LiveConflictMap";
import EscalationTimelinePanel from "./components/EscalationTimelinePanel";
import AISummaryPanel from "./components/AISummaryPanel";
import GlobalRiskMeter from "./components/GlobalRiskMeter";
import LiveChannelsPanel from "./components/LiveChannelsPanel";
import GlobalIntelligenceCenter from "./components/GlobalIntelligenceCenter";
import GlobalLiveMap from "./components/GlobalLiveMap";
import ThreatRadar from "./components/ThreatRadar";
import StrategicForecast from "./components/StrategicForecast";
import EnergyShockIndex from "./components/EnergyShockIndex";
import XNewsFeed from "./components/XNewsFeed";
import LiveRegionStrip from "./components/LiveRegionStrip";
import AudioBulletin from "./components/AudioBulletin";
import IntelligenceMeter from "./components/IntelligenceMeter";
import ForecastCenter from "./components/ForecastCenter";
import MemoryDepthPanel from "./components/MemoryDepthPanel";
import SignalDensityPanel from "./components/SignalDensityPanel";
import TrendEvolutionTimeline from "./components/TrendEvolutionTimeline";
import EventGraphPanel from "./components/EventGraphPanel";
import ScenarioPanel from "./components/ScenarioPanel";
import SportsIntelligencePanel from "./components/SportsIntelligencePanel";
import { extractIntelligence } from "./lib/entityExtractor";
import { ingestItems } from "./lib/intelligenceStore";
import { getIntelligenceMetrics } from "./lib/intelligenceEngine";
import { sortArticlesByPriority } from "./lib/priorityEngine";
import SignalScenarioCenter from "./components/SignalScenarioCenter";
import GlobalEventTimeline from "./components/GlobalEventTimeline";
import StrategicForecastCenter from "./components/StrategicForecastCenter";
import AgentDashboard from "./components/AgentDashboard";
import { ingestBatch } from "./lib/agent/ingestionAgent";
import { useI18n } from "./i18n/I18nProvider";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { OrbitalMap } from "./components/OrbitalMap";

const DEMO_NEWS = [
  {
    id: "demo-1",
    title: "تحديثات إقليمية مستمرة في عدد من المناطق",
    summary: "هذه بيانات احتياطية تظهر عند تعذر الوصول إلى الخادم.",
    urgency: "medium",
    source: "Fallback Feed",
    time: new Date().toISOString(),
    category: "regional",
    url: "#",
    image: ""
  }
];
const CATEGORIES = [
  { id: "all", key: "all", emoji: "🌍" },
  { id: "regional", key: "regional", emoji: "🗺️" },
  { id: "politics", key: "politics", emoji: "🏛️" },
  { id: "military", key: "military", emoji: "⚔️" },
  { id: "economy", key: "economy", emoji: "💰" },
  { id: "sports", key: "sports", emoji: "⚽" }
];
const SPORTS_COMPETITIONS = [
  { id: "all", key: "all", emoji: "🌍" },
  { id: "uae", key: "uae", emoji: "🇦🇪" },
  { id: "premier-league", key: "premierLeague", emoji: "🏴" },
  { id: "laliga", key: "laliga", emoji: "🇪🇸" },
  { id: "champions-league", key: "championsLeague", emoji: "🏆" },
  { id: "transfers", key: "transfers", emoji: "🔁" },
  { id: "world", key: "world", emoji: "🌐" }
];
const TABS = [
  { id: "news", key: "news", icon: "📰" },
  { id: "events", key: "events", icon: "🌍" },
  { id: "signals", key: "signals", icon: "🔭" },
  { id: "intel", key: "intel", icon: "🌐" },
  { id: "forecast", key: "forecast", icon: "🎯" },
  { id: "agent", key: "agent", icon: "🤖" },
  { id: "live", key: "live", icon: "📺" },
  { id: "xfeed", key: "xfeed", icon: "𝕏" }
];
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Section error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            color: "#e74c3c",
            padding: "16px",
            textAlign: "center",
            background: "#222",
            borderRadius: "12px",
            margin: "18px auto",
            maxWidth: "1400px",
            border: "1px solid rgba(231,76,60,.25)"
          }}
        >
          ⚠️ تعذر تحميل هذا القسم حاليًا
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { t, direction, language, setLanguage } = useI18n();
  const [tab, setTab] = useState("news");
  const [cat, setCat] = useState("all");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const intervalRef = useRef(null);
  const [sportsCompetition, setSportsCompetition] = useState("all");
  const [uaeStandings, setUaeStandings] = useState([]);
  const [uaeStandingsUpdatedAt, setUaeStandingsUpdatedAt] = useState("");
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);
  const standingsFallbackRef = useRef(null);
  const standingsIntervalRef = useRef(null);

  // Intelligence layer state
  const [intelRefreshKey, setIntelRefreshKey] = useState(0);
  const [intelMetrics, setIntelMetrics] = useState(null);

  useEffect(() => {
    document.title = `${t("app.title")} 🌍`;
  }, [t, language]);

  const tabs = useMemo(
    () => TABS.map((item) => ({ ...item, label: t(`app.tabs.${item.key}`) })),
    [t]
  );

  const categories = useMemo(
    () => CATEGORIES.map((item) => ({ ...item, label: t(`app.categories.${item.key}`) })),
    [t]
  );

  const sportsCompetitions = useMemo(
    () => SPORTS_COMPETITIONS.map((item) => ({ ...item, label: t(`app.competitions.${item.key}`) })),
    [t]
  );

const fetchNews = async () => {
  setLoading(true);
  setError("");

  try {
    let endpoint = `/api/news?category=${cat}`;

    if (cat === "sports") {
      endpoint = `/api/sports?competition=${sportsCompetition}`;
    }

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("fetch_failed");

    const data = await res.json();

    const incomingNews = Array.isArray(data.news) ? data.news.slice(0, 100) : [];

    // مهم جدًا: إذا كانت الفئة رياضة، لا نسمح إلا بأخبار sports فقط
    const filteredNews =
      cat === "sports"
        ? incomingNews.filter((item) => item.category === "sports")
        : incomingNews.filter((item) => item.category !== "sports" || cat === "all");

    setNews(sortArticlesByPriority(filteredNews));
    setError("");
  } catch {
    setNews([]);
    setError(t("app.errorLoadNews"));
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  if (tab !== "news") return;

  fetchNews();

  if (intervalRef.current) clearInterval(intervalRef.current);
  intervalRef.current = setInterval(fetchNews, 15000);

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [cat, tab, sportsCompetition]);

  // Intelligence ingestion: process new articles into the memory store
  useEffect(() => {
    if (!news.length) return;
    try {
      const extracted = news.map(a => extractIntelligence(a));
      ingestItems(extracted);
      setIntelMetrics(getIntelligenceMetrics());
      setIntelRefreshKey(k => k + 1);
      // Feed the AI agent with the same batch
      ingestBatch(news, cat === "sports" ? "sports" : "news");
    } catch { /* non-critical */ }
  }, [news]);


  useEffect(() => {
    if (cat !== "sports" || sportsCompetition !== "uae") {
      if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
      return;
    }

    const loadStandings = () => {
      setIsStandingsLoading((prev) => (uaeStandings.length === 0 ? true : prev));

      // 3-second hard timeout — if no data yet, stop spinner
      const timeout = setTimeout(() => {
        setIsStandingsLoading(false);
      }, 3000);

      fetch("/api/uae-standings")
        .then((r) => r.json())
        .then((data) => {
          clearTimeout(timeout);
          if (Array.isArray(data.standings) && data.standings.length) {
            setUaeStandings(data.standings);
            setUaeStandingsUpdatedAt(data.updatedAt || "");
            setIsStandingsLoading(false);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          setIsStandingsLoading(false);
        });
    };

    loadStandings();

    // Refresh standings every 60 seconds
    if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
    standingsIntervalRef.current = setInterval(loadStandings, 60000);

    return () => {
      if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
      if (standingsFallbackRef.current) clearTimeout(standingsFallbackRef.current);
    };
  }, [cat, sportsCompetition]);

  const displayedNews = (() => {
    if (cat === "sports" && sportsCompetition === "uae") {
      // In UAE mode: show only UAE league news, never generic world/PL/LaLiga items
      const uaeItems = news.filter((n) => n.isUaeLeagueNews || n.competition === "uae");
      return uaeItems.length > 0 ? uaeItems : news;
    }
    return news.length > 0
      ? news
      : cat === "sports"
      ? []
      : DEMO_NEWS;
  })();
  const tickerHeadlines = displayedNews.slice(0, 10).map((n) => n.title);

  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  return (
    <div
      dir={direction}
      style={{
        minHeight: "100vh",
        background: "#11151a",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        position: "relative"
      }}
    >
      {/* Newsroom background layers */}
      <div className="nr-bg-grid" />
      <div className="nr-bg-beam" />

      <BreakingNewsTicker headlines={tickerHeadlines} />

      <header
        style={{
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))",
          backdropFilter: "blur(8px)"
        }}
      >
        {/* Left: Logo + Title */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 900,
              letterSpacing: "0.5px",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "Inter, Poppins, Satoshi, system-ui, -apple-system, sans-serif",
              textShadow: "0 2px 8px rgba(56,189,248,0.2)"
            }}
          >
            🌍 {t("app.title")}
          </div>
        </div>

        {/* Center: Subtitle (hidden on mobile) */}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            display: "none",
            "@media": "screen and (min-width: 768px)"
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontFamily: "Inter, Poppins, Satoshi, system-ui, -apple-system, sans-serif"
            }}
          >
            {t("app.subtitle")}
          </div>
        </div>

        {/* Right: Premium Language Switcher */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero section with center alignment */}
      <div
        style={{
          padding: "32px 0 28px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            paddingBottom: "12px"
          }}
        >
          <div
            style={{
              width: "120px",
              height: "3px",
              margin: "0 auto 16px",
              borderRadius: "999px",
              background: "linear-gradient(90deg,#38bdf8,#60a5fa,#f3d38a,#38bdf8)",
              boxShadow: "0 0 12px rgba(56,189,248,0.25)"
            }}
          />
          <div
            style={{
              color: "#cbd5e1",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontFamily: "Inter, Poppins, Satoshi, system-ui, -apple-system, sans-serif"
            }}
          >
            {t("app.subtitle")}
          </div>
        </div>
      </div>

      <LiveRegionStrip />

      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          marginBottom: "18px",
          flexWrap: "wrap"
        }}
      >
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            style={{
              background: tab === tabItem.id ? "#f3d38a" : "#222",
              color: tab === tabItem.id ? "#222" : "#f3d38a",
              border: "none",
              borderRadius: "10px",
              padding: "10px 22px",
              fontWeight: "700",
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </nav>

      {tab === "news" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
            padding: "0 12px"
          }}
        >
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                background: cat === c.id ? "#38bdf8" : "#222",
                color: cat === c.id ? "#fff" : "#38bdf8",
                border: "none",
                borderRadius: "10px",
                padding: "8px 16px",
                fontWeight: "700",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      {tab === "news" && cat === "sports" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
            padding: "0 12px"
          }}
        >
          {sportsCompetitions.map((c) => (
            <button
              key={c.id}
              onClick={() => setSportsCompetition(c.id)}
              style={{
                background: sportsCompetition === c.id ? "#f3d38a" : "#1a1f27",
                color: sportsCompetition === c.id ? "#222" : "#f3d38a",
                border: "1px solid rgba(243,211,138,0.3)",
                borderRadius: "10px",
                padding: "7px 14px",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}


      <main style={{ padding: "0 20px 50px" }}>
        {tab === "news" && (
          <>
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#38bdf8",
                  padding: "30px"
                }}
              >
                {t("app.loading")}
              </div>
            )}

            {error && (
              <div
                style={{
                  textAlign: "center",
                  color: "#e74c3c",
                  padding: "30px"
                }}
              >
                {error}
              </div>
            )}

            {cat === "sports" && sportsCompetition === "uae" && (
              <div style={{ maxWidth: "900px", margin: "0 auto 28px" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, #1a2a1a, #0f1f0f)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    borderRadius: "16px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",
                      background: "rgba(74,222,128,0.08)",
                      borderBottom: "1px solid rgba(74,222,128,0.15)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>🇦🇪</span>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#4ade80" }}>
                      ترتيب دوري أدنوك للمحترفين
                    </span>
                  </div>
                  {isStandingsLoading && !uaeStandings.length ? (
                    <div style={{ textAlign: "center", color: "#4ade80", padding: "24px" }}>
                      ⏳ جاري تحميل الترتيب...
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.88rem",
                          color: "#e2e8f0"
                        }}
                      >
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "0.78rem" }}>
                            {["#", "النادي", "لع", "ف", "ت", "خ", "له", "عليه", "فرق", "نقاط"].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uaeStandings.map((row, i) => (
                            <tr
                              key={row.rank ?? i}
                              style={{
                                borderTop: "1px solid rgba(255,255,255,0.05)",
                                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                                ...(row.rank <= 3 ? { borderRight: "3px solid #4ade80" } : {}),
                                ...(row.rank >= uaeStandings.length - 1 ? { borderRight: "3px solid #f87171" } : {})
                              }}
                            >
                              <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{row.rank}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{row.team}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.played}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", color: "#4ade80" }}>{row.won}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24" }}>{row.drawn}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", color: "#f87171" }}>{row.lost}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsFor}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsAgainst}</td>
                              <td style={{ padding: "10px 12px", textAlign: "center", color: (row.goalDifference ?? 0) >= 0 ? "#4ade80" : "#f87171" }}>
                                {(row.goalDifference ?? 0) > 0 ? `+${row.goalDifference}` : row.goalDifference}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 900, fontSize: "1rem", color: "#f3d38a" }}>{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {uaeStandingsUpdatedAt && (
                        <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", padding: "8px 16px" }}>
                          آخر تحديث: {uaeStandingsUpdatedAt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}


            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "18px",
                maxWidth: "1400px",
                margin: "0 auto"
              }}
            >
              {cat === "sports" && sportsCompetition === "uae" && (
                <div style={{ gridColumn: "1 / -1", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f3d38a", marginBottom: "4px" }}>
                    📰 أخبار دوري أدنوك والأندية
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    آخر أخبار الشارقة والعين وشباب الأهلي والوصل وبقية أندية الدوري
                  </div>
                </div>
              )}
              {displayedNews.map((item, idx) => (
                <NewsCard
                  key={item.id || idx}
                  {...item}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </div>
          </>
        )}

    {tab === "events" && (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px 40px" }}>
        <ErrorBoundary>
          <GlobalEventTimeline />
        </ErrorBoundary>
      </div>
    )}

    {tab === "signals" && (
      <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "0 20px 40px" }}>
        <ErrorBoundary>
          <SignalScenarioCenter refreshKey={intelRefreshKey} />
        </ErrorBoundary>
      </div>
    )}

    {tab === "intel" && (
  <div
    style={{
      maxWidth: "1400px",
      margin: "0 auto",
      display: "grid",
      gap: "28px"
    }}
  >
    <ErrorBoundary>
      <GlobalLiveMap />
    </ErrorBoundary>

    {/* Intelligence meter + memory depth at top */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flexWrap: "wrap" }}>
      <ErrorBoundary>
        <IntelligenceMeter refreshKey={intelRefreshKey} />
      </ErrorBoundary>
      <ErrorBoundary>
        <MemoryDepthPanel metrics={intelMetrics} />
      </ErrorBoundary>
    </div>

    <ErrorBoundary>
      <GlobalIntelligenceCenter news={displayedNews} />
    </ErrorBoundary>

    <ErrorBoundary>
      <ThreatRadar news={displayedNews} />
    </ErrorBoundary>

    <ErrorBoundary>
      <StrategicForecast news={displayedNews} />
    </ErrorBoundary>

    <ErrorBoundary>
      <EnergyShockIndex news={displayedNews} />
    </ErrorBoundary>

    <ErrorBoundary>
      <SportsIntelligencePanel refreshKey={intelRefreshKey} />
    </ErrorBoundary>
  </div>
)}

    {tab === "forecast" && (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px 40px" }}>
        <ErrorBoundary>
          <StrategicForecastCenter refreshKey={intelRefreshKey} />
        </ErrorBoundary>
      </div>
    )}

    {tab === "agent" && (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px 40px" }}>
        <ErrorBoundary>
          <AgentDashboard refreshKey={intelRefreshKey} />
        </ErrorBoundary>
      </div>
    )}

        {tab === "live" && (
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <ErrorBoundary>
              <LiveChannelsPanel />
            </ErrorBoundary>
          </div>
        )}
      </main>

      <ArticleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        article={modalArticle}
      />

      {tab === "intel" && (
        <>
          <div
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
              justifyContent: "center",
              margin: "10px 20px 32px"
            }}
          >
            <ErrorBoundary>
              <WarRiskPanel news={displayedNews} />
            </ErrorBoundary>

            <ErrorBoundary>
              <StatsPanel
                news={displayedNews}
                updated={news.length > 0 ? news[0].time : DEMO_NEWS[0].time}
              />
            </ErrorBoundary>
          </div>

          <div style={{ margin: "32px 20px" }}>
            <ErrorBoundary>
              <GlobalRiskMeter news={displayedNews} />
            </ErrorBoundary>
          </div>

          <div style={{ margin: "32px 20px" }}>
            <ErrorBoundary>
              <AISummaryPanel news={displayedNews} />
            </ErrorBoundary>
          </div>

          <div style={{ margin: "32px 20px" }}>
            <ErrorBoundary>
              <EscalationTimelinePanel news={displayedNews} />
            </ErrorBoundary>
          </div>
        </>
      )}
      {tab === "xfeed" && (
  <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
    <ErrorBoundary>
      <XNewsFeed />
    </ErrorBoundary>
  </div>
)}

      {tab === "live" && (
        <div style={{ margin: "32px 20px" }}>
          <ErrorBoundary>
            <LiveConflictMap />
          </ErrorBoundary>
        </div>
      )}

      {/* Floating audio bulletin */}
      <AudioBulletin headlines={tickerHeadlines} />
    </div>
  );
}
