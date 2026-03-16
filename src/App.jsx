import React, { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import NewsCard from "./components/NewsCard";
import HeroSection from "./components/HeroSection";
import VideoCard from "./components/VideoCard";
import ChannelCard from "./components/ChannelCard";
import WarRiskCard from "./components/WarRiskCard";
import ConflictMiniMap from "./components/ConflictMiniMap";
import StatsPanel from "./components/StatsPanel";
import TensionHeatmap from "./components/TensionHeatmap";
import TimelinePanel from "./components/TimelinePanel";
import AISummaryPanel from "./components/AISummaryPanel";
import * as Helpers from "./AppHelpers";

// Fallback definitions for missing constants/components
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
const formatDubaiTime = () => new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" });
const getUserErrorMessage = () => "تعذر تحميل البيانات من الخادم";
const FALLBACK_LIVE_CHANNEL = { id: "fallback", name: "Fallback Channel", flag: "🇦🇪", mode: "embed", youtubeId: "gCNeDWCI0vo", externalUrl: "" };
const TABS = [
  { id: "news", label: "الأخبار", icon: "📰" },
  { id: "videos", label: "فيديوهات", icon: "📺" },
  { id: "stats", label: "إحصاءات", icon: "📊" },
  { id: "live", label: "البث المباشر", icon: "🔴" }
];
const CATEGORIES = [
  { id: "all", label: "الكل", emoji: "🌍" },
  { id: "regional", label: "إقليمي", emoji: "🗺️" },
  { id: "politics", label: "سياسة", emoji: "🏛️" },
  { id: "military", label: "عسكري", emoji: "⚔️" },
  { id: "economy", label: "اقتصاد", emoji: "💰" }
];
const CAT_COLORS = {
  all: { accent: "#f3d38a", light: "#f3d38a" },
  regional: { accent: "#38bdf8", light: "#38bdf8" },
  politics: { accent: "#c89b3c", light: "#c89b3c" },
  military: { accent: "#e74c3c", light: "#e74c3c" },
  economy: { accent: "#22c55e", light: "#22c55e" }
};
const normalizeLiveChannel = (ch) => ch;
const normalizeVideoItem = (v) => v;
const buttonStyle = () => ({ background: "#222", color: "#f3d38a", border: "1px solid #f3d38a33", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "12px", fontWeight: "700", fontFamily: "inherit", margin: "2px" });
const UAEBar = () => <div style={{ height: "4px", background: "#f3d38a", borderRadius: "2px" }} />;
const FalconSVG = ({ size = 24, color = "#f3d38a" }) => <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill={color} /></svg>;
const fmtCountdown = (ms) => `${Math.floor(ms / 1000)}s`;
const AlertBanner = ({ alerts, onClose }) => alerts.length > 0 ? (
  <div style={{ background: "#e74c3c", color: "#fff", padding: "8px", textAlign: "center", borderRadius: "8px", margin: "8px 0" }}>
    {alerts.join(" | ")}
    <button onClick={onClose} style={{ marginLeft: "12px", background: "#fff", color: "#e74c3c", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>إغلاق</button>
  </div>
 ) : null;

// ErrorBoundary to prevent one broken panel from blanking the app
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
      return <div style={{ color: "#e74c3c", padding: "20px", textAlign: "center" }}>⚠️ حدث خطأ في هذا القسم</div>;
    }
    return this.props.children;
  }
}

// ...existing code...

/* =========================
   Helpers
========================= */
function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id || "").trim());
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}


/* =========================
   Main App
========================= */
export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("news");
  const [cat, setCat] = useState("all");
  const [xNews, setXNews] = useState([]);
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [updated, setUpdated] = useState("");
  const [loadN, setLoadN] = useState(false);
  const [loadV, setLoadV] = useState(false);
  const [loadL, setLoadL] = useState(false);
  const [errN, setErrN] = useState("");
  const [errV, setErrV] = useState("");
  const [errL, setErrL] = useState("");
  const [liveChannels, setLiveChannels] = useState([]);
  const [clockTime, setClockTime] = useState(formatDubaiTime());
  const [nextRefresh, setNextRefresh] = useState(60 * 1000);
  const [liveCh, setLiveCh] = useState(FALLBACK_LIVE_CHANNEL);
  const [radarPoints, setRadarPoints] = useState([]);
  const showCats = tab === "news" || tab === "videos";

  useEffect(() => {
    fetch("/api/xintel")
      .then((r) => r.json())
      .then((d) => setXNews(d.news || []))
      .catch(() => setXNews([]));
  }, []);

  const tensionData = useMemo(() => {
    const source = news.length ? news : DEMO_NEWS;

    const value = Math.min(
      100,
      source.reduce((acc, item) => {
        if (item.urgency === "high") return acc + 28;
        if (item.urgency === "medium") return acc + 14;
        return acc + 6;
      }, 0)
    );

    return [{ label: "now", value }];
  }, [news]);

  const ticker = useMemo(() => {
    const source = news.length ? news : DEMO_NEWS;
    return source.map((n) => n.title).slice(0, 20).join("   •   ");
  }, [news]);

  async function fetchNews(category = "all", force = false) {
    try {
      setLoadN(true);
      setErrN("");

      // منع التصنيفات غير المدعومة
      let apiCategory = category;
      if (["sports", "tourism", "markets"].includes(category)) {
        apiCategory = "all";
      }

      const url = `/api/news?category=${encodeURIComponent(apiCategory)}${force ? "&force=1" : ""}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      let data = { news: [], updated: "" };
      try {
        data = await res.json();
      } catch {
        data = { news: [], updated: "" };
      }

      // Always fallback to DEMO_NEWS if empty or failed
      const safeNewsData = Array.isArray(data.news) && data.news.length > 0 ? data.news.slice(0, 200) : DEMO_NEWS;

      setNews(safeNewsData);
      setUpdated(
        safeText(
          data?.updated,
          formatDisplayTime(new Date())
        )
      );

    } catch (err) {
      console.error("NEWS ERROR", err);
      setErrN(getUserErrorMessage());
      setNews(DEMO_NEWS);
      setAlerts((prev) =>
        prev.includes("تعذر تحميل الأخبار من الخادم")
          ? prev
          : [...prev, "تعذر تحميل الأخبار من الخادم"]
      );
    } finally {
      setLoadN(false);
    }
  }

  async function fetchRadar() {
    try {
      const res = await fetch("/api/radar", {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      const data = await res.json();
      setRadarPoints(Array.isArray(data?.aircraft) ? data.aircraft : []);
    } catch {
      setRadarPoints([]);
    }
  }

  async function fetchVideos(category = "all", force = false) {
    try {
      setLoadV(true);
      setErrV("");

      const url = `/api/videos?category=${encodeURIComponent(category)}${force ? "&force=1" : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) {
        throw new Error("VIDEOS_API_FAILED");
      }

      const data = await res.json();
      const safeVideosData = safeArray(data?.videos).map(normalizeVideoItem);

      setVideos(safeVideosData.filter((v) => v.youtubeId));
    } catch {
      setErrV(getUserErrorMessage());
      setVideos([]);
      setAlerts((prev) =>
        prev.includes("تعذر تحميل الفيديوهات من الخادم") ? prev : [...prev, "تعذر تحميل الفيديوهات من الخادم"]
      );
    } finally {
      setLoadV(false);
    }
  }

  async function fetchLiveChannels() {
    try {
      setLoadL(true);
      setErrL("");

      let data = null;

      const primaryRes = await fetch("/api/live", {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (primaryRes.ok) {
        data = await primaryRes.json();
      } else {
        const backupRes = await fetch("/api/livebackup", {
          method: "GET",
          headers: { Accept: "application/json" }
        });

        if (!backupRes.ok) {
          throw new Error("LIVE_AND_BACKUP_FAILED");
        }

        data = await backupRes.json();
      }

      const channels = safeArray(data?.channels)
        .map(normalizeLiveChannel)
        .filter((ch) => ch.youtubeId || ch.externalUrl);

      setLiveChannels(channels);

      if (channels.length > 0) {
        setLiveCh((prev) => {
          const existing = channels.find((ch) => ch.id === prev?.id);
          return existing || channels[0];
        });
      } else {
        setLiveCh(FALLBACK_LIVE_CHANNEL);
        setErrL("لا توجد قنوات مباشرة متاحة الآن");
      }
    } catch {
      setErrL("تعذر تحميل البث المباشر");
      setLiveChannels([]);
      setLiveCh(FALLBACK_LIVE_CHANNEL);
    } finally {
      setLoadL(false);
    }
  }

  function changeCat(categoryId) {
    setCat(categoryId);
  }

  function refresh() {
    void fetchNews(cat, true);
    void fetchVideos(cat, true);
    void fetchLiveChannels();
    void fetchRadar();
    setNextRefresh(60 * 1000);
  }

  useEffect(() => {
    void fetchNews(cat);
    void fetchVideos(cat);
  }, [cat]);

  useEffect(() => {
    void fetchLiveChannels();
    void fetchRadar();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setClockTime(formatDubaiTime());
      setNextRefresh((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (nextRefresh === 0) {
      refresh();
    }
  }, [nextRefresh]);

  const safeNewsList = news.length ? news : [];
  const safeVideosList = videos.length ? videos : [];
  const safeLiveChannels = liveChannels.length ? liveChannels : [];

  const currentLiveId =
    liveCh?.mode === "embed" && isValidYouTubeId(liveCh?.youtubeId) ? liveCh.youtubeId : "";

  const isExternalLive = liveCh?.mode === "external" && !!liveCh?.externalUrl;

  const currentWatchUrl = isExternalLive
    ? liveCh.externalUrl
    : currentLiveId
    ? `https://www.youtube.com/watch?v=${currentLiveId}`
    : "#";

  const currentEmbedUrl = currentLiveId
    ? `https://www.youtube-nocookie.com/embed/${currentLiveId}?autoplay=1&rel=0&modestbranding=1`
    : "";

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, ${bg2} 0%, ${bg1} 35%, ${bg0} 100%)`,
        color: text,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <style>{`
  * { box-sizing: border-box; }

  html, body, #root {
    margin: 0;
    min-height: 100%;
    background: ${bg0};
    color: ${text};
  }

  a { color: inherit; }

  .news-grid, .vid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }

    <React.Fragment>
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, ${Helpers.bg2} 0%, ${Helpers.bg1} 35%, ${Helpers.bg0} 100%)`,
          color: Helpers.text,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        <AlertBanner alerts={alerts} onClose={() => setAlerts([])} />
        {/* header, tabs, category buttons, etc. */}
        {/* ...existing header and controls code... */}
        <div style={{ padding: "18px 20px 50px" }}>
          {tab === "news" && (
            <ErrorBoundary>
              {/* Render fallback DEMO_NEWS cards if news fails */}
              <div className="news-grid">
                {(news.length ? news : DEMO_NEWS).map((item, i) => (
                  <NewsCard key={`${item.id}-${i}`} item={item} index={i} />
                ))}
              </div>
            </ErrorBoundary>
          )}
          {tab === "videos" && (
            <ErrorBoundary>
              {/* Temporarily bypass videos panel if needed */}
              <div style={{ textAlign: "center", color: "#666", padding: "60px" }}>
                اضغط تحديث لتحميل الفيديوهات
              </div>
            </ErrorBoundary>
          )}
          {tab === "stats" && (
            <ErrorBoundary>
              {/* Temporarily bypass stats panels if needed */}
              <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>
                قسم الإحصاءات غير متاح مؤقتًا
              </div>
            </ErrorBoundary>
          )}
          {tab === "live" && (
            <ErrorBoundary>
              {/* Temporarily bypass live panel if needed */}
              <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>
                قسم البث المباشر غير متاح مؤقتًا
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </React.Fragment>
                <span style={{ fontSize: "13px" }}>🇦🇪</span>
