import React, { lazy } from "react";
import { LazySection, PageHero, pageShell } from "./shared/pagePrimitives";

const AgentDashboard = lazy(() => import("../components/AgentDashboard"));

export default function AgentPage({ language, refreshKey }) {
  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الوكيل الذكي" : "AI AGENT"}
        title={language === "ar" ? "مراقبة حالة الوكيل وقدرته" : "Monitor agent state and capability"}
        description={language === "ar" ? "واجهة منفصلة للوكيل الذكي وتغذيته ودقته." : "Dedicated page for the AI agent, learning, and accuracy."}
      />
      <LazySection minHeight={620}>
        <AgentDashboard refreshKey={refreshKey} />
      </LazySection>
    </div>
  );
}
