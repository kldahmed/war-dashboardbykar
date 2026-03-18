/**
 * AgentMetricsRing — A compact circular progress ring with label + value.
 * Used to display individual agent metrics (learning, confidence, etc.).
 */
import React from "react";

const RING_SIZE = 56;
const STROKE = 4;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function AgentMetricsRing({
  value = 0,
  label = "",
  color = "#38bdf8",
  size = RING_SIZE,
  reducedMotion = false,
}) {
  const s = STROKE;
  const r = (size - s) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: 58,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ display: "block" }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={s}
          />
          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={s}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={
              reducedMotion
                ? {}
                : {
                    transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)",
                  }
            }
          />
        </svg>
        {/* Center value */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            color: "#e8edf2",
            fontFamily: "monospace",
          }}
        >
          {Math.round(value)}
        </div>
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#94a3b8",
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 64,
        }}
      >
        {label}
      </div>
    </div>
  );
}
