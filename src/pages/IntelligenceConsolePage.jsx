import React from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";
import { PageHero, pageShell, panelStyle, ShortcutCard } from "./shared/pagePrimitives";

export default function IntelligenceConsolePage({ language, mode, setMode, navigate }) {
  const advancedRoutes = SECTION_ROUTES.filter((route) => route.tier === "advanced" && route.id !== "console");

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "التحليل المتقدم" : "ADVANCED ANALYSIS"}
        title={language === "ar" ? "بوابة الاستخبارات المتقدمة" : "Intelligence Console"}
        description={language === "ar"
          ? "مساحة مخصصة للمحللين تتضمن الرادار، التحليل، العلاقات، الاستشراف، ولوحة الوكيل."
          : "A dedicated analyst layer for radar, deep analysis, relationship views, forecasts, and the AI agent."}
      />

      {mode !== "advanced" ? (
        <section style={{ ...panelStyle, padding: "18px 20px", marginBottom: 18 }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
            {language === "ar" ? "الوضع المبسط مفعل حالياً" : "Simplified mode is currently active"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
            {language === "ar"
              ? "للوصول إلى أدوات التحليل العميق، انتقل إلى العرض المتقدم."
              : "Switch to Advanced View to access technical intelligence modules."}
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("advanced");
              navigate("/analysis-center");
            }}
            style={{
              border: "1px solid rgba(243,211,138,0.35)",
              background: "linear-gradient(135deg, rgba(243,211,138,0.2), rgba(243,211,138,0.08))",
              color: "#f8fafc",
              borderRadius: 10,
              padding: "9px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {language === "ar" ? "الانتقال إلى العرض المتقدم" : "Switch to Advanced View"}
          </button>
        </section>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {advancedRoutes.map((route) => (
          <ShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
        ))}
      </section>
    </div>
  );
}
