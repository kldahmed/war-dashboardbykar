import React from "react";
import { URGENCY_MAP, formatDisplayTime } from "../AppHelpers";

export default function NewsCard({ item, index = 0 }) {
  const urgency = URGENCY_MAP[item.urgency] || URGENCY_MAP.low;
  const image = item.image;

  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block", cursor: "pointer" }}
    >
      <div
        style={{
          background: "linear-gradient(180deg,#0a0906,#080808)",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: index === 0 ? "0 0 0 1px rgba(200,150,12,.06)" : "none"
        }}
      >
        {image && (
          <div
            style={{
              width: "100%",
              height: "180px",
              background: "#0b0b0b",
              overflow: "hidden",
              borderBottom: "1px solid rgba(255,255,255,.05)"
            }}
          >
            <img
              src={image}
              alt={item.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
        <div style={{ padding: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
              flexWrap: "wrap"
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: urgency.color,
                boxShadow: item.urgency === "high" ? `0 0 12px ${urgency.color}` : "none"
              }}
            />
            <span style={{ color: urgency.color, fontSize: "12px", fontWeight: 800 }}>{urgency.label}</span>
            <span style={{ color: "#555", fontSize: "11px", marginRight: "auto" }}>{item.source}</span>
          </div>
          <div style={{ color: "#f3d38a", fontSize: "15px", fontWeight: 800, lineHeight: 1.5, marginBottom: "8px" }}>{item.title}</div>
          <div style={{ color: "#b8b8b8", fontSize: "13px", lineHeight: 1.8, marginBottom: "12px" }}>{item.summary}</div>
          <div style={{ color: "#666", fontSize: "11px" }}>{formatDisplayTime(item.time)}</div>
        </div>
      </div>
    </a>
  );
}
