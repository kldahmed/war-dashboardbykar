import React, { useEffect, useState } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { useI18n } from "../i18n/I18nProvider";

const P = {
  bg: "#070b11",
  surface: "#0c1220",
  surfaceAlt: "#0e1630",
  border: "rgba(56,189,248,0.08)",
  gold: "#f3d38a",
  blue: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a78bfa",
  muted: "#475569",
  text: "#e2e8f0",
  textDim: "#64748b"
};

const CATEGORY_META = {
  conflict: { icon: "⚔️", color: "#ef4444" },
  military: { icon: "🎖️", color: "#ef4444" },
  diplomacy: { icon: "🤝", color: "#22c55e" },
  economic: { icon: "💰", color: "#f59e0b" },
  energy: { icon: "⚡", color: "#fbbf24" },
  political: { icon: "🏛️", color: "#a78bfa" },
  sports: { icon: "⚽", color: "#38bdf8" },
  breaking: { icon: "🔴", color: "#ef4444" },
  emerging: { icon: "📡", color: "#60a5fa" },
  regional: { icon: "🗺️", color: "#f3d38a" }
};

function ImpactBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{
      width: "100%", height: 4, borderRadius: 2,
      background: "rgba(255,255,255,0.06)"
    }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 2,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        transition: "width 0.6s ease"
      }} />
    </div>
  );
}

function EventCard({ event, rank, isAr }) {
  const meta = CATEGORY_META[event.category] || CATEGORY_META.emerging;
  const sevLabel = event.severity >= 70
    ? (isAr ? "حرج" : "Critical")
    : event.severity >= 50
    ? (isAr ? "مرتفع" : "High")
    : event.severity >= 30
    ? (isAr ? "متوسط" : "Medium")
    : (isAr ? "منخفض" : "Low");
  const sevColor = event.severity >= 70 ? P.red : event.severity >= 50 ? P.amber : event.severity >= 30 ? P.blue : P.green;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${P.surface}, ${P.surfaceAlt})`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.3s"
    }}>
      {/* Rank badge */}
      <div style={{
        position: "absolute",
        top: 0, [isAr ? "left" : "right"]: 0,
        background: rank <= 3 ? P.gold : P.muted,
        color: rank <= 3 ? "#000" : "#fff",
        padding: "2px 10px 4px",
        borderRadius: isAr ? "0 0 10px 0" : "0 0 0 10px",
        fontSize: 11, fontWeight: 900
      }}>
        #{rank}
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingTop: 4 }}>
        <span style={{
          fontSize: 22, flexShrink: 0,
          filter: "drop-shadow(0 0 4px rgba(0,0,0,0.3))"
        }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: P.text,
            lineHeight: 1.4, marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
          }}>
            {event.title}
          </div>
          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {event.region && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: P.gold,
                background: "rgba(243,211,138,0.1)",
                padding: "2px 8px", borderRadius: 6
              }}>📍 {event.region}</span>
            )}
            {event.country && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: P.blue,
                background: "rgba(56,189,248,0.08)",
                padding: "2px 8px", borderRadius: 6
              }}>{event.country}</span>
            )}
            {(event.entities || []).slice(0, 2).map((e, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, color: P.purple,
                background: "rgba(167,139,250,0.08)",
                padding: "2px 8px", borderRadius: 6
              }}>{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Impact bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
            {isAr ? "التأثير" : "IMPACT"}
          </span>
          <span style={{ fontSize: 10, color: sevColor, fontWeight: 800 }}>
            {sevLabel} · {event.impactScore || event.severity || 0}
          </span>
        </div>
        <ImpactBar value={event.impactScore || event.severity || 0} color={sevColor} />
      </div>

      {/* Signals */}
      {(event.relatedSignals || []).length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(event.relatedSignals || []).slice(0, 3).map((sig, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 700, color: P.textDim,
              background: "rgba(255,255,255,0.04)",
              padding: "2px 7px", borderRadius: 5,
              letterSpacing: 0.5
            }}>{sig}</span>
          ))}
        </div>
      )}

      {/* Confidence */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: P.muted }}>
          {isAr ? "الثقة" : "Confidence"}: {event.confidence || 0}%
        </span>
        {event.isEarlyWarning && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: P.amber,
            background: "rgba(245,158,11,0.1)",
            padding: "2px 8px", borderRadius: 5,
            textTransform: "uppercase", letterSpacing: 1
          }}>
            {isAr ? "إنذار مبكر" : "EARLY WARNING"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WorldEventRanking() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  if (!ws) return null;

  const events = ws.topEvents || [];
  if (!events.length) return null;

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      {/* Section header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, padding: "0 4px"
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 3,
            color: P.gold, textTransform: "uppercase", marginBottom: 2
          }}>
            {isAr ? "أهم الأحداث" : "TOP EVENTS"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "الأحداث العالمية حسب التأثير" : "Global Events by Impact"}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: P.textDim, fontWeight: 600,
          background: "rgba(255,255,255,0.03)",
          padding: "4px 12px", borderRadius: 8
        }}>
          {events.length} {isAr ? "حدث" : "events"}
        </div>
      </div>

      {/* Event grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12
      }}>
        {events.map((event, i) => (
          <EventCard
            key={event.id || i}
            event={event}
            rank={i + 1}
            isAr={isAr}
          />
        ))}
      </div>
    </section>
  );
}
