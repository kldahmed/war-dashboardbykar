import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const PredictiveIntelligencePanel = lazy(() => import("../components/PredictiveIntelligencePanel"));
const StrategicForecastCenter = lazy(() => import("../components/StrategicForecastCenter"));
const StrategicForecast = lazy(() => import("../components/StrategicForecast"));
const PatternForecastSummary = lazy(() => import("../components/PatternForecastSummary"));
const ScenarioPanel = lazy(() => import("../components/ScenarioPanel"));

export default function ForecastPage({ language, displayedNews, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الاستشراف" : "FORECAST"}
        title={language === "ar" ? "التوقعات والسيناريوهات" : "Forecasts and scenarios"}
        description={language === "ar" ? "صفحة مستقلة للاستشراف بدل مزجه مع الصفحة الرئيسية." : "Dedicated forecast page instead of blending it into the homepage."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LazySection minHeight={320}>
          <PredictiveIntelligencePanel />
        </LazySection>
        <LazySection minHeight={320}>
          <StrategicForecastCenter refreshKey={refreshKey} />
        </LazySection>
        <LazySection minHeight={320}>
          <StrategicForecast news={displayedNews} />
        </LazySection>
        <LazySection minHeight={260}>
          <PatternForecastSummary />
        </LazySection>
        <LazySection minHeight={280}>
          <ScenarioPanel />
        </LazySection>
      </div>
    </div>
  );
}
