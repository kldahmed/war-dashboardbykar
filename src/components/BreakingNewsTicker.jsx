import React, { useMemo } from "react";

export default function BreakingNewsTicker({
  headlines = [],
  speed = 28,
  label = "BREAKING",
  background = "#0f172a",
  accent = "#f3d38a",
  textColor = "#f8fafc"
}) {
  const safeHeadlines = useMemo(() => {
    if (!Array.isArray(headlines) || headlines.length === 0) {
      return ["No breaking updates available right now"];
    }

    return headlines
      .map((item) => String(item || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [headlines]);

  const tickerItems = useMemo(() => {
    // نكرر المحتوى 3 مرات لضمان الاستمرارية
    return [...safeHeadlines, ...safeHeadlines, ...safeHeadlines];
  }, [safeHeadlines]);

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background,
        borderBottom: `1px solid ${accent}66`,
        boxShadow: "0 4px 18px rgba(0,0,0,.18)",
        position: "relative",
        zIndex: 20
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minHeight: "52px",
          padding: "0 14px"
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,.04)",
            border: `1px solid ${accent}44`,
            color: accent,
            borderRadius: "999px",
            padding: "7px 12px",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "1.5px",
            textTransform: "uppercase"
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 12px #ef4444",
              display: "inline-block",
              animation: "ticker-pulse 1.2s infinite"
            }}
          />
          {label}
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            flex: 1,
            whiteSpace: "nowrap"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              width: "max-content",
              willChange: "transform",
              animation: `ticker-marquee ${speed}s linear infinite`
            }}
          >
            {tickerItems.map((title, idx) => (
              <span
                key={`${title}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: textColor,
                  fontWeight: 700,
                  fontSize: "15px",
                  letterSpacing: ".2px",
                  marginInlineEnd: "34px"
                }}
              >
                <span style={{ color: accent, marginInlineEnd: "10px" }}>•</span>
                {title}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.3333%);
          }
        }

        @keyframes ticker-pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.18);
            opacity: .75;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
