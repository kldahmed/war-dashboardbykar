
import React from "react";

export default function NewsCard({
  title = "",
  summary = "",
  source = "",
  time = "",
  image = "",
  url = "#",
  urgency = "low"
}) {
  const safeTitle = typeof title === "string" ? title : "خبر";
  const safeSummary = typeof summary === "string" ? summary : "";
  const safeSource = typeof source === "string" ? source : "";
  const safeTime = typeof time === "string" ? time : "";

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
        padding: "16px",
        color: "#e2e8f0",
        textDecoration: "none",
        minHeight: "120px"
      }}
    >
      {image && (
        <img
          src={image}
          alt={safeTitle}
          onError={(e) => (e.target.style.display = "none")}
          style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", maxHeight: "180px", objectFit: "cover" }}
        />
      )}

      <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>{safeTitle}</h3>
      <p style={{ marginBottom: "10px", color: "#cbd5e1" }}>{safeSummary}</p>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
        <span>{safeSource}</span>
        <span>{safeTime}</span>
      </div>
    </a>
  );
}
