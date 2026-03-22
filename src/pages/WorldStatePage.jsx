import React, { lazy } from "react";
import IntelligenceMeter from "../components/IntelligenceMeter";
import MemoryDepthPanel from "../components/MemoryDepthPanel";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const WorldPulseIndex = lazy(() => import("../components/WorldPulseIndex"));
const OrbitalPressureRadar = lazy(() => import("../components/OrbitalPressureRadar"));
const AgentCoreInterpreter = lazy(() => import("../components/AgentCoreInterpreter"));
const GlobalLiveMap = lazy(() => import("../components/GlobalLiveMap"));

export default function WorldStatePage({ language, intelMetrics, refreshKey }) {
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
        <LazySection minHeight={260}>
          <WorldPulseIndex />
        </LazySection>
        <LazySection minHeight={360}>
          <OrbitalPressureRadar />
        </LazySection>
        <LazySection minHeight={300}>
          <AgentCoreInterpreter />
        </LazySection>
        <LazySection minHeight={460}>
          <GlobalLiveMap />
        </LazySection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <IntelligenceMeter refreshKey={refreshKey} />
          <MemoryDepthPanel metrics={intelMetrics} />
        </div>
      </div>
    </div>
  );
}
