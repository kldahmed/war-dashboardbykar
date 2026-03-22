import { useEffect, useMemo, useRef, useState } from "react";
import { extractIntelligence } from "./entityExtractor";
import { ingestItems } from "./intelligenceStore";
import { getIntelligenceMetrics } from "./intelligenceEngine";
import { sortArticlesByPriority } from "./priorityEngine";
import { ingestBatch } from "./agent/ingestionAgent";
import { invalidateWorldState } from "./worldStateEngine";

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
    image: "",
  },
];

const CATEGORIES = [
  { id: "all", key: "all", emoji: "🌍" },
  { id: "regional", key: "regional", emoji: "🗺️" },
  { id: "politics", key: "politics", emoji: "🏛️" },
  { id: "military", key: "military", emoji: "⚔️" },
  { id: "economy", key: "economy", emoji: "💰" },
  { id: "sports", key: "sports", emoji: "⚽" },
];

const SPORTS_COMPETITIONS = [
  { id: "all", key: "all", emoji: "🌍" },
  { id: "live-channels", key: "liveChannels", emoji: "📺" },
  { id: "uae", key: "uae", emoji: "🇦🇪" },
  { id: "premier-league", key: "premierLeague", emoji: "🏴" },
  { id: "laliga", key: "laliga", emoji: "🇪🇸" },
  { id: "champions-league", key: "championsLeague", emoji: "🏆" },
  { id: "transfers", key: "transfers", emoji: "🔁" },
  { id: "world", key: "world", emoji: "🌐" },
];

export function useDashboardData({ t, currentPath }) {
  const [cat, setCat] = useState("all");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sportsCompetition, setSportsCompetition] = useState("all");
  const [uaeStandings, setUaeStandings] = useState([]);
  const [uaeStandingsUpdatedAt, setUaeStandingsUpdatedAt] = useState("");
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);
  const [intelRefreshKey, setIntelRefreshKey] = useState(0);
  const [intelMetrics, setIntelMetrics] = useState(null);
  const intervalRef = useRef(null);
  const standingsIntervalRef = useRef(null);

  const categories = useMemo(
    () => CATEGORIES.map((item) => ({ ...item, label: t(`app.categories.${item.key}`) })),
    [t]
  );

  const sportsCompetitions = useMemo(
    () => SPORTS_COMPETITIONS.map((item) => ({ ...item, label: t(`app.competitions.${item.key}`) })),
    [t]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      setLoading(true);
      setError("");

      try {
        const endpoint = cat === "sports"
          ? `/api/sports?competition=${sportsCompetition}`
          : `/api/news?category=${cat}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("fetch_failed");

        const data = await response.json();
        const incomingNews = Array.isArray(data.news) ? data.news.slice(0, 100) : [];
        const filteredNews = cat === "sports"
          ? incomingNews.filter((item) => item.category === "sports")
          : incomingNews.filter((item) => item.category !== "sports" || cat === "all");

        if (cancelled) return;
        setNews(sortArticlesByPriority(filteredNews));
        setError("");
      } catch {
        if (cancelled) return;
        setNews([]);
        setError(t("app.errorLoadNews"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, currentPath === "/news" ? 15000 : 20000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cat, sportsCompetition, currentPath, t]);

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

    let cancelled = false;

    const loadStandings = () => {
      setIsStandingsLoading((prev) => (uaeStandings.length === 0 ? true : prev));
      const timeout = setTimeout(() => {
        if (!cancelled) setIsStandingsLoading(false);
      }, 3000);

      fetch("/api/uae-standings")
        .then((response) => response.json())
        .then((data) => {
          clearTimeout(timeout);
          if (cancelled) return;
          if (Array.isArray(data.standings) && data.standings.length) {
            setUaeStandings(data.standings);
            setUaeStandingsUpdatedAt(data.updatedAt || "");
            setIsStandingsLoading(false);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          if (!cancelled) setIsStandingsLoading(false);
        });
    };

    loadStandings();
    if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
    standingsIntervalRef.current = setInterval(loadStandings, 60000);

    return () => {
      cancelled = true;
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

  return {
    categories,
    sportsCompetitions,
    cat,
    setCat,
    sportsCompetition,
    setSportsCompetition,
    displayedNews,
    loading,
    error,
    uaeStandings,
    uaeStandingsUpdatedAt,
    isStandingsLoading,
    intelRefreshKey,
    intelMetrics,
    tickerHeadlines,
    lastUpdated,
  };
}
