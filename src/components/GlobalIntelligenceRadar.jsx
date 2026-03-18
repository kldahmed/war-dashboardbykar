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
  getActivityLog,
  getSignalClusters,
  getSignalArcs,
  getCategoryDistribution,
} from "../lib/radar/globalRadarEngine";
import { severityColor, pressureColor, alertBadgeConfig } from "../lib/radar/radarClassifier";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import {
  valueToStateLabel,
  formatCount,
  formatPercent,
  computeWorldRiskLevel,
  generateSignalEvolution,
  generateSituationalStatement,
} from "../lib/radar/stateIndicators";
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
  const [activityLog, setActivityLog] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [catDist, setCatDist] = useState({});
  const [selectedCat, setSelectedCat] = useState("all");
  const [scanAngle, setScanAngle] = useState(0);
  const [viewMode, setViewMode] = useState("signals"); // signals | clusters
  const [worldState, setWorldState] = useState(null);
  const scanRef = useRef(null);

  // Start the radar engine
  useEffect(() => {
    startRadarEngine();

    const unsubscribe = subscribeRadar(() => {
      setSignals(getRadarSignals());
      setStats(getRadarStats());
      setRegions(getRegionSummary());
      setActivityLog(getActivityLog());
      setClusters(getSignalClusters());
      setCatDist(getCategoryDistribution());
    });

    // Also fetch from API as backup / initial load
    fetch("/api/global-radar")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.signals?.length) {
          setSignals(prev => prev.length ? prev : data.signals);
          if (data.stats) setStats(prev => prev.totalActive ? prev : data.stats);
          if (data.regions) setRegions(prev => prev.length ? prev : data.regions);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
      stopRadarEngine();
    };
  }, []);

  // Subscribe to world state for risk level and agent interpretation
  useEffect(() => {
    setWorldState(getWorldState());
    const unsub = subscribeWorldState(s => setWorldState(s));
    return unsub;
  }, []);

  // Computed: World Risk Level
  const worldRisk = useMemo(() => computeWorldRiskLevel(worldState), [worldState]);

  // Computed: Signal evolution timeline
  const signalEvolution = useMemo(() => generateSignalEvolution(signals), [signals]);

  // Computed: Situational awareness statements
  const situationalStatements = useMemo(
    () => generateSituationalStatement(worldState, signals, language),
    [worldState, signals, language]
  );

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

  // Total category counts for distribution bar
  const catDistEntries = useMemo(() => {
    const total = Object.values(catDist).reduce((s, v) => s + v, 0) || 1;
    return RADAR_CATEGORIES.filter(c => c.id !== "all").map(cat => ({
      ...cat,
      count: catDist[cat.id] || 0,
      pct: Math.round(((catDist[cat.id] || 0) / total) * 100),
    })).filter(c => c.count > 0);
  }, [catDist]);

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
        @keyframes gridScan {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
        @keyframes activitySlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
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
        .radar-activity-item {
          animation: activitySlideIn 0.4s ease both;
        }
        @media (max-width: 768px) {
          .radar-hero-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .radar-main-grid {
            grid-template-columns: 1fr !important;
          }
          .radar-command-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
          A. RADAR COMMAND CENTER HERO
          ═══════════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg, #060a0f, #0a1018, #0c1220, #0a0e14)",
        border: "1px solid rgba(56,189,248,0.1)",
        borderRadius: "20px",
        padding: "0",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
        animation: "radarGlow 5s infinite",
      }}>
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }} />
        {/* Scanning overlay line */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)",
          top: `${(scanAngle / 360) * 100}%`,
          transition: "top 0.05s linear",
          pointerEvents: "none",
        }} />

        {/* Command center top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(56,189,248,0.06)",
          flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: 42, height: 42, borderRadius: "12px",
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px",
            }}>📡</div>
            <div>
              <h2 style={{
                margin: 0, fontSize: "1.35rem", fontWeight: 900,
                color: "#e8edf2",
                fontFamily: "Inter, Poppins, system-ui, sans-serif",
                letterSpacing: "-0.3px",
              }}>
                {language === "ar" ? "الرادار الاستخباراتي العالمي" : "Global Intelligence Radar"}
              </h2>
              <div style={{ fontSize: "0.72rem", color: "#4b5563", marginTop: 2, letterSpacing: "0.5px" }}>
                {language === "ar" ? "نظام رصد وإنذار مبكر • بيانات حية متعددة المصادر" : "Early warning system • Multi-source live data"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Signals count badge */}
            <div style={{
              padding: "5px 14px", borderRadius: "10px",
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.15)",
              fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8",
            }}>
              {(() => {
                const fc = formatCount(stats.totalActive, "signals", language);
                return fc.isZero ? fc.display : `${fc.display} ${language === "ar" ? "إشارة" : "signals"}`;
              })()}
            </div>
            {/* LIVE indicator */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "6px 14px", borderRadius: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#ef4444",
                animation: "radarPulse 1.2s infinite",
                boxShadow: "0 0 8px rgba(239,68,68,0.5)",
              }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#ef4444", letterSpacing: "1.5px" }}>
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Command center main area: Radar Visual + Stats */}
        <div className="radar-command-grid" style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 0,
        }}>
          {/* Radar visualization */}
          <div style={{
            padding: "20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRight: "1px solid rgba(56,189,248,0.05)",
          }}>
            <RadarVisualization signals={signals} scanAngle={scanAngle} />
          </div>

          {/* Stats + Activity */}
          <div style={{ padding: "20px 24px" }}>

            {/* ── WORLD RISK LEVEL ── */}
            <WorldRiskLevelBanner risk={worldRisk} language={language} />

            {/* Hero stat cards */}
            <div className="radar-hero-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px", marginBottom: 16,
            }}>
              <HeroStat
                label={language === "ar" ? "مستوى النشاط العالمي" : "Global Activity Level"}
                value={stats.globalActivityLevel || (language === "ar" ? "جاري الرصد" : "Scanning")}
                color={activityColor}
                icon="🌍"
              />
              <HeroStat
                label={language === "ar" ? "أخطر منطقة حاليًا" : "Hottest Region"}
                value={stats.topRegion || (language === "ar" ? "جاري التحليل" : "Analyzing")}
                color="#ef4444"
                icon="🔥"
                sub={stats.topRegionPressure || (language === "ar" ? "ضغط منخفض" : "Low Pressure")}
              />
              <HeroStat
                label={language === "ar" ? "أعلى إشارة" : "Top Signal"}
                value={stats.topSignal ? String(stats.topSignal).slice(0, 50) : (language === "ar" ? "رصد أولي" : "Initial Scan")}
                color="#f3d38a"
                icon="📶"
                sub={stats.topSignalScore ? `${stats.topSignalScore}/100` : (language === "ar" ? "إشارات مبكرة" : "Early signals")}
                small
              />
              <HeroStat
                label={language === "ar" ? "آخر تحديث" : "Last Update"}
                value={stats.lastUpdate ? formatTime(stats.lastUpdate) : (language === "ar" ? "جاري التزامن" : "Syncing")}
                color="#38bdf8"
                icon="🕐"
                sub={(() => {
                  const crit = formatCount(stats.critical, "alerts", language);
                  const high = formatCount(stats.high, "alerts", language);
                  return `${crit.isZero ? crit.display : crit.display + " " + (language === "ar" ? "حرجة" : "critical")} · ${high.isZero ? high.display : high.display + " " + (language === "ar" ? "مرتفعة" : "high")}`;
                })()}
              />
            </div>

            {/* Category distribution bar */}
            {catDistEntries.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "0.68rem", color: "#4b5563", marginBottom: 5, fontWeight: 600 }}>
                  {language === "ar" ? "توزيع الإشارات حسب الفئة" : "Signal Distribution by Category"}
                </div>
                <div style={{
                  display: "flex", height: 6, borderRadius: 3, overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                }}>
                  {catDistEntries.map(c => {
                    const catColors = {
                      "صراع / تصعيد": "#ef4444", "دبلوماسية": "#38bdf8",
                      "اقتصاد / أسواق": "#eab308", "طاقة / نفط / شحن": "#f97316",
                      "رياضة": "#22c55e", "انتقالات": "#a78bfa",
                      "أحداث عالمية": "#818cf8", "إشارات ناشئة": "#64748b",
                    };
                    return (
                      <div key={c.id} style={{
                        width: `${c.pct}%`, minWidth: c.pct > 0 ? "2px" : 0,
                        background: catColors[c.id] || "#64748b",
                        transition: "width 0.5s ease",
                      }} title={`${c.icon} ${language === "ar" ? c.ar : c.en}: ${c.count}`} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: 5 }}>
                  {catDistEntries.slice(0, 5).map(c => {
                    const catColors = {
                      "صراع / تصعيد": "#ef4444", "دبلوماسية": "#38bdf8",
                      "اقتصاد / أسواق": "#eab308", "طاقة / نفط / شحن": "#f97316",
                      "رياضة": "#22c55e", "انتقالات": "#a78bfa",
                      "أحداث عالمية": "#818cf8", "إشارات ناشئة": "#64748b",
                    };
                    return (
                      <span key={c.id} style={{ fontSize: "0.62rem", color: catColors[c.id] || "#6b7280" }}>
                        {c.icon} {c.count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real-time activity stream */}
            <div>
              <div style={{ fontSize: "0.7rem", color: "#4b5563", marginBottom: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", animation: "radarPulse 2s infinite" }} />
                {language === "ar" ? "بث النشاط المباشر" : "Live Activity Stream"}
              </div>
              <div style={{
                maxHeight: 100, overflowY: "auto", overflowX: "hidden",
                scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent",
              }}>
                {activityLog.length === 0 ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 8px", animation: "radarPulse 3s infinite",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8" }} />
                    <span style={{ fontSize: "0.72rem", color: "#4b5563" }}>
                      {language === "ar" ? "النظام نشط — جاري مسح المصادر وتحليل الإشارات..." : "System active — scanning sources and analyzing signals..."}
                    </span>
                  </div>
                ) : activityLog.slice(0, 8).map((item, i) => (
                  <div key={item.id + i} className="radar-activity-item" style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)",
                    animationDelay: `${i * 0.06}s`,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: severityColor(item.severity),
                    }} />
                    <span style={{
                      fontSize: "0.7rem", color: "#9ca3af", flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "#374151", flexShrink: 0 }}>
                      {item.radarScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          B. REGIONAL RADAR STRIP
          ═══════════════════════════════════════════════════════ */}
      <RadarRegionStrip regions={regions} />

      {/* ═══════════════════════════════════════════════════════
          B2. SIGNAL EVOLUTION TIMELINE
          ═══════════════════════════════════════════════════════ */}
      <SignalEvolutionTimeline evolution={signalEvolution} language={language} />

      {/* ═══════════════════════════════════════════════════════
          B3. AI SITUATIONAL AWARENESS
          ═══════════════════════════════════════════════════════ */}
      <SituationalAwarenessPanel statements={situationalStatements} language={language} />

      {/* ═══════════════════════════════════════════════════════
          CATEGORY FILTER + VIEW MODE TOGGLE
          ═══════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, flexWrap: "wrap", gap: 8,
      }}>
        <div className="radar-scroll" style={{
          display: "flex", gap: "6px", overflowX: "auto", paddingBottom: 4, flex: 1,
        }}>
          {RADAR_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className="radar-cat-btn"
              onClick={() => setSelectedCat(cat.id)}
              style={{
                background: selectedCat === cat.id
                  ? "linear-gradient(135deg, #38bdf8, #2563eb)"
                  : "#0c1017",
                color: selectedCat === cat.id ? "#fff" : "#38bdf8",
                borderColor: selectedCat === cat.id ? "#38bdf8" : "rgba(56,189,248,0.15)",
              }}
            >
              {cat.icon} {language === "ar" ? cat.ar : cat.en}
            </button>
          ))}
        </div>
        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {[
            { key: "signals", ar: "إشارات", en: "Signals", icon: "📶" },
            { key: "clusters", ar: "تجمعات", en: "Clusters", icon: "🔗" },
          ].map(vm => (
            <button key={vm.key} onClick={() => setViewMode(vm.key)} style={{
              background: viewMode === vm.key ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${viewMode === vm.key ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.05)"}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 700,
              color: viewMode === vm.key ? "#38bdf8" : "#6b7280",
              transition: "all 0.2s",
            }}>
              {vm.icon} {language === "ar" ? vm.ar : vm.en}
            </button>
          ))}
        </div>
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
        {/* ─── LEFT: Top Radar Feed OR Clusters ─── */}
        <div>
          {viewMode === "signals" ? (
            <>
              <SectionHeader
                icon="📶"
                title={language === "ar" ? "أقوى الإشارات الحية" : "Strongest Live Signals"}
                count={displayedSignals.length}
                language={language}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {topSignals.length === 0 && (
                  <div style={{
                    textAlign: "center", padding: "30px 20px",
                    background: "rgba(56,189,248,0.03)",
                    borderRadius: "12px",
                    border: "1px solid rgba(56,189,248,0.08)",
                  }}>
                    <div style={{ fontSize: "24px", marginBottom: 8 }}>📡</div>
                    <div style={{ color: "#38bdf8", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                      {language === "ar" ? "النظام نشط — جاري الرصد" : "System Active — Scanning"}
                    </div>
                    <div style={{ color: "#4b5563", fontSize: "0.75rem" }}>
                      {language === "ar" ? "يجري تحليل المصادر وبناء صورة الوضع العالمي" : "Analyzing sources and building global situation picture"}
                    </div>
                  </div>
                )}
                {topSignals.map((sig, i) => (
                  <div key={sig.id} className="radar-card-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                    <RadarSignalCard signal={sig} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionHeader
                icon="🔗"
                title={language === "ar" ? "تجمعات الإشارات المترابطة" : "Linked Signal Clusters"}
                count={clusters.length}
                language={language}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {clusters.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "30px 20px",
                    background: "rgba(129,140,248,0.03)",
                    borderRadius: "12px",
                    border: "1px solid rgba(129,140,248,0.08)",
                  }}>
                    <div style={{ fontSize: "24px", marginBottom: 8 }}>🔗</div>
                    <div style={{ color: "#818cf8", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                      {language === "ar" ? "جاري بناء التجمعات" : "Building Clusters"}
                    </div>
                    <div style={{ color: "#4b5563", fontSize: "0.75rem" }}>
                      {language === "ar" ? "يتم ربط الإشارات المتشابهة لاكتشاف الأنماط" : "Linking related signals to discover patterns"}
                    </div>
                  </div>
                ) : clusters.map((cluster, i) => (
                  <ClusterCard key={cluster.id} cluster={cluster} language={language} index={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── RIGHT: Radar Visual + Alerts + Emerging ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* D. Critical Alerts */}
          <div style={{
            background: "linear-gradient(135deg, #0c0e14, #10141a)",
            border: "1px solid rgba(239,68,68,0.12)",
            borderRadius: "16px",
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
            background: "linear-gradient(135deg, #0c0e14, #10141a)",
            border: "1px solid rgba(129,140,248,0.12)",
            borderRadius: "16px",
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
              <div style={{
                background: "rgba(129,140,248,0.03)",
                border: "1px solid rgba(129,140,248,0.08)",
                borderRadius: "10px", padding: "16px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "18px", marginBottom: 6 }}>🔎</div>
                <div style={{ color: "#818cf8", fontSize: "0.78rem", fontWeight: 700, marginBottom: 2 }}>
                  {language === "ar" ? "مسح الإشارات الناشئة" : "Scanning for Emerging Signals"}
                </div>
                <div style={{ color: "#4b5563", fontSize: "0.68rem" }}>
                  {language === "ar" ? "لم تُكتشف أنماط جديدة بعد — المراقبة مستمرة" : "No new patterns detected yet — monitoring continues"}
                </div>
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
                value={formatCount(stats.totalActive, "signals", language).display}
              />
              <StatRow
                label={language === "ar" ? "حرجة" : "Critical"}
                value={formatCount(stats.critical, "alerts", language).display}
                color="#ef4444"
              />
              <StatRow
                label={language === "ar" ? "مرتفعة" : "High"}
                value={formatCount(stats.high, "alerts", language).display}
                color="#f59e0b"
              />
              <StatRow
                label={language === "ar" ? "تجمعات" : "Clusters"}
                value={formatCount(clusters.length, "signals", language).display}
                color="#818cf8"
              />
              <StatRow
                label={language === "ar" ? "ذاكرة مؤكدة" : "Memory Confirmed"}
                value={formatCount(signals.filter(s => s.memoryCorroborated).length, "signals", language).display}
                color="#22c55e"
              />
              <StatRow
                label={language === "ar" ? "وقت المسح" : "Scan Time"}
                value={stats.lastPollDuration ? `${stats.lastPollDuration}ms` : (language === "ar" ? "جاري" : "Active")}
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
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color}15`,
      borderRadius: "12px",
      padding: "12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: 5 }}>
        <span style={{ fontSize: "13px" }}>{icon}</span>
        <span style={{ fontSize: "0.65rem", color: "#4b5563", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{
        fontSize: small ? "0.8rem" : "1rem",
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
        <div style={{ fontSize: "0.62rem", color: "#374151", marginTop: 3 }}>{sub}</div>
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
 * ClusterCard — shows a group of linked radar signals
 */
function ClusterCard({ cluster, language, index }) {
  const [expanded, setExpanded] = React.useState(false);
  const sevColor = severityColor(cluster.master.severity);

  return (
    <div className="radar-card-enter" style={{
      background: "linear-gradient(135deg, #0c1017, #10141c)",
      border: `1px solid ${sevColor}22`,
      borderRadius: "14px",
      overflow: "hidden",
      animationDelay: `${index * 0.05}s`,
    }}>
      <div style={{
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer",
      }} onClick={() => setExpanded(!expanded)}>
        {/* Cluster size badge */}
        <div style={{
          minWidth: 44, height: 44, borderRadius: "50%",
          background: `radial-gradient(circle, ${sevColor}33, ${sevColor}11)`,
          border: `2px solid ${sevColor}55`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "14px", fontWeight: 900, color: sevColor }}>{cluster.memberCount}</span>
          <span style={{ fontSize: "8px", color: "#6b7280" }}>🔗</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e8edf2", lineHeight: 1.3 }}>
            {cluster.master.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: "rgba(56,189,248,0.12)", color: "#38bdf8",
            }}>
              {cluster.category}
            </span>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: `${sevColor}18`, color: sevColor,
            }}>
              {language === "ar" ? "أعلى" : "max"} {cluster.maxScore}/100
            </span>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px",
              borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "#6b7280",
            }}>
              {cluster.memberCount} {language === "ar" ? "إشارة مرتبطة" : "linked signals"}
            </span>
          </div>
        </div>

        <span style={{ fontSize: "0.75rem", color: "#4b5563", transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
      </div>

      {expanded && (
        <div style={{
          padding: "0 16px 14px",
          borderTop: "1px solid rgba(255,255,255,0.03)",
        }}>
          {/* Entities */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: 10, marginBottom: 10 }}>
            {cluster.entities.slice(0, 8).map(e => (
              <span key={e} style={{
                fontSize: "0.68rem", padding: "2px 8px", borderRadius: "6px",
                background: "rgba(200,155,60,0.12)", color: "#c89b3c",
              }}>{e}</span>
            ))}
          </div>
          {/* Member signals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cluster.members.slice(0, 5).map(sig => (
              <RadarSignalCard key={sig.id} signal={sig} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Large radar visualization — animated concentric circles
 * with signal dots placed by severity and arcs between linked signals.
 * Prominent, ops-center style.
 */
function RadarVisualization({ signals, scanAngle }) {
  const size = 260;
  const center = size / 2;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Place top 16 signals as dots
  const dots = (signals || []).slice(0, 16).map((sig, i) => {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const dist = (1 - sig.radarScore / 100) * (center - 18) + 18;
    const x = center + Math.cos(angle) * dist;
    const y = center + Math.sin(angle) * dist;
    const col = severityColor(sig.severity);
    const r = sig.radarScore >= 70 ? 5.5 : sig.radarScore >= 40 ? 4 : 3;
    return { x, y, col, r, score: sig.radarScore, id: sig.id, severity: sig.severity };
  });

  // Build arcs between nearby high-severity dots
  const arcs = [];
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      if (dots[i].score >= 50 && dots[j].score >= 50) {
        const s1 = signals[i], s2 = signals[j];
        if (s1 && s2) {
          const overlap = (s1.linkedEntities || []).filter(e => (s2.linkedEntities || []).includes(e));
          if (overlap.length >= 1) {
            arcs.push({ x1: dots[i].x, y1: dots[i].y, x2: dots[j].x, y2: dots[j].y, strength: overlap.length });
          }
        }
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer glow ring */}
      <circle cx={center} cy={center} r={center - 2} fill="none" stroke="rgba(56,189,248,0.04)" strokeWidth="2" />

      {/* Rings */}
      {rings.map((r, i) => (
        <circle
          key={i}
          cx={center} cy={center}
          r={r * (center - 8)}
          fill="none"
          stroke="rgba(56,189,248,0.06)"
          strokeWidth="0.8"
          strokeDasharray={i === rings.length - 1 ? "none" : "3 5"}
        />
      ))}

      {/* Cross lines */}
      <line x1={center} y1={8} x2={center} y2={size - 8} stroke="rgba(56,189,248,0.04)" strokeWidth="0.5" />
      <line x1={8} y1={center} x2={size - 8} y2={center} stroke="rgba(56,189,248,0.04)" strokeWidth="0.5" />
      {/* Diagonal lines */}
      <line x1={center - (center - 8) * 0.707} y1={center - (center - 8) * 0.707} x2={center + (center - 8) * 0.707} y2={center + (center - 8) * 0.707} stroke="rgba(56,189,248,0.025)" strokeWidth="0.5" />
      <line x1={center + (center - 8) * 0.707} y1={center - (center - 8) * 0.707} x2={center - (center - 8) * 0.707} y2={center + (center - 8) * 0.707} stroke="rgba(56,189,248,0.025)" strokeWidth="0.5" />

      {/* Sweep */}
      <line
        x1={center}
        y1={center}
        x2={center + Math.cos(scanAngle * Math.PI / 180) * (center - 8)}
        y2={center + Math.sin(scanAngle * Math.PI / 180) * (center - 8)}
        stroke="rgba(56,189,248,0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Sweep fade trail */}
      <path
        d={`M ${center} ${center} L ${center + Math.cos((scanAngle - 35) * Math.PI / 180) * (center - 8)} ${center + Math.sin((scanAngle - 35) * Math.PI / 180) * (center - 8)} A ${center - 8} ${center - 8} 0 0 1 ${center + Math.cos(scanAngle * Math.PI / 180) * (center - 8)} ${center + Math.sin(scanAngle * Math.PI / 180) * (center - 8)} Z`}
        fill="rgba(56,189,248,0.04)"
      />

      {/* Connection arcs between linked signals */}
      {arcs.map((arc, i) => (
        <line key={`arc-${i}`}
          x1={arc.x1} y1={arc.y1} x2={arc.x2} y2={arc.y2}
          stroke="rgba(56,189,248,0.12)"
          strokeWidth={0.5 + arc.strength * 0.3}
          strokeDasharray="3 4"
        />
      ))}

      {/* Signal dots with glow */}
      {dots.map(d => (
        <g key={d.id}>
          {d.score >= 70 && (
            <circle cx={d.x} cy={d.y} r={d.r + 6} fill={`${d.col}08`} />
          )}
          <circle cx={d.x} cy={d.y} r={d.r + 3} fill={`${d.col}18`} />
          <circle cx={d.x} cy={d.y} r={d.r} fill={d.col} opacity={0.9} />
        </g>
      ))}

      {/* Center dot */}
      <circle cx={center} cy={center} r={4} fill="#38bdf8" opacity={0.6} />
      <circle cx={center} cy={center} r={2} fill="#38bdf8" />

      {/* Ring labels */}
      <text x={center + 4} y={center - rings[0] * (center - 8) + 10} fill="rgba(56,189,248,0.15)" fontSize="7" fontFamily="monospace">100</text>
      <text x={center + 4} y={center - rings[2] * (center - 8) + 10} fill="rgba(56,189,248,0.15)" fontSize="7" fontFamily="monospace">50</text>
    </svg>
  );
}

/**
 * WorldRiskLevelBanner — prominent global risk metric
 */
function WorldRiskLevelBanner({ risk, language }) {
  const isAr = language === "ar";
  return (
    <div style={{
      background: `linear-gradient(135deg, ${risk.color}08, ${risk.color}04, transparent)`,
      border: `1px solid ${risk.color}30`,
      borderRadius: "14px",
      padding: "14px 18px",
      marginBottom: 14,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated pressure bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: "3px",
        width: `${risk.value}%`,
        background: `linear-gradient(90deg, ${risk.color}66, ${risk.color})`,
        borderRadius: "0 2px 0 0",
        transition: "width 1s ease",
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `${risk.color}18`,
            border: `2px solid ${risk.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 900, color: risk.color,
            animation: risk.level >= 4 ? "radarPulse 2s infinite" : "none",
          }}>
            {risk.value}
          </div>
          <div>
            <div style={{
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "2px",
              color: "#6b7280", textTransform: "uppercase", marginBottom: 2,
            }}>
              {isAr ? "مستوى الخطر العالمي" : "WORLD RISK LEVEL"}
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: risk.color }}>
              {isAr ? risk.label : risk.labelEn}
            </div>
          </div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "#6b7280", maxWidth: 260, lineHeight: 1.4 }}>
          {isAr ? risk.description : risk.descriptionEn}
        </div>
      </div>
    </div>
  );
}

/**
 * SignalEvolutionTimeline — shows how signals evolved across hours
 */
function SignalEvolutionTimeline({ evolution, language }) {
  if (!evolution || !evolution.length) return null;
  const isAr = language === "ar";
  const maxCount = Math.max(1, ...evolution.map(b => b.count));

  return (
    <div style={{
      background: "linear-gradient(135deg, #0c0e14, #10141a)",
      border: "1px solid rgba(56,189,248,0.08)",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "16px" }}>⏱️</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#e8edf2" }}>
            {isAr ? "تطور الإشارات عبر الزمن" : "Signal Evolution Timeline"}
          </span>
        </div>
        <span style={{ fontSize: "0.65rem", color: "#4b5563", fontWeight: 600 }}>
          {isAr ? "آخر 24 ساعة" : "Last 24 hours"}
        </span>
      </div>

      {/* Timeline bars */}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
        {evolution.map((bucket, i) => {
          const barHeight = Math.max(4, (bucket.count / maxCount) * 68);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {/* State label */}
              <div style={{
                fontSize: "0.55rem", color: bucket.color, fontWeight: 700,
                textAlign: "center", lineHeight: 1.1, minHeight: 12,
                opacity: bucket.count > 0 ? 1 : 0.5,
              }}>
                {isAr ? bucket.stateLabel : bucket.stateLabelEn}
              </div>
              {/* Bar */}
              <div style={{
                width: "100%",
                height: barHeight,
                background: bucket.count > 0
                  ? `linear-gradient(180deg, ${bucket.color}88, ${bucket.color}44)`
                  : "rgba(255,255,255,0.03)",
                borderRadius: "4px 4px 0 0",
                position: "relative",
                transition: "height 0.5s ease",
                minHeight: 4,
              }}>
                {bucket.count > 0 && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    fontSize: "0.6rem", fontWeight: 800, color: bucket.color,
                  }}>
                    {bucket.count}
                  </div>
                )}
              </div>
              {/* Time label */}
              <div style={{ fontSize: "0.58rem", color: "#4b5563", fontWeight: 600 }}>
                {bucket.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SituationalAwarenessPanel — AI agent short analytical statements
 */
function SituationalAwarenessPanel({ statements, language }) {
  if (!statements || !statements.length) return null;
  const isAr = language === "ar";

  const typeColors = {
    critical: "#ef4444",
    warning: "#f59e0b",
    stable: "#22c55e",
    economic: "#eab308",
    regional: "#38bdf8",
    info: "#818cf8",
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0c0e14, #10141a)",
      border: "1px solid rgba(168,139,250,0.1)",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: "16px" }}>🧠</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#e8edf2" }}>
          {isAr ? "الوعي الظرفي — تحليل الوكيل" : "Situational Awareness — Agent Analysis"}
        </span>
        <span style={{
          fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px",
          borderRadius: "6px", background: "rgba(168,139,250,0.12)", color: "#a78bfa",
          marginLeft: 4,
        }}>
          AI
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {statements.map((stmt, i) => {
          const color = typeColors[stmt.type] || "#64748b";
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "8px 12px",
              background: `${color}06`,
              borderRadius: "10px",
              borderLeft: `3px solid ${color}55`,
            }}>
              <div style={{ fontSize: "0.82rem", color: "#d1d5db", lineHeight: 1.5, flex: 1 }}>
                {isAr ? stmt.ar : stmt.en}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
