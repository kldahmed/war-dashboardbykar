import React, { lazy } from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";
import {
  FeaturedShortcutCard,
  LazySection,
  OverviewMetric,
  pageShell,
  panelStyle,
  ShortcutCard,
} from "./shared/pagePrimitives";

const WorldPulseIndex = lazy(() => import("../components/WorldPulseIndex"));

export default function OverviewPage({
  language,
  navigate,
  tickerHeadlines,
  lastUpdated,
  intelMetrics,
  refreshKey,
}) {
  const cards = SECTION_ROUTES.filter((route) => route.path !== "/");
  const featuredCards = cards.slice(0, 4);

  return (
    <div style={pageShell}>
      <section className="overview-top-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.95fr)", gap: 18, marginBottom: 28 }}>
        <div style={{ ...panelStyle, padding: "22px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#f3d38a", textTransform: "uppercase", marginBottom: 10 }}>
            {language === "ar" ? "الواجهة المختصرة" : "OVERVIEW"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#f8fafc", lineHeight: 1.15, marginBottom: 10 }}>
            {language === "ar" ? "ملخص سريع لحالة العالم والمنصة" : "A concise overview of world state and the platform"}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, marginBottom: 16 }}>
            {language === "ar"
              ? "واجهة أخف في أول شاشة: خلاصة سريعة، مؤشرات أساسية، واختصارات مباشرة لأهم الأقسام قبل النزول إلى اللوحات الأثقل."
              : "A lighter first screen with a fast summary, key metrics, and direct shortcuts before the heavier panels below."}
          </div>

          <div style={{ ...panelStyle, padding: "14px 16px", marginBottom: 16, background: "linear-gradient(160deg, rgba(56,189,248,0.05) 0%, rgba(255,255,255,0.02) 100%)" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{language === "ar" ? "آخر تحديث" : "Latest Update"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f3d38a", marginBottom: 6 }}>{lastUpdated || "—"}</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7 }}>
              {tickerHeadlines[0] || (language === "ar" ? "في انتظار التحديثات" : "Awaiting updates")}
            </div>
          </div>

          <div className="overview-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 14 }}>
            <OverviewMetric
              label={language === "ar" ? "حجم الذاكرة التحليلية" : "Analytical Memory"}
              value={intelMetrics?.totalItems || 0}
              hint={language === "ar" ? "السجلات التحليلية الحالية" : "Current intelligence records"}
              color="#38bdf8"
            />
            <OverviewMetric
              label={language === "ar" ? "الإشارات النشطة" : "Active Signals"}
              value={intelMetrics?.activeSignals || 0}
              hint={language === "ar" ? "إشارات مترابطة قابلة للرصد" : "Correlated and trackable signals"}
              color="#22c55e"
            />
            <OverviewMetric
              label={language === "ar" ? "الكيانات المرصودة" : "Tracked Entities"}
              value={intelMetrics?.entityCount || 0}
              hint={language === "ar" ? "الكيانات والأسماء المرصودة" : "Observed names and entities"}
              color="#a78bfa"
            />
            <OverviewMetric
              label={language === "ar" ? "مفتاح التحديث" : "Refresh Key"}
              value={refreshKey}
              hint={language === "ar" ? "نبض تدفق البيانات الحالي" : "Current pipeline heartbeat"}
              color="#f3d38a"
            />
          </div>
        </div>

        <div style={{ ...panelStyle, padding: "20px 20px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>
            {language === "ar" ? "اختصارات سريعة" : "Quick Access"}
          </div>
          <div className="overview-featured-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {featuredCards.map((route) => (
              <FeaturedShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>
          {language === "ar" ? "نظرة عالمية سريعة" : "World Snapshot"}
        </div>
        <LazySection minHeight={260}>
          <WorldPulseIndex />
        </LazySection>
      </section>

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
