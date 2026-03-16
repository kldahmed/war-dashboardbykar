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

    let apiCategory = category;
    if (["sports", "tourism", "markets"].includes(category)) {
      apiCategory = "all";
    }

    const url = `/api/news?category=${encodeURIComponent(apiCategory)}${force ? "&force=1" : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error("NEWS_API_FAILED");
    }

    const data = await res.json();
    const newsList = Array.isArray(data?.news) ? data.news.map(normalizeNewsItem) : [];

    setNews(newsList.slice(0, 200));
    setUpdated(safeText(data?.updated, formatDisplayTime(new Date())));
    setErrN("");
  } catch (err) {
    console.error("NEWS ERROR", err);
    setNews([]);
    setErrN("تعذر تحميل الأخبار من الخادم");
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

  const displayedNews = (Array.isArray(news) && news.length > 0) ? news : DEMO_NEWS;
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
            <div
              className="news-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
                padding: "20px",
                width: "100%",
                maxWidth: "1400px",
                margin: "0 auto"
              }}
            >
              {displayedNews.map((item, idx) => (
                <NewsCard key={item.id || idx} {...item} />
              ))}
            </div>
          </ErrorBoundary>
        )}
        {tab === "videos" && (
          <ErrorBoundary>
            <div
              className="vid-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
                padding: "20px",
                width: "100%",
                maxWidth: "1400px",
                margin: "0 auto"
              }}
            >
              {safeVideosList.length > 0 ? (
                safeVideosList.map((v, i) => (
                  <VideoCard key={v.id || i} item={v} />
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#666", padding: "60px", gridColumn: "1/-1" }}>
                  اضغط تحديث لتحميل الفيديوهات
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
        {tab === "stats" && (
          <ErrorBoundary>
            <div style={{ display: "grid", gap: "16px" }}>
              <WarRiskCard news={displayedNews} tensionData={tensionData} />
              <ConflictMiniMap news={displayedNews} radarPoints={radarPoints} />
              <TensionHeatmap news={displayedNews} />
              <StatsPanel news={displayedNews} tensionData={tensionData} />
              <TimelinePanel news={displayedNews} />
              <AISummaryPanel news={displayedNews} />
            </div>
          </ErrorBoundary>
        )}
        {tab === "live" && (
          <ErrorBoundary>
            <div
              className="live-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 285px",
                gap: "15px",
                alignItems: "start",
                padding: "20px",
                maxWidth: "1400px",
                margin: "0 auto"
              }}
            >
              <div
                style={{
                  background: "#0a0800",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `1px solid ${Helpers.gold}2a`
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#0d0b00",
                    borderBottom: `1px solid ${Helpers.gold}1a`,
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    flexWrap: "wrap"
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#e74c3c",
                      display: "inline-block",
                      animation: "pulse 1s infinite"
                    }}
                  />
                  <span
                    style={{
                      color: "#e74c3c",
                      fontWeight: "900",
                      fontSize: "11px",
                      letterSpacing: "2px"
                    }}
                  >
                    LIVE
                  </span>
                  <span style={{ color: "#555", fontSize: "12px" }}>
                    {liveCh?.flag} {liveCh?.name}
                  </span>
                  {(currentLiveId || isExternalLive) && (
                    <a
                      href={currentWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginRight: "auto",
                        background: "#cc0000dd",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "5px 11px",
                        fontSize: "11px",
                        fontWeight: "700",
                        textDecoration: "none"
                      }}
                    >
                      ▶ مشاهدة
                    </a>
                  )}
                </div>
                <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                  {currentLiveId ? (
                    <iframe
                      key={liveCh?.id}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: "none"
                      }}
                      src={currentEmbedUrl}
                      title={liveCh?.name || "Live stream"}
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : isExternalLive ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "14px",
                        color: "#bbb",
                        textAlign: "center",
                        padding: "20px"
                      }}
                    >
                      <div style={{ fontSize: "16px", fontWeight: "700", color: Helpers.goldL }}>{liveCh?.name}</div>
                      <div style={{ fontSize: "13px", color: "#888", lineHeight: 1.8 }}>
                        هذه القناة تفتح خارج الموقع لضمان عمل البث بشكل صحيح
                      </div>
                      <a
                        href={currentWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "#cc0000dd",
                          color: "#fff",
                          borderRadius: "8px",
                          padding: "10px 18px",
                          fontSize: "13px",
                          fontWeight: "700",
                          textDecoration: "none"
                        }}
                      >
                        فتح البث المباشر
                      </a>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#777",
                        fontSize: "14px"
                      }}
                    >
                      رابط البث غير صالح
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: "9px 14px",
                    background: "#080600",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}
                >
                  <span style={{ color: "#333", fontSize: "11px" }}>لا يعمل البث؟</span>
                  {(currentLiveId || isExternalLive) && (
                    <a
                      href={currentWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "rgba(204,0,0,.12)",
                        border: "1px solid rgba(204,0,0,.35)",
                        color: "#ff4444",
                        borderRadius: "6px",
                        padding: "5px 13px",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        textDecoration: "none"
                      }}
                    >
                      فتح البث
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <div
                  style={{
                    color: `${Helpers.gold}55`,
                    fontSize: "9px",
                    marginBottom: "4px",
                    fontWeight: "700",
                    letterSpacing: "2.5px"
                  }}
                >
                  LIVE CHANNELS
                </div>
                {loadL && <div style={{ textAlign: "center", color: "#e74c3c", padding: "18px" }}>جاري التحميل...</div>}
                {errL && !loadL && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#e74c3c",
                      padding: "18px",
                      border: "1px solid rgba(231,76,60,.2)",
                      borderRadius: "12px",
                      background: "rgba(231,76,60,.05)"
                    }}
                  >
                    {errL}
                  </div>
                )}
                {!loadL &&
                  safeLiveChannels.map((ch) => (
                    <ChannelCard key={ch.id} ch={ch} active={liveCh?.id === ch.id} onSelect={setLiveCh} />
                  ))}
                {!loadL && !errL && safeLiveChannels.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#666",
                      padding: "18px",
                      border: "1px solid rgba(255,255,255,.05)",
                      borderRadius: "12px"
                    }}
                  >
                    لا توجد قنوات مباشرة متاحة الآن
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
