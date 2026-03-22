import React from "react";
import { formatDisplayTime } from "../AppHelpers";
import { useI18n } from "../i18n/I18nProvider";

const RELIABILITY = {
  "BBC": { score: "high", color: "#22c55e" },
  "Reuters": { score: "high", color: "#22c55e" },
  "Google News": { score: "medium", color: "#38bdf8" },
  "default": { score: "medium", color: "#f39c12" }
};

function getReliability(source) {
  if (!source) return RELIABILITY["default"];
  if (source.includes("BBC")) return RELIABILITY["BBC"];
  if (source.includes("Reuters")) return RELIABILITY["Reuters"];
  if (source.includes("Google")) return RELIABILITY["Google News"];
  return RELIABILITY["default"];
}

export default function ArticleModal({ open, onClose, article }) {
  const { t } = useI18n();
  if (!open || !article) return null;
  const { title, summary, source, time, url } = article;
  const reliability = getReliability(source);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(3,7,12,0.76)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "radial-gradient(circle at top right, rgba(103,232,249,0.12), transparent 26%), radial-gradient(circle at top left, rgba(244,201,123,0.12), transparent 22%), linear-gradient(165deg, rgba(15,23,37,0.98), rgba(8,13,21,0.98))",
          color: "#e2e8f0",
          borderRadius: "26px",
          padding: "28px 24px 24px",
          maxWidth: "720px",
          width: "min(92vw, 720px)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.025) 40%, transparent 58%)" }} />
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(248,113,113,0.16)", color: "#fecaca", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "999px", width: 38, height: 38, fontWeight: "700", cursor: "pointer", fontSize: "18px" }}>×</button>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "999px", background: "rgba(103,232,249,0.12)", border: "1px solid rgba(103,232,249,0.22)", color: "#9be7f0", fontSize: 11, fontWeight: 800 }}>
              {source || (t("news.unknown"))}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "999px", background: `${reliability.color}20`, border: `1px solid ${reliability.color}44`, color: reliability.color, fontSize: 11, fontWeight: 800 }}>
              {reliability.score === "high" ? t("news.reliabilityHigh") : t("news.reliabilityMedium")}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "999px", background: "rgba(244,201,123,0.12)", border: "1px solid rgba(244,201,123,0.2)", color: "#f4c97b", fontSize: 11, fontWeight: 800 }}>
              {formatDisplayTime(time) || time}
            </span>
          </div>
          <h2 style={{ fontSize: "2rem", lineHeight: 1.15, marginBottom: "16px", marginTop: 0, color: "#f8fbff", letterSpacing: "-0.04em" }}>{title}</h2>
          <div style={{ marginBottom: "20px", color: "#cbd5e1", lineHeight: 1.95, fontSize: "15px" }}>{summary}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18 }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              {t("articleModal.readOriginal")}
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(135deg, #67e8f9, #38bdf8)", color: "#042235", borderRadius: "999px", padding: "12px 18px", fontWeight: "900", textDecoration: "none", display: "inline-block", boxShadow: "0 14px 28px rgba(56,189,248,0.24)" }}>
              {t("articleModal.readOriginal")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
