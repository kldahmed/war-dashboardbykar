/**
 * AgentAvatar — Premium futuristic AI core visual with state-driven animations.
 * Renders a glowing orbital intelligence orb with scan lines, pulse rings, and
 * breathing effects. Responds to agent state (idle, analyzing, alert, etc.).
 */
import React from "react";

const SIZE = 72;
const HALF = SIZE / 2;
const R_CORE = 16;
const R_RING1 = 24;
const R_RING2 = 32;

const STATE_PALETTE = {
  idle: { core: "#4b5563", glow: "rgba(75,85,99,.25)", ring: "#6b7280" },
  monitoring: { core: "#38bdf8", glow: "rgba(56,189,248,.3)", ring: "#0ea5e9" },
  analyzing: { core: "#a78bfa", glow: "rgba(167,139,250,.3)", ring: "#8b5cf6" },
  learning: { core: "#22c55e", glow: "rgba(34,197,94,.3)", ring: "#16a34a" },
  alert: { core: "#ef4444", glow: "rgba(239,68,68,.35)", ring: "#dc2626" },
  forecasting: { core: "#f59e0b", glow: "rgba(245,158,11,.3)", ring: "#d97706" },
  updating: { core: "#06b6d4", glow: "rgba(6,182,212,.3)", ring: "#0891b2" },
};

export default function AgentAvatar({ state = "idle", size = SIZE, onClick, reducedMotion = false }) {
  const palette = STATE_PALETTE[state] || STATE_PALETTE.idle;
  const scale = size / SIZE;
  const half = size / 2;

  const isActive = state !== "idle";
  const isAlert = state === "alert";

  const breathDur = isAlert ? "1.2s" : "3s";
  const scanDur = isAlert ? "1.6s" : "4s";
  const ringDur = "6s";

  const styleTag = `
    @keyframes agent-breathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
    @keyframes agent-scan{0%{stroke-dashoffset:200}100%{stroke-dashoffset:0}}
    @keyframes agent-orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    @keyframes agent-pulse-ring{0%{opacity:.45}100%{opacity:0}}
    @keyframes agent-alert-flash{0%,100%{opacity:.6}50%{opacity:1}}
  `;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="AI Agent"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      style={{
        width: size,
        height: size,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <style>{styleTag}</style>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id="agentCoreGrad" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="40%" stopColor={palette.core} stopOpacity="0.8" />
            <stop offset="100%" stopColor={palette.core} stopOpacity="0.15" />
          </radialGradient>
          <filter id="agentGlow">
            <feGaussianBlur stdDeviation={3 * scale} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow / ambient */}
        <circle
          cx={half}
          cy={half}
          r={R_RING2 * scale}
          fill="none"
          stroke={palette.glow}
          strokeWidth={1.5 * scale}
          opacity={0.3}
        />

        {/* Pulse ring — expands outward */}
        {isActive && !reducedMotion && (
          <circle
            cx={half}
            cy={half}
            r={R_RING2 * scale}
            fill="none"
            stroke={palette.core}
            strokeWidth={1.2 * scale}
            style={{
              animation: `agent-pulse-ring ${breathDur} ease-out infinite`,
            }}
          />
        )}

        {/* Orbital ring 2 — rotating dashed */}
        <g
          style={
            reducedMotion
              ? {}
              : {
                  transformOrigin: `${half}px ${half}px`,
                  animation: `agent-orbit ${ringDur} linear infinite`,
                }
          }
        >
          <circle
            cx={half}
            cy={half}
            r={R_RING2 * scale}
            fill="none"
            stroke={palette.ring}
            strokeWidth={0.8 * scale}
            strokeDasharray={`${4 * scale} ${8 * scale}`}
            opacity={0.5}
          />
        </g>

        {/* Orbital ring 1 — counter rotate */}
        <g
          style={
            reducedMotion
              ? {}
              : {
                  transformOrigin: `${half}px ${half}px`,
                  animation: `agent-orbit ${ringDur} linear infinite reverse`,
                }
          }
        >
          <circle
            cx={half}
            cy={half}
            r={R_RING1 * scale}
            fill="none"
            stroke={palette.ring}
            strokeWidth={0.7 * scale}
            strokeDasharray={`${6 * scale} ${10 * scale}`}
            opacity={0.4}
          />
        </g>

        {/* Scan arc — animated dash */}
        {isActive && !reducedMotion && (
          <circle
            cx={half}
            cy={half}
            r={R_RING1 * scale}
            fill="none"
            stroke={palette.core}
            strokeWidth={1.5 * scale}
            strokeDasharray="200"
            strokeDashoffset="200"
            strokeLinecap="round"
            opacity={0.6}
            style={{
              animation: `agent-scan ${scanDur} linear infinite`,
            }}
          />
        )}

        {/* Core orb */}
        <circle
          cx={half}
          cy={half}
          r={R_CORE * scale}
          fill="url(#agentCoreGrad)"
          filter="url(#agentGlow)"
          style={
            reducedMotion
              ? {}
              : {
                  transformOrigin: `${half}px ${half}px`,
                  animation: isAlert
                    ? `agent-alert-flash 0.8s ease-in-out infinite`
                    : `agent-breathe ${breathDur} ease-in-out infinite`,
                }
          }
        />

        {/* Center eye / indicator dot */}
        <circle
          cx={half}
          cy={half}
          r={3 * scale}
          fill="#fff"
          opacity={isActive ? 0.9 : 0.4}
        />

        {/* Horizontal scan line through center */}
        <line
          x1={half - R_CORE * scale * 0.6}
          y1={half}
          x2={half + R_CORE * scale * 0.6}
          y2={half}
          stroke="#fff"
          strokeWidth={0.7 * scale}
          opacity={0.25}
        />
      </svg>
    </div>
  );
}
