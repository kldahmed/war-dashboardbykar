import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useI18n } from "../i18n/I18nProvider";
import {
  startRadarEngine,
  stopRadarEngine,
  getRadarSignals,
  getTopRadarSignals,
  getCriticalSignals,
  getEmergingSignals,
  getRegionSummary,
  getRadarStats,
  subscribeRadar,
  getRadarSignalsByCategory,
} from "../lib/radar/globalRadarEngine";
import { severityColor, pressureColor, alertBadgeConfig } from "../lib/radar/radarClassifier";
import RadarSignalCard from "./RadarSignalCard";
import RadarRegionStrip from "./RadarRegionStrip";
import RadarCriticalAlerts from "./RadarCriticalAlerts";

const RADAR_CATEGORIES = [
  { id: "all", ar: "الكل", en: "All", icon: "📡" },
  { id: "صراع / تصعيد", ar: "صراع / تصعيد", en: "Conflict", icon: "⚔️" },
  { id: "دبلوماسية", ar: "دبلوماسية", en: "Diplomacy", icon: "🤝" },
  { id: "اقتصاد / أسواق", ar: "اقتصاد / أسواق", en: "Economy", icon: "📊" },
  { id: "طاقة / نفط / شحن", ar: "طاقة / نفط / شحن", en: "Energy", icon: "⛽" },
  { id: "رياضة", ar: "رياضة", en: "Sports", icon: "⚽" },
  { id: "انتقالات", ar: "انتقالات", en: "Transfers", icon: "🔁" },
  { id: "أحداث عالمية", ar: "أحداث عالمية", en: "World Events", icon: "🌐" },
  { id: "إشارات ناشئة", ar: "إشارات ناشئة", en: "Emerging", icon: "🔎" },
];

export default function GlobalIntelligenceRadar() {
  const { t, language } = useI18n();
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState({});
  const [regions, setRegions] = useState([]);
  const [selectedCat, setSelectedCat] = useState("all");
  const [scanAngle, setScanAngle] = useState(0);
  const scanRef = useRef(null);

  // Start the radar engine
  useEffect(() => {
    startRadarEngine();

    const unsubscribe = subscribeRadar(() => {
      setSignals(getRadarSignals());
      setStats(getRadarStats());
      setRegions(getRegionSummary());
    });

    // Also fetch from API as backup / initial load
    fetch("/api/global-radar")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.signals?.length && signals.length === 0) {
          setSignals(data.signals);
          if (data.stats) setStats(data.stats);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
      stopRadarEngine();
    };
  }, []);

  // Radar scan animation
  useEffect(() => {
    scanRef.current = setInterval(() => {
      setScanAngle(prev => (prev + 1.2) % 360);
    }, 50);
    return () => clearInterval(scanRef.current);
  }, []);

  // Filtered signals
  const displayedSignals = useMemo(() => {
    if (selectedCat === "all") return signals;
    return signals.filter(s => s.category === selectedCat);
  }, [signals, selectedCat]);

  const topSignals = useMemo(() => displayedSignals.slice(0, 20), [displayedSignals]);
  const criticalSignals = useMemo(() => getCriticalSignals(), [signals]);
  const emergingSignals = useMemo(() => getEmergingSignals().slice(0, 10), [signals]);

  const activityColor = (() => {
    switch (stats.globalActivityLevel) {
      case "حرج": return "#ef4444";
      case "مرتفع": return "#f59e0b";
      case "متوسط": return "#38bdf8";
      default: return "#22c55e";
    }
  })();

  const formatTime = useCallback((iso) => {
    try {
      return new Intl.DateTimeFormat(language === "ar" ? "ar-AE" : "en-AE", {
        timeStyle: "medium",
        timeZone: "Asia/Dubai",
      }).format(new Date(iso));
    } catch { return "—"; }
  }, [language]);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 12px" }}>
      {/* ═══ Radar Scan CSS ═══ */}
      <style>{`
        @keyframes radarPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(56,189,248,0.15); }
          50% { box-shadow: 0 0 40px rgba(56,189,248,0.3); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .radar-card-enter {
          animation: fadeInUp 0.3s ease both;
        }
        .radar-cat-btn {
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 10px;
          padding: 7px 14px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .radar-cat-btn:hover {
          border-color: rgba(56,189,248,0.5);
        }
        .radar-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .radar-scroll::-webkit-scrollbar-thumb {
          background: #27303a;
          border-radius: 4px;
        }
        @media (max-width: 768px) {
          .radar-hero-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .radar-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
          A. RADAR HERO BLOCK
          ═══════════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg, #0a0e14, #0f1520, #0a0e14)",
        border: "1px solid rgba(56,189,248,0.12)",
        borderRadius: "18px",
        padding: "24px",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
        animation: "radarGlow 4s infinite",
      }}>
        {/* Radar sweep overlay */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, opacity: 0.06,
          borderRadius: "50%",
          border: "1px solid rgba(56,189,248,0.3)",
          background: `conic-gradient(from ${scanAngle}deg, transparent 0deg, rgba(56,189,248,0.15) 30deg, transparent 60deg)`,
        }} />
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 140, height: 140, opacity: 0.04,
          borderRadius: "50%",
          border: "1px solid rgba(56,189,248,0.2)",
        }} />

        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20, flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "26px" }}>📡</span>
            <div>
              <h2 style={{
                margin: 0, fontSize: "1.3rem", fontWeight: 900,
                color: "#e8edf2",
                fontFamily: "Inter, Poppins, system-ui, sans-serif",
              }}>
                {language === "ar" ? "الرادار الاستخباراتي العالمي" : "Global Intelligence Radar"}
              </h2>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                {language === "ar" ? "نظام رصد وإنذار مبكر في الوقت الحقيقي" : "Real-time monitoring & early warning system"}
              </div>
            </div>
          </div>

          {/* LIVE indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 14px", borderRadius: "10px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#ef4444",
              animation: "radarPulse 1.2s infinite",
              boxShadow: "0 0 6px rgba(239,68,68,0.5)",
            }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#ef4444", letterSpacing: "1px" }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Hero stat cards */}
        <div className="radar-hero-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}>
          {/* Global activity */}
          <HeroStat
            label={language === "ar" ? "مستوى النشاط العالمي" : "Global Activity Level"}
            value={stats.globalActivityLevel || "—"}
            color={activityColor}
            icon="🌍"
          />
          {/* Most dangerous region */}
          <HeroStat
            label={language === "ar" ? "أخطر منطقة حاليًا" : "Hottest Region"}
            value={stats.topRegion || "—"}
            color="#ef4444"
            icon="🔥"
            sub={stats.topRegionPressure}
          />
          {/* Top signal */}
          <HeroStat
            label={language === "ar" ? "أعلى إشارة" : "Top Signal"}
            value={stats.topSignal ? String(stats.topSignal).slice(0, 50) : "—"}
            color="#f3d38a"
            icon="📶"
            sub={stats.topSignalScore ? `${stats.topSignalScore}/100` : ""}
            small
          />
          {/* Last update */}
          <HeroStat
            label={language === "ar" ? "آخر تحديث" : "Last Update"}
            value={stats.lastUpdate ? formatTime(stats.lastUpdate) : "—"}
            color="#38bdf8"
            icon="🕐"
            sub={`${stats.totalActive || 0} ${language === "ar" ? "إشارة نشطة" : "active signals"}`}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          C. REGIONAL RADAR STRIP
          ═══════════════════════════════════════════════════════ */}
      <RadarRegionStrip regions={regions} />

      {/* ═══════════════════════════════════════════════════════
          CATEGORY FILTER
          ═══════════════════════════════════════════════════════ */}
      <div className="radar-scroll" style={{
        display: "flex", gap: "8px", marginBottom: 20,
        overflowX: "auto", paddingBottom: 4,
      }}>
        {RADAR_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="radar-cat-btn"
            onClick={() => setSelectedCat(cat.id)}
            style={{
              background: selectedCat === cat.id
                ? "linear-gradient(135deg, #38bdf8, #2563eb)"
                : "#11151a",
              color: selectedCat === cat.id ? "#fff" : "#38bdf8",
              borderColor: selectedCat === cat.id ? "#38bdf8" : "rgba(56,189,248,0.2)",
            }}
          >
            {cat.icon} {language === "ar" ? cat.ar : cat.en}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT 2-COLUMN LAYOUT
          ═══════════════════════════════════════════════════════ */}
      <div className="radar-main-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "20px",
        alignItems: "start",
      }}>
        {/* ─── LEFT: Top Radar Feed ─── */}
        <div>
          <SectionHeader
            icon="📶"
            title={language === "ar" ? "أقوى الإشارات الحية" : "Strongest Live Signals"}
            count={displayedSignals.length}
            language={language}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topSignals.length === 0 && (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                color: "#4b5563", fontSize: "0.85rem",
              }}>
                {language === "ar" ? "جاري مسح الإشارات..." : "Scanning for signals..."}
              </div>
            )}
            {topSignals.map((sig, i) => (
              <div key={sig.id} className="radar-card-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                <RadarSignalCard signal={sig} />
              </div>
            ))}
          </div>
        </div>

        {/* ─── RIGHT: Alerts + Emerging ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Radar Visual Mini */}
          <RadarMiniVisual signals={signals} scanAngle={scanAngle} />

          {/* D. Critical Alerts */}
          <div style={{
            background: "linear-gradient(135deg, #0f1319, #131820)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "14px",
            padding: "16px",
          }}>
            <SectionHeader
              icon="🚨"
              title={language === "ar" ? "تنبيهات حرجة" : "Critical Alerts"}
              count={criticalSignals.length}
              language={language}
              color="#ef4444"
            />
            <RadarCriticalAlerts signals={signals} />
          </div>

          {/* E. Emerging Radar */}
          <div style={{
            background: "linear-gradient(135deg, #0f1319, #131820)",
            border: "1px solid rgba(129,140,248,0.15)",
            borderRadius: "14px",
            padding: "16px",
          }}>
            <SectionHeader
              icon="🔎"
              title={language === "ar" ? "إشارات ناشئة تستحق المراقبة" : "Emerging Signals Worth Watching"}
              count={emergingSignals.length}
              language={language}
              color="#818cf8"
            />
            {emergingSignals.length === 0 ? (
              <div style={{ color: "#4b5563", fontSize: "0.8rem", textAlign: "center", padding: "16px" }}>
                {language === "ar" ? "لا توجد إشارات ناشئة حاليًا" : "No emerging signals at this time"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {emergingSignals.map(sig => (
                  <RadarSignalCard key={sig.id} signal={sig} compact />
                ))}
              </div>
            )}
          </div>

          {/* Stats footer */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: "12px", padding: "12px 14px",
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.72rem" }}>
              <StatRow
                label={language === "ar" ? "إشارات نشطة" : "Active Signals"}
                value={stats.totalActive || 0}
              />
              <StatRow
                label={language === "ar" ? "حرجة" : "Critical"}
                value={stats.critical || 0}
                color="#ef4444"
              />
              <StatRow
                label={language === "ar" ? "مرتفعة" : "High"}
                value={stats.high || 0}
                color="#f59e0b"
              />
              <StatRow
                label={language === "ar" ? "وقت المسح" : "Scan Time"}
                value={`${stats.lastPollDuration || 0}ms`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function HeroStat({ label, value, color, icon, sub, small }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}22`,
      borderRadius: "12px",
      padding: "14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: 6 }}>
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{
        fontSize: small ? "0.82rem" : "1.05rem",
        fontWeight: 800,
        color,
        lineHeight: 1.3,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.65rem", color: "#4b5563", marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, count, language, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: color || "#e8edf2" }}>{title}</span>
      </div>
      {count !== undefined && (
        <span style={{
          fontSize: "0.68rem", fontWeight: 700,
          padding: "2px 10px", borderRadius: "8px",
          background: "rgba(56,189,248,0.1)", color: "#38bdf8",
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || "#e8edf2" }}>{value}</span>
    </div>
  );
}

/**
 * Mini radar visualization — animated concentric circles
 * with signal dots placed by severity.
 */
function RadarMiniVisual({ signals, scanAngle }) {
  const size = 200;
  const center = size / 2;
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Place top 12 signals as dots
  const dots = (signals || []).slice(0, 12).map((sig, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const dist = (1 - sig.radarScore / 100) * (center - 15) + 15;
    const x = center + Math.cos(angle) * dist;
    const y = center + Math.sin(angle) * dist;
    const col = severityColor(sig.severity);
    const r = sig.radarScore >= 70 ? 5 : sig.radarScore >= 40 ? 4 : 3;
    return { x, y, col, r, score: sig.radarScore, id: sig.id };
  });

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0e14, #0f1520)",
      border: "1px solid rgba(56,189,248,0.1)",
      borderRadius: "14px",
      padding: "16px",
      display: "flex", justifyContent: "center",
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Rings */}
        {rings.map((r, i) => (
          <circle
            key={i}
            cx={center} cy={center}
            r={r * (center - 5)}
            fill="none"
            stroke="rgba(56,189,248,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Cross lines */}
        <line x1={center} y1={5} x2={center} y2={size - 5} stroke="rgba(56,189,248,0.05)" />
        <line x1={5} y1={center} x2={size - 5} y2={center} stroke="rgba(56,189,248,0.05)" />

        {/* Sweep */}
        <line
          x1={center}
          y1={center}
          x2={center + Math.cos(scanAngle * Math.PI / 180) * (center - 5)}
          y2={center + Math.sin(scanAngle * Math.PI / 180) * (center - 5)}
          stroke="rgba(56,189,248,0.3)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Sweep fade trail */}
        <path
          d={`M ${center} ${center} L ${center + Math.cos((scanAngle - 30) * Math.PI / 180) * (center - 5)} ${center + Math.sin((scanAngle - 30) * Math.PI / 180) * (center - 5)} A ${center - 5} ${center - 5} 0 0 1 ${center + Math.cos(scanAngle * Math.PI / 180) * (center - 5)} ${center + Math.sin(scanAngle * Math.PI / 180) * (center - 5)} Z`}
          fill="rgba(56,189,248,0.04)"
        />

        {/* Signal dots */}
        {dots.map(d => (
          <g key={d.id}>
            <circle cx={d.x} cy={d.y} r={d.r + 3} fill={`${d.col}22`} />
            <circle cx={d.x} cy={d.y} r={d.r} fill={d.col} opacity={0.9} />
          </g>
        ))}

        {/* Center dot */}
        <circle cx={center} cy={center} r={3} fill="#38bdf8" />
      </svg>
    </div>
  );
}
