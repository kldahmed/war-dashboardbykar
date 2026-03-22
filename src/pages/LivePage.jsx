import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const LiveChannelsPanel = lazy(() => import("../components/LiveChannelsPanel"));
const SportsLiveChannels = lazy(() => import("../components/SportsLiveChannels"));
const LiveConflictMap = lazy(() => import("../components/LiveConflictMap"));

export default function LivePage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "البث المباشر" : "LIVE"}
        title={language === "ar" ? "القنوات والبث الحي" : "Live channels and streams"}
        description={language === "ar" ? "صفحة واحدة للبث المباشر والقنوات والخرائط الحية." : "One page for live channels, streams, and live maps."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LazySection minHeight={320}>
          <LiveChannelsPanel />
        </LazySection>
        <LazySection minHeight={420}>
          <SportsLiveChannels />
        </LazySection>
        <LazySection minHeight={420}>
          <LiveConflictMap />
        </LazySection>
      </div>
    </div>
  );
}
