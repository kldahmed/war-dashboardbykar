import React, { lazy, useEffect, useMemo, useState } from "react";
import { LazySection, PageHero, PageTakeaways, pageShell, panelStyle } from "./shared/pagePrimitives";

const AgentDashboard = lazy(() => import("../components/AgentDashboard"));

export default function AgentPage({ language, mode = "simplified", refreshKey }) {
  const isAdvanced = mode === "advanced";
  const [agentSnapshot, setAgentSnapshot] = useState({
    reliabilityLevel: language === "ar" ? "متوسط" : "Medium",
    trend: language === "ar" ? "نشاط متعدد المناطق" : "Multi-region activity",
    impact: language === "ar" ? "متوسط" : "Moderate",
  });

  useEffect(() => {
    let cancelled = false;

    const readFirstValid = async (urls) => {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = await response.json();
          if (payload && typeof payload === "object") return payload;
        } catch {
          // Try next source.
        }
      }
      return null;
    };

    const loadSummary = async () => {
      const [statePayload, auditPayload] = await Promise.all([
        readFirstValid(["/api/agent-state", "/api/agent-ingest"]),
        readFirstValid(["/api/agent-strength-audit", "/api/agent-feedback"]),
      ]);

      if (cancelled) return;
      const confidenceRaw = Number(auditPayload?.confidence || auditPayload?.score || statePayload?.confidence || 0.56);
      const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0.56;
      const reliabilityLevel = confidence >= 0.72
        ? (language === "ar" ? "مرتفع" : "High")
        : confidence >= 0.5
          ? (language === "ar" ? "متوسط" : "Medium")
          : (language === "ar" ? "منخفض" : "Low");

      setAgentSnapshot({
        reliabilityLevel,
        trend: statePayload?.trend || statePayload?.dominantPattern || (language === "ar" ? "نشاط متعدد المناطق" : "Multi-region activity"),
        impact: statePayload?.impact || statePayload?.nearTermImpact || (language === "ar" ? "متوسط" : "Moderate"),
      });
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [language, refreshKey]);

  const takeaways = useMemo(() => (
    language === "ar"
      ? [
          `الاتجاه الرئيسي: ${agentSnapshot.trend}`,
          `الأثر المحتمل: ${agentSnapshot.impact}`,
          `مستوى الموثوقية: ${agentSnapshot.reliabilityLevel}`,
        ]
      : [
          `Main trend: ${agentSnapshot.trend}`,
          `Likely impact: ${agentSnapshot.impact}`,
          `Reliability level: ${agentSnapshot.reliabilityLevel}`,
        ]
  ), [agentSnapshot, language]);

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الوكيل الذكي" : "AI AGENT"}
        title={language === "ar" ? "ملخص الذكاء الاصطناعي" : "AI Summary"}
        description={language === "ar" ? "ملخص مبسط يوضح الاتجاه الأساسي، الأثر المتوقع، ومستوى الموثوقية." : "A simplified AI brief with main trend, likely impact, and reliability level."}
      />
      <PageTakeaways
        language={language}
        items={takeaways}
      />

      {isAdvanced ? (
        <LazySection minHeight={620}>
          <AgentDashboard refreshKey={refreshKey} />
        </LazySection>
      ) : (
        <section style={{ ...panelStyle, padding: "14px 16px" }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, marginBottom: 6 }}>
            {language === "ar" ? "لوحة الوكيل الكاملة في العرض المتقدم" : "Full agent dashboard is in Advanced View"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            {language === "ar" ? "تم إخفاء تفاصيل الذاكرة، الأنماط، سلسلة الاستدلال، والتدقيق في الوضع المبسط." : "Memory depth, pattern strength, reasoning chain, and audit metrics are intentionally hidden in simplified mode."}
          </div>
        </section>
      )}
    </div>
  );
}
