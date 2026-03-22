import React, { Suspense } from "react";

export const pageShell = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "30px 20px 64px",
};

export const panelStyle = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
  backdropFilter: "blur(16px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)",
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
    <section style={{ ...panelStyle, padding: "22px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#f3d38a", textTransform: "uppercase", marginBottom: 10 }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#f8fafc", lineHeight: 1.15, marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8 }}>
            {description}
          </div>
        </div>
        {right ? <div style={{ minWidth: 220 }}>{right}</div> : null}
      </div>
    </section>
  );
}

export function OverviewMetric({ label, value, hint, color = "#38bdf8" }) {
  return (
    <div style={{ ...panelStyle, padding: "16px 16px 14px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, lineHeight: 1.55 }}>{hint}</div>
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
        padding: "18px 18px 16px",
        cursor: "pointer",
        textAlign: "inherit",
        color: "inherit",
        width: "100%",
      }}
      className="nr-card-hover"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{route.icon}</span>
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
        padding: "16px 16px 15px",
        width: "100%",
        textAlign: "inherit",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 17 }}>{route.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{description}</div>
    </button>
  );
}
