import React, { useEffect, useMemo, useRef, useState } from "react";
import BreakingNewsTicker from "./components/BreakingNewsTicker";
import ArticleModal from "./components/ArticleModal";
import { useI18n, I18nContext } from "./i18n/I18nProvider";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { extractIntelligence } from "./lib/entityExtractor";
import { ingestItems } from "./lib/intelligenceStore";
import { getIntelligenceMetrics } from "./lib/intelligenceEngine";
import { sortArticlesByPriority } from "./lib/priorityEngine";
import { ingestBatch } from "./lib/agent/ingestionAgent";
import { invalidateWorldState } from "./lib/worldStateEngine";
import { startEngine as startGlobalEventsEngine, stopEngine as stopGlobalEventsEngine } from "./lib/globalEventsEngine";
import AgentPresence from "./components/AgentPresence";
import GlobalVoiceBriefing from "./components/GlobalVoiceBriefing";
import WorldEyeMode from "./components/WorldEyeMode";
import TopSectionNav from "./components/TopSectionNav";
import { useCurrentPath } from "./lib/simpleRouter";
import {
  AnalysisCenterPage,
  AgentPage,
  EventsPage,
  ForecastPage,
  LivePage,
  LinkCenterPage,
  NewsPage,
  OverviewPage,
  RadarPage,
  WorldStatePage,
} from "./pages/AppRoutePages";

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
  { id: "live-channels", key: "liveChannels", emoji: "📺" },
  { id: "uae", key: "uae", emoji: "🇦🇪" },
  { id: "premier-league", key: "premierLeague", emoji: "🏴" },
  { id: "laliga", key: "laliga", emoji: "🇪🇸" },
  { id: "champions-league", key: "championsLeague", emoji: "🏆" },
  { id: "transfers", key: "transfers", emoji: "🔁" },
  { id: "world", key: "world", emoji: "🌐" }
];

class ErrorBoundary extends React.Component {
  static contextType = I18nContext;

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
      const t = this.context?.t;
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
          ⚠️ {t ? t("common.sectionError") : "Section failed to load"}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { t, direction, language } = useI18n();
  const { currentPath, navigate } = useCurrentPath("/");

  const [cat, setCat] = useState("all");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const [sportsCompetition, setSportsCompetition] = useState("all");
  const [uaeStandings, setUaeStandings] = useState([]);
  const [uaeStandingsUpdatedAt, setUaeStandingsUpdatedAt] = useState("");
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);
  const [intelRefreshKey, setIntelRefreshKey] = useState(0);
  const [intelMetrics, setIntelMetrics] = useState(null);
  const [worldEyeOpen, setWorldEyeOpen] = useState(false);
  const intervalRef = useRef(null);
  const standingsIntervalRef = useRef(null);

  useEffect(() => {
    document.title = `${t("app.title")} 🌍`;
  }, [t, language]);

  useEffect(() => {
    startGlobalEventsEngine();
    return () => stopGlobalEventsEngine();
  }, []);

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
    fetchNews();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, currentPath === "/news" ? 15000 : 20000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cat, sportsCompetition, currentPath]);

  useEffect(() => {
    if (!news.length) return;
    try {
      const extracted = news.map((article) => extractIntelligence(article));
      ingestItems(extracted);
      setIntelMetrics(getIntelligenceMetrics());
      setIntelRefreshKey((value) => value + 1);
      ingestBatch(news, cat === "sports" ? "sports" : "news");
      invalidateWorldState();
    } catch {
      // Non-critical sync path.
    }
  }, [news, cat]);

  useEffect(() => {
    if (cat !== "sports" || sportsCompetition !== "uae") {
      if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
      return;
    }

    const loadStandings = () => {
      setIsStandingsLoading((prev) => (uaeStandings.length === 0 ? true : prev));
      const timeout = setTimeout(() => setIsStandingsLoading(false), 3000);

      fetch("/api/uae-standings")
        .then((response) => response.json())
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
    if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
    standingsIntervalRef.current = setInterval(loadStandings, 60000);

    return () => {
      if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
    };
  }, [cat, sportsCompetition, uaeStandings.length]);

  const displayedNews = useMemo(() => {
    if (cat === "sports" && sportsCompetition === "uae") {
      const uaeItems = news.filter((item) => item.isUaeLeagueNews || item.competition === "uae");
      return uaeItems.length > 0 ? uaeItems : news;
    }
    return news.length > 0 ? news : cat === "sports" ? [] : DEMO_NEWS;
  }, [cat, news, sportsCompetition]);

  const tickerHeadlines = displayedNews.slice(0, 10).map((item) => item.title);
  const lastUpdated = displayedNews[0]?.time || uaeStandingsUpdatedAt || new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" });

  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  const renderPage = () => {
    switch (currentPath) {
      case "/world-state":
        return <WorldStatePage language={language} intelMetrics={intelMetrics} refreshKey={intelRefreshKey} />;
      case "/news":
        return (
          <NewsPage
            language={language}
            categories={categories}
            cat={cat}
            setCat={setCat}
            sportsCompetitions={sportsCompetitions}
            sportsCompetition={sportsCompetition}
            setSportsCompetition={setSportsCompetition}
            displayedNews={displayedNews}
            loading={loading}
            error={error}
            handleCardClick={handleCardClick}
            uaeStandings={uaeStandings}
            uaeStandingsUpdatedAt={uaeStandingsUpdatedAt}
            isStandingsLoading={isStandingsLoading}
          />
        );
      case "/radar":
        return <RadarPage language={language} />;
      case "/events":
        return <EventsPage language={language} />;
      case "/link-center":
        return <LinkCenterPage language={language} refreshKey={intelRefreshKey} />;
      case "/analysis-center":
        return <AnalysisCenterPage language={language} displayedNews={displayedNews} intelMetrics={intelMetrics} refreshKey={intelRefreshKey} />;
      case "/forecast":
        return <ForecastPage language={language} displayedNews={displayedNews} refreshKey={intelRefreshKey} />;
      case "/agent":
        return <AgentPage language={language} refreshKey={intelRefreshKey} />;
      case "/live":
        return <LivePage language={language} />;
      default:
        return (
          <OverviewPage
            language={language}
            navigate={navigate}
            tickerHeadlines={tickerHeadlines}
            lastUpdated={lastUpdated}
            intelMetrics={intelMetrics}
            refreshKey={intelRefreshKey}
          />
        );
    }
  };

  return (
    <div
      dir={direction}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #060a10, #0a0f1c 15%, #070b12)",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        position: "relative"
      }}
    >
      <div className="nr-bg-grid" />
      <div className="nr-bg-beam" />

      <header
        style={{
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(243,211,138,0.06)",
          background: "linear-gradient(180deg, rgba(6,10,16,0.98), rgba(10,15,28,0.96))",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "0.5px",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif"
            }}
          >
            🌐 {t("app.title")}
          </div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "3px",
              color: "#f3d38a",
              textTransform: "uppercase",
              marginTop: 3,
              opacity: 0.7
            }}
          >
            {language === "ar" ? "منصة الوعي العالمي العربية" : "Arabic World Awareness Platform"}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setWorldEyeOpen(true)}
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(167,139,250,0.08))",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 10,
              padding: "6px 14px",
              color: "#38bdf8",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.25s ease",
              fontFamily: "Inter, system-ui, sans-serif"
            }}
            title={language === "ar" ? "عين العالم — وضع المراقبة" : "World Eye — Monitoring Mode"}
          >
            👁️ {language === "ar" ? "عين العالم" : "World Eye"}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <TopSectionNav currentPath={currentPath} navigate={navigate} language={language} />

      <BreakingNewsTicker headlines={tickerHeadlines} />

      {worldEyeOpen ? <WorldEyeMode onClose={() => setWorldEyeOpen(false)} /> : null}

      <main>
        <ErrorBoundary>{renderPage()}</ErrorBoundary>
      </main>

      <ArticleModal open={modalOpen} onClose={() => setModalOpen(false)} article={modalArticle} />

      <GlobalVoiceBriefing headlines={tickerHeadlines} />

      <ErrorBoundary>
        <AgentPresence refreshKey={intelRefreshKey} />
      </ErrorBoundary>
    </div>
  );
}