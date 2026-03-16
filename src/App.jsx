import React, { useEffect, useState, useRef } from "react";
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
import ThreatRadar from "./components/ThreatRadar";
import StrategicForecast from "./components/StrategicForecast";
import EnergyShockIndex from "./components/EnergyShockIndex";
import XNewsFeed from "./components/XNewsFeed";

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
  { id: "all", label: "الكل", emoji: "🌍" },
  { id: "regional", label: "إقليمي", emoji: "🗺️" },
  { id: "politics", label: "سياسة", emoji: "🏛️" },
  { id: "military", label: "عسكري", emoji: "⚔️" },
  { id: "economy", label: "اقتصاد", emoji: "💰" },
  { id: "sports", label: "رياضة", emoji: "⚽" }
];
const TABS = [
  { id: "news", label: "الأخبار", icon: "📰" },
  { id: "intel", label: "مركز التحليل", icon: "🌐" },
  { id: "live", label: "البث المباشر", icon: "📺" },
  { id: "xfeed", label: "نبض X", icon: "𝕏" }
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
  const [tab, setTab] = useState("news");
  const [cat, setCat] = useState("all");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    document.title = "Global Pulse 🌍";
  }, []);

const fetchNews = () => {
  setLoading(true);
  setError("");

  const endpoint =
    cat === "sports" ? "/api/sports" : `/api/news?category=${cat}`;

  fetch(endpoint)
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      setNews(Array.isArray(data.news) ? data.news.slice(0, 100) : []);
      setError("");
    })
    .catch(() => {
      setNews([]);
      setError("تعذر تحميل الأخبار من الخادم");
    })
    .finally(() => setLoading(false));
};

  useEffect(() => {
    fetchNews();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cat]);

  const displayedNews = news.length > 0 ? news : DEMO_NEWS;
  const tickerHeadlines = displayedNews.slice(0, 10).map((n) => n.title);

  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#11151a",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <BreakingNewsTicker headlines={tickerHeadlines} />

      <header
        style={{
          padding: "40px 0 26px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            padding: "26px 40px",
            borderRadius: "24px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: 900,
              letterSpacing: "1px",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              justifyContent: "center",
              fontFamily:
                "Inter, Poppins, Satoshi, system-ui, -apple-system, sans-serif",
              textShadow: "0 4px 30px rgba(56,189,248,0.25)"
            }}
          >
            🌍 Global Pulse
          </div>

          <div
            style={{
              width: "160px",
              height: "4px",
              margin: "14px auto",
              borderRadius: "999px",
              background:
                "linear-gradient(90deg,#38bdf8,#60a5fa,#f3d38a,#38bdf8)",
              boxShadow: "0 0 14px rgba(56,189,248,.35)"
            }}
          />

          <div
            style={{
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "4px",
              textTransform: "uppercase",
              fontFamily:
                "Inter, Poppins, Satoshi, system-ui, -apple-system, sans-serif"
            }}
          >
            Global News & Conflict Monitor
          </div>
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          marginBottom: "18px",
          flexWrap: "wrap"
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? "#f3d38a" : "#222",
              color: tab === t.id ? "#222" : "#f3d38a",
              border: "none",
              borderRadius: "10px",
              padding: "10px 22px",
              fontWeight: "700",
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {t.icon} {t.label}
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
          {CATEGORIES.map((c) => (
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
                جاري التحميل...
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "18px",
                maxWidth: "1400px",
                margin: "0 auto"
              }}
            >
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
    </div>
  );
}
