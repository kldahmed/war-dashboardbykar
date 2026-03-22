import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const GlobalLiveEventsPanel = lazy(() => import("../components/GlobalLiveEventsPanel"));
const GlobalEventTimeline = lazy(() => import("../components/GlobalEventTimeline"));

export default function EventsPage({ language }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأحداث العالمية" : "GLOBAL EVENTS"}
        title={language === "ar" ? "الأحداث الحية والتسلسل الزمني" : "Live events and timeline"}
        description={language === "ar" ? "تجميع صفحة مستقلة للأحداث العالمية وتتابعها الزمني." : "Dedicated page for global events and their timeline."}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LazySection minHeight={320}>
          <GlobalLiveEventsPanel />
        </LazySection>
        <LazySection minHeight={320}>
          <GlobalEventTimeline />
        </LazySection>
      </div>
    </div>
  );
}
