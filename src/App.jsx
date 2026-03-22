import React, { Suspense, lazy, useEffect, useState } from "react";
import BreakingNewsTicker from "./components/BreakingNewsTicker";
import ArticleModal from "./components/ArticleModal";
import { useI18n } from "./i18n/I18nProvider";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { startEngine as startGlobalEventsEngine, stopEngine as stopGlobalEventsEngine } from "./lib/globalEventsEngine";
import AgentPresence from "./components/AgentPresence";
import GlobalVoiceBriefing from "./components/GlobalVoiceBriefing";
import WorldEyeMode from "./components/WorldEyeMode";
import TopSectionNav from "./components/TopSectionNav";
import LiveAlertDrawer from "./components/LiveAlertDrawer";
import { getRoutesForMode, useCurrentPath } from "./lib/simpleRouter";
import { useDashboardData } from "./lib/useDashboardData";
import AppSectionBoundary from "./components/AppSectionBoundary";
import { useExperienceMode } from "./lib/experienceMode";
import { ExperienceModeSwitch } from "./pages/shared/pagePrimitives";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const WorldStatePage = lazy(() => import("./pages/WorldStatePage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const RadarPage = lazy(() => import("./pages/RadarPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const AnalysisCenterPage = lazy(() => import("./pages/AnalysisCenterPage"));
const LinkCenterPage = lazy(() => import("./pages/LinkCenterPage"));
const ForecastPage = lazy(() => import("./pages/ForecastPage"));
const AgentPage = lazy(() => import("./pages/AgentPage"));
const LivePage = lazy(() => import("./pages/LivePage"));
const IntelligenceConsolePage = lazy(() => import("./pages/IntelligenceConsolePage"));

export default function App() {
  const { t, direction, language } = useI18n();
  const { mode, setMode, isAdvanced } = useExperienceMode();
  const { currentPath, currentRoute, navigate } = useCurrentPath("/");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const [worldEyeOpen, setWorldEyeOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [liveBreakingHeadlines, setLiveBreakingHeadlines] = useState([]);
  const [streamStatus, setStreamStatus] = useState("");
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [routeSearch, setRouteSearch] = useState(() => (typeof window === "undefined" ? "" : (window.location.search || "")));

  const {
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
    retryNews,
  } = useDashboardData({ t, currentPath, routeSearch, experienceMode: mode, language });

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
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 520);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    startGlobalEventsEngine();
    return () => stopGlobalEventsEngine();
  }, []);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, [currentPath]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.altKey) return;
      const routes = getRoutesForMode(mode).slice(0, 10);
      const keyRouteMap = {
        "1": routes[0]?.path,
        "2": routes[1]?.path,
        "3": routes[2]?.path,
        "4": routes[3]?.path,
        "5": routes[4]?.path,
        "6": routes[5]?.path,
        "7": routes[6]?.path,
        "8": routes[7]?.path,
        "9": routes[8]?.path,
        "0": routes[9]?.path,
      };
      const nextRoute = keyRouteMap[event.key];
      if (!nextRoute) return;
      event.preventDefault();
      navigate(nextRoute);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, navigate]);

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
            .map((item) => String(item?.title || "").trim())
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
        setStreamStatus(language === "ar" ? "تعذر تحديث البث الحي" : "Live stream update failed");
      }
    };

    const handleHealth = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (payload?.ok === false) {
          setStreamStatus(language === "ar" ? "البث الحي متعثر مؤقتاً" : "Live stream temporarily degraded");
        }
      } catch {
        // Ignore malformed health events.
      }
    };

    eventSource.addEventListener("breaking", handleBreaking);
    eventSource.addEventListener("health", handleHealth);
    eventSource.onerror = () => {
      setStreamStatus(language === "ar" ? "تم التحويل إلى التحديث الاحتياطي" : "Falling back to backup refresh");
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
          .map((item) => String(item?.title || "").trim())
          .filter(Boolean);
      });
    }
  }, [feedStatus]);

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

  useEffect(() => {
    const advancedPaths = new Set(getRoutesForMode("advanced").filter((route) => route.tier === "advanced" && route.id !== "console").map((route) => route.path));
    const allowedRoutePaths = new Set(getRoutesForMode(mode).map((route) => route.path));

    if (mode === "simplified" && advancedPaths.has(currentPath)) {
      navigate("/intelligence-console", { replace: true, behavior: "auto" });
      return;
    }

    if (!allowedRoutePaths.has(currentPath)) {
      navigate("/", { replace: true, behavior: "auto" });
    }
  }, [currentPath, mode, navigate]);

  const handleCardClick = (article) => {
    setModalArticle(article);
    setModalOpen(true);
  };

  const routeFallback = (
    <div style={{ maxWidth: 1400, margin: "24px auto", padding: "16px 20px" }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          borderRadius: 16,
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 13,
        }}
      >
        جارٍ تحميل الصفحة...
      </div>
    </div>
  );

  const renderPage = () => {
    const lockedAdvancedRoute = mode === "simplified" && ["/radar", "/analysis-center", "/link-center", "/forecast", "/agent"].includes(currentPath);
    if (lockedAdvancedRoute) {
      return <IntelligenceConsolePage language={language} mode={mode} setMode={setMode} navigate={navigate} />;
    }

    switch (currentPath) {
      case "/world-state":
        return (
          <WorldStatePage
            language={language}
            mode={mode}
            intelMetrics={intelMetrics}
            refreshKey={intelRefreshKey}
            featuredAlert={activeAlert}
          />
        );
      case "/news":
        return (
          <NewsPage
            language={language}
            mode={mode}
            categories={categories}
            cat={cat}
            setCat={setCat}
            sportsCompetitions={sportsCompetitions}
            sportsCompetition={sportsCompetition}
            setSportsCompetition={setSportsCompetition}
            displayedNews={displayedNews}
            loading={loading}
            error={error}
            feedStatus={feedStatus}
            retryNews={retryNews}
            routeSearch={routeSearch}
            handleCardClick={handleCardClick}
            uaeStandings={uaeStandings}
            uaeStandingsUpdatedAt={uaeStandingsUpdatedAt}
            isStandingsLoading={isStandingsLoading}
          />
        );
      case "/radar":
        return <RadarPage language={language} mode={mode} />;
      case "/events":
        return <EventsPage language={language} mode={mode} />;
      case "/link-center":
        return <LinkCenterPage language={language} mode={mode} refreshKey={intelRefreshKey} />;
      case "/analysis-center":
        return <AnalysisCenterPage language={language} mode={mode} displayedNews={displayedNews} intelMetrics={intelMetrics} refreshKey={intelRefreshKey} />;
      case "/forecast":
        return <ForecastPage language={language} mode={mode} displayedNews={displayedNews} refreshKey={intelRefreshKey} />;
      case "/agent":
        return <AgentPage language={language} mode={mode} refreshKey={intelRefreshKey} />;
      case "/live":
        return <LivePage language={language} mode={mode} />;
      case "/intelligence-console":
        return <IntelligenceConsolePage language={language} mode={mode} setMode={setMode} navigate={navigate} />;
      default:
        return (
          <OverviewPage
            language={language}
            mode={mode}
            navigate={navigate}
            tickerHeadlines={tickerHeadlines}
            lastUpdated={lastUpdated}
            intelMetrics={intelMetrics}
            refreshKey={intelRefreshKey}
            displayedNews={displayedNews}
            loading={loading}
          />
        );
    }
  };

  const routeThemeClass = {
    "/": "theme-overview",
    "/world-state": "theme-world-state",
    "/news": "theme-news",
    "/radar": "theme-radar",
    "/events": "theme-events",
    "/analysis-center": "theme-analysis",
    "/link-center": "theme-links",
    "/forecast": "theme-forecast",
    "/agent": "theme-agent",
    "/live": "theme-live",
    "/intelligence-console": "theme-console",
  }[currentPath] || "theme-overview";

  return (
    <div
      className={`app-shell ${activeAlert ? "alert-active" : ""} ${routeThemeClass}`.trim()}
      dir={direction}
      style={{
        position: "relative"
      }}
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
            {language === "ar" ? "منصة الوعي العالمي العربية" : "Arabic World Awareness Platform"}
          </div>
        </div>

        <div className="app-header__controls">
          <ExperienceModeSwitch language={language} mode={mode} setMode={setMode} />
          <button
            type="button"
            onClick={() => setWorldEyeOpen(true)}
            className="app-world-eye-btn"
            title={language === "ar" ? "عين العالم — وضع المراقبة" : "World Eye — Monitoring Mode"}
          >
            👁️ {language === "ar" ? "عين العالم" : "World Eye"}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="app-ops-strip">
        <div className="app-ops-strip__inner">
          <div className="app-ops-strip__group">
            <span className="app-ops-strip__dot" />
            <span>{language === "ar" ? "النظام تشغيلي" : "System operational"}</span>
          </div>
          <div className="app-ops-strip__group">
            <span>{language === "ar" ? "المسار الحالي" : "Current route"}:</span>
            <strong>{language === "ar" ? currentRoute.titleAr : currentRoute.titleEn}</strong>
          </div>
          <div className="app-ops-strip__group">
            <span>{language === "ar" ? "الوضع" : "Mode"}:</span>
            <strong>{isAdvanced ? (language === "ar" ? "متقدم" : "Advanced") : (language === "ar" ? "مبسط" : "Simplified")}</strong>
          </div>
          <div className="app-ops-strip__group">
            <span>{language === "ar" ? "آخر تحديث" : "Last update"}:</span>
            <strong>{lastUpdated}</strong>
          </div>
          <div className="app-ops-strip__group">
            <span>{language === "ar" ? "اختصارات" : "Shortcuts"}:</span>
            <strong>Alt+1..0</strong>
          </div>
        </div>
        <div className={routeLoading ? "app-route-progress active" : "app-route-progress"} />
      </div>

      <TopSectionNav currentPath={currentPath} navigate={navigate} language={language} mode={mode} />

      <BreakingNewsTicker
        headlines={liveBreakingHeadlines.length > 0 ? liveBreakingHeadlines : tickerHeadlines}
        liveCount={feedStatus?.stats?.breakingCount || liveBreakingHeadlines.length}
        statusLabel={streamStatus}
      />

      <LiveAlertDrawer
        alert={activeAlert}
        history={alertHistory}
        language={language}
        onDismiss={() => setActiveAlert(null)}
        onOpenNews={() => {
          setActiveAlert(null);
          navigate("/news");
        }}
      />

      {worldEyeOpen ? <WorldEyeMode onClose={() => setWorldEyeOpen(false)} /> : null}

      <main className="app-main-stage">
        <div key={currentPath} className={routeLoading ? "app-page-scene is-loading" : "app-page-scene"}>
          <AppSectionBoundary resetKey={currentPath}>
            <Suspense fallback={routeFallback}>{renderPage()}</Suspense>
          </AppSectionBoundary>
        </div>
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

      <GlobalVoiceBriefing headlines={tickerHeadlines} priorityAlert={activeAlert} alertHistory={alertHistory} />

      <AppSectionBoundary>
        <AgentPresence refreshKey={intelRefreshKey} />
      </AppSectionBoundary>
    </div>
  );
}