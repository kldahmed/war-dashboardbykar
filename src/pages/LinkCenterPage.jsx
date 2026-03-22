import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const CrossDomainCorrelation = lazy(() => import("../components/CrossDomainCorrelation"));
const GlobalLinkAnalysis = lazy(() => import("../components/GlobalLinkAnalysis"));
const SignalScenarioCenter = lazy(() => import("../components/SignalScenarioCenter"));
const EventGraphPanel = lazy(() => import("../components/EventGraphPanel"));

export default function LinkCenterPage({ language, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "مركز الربط" : "LINK CENTER"}
        title={language === "ar" ? "العلاقات، الترابطات، وسلاسل التأثير" : "Relationships, correlations, and influence chains"}
        description={language === "ar" ? "كل أدوات الربط والارتباط في صفحة واحدة واضحة." : "All linkage and correlation tools in one clear page."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LazySection minHeight={300}>
          <CrossDomainCorrelation />
        </LazySection>
        <LazySection minHeight={300}>
          <GlobalLinkAnalysis />
        </LazySection>
        <LazySection minHeight={300}>
          <SignalScenarioCenter refreshKey={refreshKey} />
        </LazySection>
        <LazySection minHeight={320}>
          <EventGraphPanel />
        </LazySection>
      </div>
    </div>
  );
}
