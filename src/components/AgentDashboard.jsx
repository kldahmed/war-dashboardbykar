/**
 * AgentDashboard — Premium futuristic UI panels for the AI agent.
 *
 * Panels:
 * 1. Agent Learning Level      (score 0-100, breakdown)
 * 2. Agent Memory Depth        (totalMemoryItems, entities, patterns, linked, signals, sources)
 * 3. Agent Feed Activity       (recent ingestion, top signals, top entities)
 * 4. Agent Pattern Strength    (geopolitical, market, sports, rising/falling signals)
 * 5. Agent Confidence Trend    (confidence trend, acceleration, contradiction)
 * 6. Agent Feedback Accuracy   (accuracy, reliable patterns, rates)
 *
 * Refresh triggered by prop `refreshKey`.
 */

import React, { useEffect, useState, useCallback } from "react";
import { computeAgentScore }     from "../lib/agent/scoringAgent";
import { agentMemory }           from "../lib/agent/memoryAgent";
import { analyzePatterns }       from "../lib/agent/patternAgent";
import { generateForecastSupport } from "../lib/agent/forecastAgent";
import { feedbackAgent }         from "../lib/agent/feedbackAgent";

// ── Style helpers ─────────────────────────────────────────────────────────────
const CARD = {
  background:   "linear-gradient(135deg, #060b14, #0b1220)",
  border:       "1px solid rgba(56,189,248,0.15)",
  borderRadius: "20px",
  padding:      "22px 24px",
  color:        "#e2e8f0",
  fontFamily:   "inherit",
  direction:    "rtl",
  position:     "relative",
  overflow:     "hidden",
};

const ACCENT_LINE = {
  position:   "absolute",
  top:        0,
  right:      0,
  left:       0,
  height:     "2px",
  background: "linear-gradient(90deg,transparent,#38bdf8,#60a5fa,transparent)",
};

const SECTION_TITLE = {
  fontWeight:     800,
  fontSize:       "13px",
  letterSpacing:  "0.5px",
  marginBottom:   "6px",
  display:        "flex",
  alignItems:     "center",
  gap:            "8px",
};

const SUBTITLE = {
  fontSize:     "10px",
  color:        "#475569",
  letterSpacing:"1.5px",
  textTransform:"uppercase",
  marginBottom: "18px",
};

function GlowBar({ pct, color = "#38bdf8", height = 4 }) {
  return (
    <div style={{ height, background: "rgba(56,189,248,0.08)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, pct)}%`,
        height: "100%",
        background: `linear-gradient(90deg, ${color}44, ${color})`,
        borderRadius: 99,
        transition: "width 1s cubic-bezier(0.22,0.61,0.36,1)",
        boxShadow: `0 0 8px ${color}66`,
      }} />
    </div>
  );
}

function Tag({ label, color = "#38bdf8" }) {
  return (
    <span style={{
      fontSize: "10px",
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color,
      borderRadius: 6,
      padding: "2px 9px",
      display: "inline-block",
    }}>{label}</span>
  );
}

function StatBox({ value, label, color = "#38bdf8" }) {
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: 12,
      padding: "10px 14px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "22px", fontWeight: 900, color, lineHeight: 1.1 }}>{value ?? "—"}</div>
      <div style={{ fontSize: "9px", color: "#475569", marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function formatDubaiTime(date = new Date()) {
  return new Intl.DateTimeFormat("ar-AE", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function buildAgentInsight({ patterns, forecastSupport, memoryDepth }) {
  if (!patterns && !forecastSupport && !memoryDepth) {
    return "الوكيل يجمع الإشارات النشطة حالياً لبناء قراءة أوضح خلال الدقائق المقبلة.";
  }

  const topRegion = patterns?.regionalPressure?.[0]?.region || "النطاق العالمي";
  const topSignal = forecastSupport?.strongestSignals?.[0]?.signal || null;
  const readiness = forecastSupport?.forecastReadiness ?? patterns?.patternStrength ?? 0;
  const economicSignal = topSignal && /inflation|market|economy|oil|energy|تضخم|اقتصاد|نفط|طاقة|سوق/i.test(topSignal);
  const theme = economicSignal
    ? "اقتصادية"
    : patterns?.geopolitical?.level === "high"
      ? "جيوسياسية"
      : "مترابطة";
  const impactTarget = theme === "اقتصادية" ? "الأسواق" : "المشهد الإقليمي";
  const signalPart = topSignal ? ` عبر إشارة ${topSignal}` : "";
  const volumePart = memoryDepth?.totalIngested ? ` بعد رصد ${memoryDepth.totalIngested} مدخلاً` : "";

  return `الوكيل يرصد تصاعد إشارات ${theme} في ${topRegion}${signalPart}${volumePart} — احتمال التأثير على ${impactTarget} ${readiness}%`;
}

// ── Panel 1: Agent Learning Level ─────────────────────────────────────────────
function LearningLevelPanel({ score: scoreData }) {
  if (!scoreData) return null;
  const { score, label, labelEn, color, breakdown } = scoreData;
  const radius = 46;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ - (score / 100) * circ;

  return (
    <div style={CARD}>
      <div style={ACCENT_LINE} />
      <div style={{ ...SECTION_TITLE, color: "#f3d38a" }}>
        <span>🧠</span> مستوى تغذية الوكيل
      </div>
      <div style={SUBTITLE}>Agent Learning Level · مؤشر نضج الوكيل</div>

      <div style={{ display: "flex", gap: "24px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
        {/* Score ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="116" height="116" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="58" cy="58" r={radius} fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="9" />
            <circle cx="58" cy="58" r={radius} fill="none"
              stroke={color} strokeWidth="9"
              strokeDasharray={`${circ}`}
              strokeDashoffset={`${dash}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,0.61,0.36,1), stroke 0.5s" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "28px", fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: "9px", color: "#475569" }}>/100</span>
          </div>
        </div>

        {/* Label + breakdown */}
        <div style={{ flex: 1, minWidth: "170px" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color, marginBottom: "4px" }}>{label}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "14px" }}>{labelEn}</div>
          {breakdown && Object.entries(breakdown).map(([key, b]) => (
            <div key={key} style={{ marginBottom: "7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>
                <span>{b.label}</span>
                <span style={{ color }}>{b.pts}/{b.max}</span>
              </div>
              <GlowBar pct={(b.pts / b.max) * 100} color={color} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "10px", color: "#334155", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px" }}>
        ⚙ المؤشر يعكس حجم البيانات المعالجة الفعلية، وتنوع المصادر، والأنماط المرصودة. لا يُستخدم ذكاء اصطناعي خارجي.
      </div>
    </div>
  );
}

// ── Panel 2: Agent Memory Depth ───────────────────────────────────────────────
function MemoryPanel({ depth }) {
  if (!depth) return null;

  return (
    <div style={CARD}>
      <div style={ACCENT_LINE} />
      <div style={{ ...SECTION_TITLE, color: "#a78bfa" }}>
        <span>💾</span> عمق ذاكرة الوكيل
      </div>
      <div style={SUBTITLE}>Agent Memory Depth</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        <StatBox value={depth.totalMemoryItems}  label="سجلات الذاكرة"       color="#38bdf8" />
        <StatBox value={depth.trackedEntities}   label="كيانات مرصودة"       color="#a78bfa" />
        <StatBox value={depth.activePatterns}    label="أنماط نشطة"          color="#f59e0b" />
        <StatBox value={depth.linkedEvents}      label="أحداث مرتبطة"        color="#22c55e" />
        <StatBox value={depth.repeatedSignals}   label="إشارات متكررة"       color="#f97316" />
        <StatBox value={depth.sourceDiversity}   label="تنوع المصادر"        color="#60a5fa" />
      </div>

      {/* Top entities */}
      {depth.topEntities?.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "7px", textTransform: "uppercase" }}>الكيانات الأكثر رصداً</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {depth.topEntities.map(e => (
              <Tag key={e.key} label={`${e.key} (${e.count})`} color="#a78bfa" />
            ))}
          </div>
        </div>
      )}

      {/* Top sources */}
      {depth.topSources?.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "7px", textTransform: "uppercase" }}>أبرز المصادر</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {depth.topSources.map(s => (
              <Tag key={s.key} label={`${s.key} (${s.count})`} color="#60a5fa" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel 3: Agent Feed Activity ──────────────────────────────────────────────
function FeedActivityPanel({ depth, forecastSupport }) {
  if (!depth) return null;
  const signals = depth.topSignals || [];

  return (
    <div style={CARD}>
      <div style={{ ...ACCENT_LINE, background: "linear-gradient(90deg,transparent,#22c55e,#38bdf8,transparent)" }} />
      <div style={{ ...SECTION_TITLE, color: "#22c55e" }}>
        <span style={{ animation: "pulse 1.5s infinite" }}>⚡</span> نشاط التغذية
        <span style={{
          marginInlineStart: "auto",
          fontSize: "9px",
          background: "#22c55e20",
          border: "1px solid #22c55e30",
          color: "#22c55e",
          borderRadius: 6,
          padding: "2px 8px",
          letterSpacing: "1px",
        }}>LIVE</span>
      </div>
      <div style={SUBTITLE}>Agent Feed Activity</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <StatBox value={depth.totalIngested}    label="إجمالي الوارد"        color="#22c55e" />
        <StatBox value={forecastSupport?.strongestSignals?.length || 0} label="إشارات قوية نشطة" color="#38bdf8" />
      </div>

      {/* Signal frequency bars */}
      {signals.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "7px", textTransform: "uppercase" }}>أعلى الإشارات تكراراً</div>
          {signals.slice(0, 6).map(s => (
            <div key={s.key} style={{ marginBottom: "7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>
                <span>{s.key}</span>
                <span style={{ color: "#22c55e" }}>{s.count}×</span>
              </div>
              <GlowBar pct={Math.min(100, (s.count / Math.max(1, signals[0].count)) * 100)} color="#22c55e" height={3} />
            </div>
          ))}
        </div>
      )}

      {/* Acceleration */}
      {forecastSupport?.acceleration && (
        <div style={{
          background: "rgba(56,189,248,0.05)",
          border: "1px solid rgba(56,189,248,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: "11px",
        }}>
          <span style={{ color: "#64748b" }}>تسارع الإشارات: </span>
          <span style={{ color: forecastSupport.acceleration.direction === "accelerating" ? "#22c55e" : forecastSupport.acceleration.direction === "decelerating" ? "#ef4444" : "#94a3b8", fontWeight: 700 }}>
            {forecastSupport.acceleration.label}
          </span>
          {forecastSupport.acceleration.value !== 0 && (
            <span style={{ color: "#475569", marginInlineStart: "6px" }}>({forecastSupport.acceleration.value > 0 ? "+" : ""}{forecastSupport.acceleration.value}%)</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Panel 4: Agent Pattern Strength ──────────────────────────────────────────
function PatternStrengthPanel({ patterns }) {
  if (!patterns) return null;

  return (
    <div style={CARD}>
      <div style={{ ...ACCENT_LINE, background: "linear-gradient(90deg,transparent,#f59e0b,#f97316,transparent)" }} />
      <div style={{ ...SECTION_TITLE, color: "#f59e0b" }}>
        <span>🔭</span> قوة الأنماط
      </div>
      <div style={SUBTITLE}>Agent Pattern Strength</div>

      {/* Strength gauge */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
          <span>{patterns.patternStrengthLabel}</span>
          <span style={{ color: "#f59e0b", fontWeight: 900 }}>{patterns.patternStrength}/100</span>
        </div>
        <GlowBar pct={patterns.patternStrength} color="#f59e0b" height={6} />
      </div>

      {/* Geopolitical */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "10px", marginBottom: "14px" }}>
        {patterns.geopolitical && (
          <div style={{ background: `${patterns.geopolitical.color}10`, border: `1px solid ${patterns.geopolitical.color}25`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>جيوسياسي</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: patterns.geopolitical.color }}>{patterns.geopolitical.label}</div>
          </div>
        )}
        {patterns.market && (
          <div style={{ background: `${patterns.market.color}10`, border: `1px solid ${patterns.market.color}25`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>السوق</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: patterns.market.color }}>{patterns.market.label}</div>
          </div>
        )}
        {patterns.sports && (
          <div style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>رياضي</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#38bdf8" }}>{patterns.sports.momentumLabel}</div>
          </div>
        )}
        {patterns.sports?.transferHeat >= 1 && (
          <div style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>انتقالات</div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#f97316" }}>{patterns.sports.transferHeatLabel}</div>
          </div>
        )}
      </div>

      {/* Rising signals */}
      {patterns.signalTrends?.rising?.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "6px", textTransform: "uppercase" }}>إشارات صاعدة</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {patterns.signalTrends.rising.map(t => (
              <Tag key={t.key} label={`↑ ${t.key} (${t.recentCount})`} color="#22c55e" />
            ))}
          </div>
        </div>
      )}

      {/* Falling signals */}
      {patterns.signalTrends?.falling?.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "6px", textTransform: "uppercase" }}>إشارات متراجعة</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {patterns.signalTrends.falling.map(t => (
              <Tag key={t.key} label={`↓ ${t.key}`} color="#ef4444" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel 5: Agent Confidence Trend ──────────────────────────────────────────
function ConfidenceTrendPanel({ forecastSupport }) {
  if (!forecastSupport) return null;
  const { confidenceTrend, contradiction, historicalSimilarity, forecastReadiness, forecastReadinessLabel } = forecastSupport;

  return (
    <div style={CARD}>
      <div style={{ ...ACCENT_LINE, background: "linear-gradient(90deg,transparent,#60a5fa,#a78bfa,transparent)" }} />
      <div style={{ ...SECTION_TITLE, color: "#60a5fa" }}>
        <span>📈</span> اتجاه الثقة
      </div>
      <div style={SUBTITLE}>Agent Confidence Trend</div>

      {/* Forecast readiness */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
          <span>جاهزية التوقع</span>
          <span style={{ color: "#60a5fa", fontWeight: 900 }}>{forecastReadiness}%</span>
        </div>
        <GlowBar pct={forecastReadiness} color="#60a5fa" height={6} />
        <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>{forecastReadinessLabel}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "14px" }}>
        {/* Confidence trend */}
        {confidenceTrend && (
          <div style={{ background: `${confidenceTrend.color}10`, border: `1px solid ${confidenceTrend.color}25`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>اتجاه الثقة</div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: confidenceTrend.color }}>{confidenceTrend.label}</div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              {confidenceTrend.recentAvg}% حديث / {confidenceTrend.allAvg}% كلي
            </div>
          </div>
        )}

        {/* Contradiction */}
        {contradiction && (
          <div style={{ background: `${contradiction.color}10`, border: `1px solid ${contradiction.color}25`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>مستوى التناقض</div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: contradiction.color }}>{contradiction.label}</div>
          </div>
        )}
      </div>

      {/* Historical similarity */}
      {historicalSimilarity?.available && (
        <div style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
            <span>التشابه التاريخي</span>
            <span style={{ color: "#a78bfa", fontWeight: 900 }}>{historicalSimilarity.score}%</span>
          </div>
          <GlowBar pct={historicalSimilarity.score} color="#a78bfa" height={3} />
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{historicalSimilarity.label}</div>
        </div>
      )}
    </div>
  );
}

// ── Panel 6: Agent Feedback Accuracy ─────────────────────────────────────────
function FeedbackAccuracyPanel({ feedbackStats, onMarkOutcome }) {
  const [forecastId, setForecastId] = useState("");
  const [outcome, setOutcome]       = useState("success");
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = () => {
    if (!forecastId.trim()) return;
    onMarkOutcome(forecastId.trim(), outcome);
    setForecastId("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  if (!feedbackStats) return null;
  const { overallAccuracy, accuracyLabel, accuracyColor, confirmedSignalRate, falseSignalRate, totalPredictions, resolved, reliablePatterns } = feedbackStats;

  return (
    <div style={CARD}>
      <div style={{ ...ACCENT_LINE, background: "linear-gradient(90deg,transparent,#22c55e,#f59e0b,transparent)" }} />
      <div style={{ ...SECTION_TITLE, color: "#f3d38a" }}>
        <span>🎯</span> دقة الوكيل
      </div>
      <div style={SUBTITLE}>Agent Feedback Accuracy</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <StatBox value={totalPredictions}              label="توقعات مسجلة"  color="#38bdf8" />
        <StatBox value={resolved}                      label="تم التقييم"    color="#f59e0b" />
        <StatBox value={overallAccuracy !== null ? `${overallAccuracy}%` : "—"} label={accuracyLabel} color={accuracyColor} />
      </div>

      {/* Accuracy bar */}
      {overallAccuracy !== null && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginBottom: "5px" }}>
            <span>إشارات مؤكدة: <strong style={{ color: "#22c55e" }}>{confirmedSignalRate}%</strong></span>
            <span>إشارات كاذبة: <strong style={{ color: "#ef4444" }}>{falseSignalRate}%</strong></span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${confirmedSignalRate}%`, background: "linear-gradient(90deg,#22c55e44,#22c55e)", transition: "width 1s ease" }} />
            <div style={{ width: `${falseSignalRate}%`, background: "linear-gradient(90deg,#ef444444,#ef4444)", transition: "width 1s ease" }} />
          </div>
        </div>
      )}

      {/* Reliable patterns */}
      {reliablePatterns?.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: "#334155", letterSpacing: "1px", marginBottom: "6px", textTransform: "uppercase" }}>موثوقية الأنماط</div>
          {reliablePatterns.slice(0, 5).map(p => (
            <div key={p.signal} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{p.signal}</span>
              <Tag label={p.label} color={p.color} />
            </div>
          ))}
        </div>
      )}

      {/* Manual outcome submission */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
        <div style={{ fontSize: "10px", color: "#475569", marginBottom: "8px" }}>تقديم نتيجة توقع يدوياً</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            value={forecastId}
            onChange={e => setForecastId(e.target.value)}
            placeholder="معرّف التوقع"
            style={{
              flex: 1,
              minWidth: "100px",
              background: "rgba(56,189,248,0.07)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 8,
              padding: "7px 10px",
              color: "#e2e8f0",
              fontSize: "11px",
              outline: "none",
            }}
          />
          <select
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            style={{
              background: "rgba(56,189,248,0.07)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 8,
              padding: "7px 10px",
              color: "#e2e8f0",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <option value="success">✅ نجح</option>
            <option value="failure">❌ فشل</option>
          </select>
          <button onClick={handleSubmit} style={{
            background: submitted ? "#22c55e" : "rgba(56,189,248,0.15)",
            border: "1px solid rgba(56,189,248,0.3)",
            borderRadius: 8,
            padding: "7px 14px",
            color: "#e2e8f0",
            fontSize: "11px",
            cursor: "pointer",
            fontWeight: 700,
            transition: "background 0.3s",
          }}>
            {submitted ? "✓ تم" : "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Regional Pressure Mini Panel ─────────────────────────────────────────────
function RegionalPressurePanel({ patterns }) {
  if (!patterns?.regionalPressure?.length) return null;

  const pressureColor = p => p === "high" ? "#ef4444" : p === "medium" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ ...CARD, padding: "18px 20px" }}>
      <div style={ACCENT_LINE} />
      <div style={{ ...SECTION_TITLE, color: "#f87171", fontSize: "12px" }}>
        <span>🌍</span> ضغط إقليمي
      </div>
      {patterns.regionalPressure.map(r => (
        <div key={r.region} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>{r.region}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "60px" }}>
              <GlowBar pct={r.count * 10} color={pressureColor(r.pressure)} height={3} />
            </div>
            <Tag label={r.label} color={pressureColor(r.pressure)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Entity Cluster Panel ─────────────────────────────────────────────────────
function ClusterPanel({ patterns }) {
  if (!patterns?.clusters?.length) return null;

  return (
    <div style={{ ...CARD, padding: "18px 20px" }}>
      <div style={{ ...ACCENT_LINE, background: "linear-gradient(90deg,transparent,#a78bfa,transparent)" }} />
      <div style={{ ...SECTION_TITLE, color: "#a78bfa", fontSize: "12px" }}>
        <span>🕸</span> تجمعات الكيانات
      </div>
      {patterns.clusters.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
            {c.entityA} <span style={{ color: "#475569" }}>↔</span> {c.entityB}
          </span>
          <Tag label={`${c.coCount}× ${c.strength}`} color="#a78bfa" />
        </div>
      ))}
    </div>
  );
}

// ── Master component ──────────────────────────────────────────────────────────
export default function AgentDashboard({ refreshKey = 0 }) {
  const [scoreData,       setScoreData]       = useState(null);
  const [memoryDepth,     setMemoryDepth]     = useState(null);
  const [patterns,        setPatterns]        = useState(null);
  const [forecastSupport, setForecastSupport] = useState(null);
  const [feedbackStats,   setFeedbackStats]   = useState(null);
  const [statusTime,      setStatusTime]      = useState(() => formatDubaiTime());

  const refresh = useCallback(() => {
    try {
      setScoreData(computeAgentScore());
      setMemoryDepth(agentMemory.getMemoryDepth());
      setPatterns(analyzePatterns());
      setForecastSupport(generateForecastSupport());
      setFeedbackStats(feedbackAgent.getStats());
      setStatusTime(formatDubaiTime());
    } catch (e) {
      console.error("AgentDashboard refresh error:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusTime(formatDubaiTime());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleMarkOutcome = (forecastId, outcome) => {
    feedbackAgent.markOutcome(forecastId, outcome);
    refresh();
  };

  const activeSignalsCount = memoryDepth?.activePatterns ?? forecastSupport?.strongestSignals?.length ?? 0;
  const insightText = buildAgentInsight({ patterns, forecastSupport, memoryDepth });

  return (
    <div className="agent-dashboard" style={{ direction: "rtl" }}>
      {/* Dashboard header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: "18px",
        padding: "0 4px",
        flexWrap: "wrap",
        gap: "10px",
      }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: "18px", color: "#f3d38a", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🤖</span>
            وكيل الذكاء الذاتي
          </div>
          <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "2px", textTransform: "uppercase", marginTop: "3px" }}>
            Self-Feeding AI Agent · Structured Intelligence Processing
          </div>
        </div>
      </div>

      <div className="agent-dashboard-statusbar" style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "18px",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#22c55e", fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
          <span>ACTIVE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>آخر تحديث: <strong style={{ color: "#f3d38a" }}>{statusTime}</strong></span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>عدد الإشارات النشطة: <strong style={{ color: "#38bdf8" }}>{activeSignalsCount}</strong></span>
        </div>
      </div>

      <div className="agent-dashboard-insight" style={{
        background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(243,211,138,0.05))",
        border: "1px solid rgba(56,189,248,0.16)",
        borderRadius: "18px",
        padding: "18px 20px",
        marginBottom: "22px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}>
        <div style={{ fontSize: "10px", color: "#38bdf8", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", fontWeight: 900 }}>
          Agent Insight
        </div>
        <div style={{ fontSize: "14px", lineHeight: 1.9, color: "#e2e8f0", fontWeight: 700 }}>
          {insightText}
        </div>
      </div>

      <div className="agent-dashboard-grid agent-dashboard-grid-primary">
        <div className="agent-dashboard-cell agent-dashboard-cell-pattern">
          <PatternStrengthPanel patterns={patterns} />
        </div>
        <div className="agent-dashboard-cell agent-dashboard-cell-feed">
          <FeedActivityPanel depth={memoryDepth} forecastSupport={forecastSupport} />
        </div>
        <div className="agent-dashboard-cell agent-dashboard-cell-memory">
          <MemoryPanel depth={memoryDepth} />
        </div>
      </div>

      <div className="agent-dashboard-grid agent-dashboard-grid-secondary">
        <div className="agent-dashboard-cell agent-dashboard-cell-learning">
          <LearningLevelPanel score={scoreData} />
        </div>
        <div className="agent-dashboard-cell agent-dashboard-cell-accuracy">
          <FeedbackAccuracyPanel feedbackStats={feedbackStats} onMarkOutcome={handleMarkOutcome} />
        </div>
        <div className="agent-dashboard-cell agent-dashboard-cell-confidence">
          <ConfidenceTrendPanel forecastSupport={forecastSupport} />
        </div>
      </div>

      {/* Secondary panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "26px" }}>
        <RegionalPressurePanel patterns={patterns} />
        <ClusterPanel patterns={patterns} />
      </div>

      {/* Safety disclaimer */}
      <div style={{
        marginTop: "28px",
        padding: "12px 18px",
        background: "rgba(56,189,248,0.04)",
        border: "1px solid rgba(56,189,248,0.1)",
        borderRadius: "12px",
        fontSize: "10px",
        color: "#334155",
        lineHeight: 1.7,
        direction: "rtl",
      }}>
        ⚙ <strong style={{ color: "#475569" }}>ملاحظة:</strong> الوكيل يعمل بالمعالجة الهيكلية للبيانات الواردة فعلياً. لا يُدّعى أن الوكيل واعٍ أو مستقل. جميع المخرجات قابلة للتفسير ومستندة إلى بيانات حقيقية فقط.
      </div>
    </div>
  );
}
