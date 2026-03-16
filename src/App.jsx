import React, { useEffect, useState, useRef } from "react";
import NewsCard from "./components/NewsCard";
import BreakingNewsTicker from "./components/BreakingNewsTicker";
import ArticleModal from "./components/ArticleModal";
import ConflictMiniMap from "./components/ConflictMiniMap";
import WarRiskPanel from "./components/WarRiskPanel";
import StatsPanel from "./components/StatsPanel";
import LiveConflictMap from "./components/LiveConflictMap";
import EscalationTimelinePanel from "./components/EscalationTimelinePanel";
import AISummaryPanel from "./components/AISummaryPanel";
import GlobalTensionHeatmap from "./components/GlobalTensionHeatmap";
import GlobalRiskMeter from "./components/GlobalRiskMeter";
import LiveChannelsPanel from "./components/LiveChannelsPanel";

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

const TABS = [
  { id: "news", label: "الأخبار", icon: "📰" },
  { id: "live", label: "البث المباشر", icon: "📺" }
];
const CATEGORIES = [
  { id: "all", label: "الكل", emoji: "🌍" },
  { id: "regional", label: "إقليمي", emoji: "🗺️" },
  { id: "politics", label: "سياسة", emoji: "🏛️" },
  { id: "military", label: "عسكري", emoji: "⚔️" },
  { id: "economy", label: "اقتصاد", emoji: "💰" }
];

// ErrorBoundary for risky panels
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {}
  render() {
    if (this.state.hasError) {
      return <div style={{ color: "#e74c3c", padding: "16px", textAlign: "center", background: "#222", borderRadius: "8px", margin: "18px 0" }}>⚠️ تعذر تحميل خريطة النزاعات</div>;
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

  // Fetch news with fallback and limit
  const fetchNews = () => {
    setLoading(true);
    setError("");
    fetch(`/api/news?category=${cat}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
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
    intervalRef.current = setInterval(fetchNews, 60000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [cat]);

  const displayedNews = news.length > 0 ? news : DEMO_NEWS;
  const tickerHeadlines = displayedNews.slice(0, 10).map(n => n.title);

  // Modal handler
  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#11151a", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      {/* Breaking News Ticker */}
      <BreakingNewsTicker headlines={tickerHeadlines} />
      {/* Header */}
      <header
  style={{
    padding: "34px 0 18px",
    textAlign: "center"
  }}
>
  <div
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      padding: "20px 28px",
      borderRadius: "22px",
      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
      backdropFilter: "blur(10px)"
    }}
  >
    <div
      style={{
        fontSize: "46px",
        fontWeight: 900,
        letterSpacing: "1.5px",
        lineHeight: 1,
        color: "#f8fafc",
        fontFamily:
          'Inter, SF Pro Display, Satoshi, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        textShadow: "0 4px 24px rgba(56,189,248,.16)"
      }}
    >
      Global Pulse <span style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,.35))" }}>🌍</span>
    </div>

    <div
      style={{
        height: "4px",
        width: "140px",
        borderRadius: "999px",
        background: "linear-gradient(90deg, #38bdf8, #f3d38a, #38bdf8)",
        boxShadow: "0 0 18px rgba(56,189,248,.28)"
      }}
    />

    <div
      style={{
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "3px",
        textTransform: "uppercase",
        fontFamily:
          'Inter, SF Pro Display, Satoshi, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      Global News & Conflict Monitor
    </div>
  </div>
</header>
      {/* Tabs */}
      <nav style={{ display: "flex", justifyContent: "center", gap: "18px", marginBottom: "18px" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? "#f3d38a" : "#222", color: tab === t.id ? "#222" : "#f3d38a", border: "none", borderRadius: "8px", padding: "8px 22px", fontWeight: "700", fontSize: "1rem", cursor: "pointer" }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>
      {/* Category Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "24px" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{ background: cat === c.id ? "#38bdf8" : "#222", color: cat === c.id ? "#fff" : "#38bdf8", border: "none", borderRadius: "8px", padding: "6px 16px", fontWeight: "700", fontSize: "1rem", cursor: "pointer" }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <main style={{ padding: "0 20px 50px" }}>
  {tab === "news" && (
    <>
      {loading && (
        <div style={{ textAlign: "center", color: "#38bdf8", padding: "30px" }}>
          جاري التحميل...
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", color: "#e74c3c", padding: "30px" }}>
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

  {tab === "live" && (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <LiveChannelsPanel />
    </div>
  )}
</main>
      {/* Article Modal */}
      <ArticleModal open={modalOpen} onClose={() => setModalOpen(false)} article={modalArticle} />
      {/* Map Panel */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <ConflictMiniMap news={displayedNews} radarPoints={[]} />
        </ErrorBoundary>
      </div>
      {/* War Risk Panel */}
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center", margin: "32px 0" }}>
        <ErrorBoundary>
          <WarRiskPanel news={displayedNews} />
        </ErrorBoundary>
        <ErrorBoundary>
          <StatsPanel news={displayedNews} updated={news.length > 0 ? news[0].time : DEMO_NEWS[0].time} />
        </ErrorBoundary>
      </div>
      {/* Live Conflict Map */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <LiveConflictMap />
        </ErrorBoundary>
      </div>
      {/* Escalation Timeline Panel */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <EscalationTimelinePanel news={displayedNews} />
        </ErrorBoundary>
      </div>
      {/* AISummaryPanel */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <AISummaryPanel news={displayedNews} />
        </ErrorBoundary>
      </div>
      {/* GlobalTensionHeatmap */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <GlobalTensionHeatmap news={displayedNews} />
        </ErrorBoundary>
      </div>
      {/* GlobalRiskMeter */}
      <div style={{ margin: "32px 0" }}>
        <ErrorBoundary>
          <GlobalRiskMeter news={displayedNews} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
