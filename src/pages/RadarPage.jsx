import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const GlobalIntelligenceRadar = lazy(() => import("../components/GlobalIntelligenceRadar"));

export default function RadarPage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الرادار" : "RADAR"}
        title={language === "ar" ? "رادار الإشارات الحرجة" : "Critical signal radar"}
        description={language === "ar" ? "صفحة مركزة للرادار فقط مع بقاء الهوية البصرية كما هي." : "A dedicated radar page without changing the existing identity."}
      />
      <LazySection minHeight={420}>
        <GlobalIntelligenceRadar />
      </LazySection>
    </div>
  );
}
