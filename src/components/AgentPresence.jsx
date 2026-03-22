/**
 * AgentPresence — The persistent floating AI agent that lives inside the site.
 * Shows a compact docked widget with the avatar, state badge, live metrics,
 * and status message. Expands into the full AgentStatusPanel on click.
 * Reacts to platform data via useAgentIntelligence hook.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AgentAvatar from "./AgentAvatar";
import AgentStateBadge from "./AgentStateBadge";
import AgentMetricsRing from "./AgentMetricsRing";
import AgentStatusPanel from "./AgentStatusPanel";
import { useAgentIntelligence } from "../lib/useAgentIntelligence";

const WIDGET_WIDTH = 260;

// Subtle positional offset based on state — gives the feeling of
// intelligent, intentional micro-movement toward relevant activity.
const STATE_OFFSET = {
  idle: { x: 0, y: 0 },
  monitoring: { x: 0, y: -2 },
  analyzing: { x: -1, y: -3 },
  learning: { x: 1, y: -2 },
  alert: { x: 0, y: -5 },
  forecasting: { x: -2, y: -1 },
  updating: { x: 1, y: -1 },
};

export default function AgentPresence({ refreshKey = 0 }) {
  const { metrics, agentState, stateInfo, statusMessage, history } =
    useAgentIntelligence(refreshKey);

  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const widgetRef = useRef(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Clear action result after delay
  useEffect(() => {
    if (!actionResult) return;
    const t = setTimeout(() => setActionResult(null), 5000);
    return () => clearTimeout(t);
  }, [actionResult]);

  const offset = STATE_OFFSET[agentState] || STATE_OFFSET.idle;

  const handleAction = useCallback(
    (id) => {
      if (!metrics) return;
      switch (id) {
        case "briefing": {
          const summary = metrics.strategicSummary?.topGlobalEvents?.[0];
          const sig = metrics.strongestSignals?.slice(0, 3).map((s) => s.signal).join("، ") || "لا إشارات";
          setActionResult(summary
            ? `📋 ${summary.title} | ${summary.leadingScenario?.label || "scenario"} ${summary.leadingScenario?.probability || 0}%`
            : `📋 أقوى الإشارات: ${sig} | الثقة: ${metrics.confidence}%`);
          break;
        }
        case "important": {
          const region = metrics.strategicSummary?.regionsWithHighestTension?.[0] || "—";
          const top = metrics.topEntities?.slice(0, 3).map((e) => e.key).join("، ") || "—";
          setActionResult(`⚡ أعلى توتر: ${region} | أبرز الكيانات: ${top}`);
          break;
        }
        case "forecast": {
          const next72 = metrics.strategicSummary?.likelyNext72Hours;
          const ready = metrics.forecastReadiness;
          const trend = metrics.confidenceTrend?.label || "—";
          setActionResult(next72 || `🔮 الجاهزية: ${ready}% | اتجاه الثقة: ${trend}`);
          break;
        }
        default:
          break;
      }
    },
    [metrics]
  );

  // Primary compact rings for the widget
  const compactRings = useMemo(() => {
    if (!metrics) return [];
    return [
      { value: metrics.learningLevel, label: "التعلم", color: "#22c55e" },
      { value: metrics.confidence, label: "الثقة", color: "#38bdf8" },
      { value: metrics.activity, label: "النشاط", color: "#a78bfa" },
    ];
  }, [metrics]);

  if (!metrics) return null;

  // Minimized: just the orb
  if (minimized) {
    return (
      <div
        className="agent-presence-minimized"
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 9999,
          cursor: "pointer",
        }}
        onClick={() => setMinimized(false)}
        title="Global Pulse AI Agent"
      >
        <AgentAvatar state={agentState} size={48} reducedMotion={reducedMotion} />
      </div>
    );
  }

  return (
    <>
      {/* Floating docked widget */}
      <div
        ref={widgetRef}
        className="agent-presence-widget"
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 9999,
          width: WIDGET_WIDTH,
          background: "rgba(11,13,16,0.94)",
          border: `1px solid ${stateInfo.color}22`,
          borderRadius: 16,
          backdropFilter: "blur(12px)",
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 30px ${stateInfo.color}10`,
          transform: reducedMotion
            ? "none"
            : `translate(${offset.x}px, ${offset.y}px)`,
          transition: reducedMotion
            ? "none"
            : "transform 1.5s cubic-bezier(.4,0,.2,1), border-color 0.6s, box-shadow 0.6s",
          overflow: "hidden",
          direction: "rtl",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${stateInfo.color}, transparent)`,
            opacity: 0.6,
          }}
        />

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px 6px",
          }}
        >
          <AgentAvatar
            state={agentState}
            size={44}
            onClick={() => setExpanded(true)}
            reducedMotion={reducedMotion}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#f8fafc",
                  letterSpacing: "0.2px",
                }}
              >
                الوكيل الذكي
              </span>
              <AgentStateBadge stateInfo={stateInfo} size="small" />
            </div>
            <div
              style={{
                fontSize: 10,
                color: stateInfo.color,
                fontWeight: 500,
                opacity: 0.85,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minHeight: 14,
              }}
            >
              {statusMessage}
            </div>
          </div>
          {/* Minimize button */}
          <button
            onClick={() => setMinimized(true)}
            aria-label="Minimize agent"
            style={{
              background: "none",
              border: "none",
              color: "#475569",
              fontSize: 14,
              cursor: "pointer",
              padding: "2px 4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ▾
          </button>
        </div>

        {/* Compact metrics */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            padding: "6px 12px 10px",
          }}
        >
          {compactRings.map((r) => (
            <AgentMetricsRing
              key={r.label}
              value={r.value}
              label={r.label}
              color={r.color}
              size={44}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        {/* Action result toast */}
        {actionResult && (
          <div
            style={{
              fontSize: 10,
              color: "#38bdf8",
              background: "rgba(56,189,248,0.06)",
              borderTop: "1px solid rgba(56,189,248,0.1)",
              padding: "6px 12px",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {actionResult}
          </div>
        )}

        {/* Tap to expand hint */}
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "block",
            width: "100%",
            background: "rgba(255,255,255,0.02)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            border: "none",
            borderTopStyle: "solid",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.04)",
            padding: "6px 0",
            fontSize: 9,
            color: "#475569",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.3px",
          }}
        >
          اضغط لعرض التفاصيل ↗
        </button>
      </div>

      {/* Expanded full panel */}
      {expanded && (
        <AgentStatusPanel
          metrics={metrics}
          agentState={agentState}
          stateInfo={stateInfo}
          statusMessage={statusMessage}
          onClose={() => setExpanded(false)}
          onAction={handleAction}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
