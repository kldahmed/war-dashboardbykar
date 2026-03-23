import { useEffect, useMemo, useRef, useState } from "react";
import { extractIntelligence } from "./entityExtractor";
import { ingestItems } from "./intelligenceStore";
import { getIntelligenceMetrics } from "./intelligenceEngine";
import { sortArticlesByPriority } from "./priorityEngine";
import { ingestBatch } from "./agent/ingestionAgent";
import { invalidateWorldState } from "./worldStateEngine";
import { localizeDisplayItem, localizeSummaryText } from "./i18n/summaryLocalizer";

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

function buildDashboardCacheKey({ cat, sportsCompetition, experienceMode, language, sourceFilterKey }) {
  return `${DASHBOARD_CACHE_PREFIX}${experienceMode}:${language}:${cat}:${sportsCompetition}:${sourceFilterKey || "all"}`;
}

function parseSourceFilters(routeSearch = "", currentPath = "") {
  if (currentPath !== "/news") return [];
  try {
    const params = new URLSearchParams(String(routeSearch || "").replace(/^\?/, ""));
    const raw = String(params.get("source") || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((item) => decodeURIComponent(String(item || "").trim()))
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function parseCategoryFromSearch(routeSearch = "") {
  try {
    const params = new URLSearchParams(String(routeSearch || "").replace(/^\?/, ""));
    const category = String(params.get("category") || "").trim().toLowerCase();
    if (!category) return "";
    return category;
  } catch {
    return "";
  }
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
  const localized = localizeDisplayItem(item, language);
  const stripHtml = (value = "") => {
    const raw = String(value || "");
    const noScripts = raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
    return noScripts
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  };

  const clampText = (value = "", max = 160) => {
    const clean = stripHtml(value);
    if (clean.length <= max) return clean;
    return `${clean.slice(0, Math.max(0, max - 1)).trim()}…`;
  };

  const safeTitle = clampText(localized.title || item.title || "", 140);
  const safeSummary = clampText(localized.summary || item.summary || "", 160);
  const safeSource = clampText(localized.source || item.source || "", 70);

  return {
    ...localized,
    title: safeTitle,
    summary: safeSummary,
    source: safeSource,
    category: String(localized.category || item.category || "all").toLowerCase(),
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

function dedupeByUrlOrTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url && item.url !== "#" ? item.url : item.title || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useDashboardData({ t, currentPath, routeSearch = "", experienceMode = "simplified", language = "ar", adminKey = "" }) {
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
  const [feedStatus, setFeedStatus] = useState({
    sourceMode: "",
    health: [],
    stats: null,
    breaking: [],
    featuredAlert: null,
    dashboard: null,
    sources: [],
    operationsUpdatedAt: "",
    sections: null,
    pipeline: null,
  });
  const [opsBusy, setOpsBusy] = useState(false);
  const [opsMessage, setOpsMessage] = useState("");
  const intervalRef = useRef(null);
  const standingsIntervalRef = useRef(null);
  const operationsIntervalRef = useRef(null);
  const newsRequestSeqRef = useRef(0);
  const standingsRequestSeqRef = useRef(0);

  const refreshOperationsRef = useRef(async () => {});

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

  const hasBreakingSignals = useMemo(
    () => news.some((item) => item?.urgency === "high" || item?.isBreaking),
    [news]
  );

  const refreshInterval = useMemo(() => {
    if (currentPath === "/news") {
      return hasBreakingSignals ? 3000 : 5000;
    }
    return hasBreakingSignals ? 5000 : 9000;
  }, [currentPath, hasBreakingSignals]);

  const sourceFilters = useMemo(
    () => parseSourceFilters(routeSearch, currentPath),
    [routeSearch, currentPath]
  );

  const sourceFilterKey = useMemo(
    () => (sourceFilters.length > 0 ? sourceFilters.map((item) => item.toLowerCase()).join("|") : "all"),
    [sourceFilters]
  );

  useEffect(() => {
    if (currentPath !== "/news") return;
    const requested = parseCategoryFromSearch(routeSearch);
    if (!requested) return;
    const isValid = CATEGORIES.some((item) => item.id === requested);
    if (isValid && requested !== cat) setCat(requested);
  }, [routeSearch, currentPath, cat]);

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
      const cacheKey = buildDashboardCacheKey({ cat: requestedCategory, sportsCompetition, experienceMode, language, sourceFilterKey });
      const cachedNews = readDashboardCache(cacheKey);
      const rankingContext = {
        category: requestedCategory,
        sourceFilters,
        currentPath,
      };
      if (cachedNews && requestId === newsRequestSeqRef.current) {
        setNews(sortArticlesByPriority(cachedNews, rankingContext));
      }

      setLoading(!cachedNews);
      setError("");

      try {
        const sourceQuery = sourceFilters.length > 0 ? `&source=${encodeURIComponent(sourceFilters.join(","))}` : "";
        const endpointCandidates = cat === "sports"
          ? [`/api/sports?competition=${sportsCompetition}`]
          : [
              "/api/live-intake?category=" + requestedCategory + sourceQuery,
              "/api/news?category=" + requestedCategory + sourceQuery,
              "/api/fastnews",
              "/api/intelnews",
              "/api/x-feed",
            ];

        let liveIntakePayload = null;
        const responses = await Promise.allSettled(
          endpointCandidates.map((endpoint) => fetchJsonWithRetry(endpoint, { retries: 1, timeoutMs: endpoint.includes("/api/news") ? 9000 : 12000 }))
        );

        let incomingNews = responses.flatMap((result) => {
          if (result.status !== "fulfilled") return [];
          const data = result.value;
          if (data?.sourceMode === "live-intake-open-source") {
            liveIntakePayload = data;
          }
          return Array.isArray(data?.news)
            ? data.news
            : Array.isArray(data?.posts)
              ? data.posts
              : Array.isArray(data?.items)
                ? data.items
                : [];
        });

        incomingNews = dedupeByUrlOrTitle(dedupeByTitle(
          incomingNews
            .filter(isValidArticle)
            .slice(0, 240)
            .map((item) => normalizeNewsItem(item, language))
            .filter((item) => {
              if (language !== "ar") return true;
              if (item?.displayable === false) return false;
              const hasArTitle = /[\u0600-\u06FF]/.test(String(item?.title || ""));
              const hasArSummary = /[\u0600-\u06FF]/.test(String(item?.summary || ""));
              return item?.isArabicReady !== false && hasArTitle && hasArSummary;
            })
        ));

        const filteredNews = cat === "sports"
          ? incomingNews.filter((item) => item.category === "sports")
          : incomingNews.filter((item) => {
              if (item.category === "sports" && cat !== "all") return false;
              if (experienceMode !== "advanced" && PUBLIC_BLOCKED_CATEGORIES.has(item.category)) return false;
            if (sourceFilters.length > 0) {
              const haystack = String(item.source || "").toLowerCase();
              const hasMatch = sourceFilters.some((filterValue) => haystack.includes(String(filterValue).toLowerCase()));
              if (!hasMatch) return false;
            }
              return cat === "all" ? true : item.category === cat;
            });

        if (cancelled || requestId !== newsRequestSeqRef.current) return;
        const localizedFeatured = liveIntakePayload?.featuredAlert ? localizeDisplayItem(liveIntakePayload.featuredAlert, language) : null;

        setFeedStatus((current) => ({
          ...current,
          sourceMode: language === "ar"
            ? localizeSummaryText(liveIntakePayload?.sourceMode || "", "ar", { kind: "label" })
            : liveIntakePayload?.sourceMode || "",
          health: Array.isArray(liveIntakePayload?.health) ? liveIntakePayload.health : [],
          stats: liveIntakePayload?.stats || null,
          breaking: Array.isArray(liveIntakePayload?.breaking)
            ? liveIntakePayload.breaking
              .map((item) => localizeDisplayItem(item, language))
              .filter((item) => {
                if (language !== "ar") return true;
                return item?.displayable !== false && item?.isArabicReady !== false;
              })
            : [],
          featuredAlert: language === "ar"
            ? (localizedFeatured?.displayable === false ? null : localizedFeatured)
            : localizedFeatured,
          dashboard: liveIntakePayload?.dashboard || current.dashboard,
          sections: liveIntakePayload?.sections || current.sections,
          operationsUpdatedAt: liveIntakePayload?.dashboard?.generated_at || current.operationsUpdatedAt,
          pipeline: liveIntakePayload?.pipeline || current.pipeline,
        }));
        writeDashboardCache(cacheKey, filteredNews);
        setNews(sortArticlesByPriority(filteredNews, rankingContext));
        setError("");
      } catch {
        if (cancelled || requestId !== newsRequestSeqRef.current) return;
        if (cachedNews) {
          setNews(sortArticlesByPriority(cachedNews, rankingContext));
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
    intervalRef.current = setInterval(fetchNews, refreshInterval);

    return () => {
      cancelled = true;
      activeController?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cat, sportsCompetition, currentPath, t, experienceMode, language, retryNewsToken, refreshInterval, sourceFilters, sourceFilterKey]);

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

  useEffect(() => {
    if (currentPath !== "/admin/news-operations" && currentPath !== "/admin/news-sources") {
      if (operationsIntervalRef.current) clearInterval(operationsIntervalRef.current);
      return undefined;
    }

    if (!String(adminKey || "").trim()) {
      if (operationsIntervalRef.current) clearInterval(operationsIntervalRef.current);
      setOpsMessage(language === "ar" ? "يتطلب هذا القسم صلاحية مدير" : "This section requires admin access");
      return undefined;
    }

    let cancelled = false;
    let activeController = null;

    const fetchOperations = async () => {
      const controller = new AbortController();
      activeController = controller;

      try {
        const [dashboardResponse, sourcesResponse] = await Promise.all([
          fetch("/api/news/dashboard", {
            signal: controller.signal,
            headers: { "X-Admin-Key": String(adminKey || "").trim() },
          }),
          fetch("/api/news/sources", {
            signal: controller.signal,
            headers: { "X-Admin-Key": String(adminKey || "").trim() },
          }),
        ]);

        if (!dashboardResponse.ok) {
          if (dashboardResponse.status === 403 || dashboardResponse.status === 503) {
            throw new Error("admin_forbidden");
          }
          throw new Error(`dashboard_${dashboardResponse.status}`);
        }
        if (!sourcesResponse.ok) throw new Error(`sources_${sourcesResponse.status}`);

        const [dashboardPayload, sourcesPayload] = await Promise.all([
          dashboardResponse.json(),
          sourcesResponse.json(),
        ]);

        if (cancelled) return;

        setFeedStatus((current) => ({
          ...current,
          dashboard: dashboardPayload || null,
          sources: Array.isArray(sourcesPayload?.sources) ? sourcesPayload.sources : [],
          operationsUpdatedAt: dashboardPayload?.generated_at || new Date().toISOString(),
        }));
      } catch {
        if (cancelled) return;
        setOpsMessage(language === "ar" ? "تعذر تحميل لوحة التشغيل أو صلاحية غير كافية" : "Unable to load operations dashboard or insufficient permissions");
      }
    };

    refreshOperationsRef.current = fetchOperations;

    fetchOperations();
    if (operationsIntervalRef.current) clearInterval(operationsIntervalRef.current);
    operationsIntervalRef.current = setInterval(fetchOperations, 15000);

    return () => {
      cancelled = true;
      activeController?.abort();
      if (operationsIntervalRef.current) clearInterval(operationsIntervalRef.current);
    };
  }, [currentPath, adminKey, language]);

  const refreshOperations = async () => {
    if (typeof refreshOperationsRef.current === "function") {
      await refreshOperationsRef.current();
    }
  };

  const updateNewsSource = async (payload) => {
    setOpsBusy(true);
    setOpsMessage("");
    try {
      const response = await fetch("/api/news/sources", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": String(adminKey || "").trim(),
        },
        body: JSON.stringify(payload || {}),
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `http_${response.status}`);
      }
      await refreshOperations();
      setOpsMessage(language === "ar" ? "تم تحديث المصدر" : "Source updated");
      return data;
    } catch (error) {
      const message = language === "ar" ? "تعذر تحديث المصدر" : "Unable to update source";
      setOpsMessage(message);
      throw error;
    } finally {
      setOpsBusy(false);
    }
  };

  const reprocessNewsBatch = async (count = 300) => {
    setOpsBusy(true);
    setOpsMessage("");
    try {
      const response = await fetch("/api/news/reprocess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": String(adminKey || "").trim(),
        },
        body: JSON.stringify({ count }),
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `http_${response.status}`);
      }
      await refreshOperations();
      setRetryNewsToken((value) => value + 1);
      setOpsMessage(language === "ar" ? `تمت إعادة معالجة ${data?.reprocessed || count}` : `Reprocessed ${data?.reprocessed || count}`);
      return data;
    } catch (error) {
      const message = language === "ar" ? "تعذرت إعادة المعالجة" : "Unable to reprocess batch";
      setOpsMessage(message);
      throw error;
    } finally {
      setOpsBusy(false);
    }
  };

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
    feedStatus,
    opsBusy,
    opsMessage,
    refreshOperations,
    updateNewsSource,
    reprocessNewsBatch,
    retryNews,
  };
}
