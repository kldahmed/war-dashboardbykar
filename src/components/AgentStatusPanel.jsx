/**
 * AgentStatusPanel — Expanded panel showing full agent intelligence metrics,
 * active signals, reasoning summary, and interaction buttons.
 * Opens when user clicks the agent avatar.
 */
import React from "react";
import AgentAvatar from "./AgentAvatar";
import AgentStateBadge from "./AgentStateBadge";
import AgentMetricsRing from "./AgentMetricsRing";

const PANEL_BG = "rgba(11,13,16,0.97)";
const CARD_BG = "rgba(22,27,34,0.85)";
const BORDER = "rgba(56,189,248,0.12)";
const ACCENT = "#38bdf8";

function MetricRow({ label, value, unit = "", color = "#e8edf2" }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>
        {value}
        {unit && <span style={{ fontSize: 10, color: "#64748b", marginRight: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

function SignalPill({ text, strength }) {
  const c =
    strength === "high" ? "#ef4444" : strength === "medium" ? "#f59e0b" : "#22c55e";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 6,
        background: `${c}15`,
        border: `1px solid ${c}33`,
        color: c,
        margin: "2px 3px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function AgentStatusPanel({
  metrics,
  agentState,
  stateInfo,
  statusMessage,
  onClose,
  onAction,
  reducedMotion = false,
}) {
  if (!metrics) return null;

  const rings = [
    { value: metrics.learningLevel, label: "مستوى التعلم", color: "#22c55e" },
    { value: metrics.confidence, label: "الثقة الحالية", color: "#38bdf8" },
    { value: metrics.activity, label: "نشاط الوكيل", color: "#a78bfa" },
    { value: metrics.signalDensity, label: "كثافة الإشارات", color: "#f59e0b" },
    { value: metrics.forecastReadiness, label: "جاهزية التوقع", color: "#06b6d4" },
    { value: metrics.patternStrength, label: "قوة الأنماط", color: "#f472b6" },
  ];

  const actions = [
    { id: "briefing", label: "اطلب موجزًا", icon: "📋" },
    { id: "important", label: "ما أهم شيء الآن؟", icon: "⚡" },
    { id: "forecast", label: "ماذا تتوقع؟", icon: "🔮" },
  ];

  return (
    <div
      className="agent-panel-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        padding: 16,
      }}
    >
      <div
        className="agent-status-panel"
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "90vh",
          overflowY: "auto",
          background: PANEL_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 24,
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <AgentAvatar state={agentState} size={80} reducedMotion={reducedMotion} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
            Global Pulse AI Agent
          </div>
          <AgentStateBadge stateInfo={stateInfo} />
          <div
            style={{
              fontSize: 11,
              color: stateInfo?.color || "#94a3b8",
              fontWeight: 500,
              textAlign: "center",
              minHeight: 16,
              direction: "rtl",
            }}
          >
            {statusMessage}
          </div>
        </div>

        {/* Metrics rings */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            marginBottom: 20,
            padding: "16px 8px",
            background: CARD_BG,
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
          }}
        >
          {rings.map((r) => (
            <AgentMetricsRing
              key={r.label}
              value={r.value}
              label={r.label}
              color={r.color}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        {/* Details */}
        <div
          style={{
            background: CARD_BG,
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
            padding: "12px 14px",
            marginBottom: 16,
            direction: "rtl",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: ACCENT,
              marginBottom: 8,
              letterSpacing: "0.5px",
            }}
          >
            📊 تفاصيل الوكيل
          </div>
          <MetricRow label="حالة الوكيل" value={stateInfo?.ar || "—"} color={stateInfo?.color} />
          <MetricRow label="عدد الإشارات المعالجة" value={metrics.totalProcessed} />
          <MetricRow label="الأنماط النشطة" value={metrics.activePatternsCount} />
          <MetricRow label="الأحداث المرتبطة" value={metrics.linkedEventsCount} />
          <MetricRow label="تنوع المصادر" value={metrics.sourceDiversity} />
          <MetricRow label="الخطر العالمي" value={metrics.globalRiskLevel || "LOW"} color={metrics.globalRiskLevel === "CRITICAL" ? "#ef4444" : metrics.globalRiskLevel === "HIGH" ? "#f59e0b" : metrics.globalRiskLevel === "MODERATE" ? "#38bdf8" : "#22c55e"} />
          <MetricRow label="عُقد الرسم الحدثي" value={metrics.eventGraphNodeCount || 0} />
          <MetricRow label="روابط السبب/الأثر" value={metrics.causalLinks?.length || 0} />
          <MetricRow label="إشارات غير مؤكدة" value={metrics.unconfirmedSignalsCount || 0} color={metrics.unconfirmedSignalsCount ? "#f59e0b" : "#22c55e"} />
          <MetricRow
            label="دقة التوقعات"
            value={metrics.feedbackAccuracy != null ? `${Math.round(metrics.feedbackAccuracy)}%` : "—"}
            color={metrics.feedbackAccuracy >= 60 ? "#22c55e" : metrics.feedbackAccuracy != null ? "#f59e0b" : "#64748b"}
          />
          <MetricRow
            label="النضج"
            value={metrics.maturityLabel || "—"}
            color={metrics.maturityColor || "#94a3b8"}
          />
          <MetricRow
            label="آخر تغذية"
            value={metrics.lastFeedAt ? new Date(metrics.lastFeedAt).toLocaleTimeString("ar-AE") : "—"}
          />
        </div>

        {metrics.strategicSummary && (
          <div
            style={{
              background: CARD_BG,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: "12px 14px",
              marginBottom: 16,
              direction: "rtl",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginBottom: 8 }}>
              🧭 الخلاصة الاستراتيجية
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.8, marginBottom: 8 }}>
              {metrics.strategicSummary.narrative}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              72 ساعة: {metrics.strategicSummary.likelyNext72Hours}
            </div>
          </div>
        )}

        {/* Strongest signals */}
        {metrics.strongestSignals?.length > 0 && (
          <div
            style={{
              background: CARD_BG,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: "12px 14px",
              marginBottom: 16,
              direction: "rtl",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#f59e0b",
                marginBottom: 8,
              }}
            >
              ⚡ أقوى الإشارات النشطة
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {metrics.strongestSignals.slice(0, 6).map((s, i) => (
                <SignalPill key={i} text={`${s.signal}${s.weightedCount ? ` · ${s.weightedCount}` : ""}`} strength={s.strength} />
              ))}
            </div>
          </div>
        )}

        {/* Regional pressure */}
        {metrics.regionalPressure?.length > 0 && (
          <div
            style={{
              background: CARD_BG,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: "12px 14px",
              marginBottom: 16,
              direction: "rtl",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#ef4444",
                marginBottom: 8,
              }}
            >
              🌍 الضغط الإقليمي
            </div>
            {metrics.regionalPressure.slice(0, 4).map((rp, i) => {
              const c =
                rp.pressure === "high" ? "#ef4444" : rp.pressure === "medium" ? "#f59e0b" : "#22c55e";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 0",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#cbd5e1" }}>{rp.region}</span>
                  <span style={{ color: c, fontWeight: 700, fontSize: 11 }}>{rp.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => onAction?.(a.id)}
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.2)",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 11,
                fontWeight: 600,
                color: ACCENT,
                cursor: "pointer",
                direction: "rtl",
              }}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
