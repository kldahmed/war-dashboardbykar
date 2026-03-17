import React, { useEffect, useState, useCallback } from "react";
import {
  generateStrategicForecasts,
  CATEGORY_META,
  TIME_HORIZONS,
  TIME_HORIZON_LABELS,
} from "../lib/strategicForecastEngine";
import { getMemoryStats } from "../lib/forecastMemory";
import { formatDisplayTime } from "../AppHelpers";
import ScenarioCard from "./ScenarioCard";
import { RiskDashboard } from "./RiskMeter";
import ForecastConfidencePanel from "./ForecastConfidencePanel";
import LinkedDriversPanel from "./LinkedDriversPanel";
import StrategicPredictionTimeline from "./StrategicPredictionTimeline";

// ── Reusable primitives ───────────────────────────────────────────────────────

function HorizonSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {TIME_HORIZONS.map(h => (
        <button key={h} onClick={() => onChange(h)} style={{
          background: value === h ? "#38bdf8" : "rgba(255,255,255,0.04)",
          color: value === h ? "#0b0f1a" : "#64748b",
          border: `1px solid ${value === h ? "#38bdf8" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "8px", padding: "5px 12px",
          fontSize: "11px", fontWeight: 700, cursor: "pointer",
          transition: "all 0.2s",
        }}>
          {TIME_HORIZON_LABELS[h]}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ margin: 0, fontWeight: 900, fontSize: "15px", color: "#f3d38a" }}>
        {icon} {title}
      </h3>
      {subtitle && <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px" }}>{subtitle}</div>}
    </div>
  );
}

function ConfidenceArc({ value }) {
  const r = 14, circ = 2 * Math.PI * r;
  const color = value >= 60 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  const dash = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${circ}`} strokeDashoffset={`${dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 900, color }}>{value}%</span>
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      fontSize: "9px", padding: "2px 7px", borderRadius: "5px", fontWeight: 600,
      background: `${color}12`, border: `1px solid ${color}28`, color,
    }}>{children}</span>
  );
}

// ── Forecast card ─────────────────────────────────────────────────────────────
function ForecastCard({ fc, onClick, active }) {
  const meta = CATEGORY_META[fc.category] || { icon: "🔭", color: "#38bdf8", bg: "rgba(56,189,248,0.06)" };
  const trend = fc.trendDirection || {};
  const trendColor = trend.color || "#94a3b8";
  const evColor = fc.evidenceStrength === "strong" ? "#22c55e"
                : fc.evidenceStrength === "moderate" ? "#f59e0b" : "#ef4444";
  return (
    <div onClick={onClick} style={{
      background: active
        ? `linear-gradient(145deg, ${meta.color}12, #0f172a)`
        : "linear-gradient(145deg, #0b0f1a, #0f172a)",
      border: `1px solid ${active ? meta.color + "44" : meta.color + "18"}`,
      borderRadius: "14px", padding: "16px",
      cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 10, insetInlineEnd: 10,
        fontSize: "9px", padding: "2px 7px", borderRadius: "5px",
        background: meta.bg, color: meta.color, fontWeight: 700,
        border: `1px solid ${meta.color}22`,
      }}>
        {fc.category}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", paddingInlineEnd: "70px" }}>
        <span style={{ fontSize: "22px", flexShrink: 0 }}>{meta.icon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "13px", color: "#e2e8f0", lineHeight: 1.3 }}>{fc.topic}</div>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>{fc.region}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div style={{ fontSize: "18px", fontWeight: 900, color: trendColor, width: 24, textAlign: "center" }}>
          {trend.arrow || "→"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#475569", marginBottom: "3px" }}>
            <span>احتمالية الاستمرار</span>
            <span style={{ fontWeight: 800, color: trendColor }}>{fc.probability}%</span>
          </div>
          <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              width: `${fc.probability}%`, height: "100%",
              background: `linear-gradient(90deg, ${trendColor}66, ${trendColor})`,
              borderRadius: "99px", transition: "width 1s cubic-bezier(0.22,0.61,0.36,1)",
            }} />
          </div>
        </div>
        <ConfidenceArc value={fc.confidence} />
      </div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        <Badge color={evColor}>{fc.evidenceStrength === "strong" ? "قوي" : fc.evidenceStrength === "moderate" ? "متوسط" : "ضعيف"} الأدلة</Badge>
        <Badge color="#64748b">{fc.signalCount} إشارة</Badge>
        <Badge color="#64748b">{fc.linkedEvents?.length || 0} حدث</Badge>
        {fc.drivers?.[0] && <Badge color={meta.color}>{fc.drivers[0].replace(/_/g, " ")}</Badge>}
      </div>
    </div>
  );
}

// ── UAE club card ─────────────────────────────────────────────────────────────
function UaeClubCard({ fc }) {
  const { clubMeta = {} } = fc;
  const color = clubMeta.color || "#f3d38a";
  const momColor = clubMeta.momentum === "صاعد" ? "#22c55e"
                 : clubMeta.momentum === "هابط" ? "#ef4444" : "#94a3b8";
  const pressColor = (clubMeta.pressScore || 0) >= 70 ? "#ef4444"
                   : (clubMeta.pressScore || 0) >= 50 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{
      background: "linear-gradient(145deg, #0c1018, #111827)",
      border: `1px solid ${color}22`, borderRadius: "14px", padding: "16px",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "18px" }}>🇦🇪</span>
        <div>
          <div style={{ fontWeight: 900, fontSize: "13px", color: "#e2e8f0" }}>{fc.entities[0]}</div>
          <div style={{ fontSize: "10px", color: "#475569" }}>دوري أدنوك للمحترفين</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "احتمالية اللقب", value: `${fc.probability}%`, color },
          { label: "الزخم",           value: clubMeta.momentum || "—", color: momColor },
          { label: "ضغط المباريات",   value: clubMeta.fixtureRisk || "—", color: pressColor },
        ].map(s => (
          <div key={s.label} style={{
            background: `${s.color}0a`, border: `1px solid ${s.color}1a`,
            borderRadius: "8px", padding: "8px", textAlign: "center",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "7px 10px", background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px",
        fontSize: "10px", color: "#475569",
      }}>
        <span>{fc.signalCount} إشارة مرصودة</span>
        {clubMeta.transfers > 0 && <span style={{ color: "#4ade80" }}>🔁 {clubMeta.transfers} انتقالات</span>}
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.6 }}>{fc.explanation}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {[
          { label: "أساسي", text: fc.baseCase,    color: "#94a3b8" },
          { label: "إيجابي", text: fc.upsideCase,  color: "#22c55e" },
          { label: "سلبي",   text: fc.downsideCase, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", gap: "6px", fontSize: "10px", lineHeight: 1.5 }}>
            <span style={{ color: s.color, fontWeight: 700, flexShrink: 0 }}>{s.label}:</span>
            <span style={{ color: "#475569" }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Memory panel ──────────────────────────────────────────────────────────────
function MemoryFeedbackPanel({ memStats }) {
  if (!memStats || !memStats.total) return (
    <div style={{
      textAlign: "center", padding: "40px",
      color: "#334155", fontSize: "12px",
      background: "linear-gradient(145deg, #0b0f1a, #0f1722)",
      borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      الذاكرة فارغة حتى الآن. ستُبنى بعد توليد أول مجموعة من التوقعات.
    </div>
  );

  const rateColor = memStats.overallSuccessRate !== null
    ? (memStats.overallSuccessRate >= 0.7 ? "#22c55e" : memStats.overallSuccessRate >= 0.5 ? "#f59e0b" : "#ef4444")
    : "#94a3b8";
  const rateLabel = memStats.overallSuccessRate !== null
    ? `${Math.round(memStats.overallSuccessRate * 100)}%` : "—";

  return (
    <div style={{
      background: "linear-gradient(145deg, #0b0f1a, #0f1722)",
      border: "1px solid rgba(167,139,250,0.15)",
      borderRadius: "14px", padding: "16px",
    }}>
      <div style={{ fontWeight: 800, fontSize: "13px", color: "#a78bfa", marginBottom: "12px" }}>
        🧠 ذاكرة النموذج وحلقة التغذية الراجعة
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        {[
          { label: "نماذج مُرصودة",  value: String(memStats.total),    color: "#a78bfa" },
          { label: "توقعات مُقيّمة", value: String(memStats.resolved), color: "#38bdf8" },
          { label: "معدل الدقة",     value: rateLabel,                  color: rateColor },
        ].map(s => (
          <div key={s.label} style={{
            background: `${s.color}0a`, border: `1px solid ${s.color}1a`,
            borderRadius: "8px", padding: "10px", textAlign: "center",
          }}>
            <div style={{ fontSize: "16px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>
      {memStats.patterns?.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", color: "#334155", marginBottom: "6px" }}>موثوقية الأنماط</div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {memStats.patterns.map(p => {
              const c = p.reliability === "عالية" ? "#22c55e" : p.reliability === "متوسطة" ? "#f59e0b" : "#ef4444";
              return (
                <span key={p.id} style={{
                  fontSize: "9px", padding: "2px 7px", borderRadius: "5px",
                  background: `${c}12`, border: `1px solid ${c}28`, color: c,
                }}>
                  {p.id.replace(/_/g, " ")} — {p.reliability}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StrategicForecastCenter({ refreshKey = 0 }) {
  const [timeHorizon, setTimeHorizon] = useState("24h");
  const [data, setData] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState("forecasts");
  const [lastUpdate, setLastUpdate] = useState("");
  const [memStats, setMemStats] = useState(null);

  const refresh = useCallback(() => {
    try {
      const result = generateStrategicForecasts(timeHorizon);
      setData(result);
      setMemStats(getMemoryStats());
      setLastUpdate(formatDisplayTime(new Date().toISOString()));
      if (result.forecasts.length && !activeId) {
        setActiveId(result.forecasts[0].id);
      }
    } catch (e) {
      console.error("StrategicForecastCenter error:", e);
    }
  }, [timeHorizon, activeId]);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const activeForecast = data?.forecasts?.find(f => f.id === activeId);

  const innerTabs = [
    { id: "forecasts", label: "التوقعات",          icon: "🔭" },
    { id: "risks",     label: "المخاطر",           icon: "⚠️" },
    { id: "uae",       label: "الدوري الإماراتي",  icon: "🇦🇪" },
    { id: "memory",    label: "الذاكرة",           icon: "🧠" },
  ];

  const emptyState = (
    <div style={{
      textAlign: "center", padding: "48px 24px",
      background: "linear-gradient(145deg, #0b0f1a, #0f1722)",
      borderRadius: "16px", border: "1px solid rgba(56,189,248,0.08)",
      color: "#334155",
    }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧠</div>
      <div style={{ fontWeight: 800, color: "#475569", marginBottom: "8px" }}>لا توقعات متاحة حالياً</div>
      <div style={{ fontSize: "12px", lineHeight: 1.6 }}>
        يحتاج النظام إلى معالجة مزيد من الأخبار لبناء توقعات دقيقة.<br />
        تصفح تبويب الأخبار أولاً لتغذية ذاكرة النظام.
      </div>
    </div>
  );

  return (
    <div style={{ direction: "rtl", fontFamily: "inherit" }}>

      {/* Master header */}
      <div style={{
        background: "linear-gradient(145deg, #0b0f1a, #0f1722)",
        border: "1px solid rgba(243,211,138,0.12)",
        borderRadius: "18px", padding: "22px 24px", marginBottom: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: "20px", color: "#f3d38a" }}>
              🎯 مركز التوقعات الاستراتيجية
            </h2>
            <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
              AI Strategic Forecast Center — توقعات احتمالية مبنية على الإشارات الحية
            </div>
          </div>
          <div style={{ textAlign: "end" }}>
            {lastUpdate && <div style={{ fontSize: "10px", color: "#334155" }}>آخر تحديث: {lastUpdate}</div>}
            {data && (
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
                {data.storeSize} مقال مُعالج · {data.stats || 0} إشارة في 6 ساعات
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "10px", color: "#334155", marginBottom: "6px" }}>أُفق التوقع</div>
          <HorizonSelector value={timeHorizon} onChange={h => { setTimeHorizon(h); setActiveId(null); }} />
        </div>
        <div style={{
          marginTop: "14px", padding: "8px 14px",
          background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: "8px", fontSize: "10px", color: "#78350f", lineHeight: 1.6,
        }}>
          ⚠️ جميع التوقعات <strong>احتمالية</strong> مستنبطة من إشارات فعلية مرصودة — لا تُمثل حقائق قاطعة أو تنبؤات مضمونة.
        </div>
      </div>

      {/* Inner nav */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {innerTabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? "#f3d38a" : "rgba(255,255,255,0.03)",
            color: activeTab === t.id ? "#111" : "#64748b",
            border: `1px solid ${activeTab === t.id ? "#f3d38a" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "10px", padding: "8px 16px",
            fontWeight: 700, fontSize: "12px", cursor: "pointer", transition: "all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Forecasts tab */}
      {activeTab === "forecasts" && (
        <>
          {(!data || !data.forecasts?.length) ? emptyState : (
            <>
              <StrategicPredictionTimeline forecasts={data.forecasts} timeHorizon={timeHorizon} />
              <div style={{ height: "20px" }} />
              <SectionHeader
                icon="🔭"
                title="التوقعات الاستراتيجية"
                subtitle={`${data.forecasts.length} توقع نشط — اضغط على أي بطاقة للتفاصيل الكاملة`}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                {data.forecasts.map(fc => (
                  <ForecastCard key={fc.id} fc={fc}
                    active={fc.id === activeId}
                    onClick={() => setActiveId(fc.id === activeId ? null : fc.id)}
                  />
                ))}
              </div>

              {activeForecast && (
                <div style={{ marginTop: "20px" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "14px",
                  }}>
                    <ScenarioCard forecast={activeForecast} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <ForecastConfidencePanel forecast={activeForecast} />
                      <LinkedDriversPanel forecast={activeForecast} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Risks tab */}
      {activeTab === "risks" && (
        <>
          <SectionHeader
            icon="⚠️"
            title="محرك المخاطر الاستراتيجية"
            subtitle="مخاطر فعلية محسوبة من الإشارات المرصودة"
          />
          {(!data?.risks?.length) ? emptyState : <RiskDashboard risks={data.risks} />}
        </>
      )}

      {/* UAE tab */}
      {activeTab === "uae" && (
        <>
          <SectionHeader
            icon="🇦🇪"
            title="توقعات دوري أدنوك للمحترفين"
            subtitle="تحليل الزخم وسباق اللقب لكل نادٍ بناءً على الإشارات الحية"
          />
          {(!data?.uaeClubs?.length) ? emptyState : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {data.uaeClubs.map(fc => <UaeClubCard key={fc.id} fc={fc} />)}
            </div>
          )}
        </>
      )}

      {/* Memory tab */}
      {activeTab === "memory" && (
        <>
          <SectionHeader
            icon="🧠"
            title="ذاكرة النموذج وحلقة التغذية الراجعة"
            subtitle="يتحسّن النموذج من سجل التوقعات السابقة"
          />
          <MemoryFeedbackPanel memStats={memStats} />
        </>
      )}

    </div>
  );
}
