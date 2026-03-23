import React, { lazy, Suspense, useEffect, useState } from "react";
import BreakingNewsTicker from "./components/BreakingNewsTicker";
import ArticleModal from "./components/ArticleModal";
import TopSectionNav from "./components/TopSectionNav";
import { useI18n } from "./i18n/I18nProvider";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { startEngine as startGlobalEventsEngine, stopEngine as stopGlobalEventsEngine } from "./lib/globalEventsEngine";
import LiveAlertDrawer from "./components/LiveAlertDrawer";
import DeadlineCountdownCard from "./components/DeadlineCountdownCard";
import { useDashboardData } from "./lib/useDashboardData";
import { useWeather } from "./lib/useWeather";
import { useCurrentPath } from "./lib/simpleRouter";
import { processNewsItem } from "./lib/i18n/summaryLocalizer";
import { clearAdminKey, isAdminRoute, readAdminKey, saveAdminKey } from "./lib/adminAccess";

const NewsPage     = lazy(() => import("./pages/NewsPage"));
const NewsOpsPage  = lazy(() => import("./pages/NewsOpsPage"));
const NewsAnalyticsPage = lazy(() => import("./pages/NewsAnalyticsPage"));
const NewsSourcesPage = lazy(() => import("./pages/NewsSourcesPage"));
const NewsClustersPage = lazy(() => import("./pages/NewsClustersPage"));
const NewsIngestPage = lazy(() => import("./pages/NewsIngestPage"));
const LivePage     = lazy(() => import("./pages/LivePage"));
const LiveNewsAIPage = lazy(() => import("./pages/LiveNewsAIPage"));
const WorldEyePage = lazy(() => import("./pages/WorldEyePage"));
const UAEWeatherPage = lazy(() => import("./pages/UAEWeatherPage"));

function PageLoader({ language }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 340, color: "#67e8f9", fontSize: 16, fontWeight: 700 }}>
      {language === "ar" ? "جارٍ التحميل…" : "Loading…"}
    </div>
  );
}

export default function App() {
  const { t, direction, language } = useI18n();
  const { currentPath, navigate } = useCurrentPath();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [liveBreakingHeadlines, setLiveBreakingHeadlines] = useState([]);
  const [streamStatus, setStreamStatus] = useState("");
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [routeSearch, setRouteSearch] = useState(() => (typeof window === "undefined" ? "" : (window.location.search || "")));
  const [adminKey, setAdminKey] = useState(() => readAdminKey());
  const [adminInput, setAdminInput] = useState("");

  const {
    cities: weatherCities,
    alerts: weatherAlerts,
    loading: weatherLoading,
    error: weatherError,
    fetchedAt: weatherFetchedAt,
    retry: retryWeather,
  } = useWeather();

  const {
    displayedNews,
    loading: newsLoading,
    error: newsError,
    tickerHeadlines,
    lastUpdated,
    feedStatus,
    opsBusy,
    opsMessage,
    refreshOperations,
    updateNewsSource,
    reprocessNewsBatch,
    retryNews,
    categories,
    cat,
    setCat,
    sportsCompetitions,
    sportsCompetition,
    setSportsCompetition,
    uaeStandings,
    uaeStandingsUpdatedAt,
    isStandingsLoading,
  } = useDashboardData({ t, currentPath, routeSearch, experienceMode: "simplified", language, adminKey });

  const adminAuthorized = Boolean(String(adminKey || "").trim());
  const onSaveAdminKey = () => {
    const value = String(adminInput || "").trim();
    saveAdminKey(value);
    setAdminKey(value);
    setAdminInput("");
  };

  const onClearAdminSession = () => {
    clearAdminKey();
    setAdminKey("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncSearch = () => setRouteSearch(window.location.search || "");
    syncSearch();
    window.addEventListener("popstate", syncSearch);
    return () => window.removeEventListener("popstate", syncSearch);
  }, []);

  useEffect(() => {
    document.title = `${t("app.title")} 🌍`;
  }, [t, language]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    startGlobalEventsEngine();
    return () => stopGlobalEventsEngine();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
      return undefined;
    }

    const eventSource = new window.EventSource("/api/live-intake-stream");

    const handleBreaking = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const breaking = Array.isArray(payload?.breaking) ? payload.breaking : [];
        setLiveBreakingHeadlines(
          breaking
            .map((item) => {
              const rawTitle = String(item?.title || "").trim();
              if (!rawTitle) return "";
              if (language !== "ar") return rawTitle;
              const processed = processNewsItem({ title: rawTitle, summary: item?.summary, category: item?.category, source: item?.source }, "ar");
              return processed?.displayable === false ? "" : processed.title;
            })
            .filter(Boolean)
        );
        const breakingCount = Number(payload?.stats?.breakingCount || breaking.length || 0);
        setStreamStatus(
          breakingCount > 0
            ? (language === "ar" ? `رصد حي: ${breakingCount} خبر عاجل` : `Live watch: ${breakingCount} breaking items`)
            : (language === "ar" ? "الرصد الحي متصل" : "Live watch connected")
        );
        if (payload?.featuredAlert?.id) {
          setActiveAlert((current) => (current?.id === payload.featuredAlert.id ? current : payload.featuredAlert));
        }
      } catch {
        // Suppress parse errors — no negative message shown to user.
      }
    };

    const handleHealth = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (payload?.ok === false) {
          setStreamStatus(language === "ar" ? "البث قيد المتابعة" : "Live monitoring active");
        }
      } catch {
        // Ignore malformed health events.
      }
    };

    eventSource.addEventListener("breaking", handleBreaking);
    eventSource.addEventListener("health", handleHealth);
    eventSource.onerror = () => {
      setStreamStatus(language === "ar" ? "تحديث البث جارٍ" : "Refreshing live feed");
    };

    return () => {
      eventSource.removeEventListener("breaking", handleBreaking);
      eventSource.removeEventListener("health", handleHealth);
      eventSource.close();
    };
  }, [language]);

  useEffect(() => {
    if (Array.isArray(feedStatus?.breaking) && feedStatus.breaking.length > 0) {
      setLiveBreakingHeadlines((current) => {
        if (current.length > 0) return current;
        return feedStatus.breaking
          .map((item) => {
            const rawTitle = String(item?.title || "").trim();
            if (!rawTitle) return "";
            if (language !== "ar") return rawTitle;
            const processed = processNewsItem({ title: rawTitle, summary: item?.summary, category: item?.category, source: item?.source }, "ar");
            return processed?.displayable === false ? "" : processed.title;
          })
          .filter(Boolean);
      });
    }
  }, [feedStatus, language]);

  useEffect(() => {
    if (feedStatus?.featuredAlert?.id) {
      setActiveAlert((current) => (current?.id === feedStatus.featuredAlert.id ? current : feedStatus.featuredAlert));
    }
  }, [feedStatus?.featuredAlert]);

  useEffect(() => {
    if (!activeAlert?.id) return;

    setAlertHistory((current) => {
      const next = [
        activeAlert,
        ...current.filter((item) => item?.id && item.id !== activeAlert.id),
      ];
      return next.slice(0, 8);
    });
  }, [activeAlert]);

  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  const renderPage = () => {
    if (isAdminRoute(currentPath) && !adminAuthorized) {
      return (
        <div style={{ maxWidth: 640, margin: "24px auto", padding: "24px", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 20, background: "linear-gradient(160deg, rgba(10,18,30,0.92), rgba(7,12,20,0.95))" }}>
          <div style={{ color: "#f8fafc", fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
            {language === "ar" ? "وصول إداري مطلوب" : "Admin access required"}
          </div>
          <div style={{ color: "#a9bacd", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            {language === "ar"
              ? "هذه الصفحة مخصصة للإدارة فقط. أدخل مفتاح الإدارة للمتابعة."
              : "This page is restricted to administrators. Enter the admin key to continue."}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="password"
              value={adminInput}
              onChange={(event) => setAdminInput(event.target.value)}
              placeholder={language === "ar" ? "مفتاح الإدارة" : "Admin key"}
              style={{ flex: "1 1 240px", minWidth: 220, borderRadius: 10, border: "1px solid rgba(148,163,184,0.32)", background: "rgba(15,23,42,0.7)", color: "#f8fafc", padding: "10px 12px" }}
            />
            <button
              type="button"
              onClick={onSaveAdminKey}
              style={{ border: "1px solid rgba(56,189,248,0.42)", background: "rgba(56,189,248,0.14)", color: "#bae6fd", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}
            >
              {language === "ar" ? "دخول" : "Access"}
            </button>
          </div>
        </div>
      );
    }

    switch (currentPath) {
      case "/news":
        return (
          <NewsPage
            language={language}
            categories={categories || []}
            cat={cat}
            setCat={setCat}
            sportsCompetitions={sportsCompetitions || []}
            sportsCompetition={sportsCompetition}
            setSportsCompetition={setSportsCompetition}
            displayedNews={displayedNews}
            loading={newsLoading}
            error={newsError}
            feedStatus={feedStatus}
            retryNews={retryNews}
            routeSearch={routeSearch}
            handleCardClick={handleCardClick}
            uaeStandings={uaeStandings}
            uaeStandingsUpdatedAt={uaeStandingsUpdatedAt}
            isStandingsLoading={isStandingsLoading}
            lastUpdated={lastUpdated}
          />
        );
      case "/admin/news-operations":
        return (
          <NewsOpsPage
            language={language}
            feedStatus={feedStatus}
            opsBusy={opsBusy}
            opsMessage={opsMessage}
            refreshOperations={refreshOperations}
            updateNewsSource={updateNewsSource}
            reprocessNewsBatch={reprocessNewsBatch}
            onLogout={onClearAdminSession}
          />
        );
      case "/admin/news-analytics":
        return (
          <NewsAnalyticsPage
            language={language}
            adminKey={adminKey}
            onLogout={onClearAdminSession}
          />
        );
      case "/admin/news-sources":
        return (
          <NewsSourcesPage
            language={language}
            feedStatus={feedStatus}
            updateNewsSource={updateNewsSource}
            opsBusy={opsBusy}
            refreshOperations={refreshOperations}
            onLogout={onClearAdminSession}
          />
        );
      case "/admin/news-clusters":
        return (
          <NewsClustersPage
            language={language}
            adminKey={adminKey}
            onLogout={onClearAdminSession}
          />
        );
      case "/admin/news-ingest":
        return (
          <NewsIngestPage
            language={language}
            adminKey={adminKey}
            onLogout={onClearAdminSession}
          />
        );
      case "/live":
        return (
          <LivePage
            language={language}
            feedStatus={feedStatus}
            activeAlert={activeAlert}
            streamStatus={streamStatus}
            liveBreakingHeadlines={liveBreakingHeadlines}
          />
        );
      case "/live-news-ai":
        return (
          <LiveNewsAIPage
            language={language}
          />
        );
      case "/uae-weather":
        return (
          <UAEWeatherPage
            language={language}
            cities={weatherCities}
            alerts={weatherAlerts}
            loading={weatherLoading}
            error={weatherError}
            fetchedAt={weatherFetchedAt}
            onRetry={retryWeather}
          />
        );
      case "/world-eye":
      default:
        return (
          <WorldEyePage
            language={language}
            feedStatus={feedStatus}
            activeAlert={activeAlert}
            displayedNews={displayedNews}
            streamStatus={streamStatus}
          />
        );
    }
  };

  return (
    <div
      className={`app-shell intelligence-shell ${activeAlert ? "alert-active" : ""}`.trim()}
      dir={direction}
      style={{ position: "relative" }}
    >
      <div className="nr-bg-grid" />
      <div className="nr-bg-beam" />

      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__title">
            <span className="app-header__title-mark" aria-hidden="true">
              <img className="app-header__logo" src="/media/brand-mark.svg" alt="KAR" loading="eager" />
            </span>
            <span>{t("app.title")}</span>
          </div>
          <div className="app-header__subtitle">
            {language === "ar" ? "منصة مراقبة استخباراتية مبسطة وسريعة الفهم" : "A simplified global intelligence platform"}
          </div>
        </div>
        <div className="app-header__controls">
          <LanguageSwitcher />
        </div>
      </header>

      <BreakingNewsTicker
        headlines={liveBreakingHeadlines.length > 0 ? liveBreakingHeadlines : tickerHeadlines}
        liveCount={feedStatus?.stats?.breakingCount || liveBreakingHeadlines.length}
        statusLabel={streamStatus}
      />

      <div style={{ paddingInline: "clamp(8px, 2vw, 20px)", marginTop: 12, marginBottom: 4 }}>
        <DeadlineCountdownCard language={language} />
      </div>

      <TopSectionNav
        currentPath={currentPath}
        navigate={navigate}
        language={language}
        includeAdmin={adminAuthorized}
      />

      <LiveAlertDrawer
        alert={activeAlert}
        history={alertHistory}
        language={language}
        onDismiss={() => setActiveAlert(null)}
        onOpenNews={() => {
          setActiveAlert(null);
          navigate("/live");
        }}
      />

      <main className="app-main-stage">
        <Suspense fallback={<PageLoader language={language} />}>
          {renderPage()}
        </Suspense>
      </main>

      {showBackToTop ? (
        <button
          className="app-backtotop"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={language === "ar" ? "العودة للأعلى" : "Back to top"}
          title={language === "ar" ? "العودة للأعلى" : "Back to top"}
        >
          <span>↑</span>
          <span>{language === "ar" ? "العودة للأعلى" : "Back to top"}</span>
        </button>
      ) : null}

      <ArticleModal open={modalOpen} onClose={() => setModalOpen(false)} article={modalArticle} />
    </div>
  );
}