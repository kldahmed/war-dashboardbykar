import React from "react";
import NewsCard from "../components/NewsCard";
import WorldPulseIndex from "../components/WorldPulseIndex";
import OrbitalPressureRadar from "../components/OrbitalPressureRadar";
import AgentCoreInterpreter from "../components/AgentCoreInterpreter";
import GlobalIntelligenceRadar from "../components/GlobalIntelligenceRadar";
import GlobalLiveEventsPanel from "../components/GlobalLiveEventsPanel";
import GlobalEventTimeline from "../components/GlobalEventTimeline";
import CrossDomainCorrelation from "../components/CrossDomainCorrelation";
import GlobalLinkAnalysis from "../components/GlobalLinkAnalysis";
import SignalScenarioCenter from "../components/SignalScenarioCenter";
import EventGraphPanel from "../components/EventGraphPanel";
import GlobalIntelligenceCenter from "../components/GlobalIntelligenceCenter";
import ThreatRadar from "../components/ThreatRadar";
import IntelligenceMeter from "../components/IntelligenceMeter";
import MemoryDepthPanel from "../components/MemoryDepthPanel";
import EnergyShockIndex from "../components/EnergyShockIndex";
import AISummaryPanel from "../components/AISummaryPanel";
import WarRiskPanel from "../components/WarRiskPanel";
import StatsPanel from "../components/StatsPanel";
import XNewsFeed from "../components/XNewsFeed";
import PredictiveIntelligencePanel from "../components/PredictiveIntelligencePanel";
import StrategicForecastCenter from "../components/StrategicForecastCenter";
import StrategicForecast from "../components/StrategicForecast";
import PatternForecastSummary from "../components/PatternForecastSummary";
import ScenarioPanel from "../components/ScenarioPanel";
import AgentDashboard from "../components/AgentDashboard";
import LiveChannelsPanel from "../components/LiveChannelsPanel";
import SportsLiveChannels from "../components/SportsLiveChannels";
import LiveConflictMap from "../components/LiveConflictMap";
import GlobalLiveMap from "../components/GlobalLiveMap";
import { SECTION_ROUTES } from "../lib/simpleRouter";

const pageShell = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "24px 20px 48px",
};

const panelStyle = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
  backdropFilter: "blur(16px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)",
};

function PageHero({ eyebrow, title, description, right }) {
  return (
    <section style={{ ...panelStyle, padding: "22px 24px", marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#f3d38a", textTransform: "uppercase", marginBottom: 10 }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#f8fafc", lineHeight: 1.15, marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8 }}>
            {description}
          </div>
        </div>
        {right ? <div style={{ minWidth: 220 }}>{right}</div> : null}
      </div>
    </section>
  );
}

function OverviewMetric({ label, value, hint, color = "#38bdf8" }) {
  return (
    <div style={{ ...panelStyle, padding: "18px 18px 16px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.6 }}>{hint}</div>
    </div>
  );
}

function ShortcutCard({ route, language, navigate }) {
  const title = language === "ar" ? route.titleAr : route.titleEn;
  const description = language === "ar" ? route.descriptionAr : route.descriptionEn;
  return (
    <button
      type="button"
      onClick={() => navigate(route.path)}
      style={{
        ...panelStyle,
        padding: "18px 18px 16px",
        cursor: "pointer",
        textAlign: "inherit",
        color: "inherit",
        width: "100%",
      }}
      className="nr-card-hover"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{route.icon}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{description}</div>
    </button>
  );
}

export function OverviewPage({
  language,
  navigate,
  tickerHeadlines,
  lastUpdated,
  intelMetrics,
  refreshKey,
}) {
  const cards = SECTION_ROUTES.filter((route) => route.path !== "/");
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الواجهة المختصرة" : "OVERVIEW"}
        title={language === "ar" ? "ملخص سريع لحالة العالم والمنصة" : "A concise overview of world state and the platform"}
        description={language === "ar"
          ? "الصفحة الرئيسية أصبحت مختصرة: حالة عامة، مؤشرات أساسية، وقت آخر تحديث، وبطاقات تنقل مباشرة إلى كل قسم كبير."
          : "The home page is now concise: world summary, key indicators, latest update, and direct navigation cards."}
        right={
          <div style={{ ...panelStyle, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{language === "ar" ? "آخر تحديث" : "Latest Update"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f3d38a" }}>{lastUpdated || "—"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{tickerHeadlines[0] || (language === "ar" ? "في انتظار التحديثات" : "Awaiting updates")}</div>
          </div>
        }
      />

      <div style={{ marginBottom: 24 }}>
        <WorldPulseIndex />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <OverviewMetric
          label={language === "ar" ? "حجم الذاكرة التحليلية" : "Analytical Memory"}
          value={intelMetrics?.totalItems || 0}
          hint={language === "ar" ? "عدد السجلات التحليلية الحالية" : "Current intelligence records"}
          color="#38bdf8"
        />
        <OverviewMetric
          label={language === "ar" ? "الإشارات النشطة" : "Active Signals"}
          value={intelMetrics?.activeSignals || 0}
          hint={language === "ar" ? "إشارات مترابطة وقابلة للرصد" : "Correlated and trackable signals"}
          color="#22c55e"
        />
        <OverviewMetric
          label={language === "ar" ? "الكيانات المرصودة" : "Tracked Entities"}
          value={intelMetrics?.entityCount || 0}
          hint={language === "ar" ? "أسماء وملفات وكيانات مرصودة" : "Observed names and entities"}
          color="#a78bfa"
        />
        <OverviewMetric
          label={language === "ar" ? "مفتاح التحديث" : "Refresh Key"}
          value={refreshKey}
          hint={language === "ar" ? "يدل على نشاط تدفق البيانات" : "Reflects data pipeline activity"}
          color="#f3d38a"
        />
      </div>

      <section>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>
          {language === "ar" ? "الأقسام الرئيسية" : "Primary Sections"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {cards.map((route) => (
            <ShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function WorldStatePage({ language, intelMetrics, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "حالة العالم" : "WORLD STATE"}
        title={language === "ar" ? "القراءة العليا للمشهد العالمي" : "Top-layer reading of the global landscape"}
        description={language === "ar"
          ? "صفحة مستقلة للحالة العالمية مع الخلاصة، خرائط الضغط، ومؤشرات القراءة المركبة."
          : "A dedicated page for global state, pressure mapping, and high-level reading."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <WorldPulseIndex />
        <OrbitalPressureRadar />
        <AgentCoreInterpreter />
        <GlobalLiveMap />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <IntelligenceMeter refreshKey={refreshKey} />
          <MemoryDepthPanel metrics={intelMetrics} />
        </div>
      </div>
    </div>
  );
}

export function NewsPage({
  language,
  categories,
  cat,
  setCat,
  sportsCompetitions,
  sportsCompetition,
  setSportsCompetition,
  displayedNews,
  loading,
  error,
  handleCardClick,
  uaeStandings,
  uaeStandingsUpdatedAt,
  isStandingsLoading,
}) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأخبار" : "NEWS"}
        title={language === "ar" ? "أخبار مختارة وتدفق موضوعي" : "Curated news and thematic feed"}
        description={language === "ar"
          ? "تم نقل الأخبار إلى صفحة مستقلة مع التصنيفات، الرياضة، وترتيب أوضح للمحتوى."
          : "News now lives in a dedicated page with categories, sports, and a clearer content flow."}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCat(item.id)}
            style={{
              background: cat === item.id ? "#38bdf8" : "#222",
              color: cat === item.id ? "#fff" : "#38bdf8",
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>

      {cat === "sports" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {sportsCompetitions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSportsCompetition(item.id)}
              style={{
                background: sportsCompetition === item.id ? "#f3d38a" : "#1a1f27",
                color: sportsCompetition === item.id ? "#222" : "#f3d38a",
                border: "1px solid rgba(243,211,138,0.3)",
                borderRadius: 10,
                padding: "7px 14px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      )}

      {cat === "sports" && sportsCompetition === "uae" && (
        <div style={{ ...panelStyle, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ padding: "16px 20px", background: "rgba(74,222,128,0.08)", borderBottom: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🇦🇪</span>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#4ade80" }}>{language === "ar" ? "ترتيب الدوري الإماراتي" : "UAE League Standings"}</span>
          </div>
          {isStandingsLoading && !uaeStandings.length ? (
            <div style={{ textAlign: "center", color: "#4ade80", padding: 24 }}>{language === "ar" ? "⏳ جارٍ تحميل الترتيب" : "Loading standings"}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", color: "#e2e8f0" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "0.78rem" }}>
                    {["#", language === "ar" ? "الفريق" : "Team", language === "ar" ? "لعب" : "P", language === "ar" ? "فاز" : "W", language === "ar" ? "تعادل" : "D", language === "ar" ? "خسر" : "L", language === "ar" ? "له" : "GF", language === "ar" ? "عليه" : "GA", language === "ar" ? "+/-" : "GD", language === "ar" ? "النقاط" : "Pts"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uaeStandings.map((row, index) => (
                    <tr key={row.rank ?? index} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{row.rank}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{row.team}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.played}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#4ade80" }}>{row.won}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24" }}>{row.drawn}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#f87171" }}>{row.lost}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsFor}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalsAgainst}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{row.goalDifference}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#f3d38a", fontWeight: 900 }}>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uaeStandingsUpdatedAt ? (
                <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", padding: "8px 16px" }}>
                  {language === "ar" ? "آخر تحديث" : "Last update"}: {uaeStandingsUpdatedAt}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {loading ? <div style={{ textAlign: "center", color: "#38bdf8", padding: 30 }}>{language === "ar" ? "جارٍ التحميل" : "Loading"}</div> : null}
      {error ? <div style={{ textAlign: "center", color: "#e74c3c", padding: 30 }}>{error}</div> : null}

      {cat === "sports" && sportsCompetition === "live-channels" ? (
        <SportsLiveChannels />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          {displayedNews.map((item, idx) => (
            <NewsCard key={item.id || idx} {...item} onClick={() => handleCardClick(item)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <XNewsFeed />
      </div>
    </div>
  );
}

export function RadarPage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الرادار" : "RADAR"}
        title={language === "ar" ? "رادار الإشارات الحرجة" : "Critical signal radar"}
        description={language === "ar" ? "صفحة مركزة للرادار فقط مع بقاء الهوية البصرية كما هي." : "A dedicated radar page without changing the existing identity."}
      />
      <GlobalIntelligenceRadar />
    </div>
  );
}

export function EventsPage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأحداث العالمية" : "GLOBAL EVENTS"}
        title={language === "ar" ? "الأحداث الحية والتسلسل الزمني" : "Live events and timeline"}
        description={language === "ar" ? "تجميع صفحة مستقلة للأحداث العالمية وتتابعها الزمني." : "Dedicated page for global events and their timeline."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <GlobalLiveEventsPanel />
        <GlobalEventTimeline />
      </div>
    </div>
  );
}

export function LinkCenterPage({ language, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "مركز الربط" : "LINK CENTER"}
        title={language === "ar" ? "العلاقات، الترابطات، وسلاسل التأثير" : "Relationships, correlations, and influence chains"}
        description={language === "ar" ? "كل أدوات الربط والارتباط في صفحة واحدة واضحة." : "All linkage and correlation tools in one clear page."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <CrossDomainCorrelation />
        <GlobalLinkAnalysis />
        <SignalScenarioCenter refreshKey={refreshKey} />
        <EventGraphPanel />
      </div>
    </div>
  );
}

export function AnalysisCenterPage({ language, displayedNews, intelMetrics, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "مركز التحليل" : "ANALYSIS CENTER"}
        title={language === "ar" ? "لوحات التحليل والاستخبارات" : "Analysis and intelligence boards"}
        description={language === "ar" ? "تم تجميع التحليل الاستخباري في صفحة مستقلة بدل تمدده في الصفحة الرئيسية." : "Intelligence analysis now has a dedicated page instead of stretching the home page."}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginBottom: 22 }}>
        <IntelligenceMeter refreshKey={refreshKey} />
        <MemoryDepthPanel metrics={intelMetrics} />
      </div>
      <div style={{ display: "grid", gap: 22 }}>
        <GlobalIntelligenceCenter news={displayedNews} />
        <ThreatRadar news={displayedNews} />
        <EnergyShockIndex news={displayedNews} />
        <AISummaryPanel news={displayedNews} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <WarRiskPanel news={displayedNews} />
          <StatsPanel news={displayedNews} updated={displayedNews[0]?.time || new Date().toISOString()} />
        </div>
      </div>
    </div>
  );
}

export function ForecastPage({ language, displayedNews, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الاستشراف" : "FORECAST"}
        title={language === "ar" ? "التوقعات والسيناريوهات" : "Forecasts and scenarios"}
        description={language === "ar" ? "صفحة مستقلة للاستشراف بدل مزجه مع الصفحة الرئيسية." : "Dedicated forecast page instead of blending it into the homepage."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <PredictiveIntelligencePanel />
        <StrategicForecastCenter refreshKey={refreshKey} />
        <StrategicForecast news={displayedNews} />
        <PatternForecastSummary />
        <ScenarioPanel />
      </div>
    </div>
  );
}

export function AgentPage({ language, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الوكيل الذكي" : "AI AGENT"}
        title={language === "ar" ? "مراقبة حالة الوكيل وقدرته" : "Monitor agent state and capability"}
        description={language === "ar" ? "واجهة منفصلة للوكيل الذكي وتغذيته ودقته." : "Dedicated page for the AI agent, learning, and accuracy."}
      />
      <AgentDashboard refreshKey={refreshKey} />
    </div>
  );
}

export function LivePage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "البث المباشر" : "LIVE"}
        title={language === "ar" ? "القنوات والبث الحي" : "Live channels and streams"}
        description={language === "ar" ? "صفحة واحدة للبث المباشر والقنوات والخرائط الحية." : "One page for live channels, streams, and live maps."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LiveChannelsPanel />
        <SportsLiveChannels />
        <LiveConflictMap />
      </div>
    </div>
  );
}