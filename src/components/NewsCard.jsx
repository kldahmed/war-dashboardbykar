import React, { useState, useMemo } from "react";
import { URGENCY_MAP, formatDisplayTime } from "../AppHelpers";
import { useI18n } from "../i18n/I18nProvider";
import { localizeSourceLabel, processNewsItem } from "../lib/i18n/summaryLocalizer";

const SOURCE_BADGES = {
  "BBC": { label: "BBC", color: "#1a1a1a", logo: "🌐" },
  "Reuters": { label: "Reuters", color: "#222", logo: "📰" },
  "Google News": { label: "Google News", color: "#4285F4", logo: "🔎" }
};

const RELIABILITY = {
  "BBC": { score: "high", color: "#22c55e" },
  "Reuters": { score: "high", color: "#22c55e" },
  "Google News": { score: "medium", color: "#38bdf8" },
  "default": { score: "medium", color: "#f39c12" }
};

function getSourceBadge(source) {
  if (!source) return { label: "مصدر غير محدد", color: "#444", logo: "❓" };
  if (source.includes("BBC")) return SOURCE_BADGES["BBC"];
  if (source.includes("Reuters")) return SOURCE_BADGES["Reuters"];
  if (source.includes("Google")) return SOURCE_BADGES["Google News"];
  return { label: source, color: "#444", logo: "🗞️" };
}

function getReliability(source) {
  if (!source) return RELIABILITY["default"];
  if (source.includes("BBC")) return RELIABILITY["BBC"];
  if (source.includes("Reuters")) return RELIABILITY["Reuters"];
  if (source.includes("Google")) return RELIABILITY["Google News"];
  return RELIABILITY["default"];
}

export default function NewsCard({
  title = "",
  summary = "",
  source = "",
  time = "",
  image = "",
  videoUrl = "",
  mediaType = "none",
  url = "#",
  urgency = "low",
  region = "",
  importance = "",
  onClick
}) {
  const { t, language } = useI18n();
  const [imageVisible, setImageVisible] = useState(Boolean(image));
  const hasVideo = Boolean(videoUrl);

  // Process the news item to clean and localize content
  const processedItem = useMemo(() => {
    if (language !== "ar") {
      // Non-Arabic: minimal processing
      return {
        title: typeof title === "string" ? title : t("news.unknown"),
        summary: typeof summary === "string" ? summary : "",
        source: typeof source === "string" ? source : "",
        displayable: true,
      };
    }

    // Arabic: always process to ensure journalistic quality
    const processed = processNewsItem({ title, summary, source, category: "" }, "ar");
    if (processed?.displayable !== false) {
      return {
        title: processed.title,
        summary: processed.summary,
        source: processed.source,
        displayable: true,
      };
    }

    return {
      title: "",
      summary: "",
      source: typeof source === "string" ? localizeSourceLabel(source, "ar") : "",
      displayable: false,
    };
  }, [title, summary, source, language, t]);

  if (language === "ar" && processedItem.displayable === false) {
    return null;
  }

  const safeTitle = processedItem.title;
  const safeSummary = processedItem.summary;
  const safeSource = processedItem.source || localizeSourceLabel("", language);
  const safeRegion = language === "ar"
    ? (typeof region === "string" && region.trim() ? region : "عالمي")
    : (typeof region === "string" && region.trim() ? region : "Global");
  const safeImportance = language === "ar"
    ? (importance || (urgency === "high" ? "مرتفعة" : urgency === "medium" ? "متوسطة" : "منخفضة"))
    : (importance || urgency);
  const rawTime = typeof time === "string" ? time : "";
  const safeTime = rawTime ? (formatDisplayTime(rawTime, language === "en" ? "en" : "ar") || rawTime) : "";
  const badge = getSourceBadge(safeSource);
  const urgencyColor = URGENCY_MAP[urgency]?.color || "#38bdf8";
  const reliability = getReliability(safeSource);

  const articleSchema = safeTitle ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": safeTitle,
    "description": safeSummary || safeTitle,
    "datePublished": rawTime || new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": safeSource || "Global Pulse"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Global Pulse",
      "url": "https://war-dashboardbykar.vercel.app"
    },
    ...(image ? { "image": image } : {}),
    "mainEntityOfPage": url !== "#" ? url : "https://war-dashboardbykar.vercel.app"
  } : null;

  return (
    <div
      onClick={onClick}
      className="nr-card-enter nr-card-hover"
      style={{
        display: "block",
        background: `radial-gradient(circle at top right, ${urgencyColor}22, transparent 28%), linear-gradient(160deg, rgba(14,22,35,0.96), rgba(8,13,21,0.94))`,
        border: `1px solid ${urgencyColor}55`,
        borderRadius: "22px",
        padding: "18px",
        color: "#e2e8f0",
        textDecoration: "none",
        minHeight: "180px",
        cursor: "pointer",
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        transition: "transform .2s, box-shadow .2s",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ position: "absolute", inset: "auto auto -36px -36px", width: 140, height: 140, borderRadius: 999, background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)", pointerEvents: "none" }} />
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      {image && imageVisible && (
        <img
          src={image}
          alt={safeTitle}
          onError={() => setImageVisible(false)}
          style={{ width: "100%", borderRadius: "16px", marginBottom: "14px", maxHeight: "220px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.08)" }}
        />
      )}
      {hasVideo ? (
        <div style={{ marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontSize: 11, fontWeight: 800 }}>
          🎬 {mediaType === "youtube" ? "YouTube" : (language === "ar" ? "فيديو من المصدر" : "Source video")}
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "18px", fontWeight: 900, lineHeight: 1.3, flex: "1 1 240px" }}>{safeTitle}</span>
        <span style={{ background: `${badge.color}cc`, color: "#fff", borderRadius: "999px", padding: "5px 10px", fontSize: "11px", fontWeight: "800" }}>
          {badge.logo} {badge.label}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ background: `${urgencyColor}22`, border: `1px solid ${urgencyColor}44`, color: urgencyColor, borderRadius: "999px", padding: "5px 10px", fontSize: "11px", fontWeight: "800" }}>
          {t(`news.urgency.${urgency}`)}
        </span>
        <span style={{ background: `${reliability.color}20`, border: `1px solid ${reliability.color}44`, color: reliability.color, borderRadius: "999px", padding: "5px 10px", fontSize: "11px", fontWeight: "800" }}>
          {reliability.score === "high" ? t("news.reliabilityHigh") : t("news.reliabilityMedium")}
        </span>
      </div>
      <p style={{ marginBottom: "14px", color: "#cbd5e1", lineHeight: 1.8, fontSize: "13px" }}>{safeSummary}</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: "12px", color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
        <span style={{ fontWeight: 700, color: "#a9bacd" }}>{safeSource}</span>
        <span>{safeTime}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: "12px", color: "#cbd5e1", marginTop: 8 }}>
        <span>{language === "ar" ? `المنطقة: ${safeRegion}` : `Region: ${safeRegion}`}</span>
        <span>{language === "ar" ? `الأهمية: ${safeImportance}` : `Importance: ${safeImportance}`}</span>
      </div>
      {typeof onClick === "function" ? (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
            style={{
              border: "1px solid rgba(56,189,248,0.5)",
              background: "rgba(56,189,248,0.12)",
              color: "#bae6fd",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {language === "ar" ? "التفاصيل" : "Details"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
