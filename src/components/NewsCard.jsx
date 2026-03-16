import React, { useState } from "react";
import { URGENCY_MAP } from "../AppHelpers";

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
  if (!source) return { label: "Unknown", color: "#444", logo: "❓" };
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
  url = "#",
  urgency = "low",
  sharjahBadge = false,
  onClick
}) {
  const safeTitle = typeof title === "string" ? title : "خبر";
  const safeSummary = typeof summary === "string" ? summary : "";
  const safeSource = typeof source === "string" ? source : "";
  const safeTime = typeof time === "string" ? time : "";
  const badge = getSourceBadge(safeSource);
  const urgencyColor = URGENCY_MAP[urgency]?.color || "#38bdf8";
  const reliability = getReliability(safeSource);

  return (
    <div
      onClick={onClick}
      style={{
        display: "block",
        background: "#0f172a",
        border: `2px solid ${urgencyColor}`,
        borderRadius: "12px",
        padding: "16px",
        color: "#e2e8f0",
        textDecoration: "none",
        minHeight: "120px",
        cursor: "pointer",
        boxShadow: "0 2px 8px #0002",
        transition: "transform .15s, box-shadow .15s",
        position: "relative"
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      {image && (
        <img
          src={image}
          alt={safeTitle}
          onError={(e) => (e.target.style.display = "none")}
          style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", maxHeight: "180px", objectFit: "cover" }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "16px", fontWeight: "bold", flex: "1 1 auto" }}>{safeTitle}</span>
        {sharjahBadge && (
          <span style={{
            background: "linear-gradient(90deg,#c89b3c,#f3d38a)",
            color: "#111",
            borderRadius: "999px",
            padding: "2px 10px",
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap"
          }}>
            🏆 نادي الشارقة
          </span>
        )}
        <span style={{ background: badge.color, color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: "700", marginLeft: "auto" }}>
          {badge.logo} {badge.label}
        </span>
        <span style={{ background: urgencyColor, color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: "700" }}>
          {URGENCY_MAP[urgency]?.label || "منخفض"}
        </span>
        <span style={{ background: reliability.color, color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: "700", marginLeft: "4px" }}>
          {reliability.score === "high" ? "موثوقية عالية" : "موثوقية متوسطة"}
        </span>
      </div>
      <p style={{ marginBottom: "10px", color: "#cbd5e1" }}>{safeSummary}</p>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
        <span>{safeSource}</span>
        <span>{safeTime}</span>
      </div>
    </div>
  );
}
