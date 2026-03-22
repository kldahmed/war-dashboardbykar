import React, { Suspense } from "react";

export const pageShell = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "34px 20px 72px",
};

export const panelStyle = {
  background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 48%, rgba(103,232,249,0.035) 100%)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 24,
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.05)",
};

export function LazySection({ children, minHeight = 260 }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            ...panelStyle,
            minHeight,
            padding: "20px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          جارٍ تحميل اللوحة...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function PageHero({ eyebrow, title, description, right }) {
  return (
    <section style={{ ...panelStyle, padding: "30px 30px 28px", marginBottom: 30, position: "relative", overflow: "hidden", background: "radial-gradient(circle at top left, rgba(103,232,249,0.12), transparent 36%), radial-gradient(circle at top right, rgba(244,201,123,0.1), transparent 26%), linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 48%, rgba(103,232,249,0.035) 100%)" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.02) 42%, transparent 60%)" }} />
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", position: "relative" }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#f3d38a", textTransform: "uppercase", marginBottom: 14, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(243,211,138,0.18)", background: "rgba(243,211,138,0.07)" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#67e8f9", boxShadow: "0 0 14px rgba(103,232,249,0.8)" }} />
            {eyebrow}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#f8fafc", lineHeight: 1.02, marginBottom: 12, letterSpacing: "-0.04em", maxWidth: 720 }}>
            {title}
          </div>
          <div style={{ fontSize: 15, color: "#b6c2d1", lineHeight: 1.9, maxWidth: 680 }}>
            {description}
          </div>
        </div>
        {right ? <div style={{ minWidth: 240, position: "relative" }}>{right}</div> : null}
      </div>
    </section>
  );
}

export function ExperienceModeSwitch({ language = "ar", mode = "simplified", setMode }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid rgba(103,232,249,0.22)", borderRadius: 999, overflow: "hidden", padding: 4, background: "rgba(9,15,25,0.76)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 26px rgba(0,0,0,0.18)" }}>
      <button
        type="button"
        onClick={() => setMode("simplified")}
        style={{
          border: "none",
          background: mode === "simplified" ? "linear-gradient(135deg, rgba(103,232,249,0.35), rgba(103,232,249,0.12))" : "transparent",
          color: mode === "simplified" ? "#f8fafc" : "#94a3b8",
          padding: "9px 14px",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          borderRadius: 999,
        }}
      >
        {language === "ar" ? "عرض مبسط" : "Simplified View"}
      </button>
      <button
        type="button"
        onClick={() => setMode("advanced")}
        style={{
          border: "none",
          background: mode === "advanced" ? "linear-gradient(135deg, rgba(243,211,138,0.35), rgba(243,211,138,0.12))" : "transparent",
          color: mode === "advanced" ? "#f8fafc" : "#94a3b8",
          padding: "9px 14px",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          borderRadius: 999,
        }}
      >
        {language === "ar" ? "عرض متقدم" : "Advanced View"}
      </button>
    </div>
  );
}

export function PageTakeaways({ language = "ar", items = [] }) {
  return (
    <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#8fa0b5", marginBottom: 12, textTransform: "uppercase", letterSpacing: 2 }}>
        {language === "ar" ? "أهم 3 نقاط" : "Top 3 takeaways"}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {(Array.isArray(items) ? items : []).slice(0, 3).map((item, index) => (
          <div key={`takeaway-${index}`} style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, display: "grid", gridTemplateColumns: "30px 1fr", alignItems: "start", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 999, background: "rgba(103,232,249,0.12)", color: "#67e8f9", fontWeight: 900 }}>{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OverviewMetric({ label, value, hint, color = "#38bdf8" }) {
  return (
    <div style={{ ...panelStyle, padding: "18px 18px 16px", background: `radial-gradient(circle at top right, ${color}1f, transparent 34%), linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 48%, rgba(103,232,249,0.035) 100%)` }}>
      <div style={{ fontSize: 11, color: "#8fa0b5", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.4 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.04em" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#b1bfce", marginTop: 8, lineHeight: 1.6 }}>{hint}</div>
    </div>
  );
}

export function ShortcutCard({ route, language, navigate }) {
  const title = language === "ar" ? route.titleAr : route.titleEn;
  const description = language === "ar" ? route.descriptionAr : route.descriptionEn;

  return (
    <button
      type="button"
      onClick={() => navigate(route.path)}
      style={{
        ...panelStyle,
        padding: "20px 20px 18px",
        cursor: "pointer",
        textAlign: "inherit",
        color: "inherit",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
      className="nr-card-hover"
    >
      <div style={{ position: "absolute", inset: "auto -14% -36% auto", width: 120, height: 120, borderRadius: 999, background: "radial-gradient(circle, rgba(103,232,249,0.14), transparent 66%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{route.icon}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{description}</div>
    </button>
  );
}

export function FeaturedShortcutCard({ route, language, navigate }) {
  const title = language === "ar" ? route.titleAr : route.titleEn;
  const description = language === "ar" ? route.descriptionAr : route.descriptionEn;

  return (
    <button
      type="button"
      onClick={() => navigate(route.path)}
      className="nr-card-hover"
      style={{
        ...panelStyle,
        padding: "18px 18px 16px",
        width: "100%",
        textAlign: "inherit",
        color: "inherit",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: "auto auto -42% -12%", width: 110, height: 110, borderRadius: 999, background: "radial-gradient(circle, rgba(244,201,123,0.16), transparent 66%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 17, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{route.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{description}</div>
    </button>
  );
}
