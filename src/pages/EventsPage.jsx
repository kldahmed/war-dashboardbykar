import React, { lazy } from "react";
import { LazySection, PageHero, PageTakeaways, pageShell, panelStyle } from "./shared/pagePrimitives";

const GlobalLiveEventsPanel = lazy(() => import("../components/GlobalLiveEventsPanel"));
const GlobalEventTimeline = lazy(() => import("../components/GlobalEventTimeline"));

export default function EventsPage({ language, mode = "simplified" }) {
  const isAdvanced = mode === "advanced";
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الأحداث العالمية" : "GLOBAL EVENTS"}
        title={language === "ar" ? "الأحداث العالمية المهمة" : "Major Global Events"}
        description={language === "ar" ? "عرض مبسط للأحداث وتأثيرها قبل التفاصيل الفنية." : "A simplified event view first, then technical detail if needed."}
      />
      <PageTakeaways
        language={language}
        items={language === "ar"
          ? [
              "أهم الأحداث مرتبة حسب الأثر والوقت.",
              "يمكنك فهم سبب أهمية الحدث دون الحاجة لقراءة تقنية طويلة.",
              "التفاصيل المتقدمة متاحة في العرض المتقدم.",
            ]
          : [
              "Top events are ranked by impact and recency.",
              "You can understand why each event matters without analyst jargon.",
              "Advanced map depth is available in Advanced View.",
            ]}
      />
      <div style={{ display: "grid", gap: 22 }}>
        <LazySection minHeight={320}>
          <GlobalLiveEventsPanel />
        </LazySection>
        {isAdvanced ? (
          <LazySection minHeight={320}>
            <GlobalEventTimeline />
          </LazySection>
        ) : (
          <section style={{ ...panelStyle, padding: "14px 16px" }}>
            <div style={{ color: "#f8fafc", fontWeight: 800, marginBottom: 6 }}>
              {language === "ar" ? "العرض المتقدم متاح" : "Advanced view available"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              {language === "ar" ? "يمكنك الانتقال إلى العرض المتقدم لرؤية الخرائط التفصيلية والفلترة والعلاقات بين الأحداث." : "Switch to Advanced View for full interactive map controls, clustering, and event relationship lines."}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
