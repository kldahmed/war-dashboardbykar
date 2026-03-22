import React, { lazy } from "react";
import IntelligenceMeter from "../components/IntelligenceMeter";
import MemoryDepthPanel from "../components/MemoryDepthPanel";
import EnergyShockIndex from "../components/EnergyShockIndex";
import AISummaryPanel from "../components/AISummaryPanel";
import WarRiskPanel from "../components/WarRiskPanel";
import StatsPanel from "../components/StatsPanel";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const GlobalIntelligenceCenter = lazy(() => import("../components/GlobalIntelligenceCenter"));
const ThreatRadar = lazy(() => import("../components/ThreatRadar"));

export default function AnalysisCenterPage({ language, displayedNews, intelMetrics, refreshKey }) {
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
        <LazySection minHeight={320}>
          <GlobalIntelligenceCenter news={displayedNews} />
        </LazySection>
        <LazySection minHeight={320}>
          <ThreatRadar news={displayedNews} />
        </LazySection>
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
