import { useEffect, useMemo, useRef, useState } from "react";
import { extractIntelligence } from "./entityExtractor";
import { ingestItems } from "./intelligenceStore";
import { getIntelligenceMetrics } from "./intelligenceEngine";
import { sortArticlesByPriority } from "./priorityEngine";
import { ingestBatch } from "./agent/ingestionAgent";
import { invalidateWorldState } from "./worldStateEngine";
import { localizeSummaryText } from "./i18n/summaryLocalizer";

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

const PUBLIC_BLOCKED_CATEGORIES = new Set(["military"]);
const DASHBOARD_CACHE_TTL_MS = 60 * 1000;
const DASHBOARD_CACHE_PREFIX = "kar-dashboard-news:";
const dashboardMemoryCache = new Map();

function buildDashboardCacheKey({ cat, sportsCompetition, experienceMode, language }) {
  return `${DASHBOARD_CACHE_PREFIX}${experienceMode}:${language}:${cat}:${sportsCompetition}`;
}

function readDashboardCache(key) {
  const now = Date.now();
  const memoryEntry = dashboardMemoryCache.get(key);
  if (memoryEntry && now - memoryEntry.savedAt <= DASHBOARD_CACHE_TTL_MS) {
    return memoryEntry.items;
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || !Number.isFinite(parsed.savedAt)) return null;
    if (now - parsed.savedAt > DASHBOARD_CACHE_TTL_MS) return null;
    dashboardMemoryCache.set(key, parsed);
    return parsed.items;
  } catch {
    return null;
  }
}

function writeDashboardCache(key, items) {
  const payload = { items, savedAt: Date.now() };
  dashboardMemoryCache.set(key, payload);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Non-critical: caching should never block rendering.
  }
}

function isValidArticle(item) {
  return Boolean(item && typeof item === "object" && typeof item.title === "string" && item.title.trim().length > 3);
}

function normalizeNewsItem(item, language) {
  const title = localizeSummaryText(item.title || "", language);
  const summary = localizeSummaryText(item.summary || "", language);
  return {
    ...item,
    title,
    summary,
    category: String(item.category || "all").toLowerCase(),
  };
}

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.title || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useDashboardData({ t, currentPath, experienceMode = "simplified", language = "ar" }) {
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
  const [retryNewsToken, setRetryNewsToken] = useState(0);
  const intervalRef = useRef(null);
  const standingsIntervalRef = useRef(null);
  const newsRequestSeqRef = useRef(0);
  const standingsRequestSeqRef = useRef(0);

  const categories = useMemo(
    () => CATEGORIES
      .filter((item) => (experienceMode === "advanced" ? true : !PUBLIC_BLOCKED_CATEGORIES.has(item.id)))
      .map((item) => ({ ...item, label: t(`app.categories.${item.key}`) })),
    [experienceMode, t]
  );

  const sportsCompetitions = useMemo(
    () => SPORTS_COMPETITIONS.map((item) => ({ ...item, label: t(`app.competitions.${item.key}`) })),
    [t]
  );

  useEffect(() => {
    const availableCategoryIds = new Set(categories.map((item) => item.id));
    if (!availableCategoryIds.has(cat)) {
      setCat("all");
    }
  }, [cat, categories]);

  useEffect(() => {
    let cancelled = false;
    let activeController = null;

    const fetchJsonWithRetry = async (url, { retries = 1, timeoutMs = 12000 } = {}) => {
      let attempt = 0;
      while (attempt <= retries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        activeController = controller;
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`http_${response.status}`);
          const payload = await response.json();
          clearTimeout(timeoutId);
          return payload;
        } catch (error) {
          clearTimeout(timeoutId);
          if (attempt >= retries) throw error;
          attempt += 1;
        }
      }
      return null;
    };

    const fetchNews = async () => {
      const requestId = ++newsRequestSeqRef.current;
      const requestedCategory = experienceMode === "advanced" ? cat : (PUBLIC_BLOCKED_CATEGORIES.has(cat) ? "all" : cat);
      const cacheKey = buildDashboardCacheKey({ cat: requestedCategory, sportsCompetition, experienceMode, language });
      const cachedNews = readDashboardCache(cacheKey);
      if (cachedNews && requestId === newsRequestSeqRef.current) {
        setNews(sortArticlesByPriority(cachedNews));
      }

      setLoading(!cachedNews);
      setError("");

      try {
        const endpointCandidates = cat === "sports"
          ? [`/api/sports?competition=${sportsCompetition}`]
          : [`/api/news?category=${requestedCategory}`, "/api/intelnews", "/api/x-feed"];

        let incomingNews = [];
        for (const endpoint of endpointCandidates) {
          try {
            const data = await fetchJsonWithRetry(endpoint, { retries: 1, timeoutMs: 12000 });
            const candidates = Array.isArray(data?.news)
              ? data.news
              : Array.isArray(data?.posts)
                ? data.posts
                : Array.isArray(data?.items)
                  ? data.items
                  : [];
            if (candidates.length) {
              incomingNews = candidates;
              break;
            }
          } catch {
            // Try next source.
          }
        }

        incomingNews = dedupeByTitle(
          incomingNews
            .filter(isValidArticle)
            .slice(0, 120)
            .map((item) => normalizeNewsItem(item, language))
        );

        const filteredNews = cat === "sports"
          ? incomingNews.filter((item) => item.category === "sports")
          : incomingNews.filter((item) => {
              if (item.category === "sports" && cat !== "all") return false;
              if (experienceMode !== "advanced" && PUBLIC_BLOCKED_CATEGORIES.has(item.category)) return false;
              return cat === "all" ? true : item.category === cat;
            });

        if (cancelled || requestId !== newsRequestSeqRef.current) return;
        writeDashboardCache(cacheKey, filteredNews);
        setNews(sortArticlesByPriority(filteredNews));
        setError("");
      } catch {
        if (cancelled || requestId !== newsRequestSeqRef.current) return;
        if (cachedNews) {
          setNews(sortArticlesByPriority(cachedNews));
          setError(language === "ar" ? "تم عرض نسخة احتياطية مؤقتة من آخر تحديث ناجح" : "Showing cached snapshot from the most recent successful update");
        } else {
          setNews([]);
          setError(t("app.errorLoadNews"));
        }
      } finally {
        if (!cancelled && requestId === newsRequestSeqRef.current) setLoading(false);
      }
    };

    fetchNews();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, currentPath === "/news" ? 15000 : 20000);

    return () => {
      cancelled = true;
      activeController?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cat, sportsCompetition, currentPath, t, experienceMode, language, retryNewsToken]);

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
    let activeController = null;

    const loadStandings = () => {
      const requestId = ++standingsRequestSeqRef.current;
      setIsStandingsLoading((prev) => (uaeStandings.length === 0 ? true : prev));
      const timeout = setTimeout(() => {
        if (!cancelled) setIsStandingsLoading(false);
      }, 3000);

      const controller = new AbortController();
      activeController = controller;

      fetch("/api/uae-standings", { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`http_${response.status}`);
          return response.json();
        })
        .then((data) => {
          clearTimeout(timeout);
          if (cancelled || requestId !== standingsRequestSeqRef.current) return;
          if (Array.isArray(data.standings) && data.standings.length) {
            setUaeStandings(data.standings);
            setUaeStandingsUpdatedAt(data.updatedAt || "");
            setIsStandingsLoading(false);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          if (!cancelled && requestId === standingsRequestSeqRef.current) {
            setIsStandingsLoading(false);
          }
        });
    };

    loadStandings();
    if (standingsIntervalRef.current) clearInterval(standingsIntervalRef.current);
    standingsIntervalRef.current = setInterval(loadStandings, 60000);

    return () => {
      cancelled = true;
      activeController?.abort();
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
  const lastUpdated = displayedNews[0]?.time || uaeStandingsUpdatedAt || new Date().toLocaleString(language === "ar" ? "ar-AE" : "en-GB", { timeZone: "Asia/Dubai" });
  const retryNews = () => setRetryNewsToken((value) => value + 1);

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
    retryNews,
  };
}
