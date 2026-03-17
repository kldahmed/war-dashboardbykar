/**
 * GlobalLiveEventsPanel.jsx
 *
 * "الأحداث العالمية الآن" — Global Live Events Now
 *
 * A real-time global events intelligence surface. The user should feel
 * the world is moving live inside the platform.
 *
 * Features:
 * - Live event cards ranked by urgency × impact × signal density
 * - Region filter chips
 * - SVG world map with event dots
 * - Live stats bar
 * - Auto-refresh every 20s
 * - Severity-coded badges and pulsing indicators
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  startEngine,
  stopEngine,
  getGlobalEvents,
  getEngineStats,
  subscribeEvents,
  EVENT_CATEGORIES,
} from "../lib/globalEventsEngine";

// ── Palette ────────────────────────────────────────────────────────────────────
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
  dim: "#1e293b",
};

const SEVERITY_LEVELS = [
  { min: 70, label: "حرج", color: "#ef4444", glow: "0 0 12px rgba(239,68,68,0.35)" },
  { min: 50, label: "مرتفع", color: "#f59e0b", glow: "0 0 10px rgba(245,158,11,0.25)" },
  { min: 30, label: "متوسط", color: "#38bdf8", glow: "0 0 8px rgba(56,189,248,0.2)" },
  { min: 0,  label: "منخفض", color: "#64748b", glow: "none" },
];

function getSeverityLevel(score) {
  return SEVERITY_LEVELS.find(l => score >= l.min) || SEVERITY_LEVELS[3];
}

const REGION_FILTERS = [
  { id: "all",     label: "الكل",              icon: "🌍" },
  { id: "الشرق الأوسط", label: "الشرق الأوسط", icon: "🕌" },
  { id: "أوروبا",  label: "أوروبا",            icon: "🏰" },
  { id: "آسيا والمحيط الهادئ", label: "آسيا", icon: "🏯" },
  { id: "أمريكا الشمالية", label: "أمريكا",    icon: "🗽" },
  { id: "شمال أفريقيا", label: "أفريقيا",      icon: "🌍" },
  { id: "الممرات البحرية", label: "بحري",       icon: "🚢" },
  { id: "الأسواق", label: "الأسواق",           icon: "📈" },
];

const CAT_FILTERS = [
  { id: "all",      label: "الكل",     icon: "🌐" },
  { id: "conflict", label: "نزاعات",   icon: "⚔️" },
  { id: "military", label: "عسكري",    icon: "🎖️" },
  { id: "diplomacy",label: "دبلوماسية",icon: "🤝" },
  { id: "economic", label: "اقتصادي",  icon: "📊" },
  { id: "energy",   label: "طاقة",     icon: "⛽" },
  { id: "political",label: "سياسي",    icon: "🏛️" },
  { id: "sports",   label: "رياضة",    icon: "⚽" },
  { id: "breaking", label: "عاجل",     icon: "🔴" },
  { id: "emerging", label: "ناشئة",    icon: "🔎" },
];

// ── Pulse Animation CSS ────────────────────────────────────────────────────────
const pulseKeyframes = `
@keyframes glePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.3); }
}
@keyframes gleGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(239,68,68,0.3); }
  50%      { box-shadow: 0 0 16px rgba(239,68,68,0.6); }
}
@keyframes gleSweep {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
`;

// ── Live Dot ───────────────────────────────────────────────────────────────────
function LiveDot({ color = P.green, size = 8 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: color,
      boxShadow: `0 0 6px ${color}80`,
      animation: "glePulse 2s infinite",
    }} />
  );
}

// ── Severity Badge ─────────────────────────────────────────────────────────────
function SeverityBadge({ score }) {
  const lvl = getSeverityLevel(score);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: `${lvl.color}15`, color: lvl.color,
      border: `1px solid ${lvl.color}33`,
      fontSize: 10, fontWeight: 800, padding: "2px 8px",
      borderRadius: 999, letterSpacing: ".03em",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: lvl.color, boxShadow: lvl.glow,
      }} />
      {lvl.label} {score}
    </span>
  );
}

// ── Confidence Bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value >= 70 ? P.green : value >= 45 ? P.amber : P.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: P.muted, fontSize: 10 }}>ثقة</span>
      <div style={{
        width: 60, height: 4, borderRadius: 2,
        background: P.dim, overflow: "hidden",
      }}>
        <div style={{
          width: `${value}%`, height: "100%", borderRadius: 2,
          background: color,
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{value}%</span>
    </div>
  );
}

// ── Event Impact Ring ──────────────────────────────────────────────────────────
function ImpactRing({ score, color, size = 52 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={P.dim} strokeWidth="3.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
        fill={color} fontSize="11" fontWeight="900">{score}</text>
    </svg>
  );
}

// ── Mini Map ───────────────────────────────────────────────────────────────────
function EventMiniMap({ events }) {
  const withCoords = events.filter(e => e.coordinates);
  if (!withCoords.length) return null;

  const W = 800, H = 400;
  const toX = lon => ((lon + 180) / 360) * W;
  const toY = lat => ((90 - lat) / 180) * H;

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 16, padding: "14px 18px", overflow: "hidden",
    }}>
      <div style={{
        color: P.gold, fontWeight: 800, fontSize: 13,
        marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
      }}>
        <LiveDot color={P.red} size={6} />
        🗺️ خريطة الأحداث الحية
      </div>
      <div style={{
        position: "relative", width: "100%", paddingBottom: "50%",
        overflow: "hidden", borderRadius: 10,
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
          style={{
            position: "absolute", top: 0, left: 0,
            background: "linear-gradient(180deg,#080e1a,#060a14)",
          }}>
          {/* Grid */}
          {[-60, -30, 0, 30, 60].map(lat => (
            <line key={`lat${lat}`} x1={0} x2={W} y1={toY(lat)} y2={toY(lat)}
              stroke="rgba(255,255,255,.04)" strokeWidth="0.5" />
          ))}
          {[-120, -60, 0, 60, 120].map(lon => (
            <line key={`lon${lon}`} x1={toX(lon)} x2={toX(lon)} y1={0} y2={H}
              stroke="rgba(255,255,255,.04)" strokeWidth="0.5" />
          ))}
          {/* Events */}
          {withCoords.map(ev => {
            const [lon, lat] = ev.coordinates;
            const x = toX(lon), y = toY(lat);
            const color = ev.categoryMeta?.color || P.muted;
            const r = 4 + Math.round((ev.severity / 100) * 8);
            return (
              <g key={ev.id}>
                <circle cx={x} cy={y} r={r * 2.5} fill={color} opacity="0.06">
                  <animate attributeName="r" values={`${r * 2};${r * 3};${r * 2}`}
                    dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy={y} r={r * 1.3} fill={color} opacity="0.18" />
                <circle cx={x} cy={y} r={Math.max(3, r * 0.6)} fill={color} opacity="0.9" />
                {ev.severity >= 70 && (
                  <circle cx={x} cy={y} r={r * 2} fill="none" stroke={color}
                    strokeWidth="0.6" opacity="0.4">
                    <animate attributeName="r" values={`${r};${r * 3}`}
                      dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0"
                      dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        {Object.entries(EVENT_CATEGORIES)
          .filter(([k]) => withCoords.some(e => e.category === k))
          .map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: v.color,
              }} />
              <span style={{ color: P.muted, fontSize: 10 }}>{v.icon} {v.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  return (
    <div style={{
      display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
      padding: "10px 16px", background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.04)", borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <LiveDot />
        <span style={{ color: P.green, fontSize: 11, fontWeight: 700 }}>رصد مباشر</span>
      </div>
      <StatPill label="حدث نشط" value={stats.total} color={P.blue} />
      <StatPill label="حرج" value={stats.urgent} color={P.red} />
      <StatPill label="مرتفع" value={stats.high} color={P.amber} />
      <StatPill label="ناشئة" value={stats.emerging} color={P.muted} />
      <StatPill label="متوسط الخطورة" value={stats.avgSeverity} color={P.purple} />
      <StatPill label="متوسط الثقة" value={`${stats.avgConfidence}%`} color={P.green} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
      <span style={{ color, fontWeight: 800, fontSize: 14 }}>{value}</span>
      <span style={{ color: P.muted, fontSize: 11 }}>{label}</span>
    </div>
  );
}

// ── Region Breakdown ───────────────────────────────────────────────────────────
function RegionBreakdown({ stats }) {
  const regions = Object.entries(stats.regionBreakdown || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!regions.length) return null;

  const max = Math.max(...regions.map(([, v]) => v), 1);

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ color: P.gold, fontWeight: 800, fontSize: 12, marginBottom: 10 }}>
        📍 التوزيع الإقليمي
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {regions.map(([region, count]) => (
          <div key={region} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: P.text, fontSize: 11, minWidth: 90, textAlign: "right" }}>{region}</span>
            <div style={{
              flex: 1, height: 6, borderRadius: 3,
              background: P.dim, overflow: "hidden",
            }}>
              <div style={{
                width: `${(count / max) * 100}%`, height: "100%",
                borderRadius: 3,
                background: `linear-gradient(90deg, ${P.blue}, ${P.purple})`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <span style={{ color: P.blue, fontSize: 11, fontWeight: 700, minWidth: 20 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────
function EventCard({ event, expanded, onToggle }) {
  const catMeta = event.categoryMeta || EVENT_CATEGORIES[event.category] || {};
  const color = catMeta.color || P.muted;
  const sevLevel = getSeverityLevel(event.severity);

  const timeDiff = Date.now() - new Date(event.timestamp).getTime();
  const minsAgo = Math.floor(timeDiff / 60000);
  const timeLabel = minsAgo < 1 ? "الآن" : minsAgo < 60 ? `منذ ${minsAgo} د` :
    minsAgo < 1440 ? `منذ ${Math.floor(minsAgo / 60)} س` : `منذ ${Math.floor(minsAgo / 1440)} ي`;

  return (
    <div style={{
      background: `linear-gradient(160deg, ${P.surface}, ${P.surfaceAlt})`,
      border: `1px solid ${color}25`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: event.severity >= 70
        ? `0 0 0 1px ${color}20, 0 4px 24px rgba(0,0,0,.3)`
        : "0 2px 12px rgba(0,0,0,.15)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}>
      {/* Color bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}40, transparent)`,
      }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <ImpactRing score={event.severity} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{
                background: `${color}15`, color,
                border: `1px solid ${color}30`,
                fontSize: 10, fontWeight: 800, padding: "2px 8px",
                borderRadius: 999,
              }}>
                {catMeta.icon || "🌍"} {catMeta.label || event.category}
              </span>
              <SeverityBadge score={event.severity} />
              {event.isEarlyWarning && (
                <span style={{
                  background: "rgba(100,116,139,.1)", color: "#94a3b8",
                  border: "1px solid rgba(100,116,139,.2)",
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                }}>
                  🔎 إشارة ناشئة
                </span>
              )}
            </div>
            <h3 style={{
              color: P.text, fontSize: 14, fontWeight: 800,
              margin: 0, lineHeight: 1.45,
            }}>
              {event.title}
            </h3>
            <div style={{
              display: "flex", gap: 10, alignItems: "center",
              color: P.muted, fontSize: 11, marginTop: 4, flexWrap: "wrap",
            }}>
              <span>📍 {event.region}</span>
              <span>🏳️ {event.country}</span>
              <span>⏱️ {timeLabel}</span>
              <span>📡 {event.signalCount} إشارة</span>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 8 }}>
          <ConfidenceBar value={event.confidence} />
        </div>

        {/* Entities */}
        {event.entities?.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {event.entities.slice(0, 6).map((e, i) => (
              <span key={i} style={{
                background: e.weight >= 8 ? `${color}12` : "rgba(255,255,255,.03)",
                border: e.weight >= 8 ? `1px solid ${color}25` : "1px solid rgba(255,255,255,.06)",
                color: e.weight >= 8 ? color : "#94a3b8",
                fontSize: 10, padding: "2px 7px", borderRadius: 999,
                fontWeight: e.weight >= 8 ? 700 : 400,
              }}>
                {e.name}
              </span>
            ))}
          </div>
        )}

        {/* Sources */}
        {event.sources?.length > 0 && (
          <div style={{
            display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8,
            padding: "6px 0", borderTop: "1px solid rgba(255,255,255,.04)",
          }}>
            <span style={{ color: P.muted, fontSize: 10, fontWeight: 700 }}>المصادر:</span>
            {event.sources.slice(0, 4).map((s, i) => (
              <span key={i} style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                color: "#94a3b8", fontSize: 10, padding: "1px 6px", borderRadius: 999,
              }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Related Signals (expandable) */}
        {event.relatedSignals?.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", paddingTop: 8 }}>
            <button onClick={onToggle} style={{
              background: "transparent", border: "none", color: P.blue,
              fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "2px 0",
              marginBottom: expanded ? 8 : 0,
            }}>
              {expanded
                ? `▲ إخفاء الإشارات`
                : `▼ عرض الإشارات (${event.relatedSignals.length})`}
            </button>
            {expanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {event.relatedSignals.map((sig, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    padding: "6px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,.02)",
                    border: "1px solid rgba(255,255,255,.04)",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", marginTop: 5,
                      background: sig.sourceType === "breaking" ? P.red :
                        sig.sourceType === "news" ? P.green : P.blue,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: "#94a3b8", fontSize: 11,
                        lineHeight: 1.55, margin: 0,
                      }}>
                        {sig.text}
                      </p>
                      <div style={{
                        display: "flex", gap: 8, marginTop: 3,
                        color: P.muted, fontSize: 10,
                      }}>
                        <span>{sig.source}</span>
                        <span>•</span>
                        <span>{sig.sourceType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GlobalLiveEventsPanel() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [regionFilter, setRegionFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [expanded, setExpanded] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const styleRef = useRef(null);

  // Inject keyframes
  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement("style");
      style.textContent = pulseKeyframes;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  // Start engine & subscribe
  useEffect(() => {
    startEngine();

    const unsub = subscribeEvents((evts) => {
      setEvents(evts);
      setStats(getEngineStats());
      setIsLoading(false);
    });

    // Initial load
    const initial = getGlobalEvents();
    if (initial.length) {
      setEvents(initial);
      setStats(getEngineStats());
      setIsLoading(false);
    }

    // Safety timeout
    const timeout = setTimeout(() => setIsLoading(false), 5000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  // Filtered events
  const displayed = useMemo(() => {
    let list = events;
    if (regionFilter !== "all") {
      list = list.filter(e => e.region === regionFilter);
    }
    if (catFilter !== "all") {
      list = list.filter(e => e.category === catFilter);
    }
    return list;
  }, [events, regionFilter, catFilter]);

  const toggleExpand = useCallback((id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <section style={{
      maxWidth: 1400, margin: "0 auto",
      display: "grid", gap: 18,
    }}>
      {/* Header */}
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
          flexWrap: "wrap",
        }}>
          <LiveDot color={P.red} size={10} />
          <span style={{
            color: "#f8fafc", fontSize: 26, fontWeight: 900,
          }}>
            الأحداث العالمية الآن
          </span>
          <span style={{
            background: "rgba(239,68,68,.1)", color: P.red,
            border: "1px solid rgba(239,68,68,.2)",
            fontSize: 10, fontWeight: 800, padding: "3px 10px",
            borderRadius: 999, letterSpacing: ".06em",
            animation: "gleGlow 2s infinite",
          }}>
            LIVE GLOBAL EVENTS
          </span>
          {isLoading && (
            <span style={{ color: P.muted, fontSize: 12 }}>يحدّث…</span>
          )}
        </div>
        <p style={{
          color: P.muted, fontSize: 12, margin: 0, lineHeight: 1.7,
        }}>
          محرك رصد الأحداث العالمية — يكتشف ويصنف ويرتب الأحداث تلقائياً من مصادر
          الأخبار، الإشارات الاجتماعية، الأسواق المالية، والرياضة في الوقت الحقيقي
        </p>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Mini Map */}
      <EventMiniMap events={displayed} />

      {/* Region Breakdown + Categories */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 14,
      }}>
        <RegionBreakdown stats={stats} />
        {/* Category breakdown */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ color: P.gold, fontWeight: 800, fontSize: 12, marginBottom: 10 }}>
            📊 التوزيع حسب النوع
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(stats.categoryBreakdown || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([cat, count]) => {
                const catMeta = EVENT_CATEGORIES[cat] || {};
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{catMeta.icon || "🌍"}</span>
                    <span style={{ color: P.text, fontSize: 11, minWidth: 70 }}>
                      {catMeta.label || cat}
                    </span>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: P.dim, overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${Math.min(100, count * 10)}%`, height: "100%",
                        borderRadius: 3, background: catMeta.color || P.muted,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <span style={{
                      color: catMeta.color || P.muted,
                      fontSize: 11, fontWeight: 700, minWidth: 20,
                    }}>{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Region Filter */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap",
        padding: "8px 12px", background: "rgba(255,255,255,.02)",
        border: "1px solid rgba(255,255,255,.04)", borderRadius: 10,
      }}>
        {REGION_FILTERS.map(f => (
          <button key={f.id} onClick={() => setRegionFilter(f.id)} style={{
            background: regionFilter === f.id ? `${P.blue}20` : "transparent",
            color: regionFilter === f.id ? P.blue : P.muted,
            border: `1px solid ${regionFilter === f.id ? `${P.blue}40` : "rgba(255,255,255,.06)"}`,
            borderRadius: 999, padding: "5px 12px",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            transition: "all 0.2s",
          }}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{
        display: "flex", gap: 5, flexWrap: "wrap",
        padding: "6px 12px", background: "rgba(255,255,255,.015)",
        border: "1px solid rgba(255,255,255,.03)", borderRadius: 10,
      }}>
        {CAT_FILTERS.map(f => {
          const catMeta = EVENT_CATEGORIES[f.id] || {};
          return (
            <button key={f.id} onClick={() => setCatFilter(f.id)} style={{
              background: catFilter === f.id ? `${(catMeta.color || P.blue)}18` : "transparent",
              color: catFilter === f.id ? (catMeta.color || P.blue) : P.muted,
              border: `1px solid ${catFilter === f.id ? `${(catMeta.color || P.blue)}35` : "rgba(255,255,255,.05)"}`,
              borderRadius: 999, padding: "4px 10px",
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {f.icon} {f.label}
            </button>
          );
        })}
      </div>

      {/* Event Cards */}
      {isLoading && !events.length ? (
        <div style={{ textAlign: "center", padding: 40, color: P.muted }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: `3px solid ${P.dim}`, borderTopColor: P.blue,
            animation: "glePulse 1s linear infinite",
            margin: "0 auto 12px",
          }} />
          جاري رصد الأحداث العالمية...
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 40, color: P.muted,
          background: P.surface, borderRadius: 12,
        }}>
          لا توجد أحداث تطابق الفلتر الحالي
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 16,
        }}>
          {displayed.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              expanded={expanded.has(ev.id)}
              onToggle={() => toggleExpand(ev.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "12px 0",
        color: P.muted, fontSize: 10,
        borderTop: "1px solid rgba(255,255,255,.04)",
      }}>
        محرك الأحداث العالمية — يُحدّث تلقائياً كل 20 ثانية ·
        {events.length > 0 && ` ${events.length} حدث نشط`}
      </div>
    </section>
  );
}
