/**
 * StrategicForecastCenter.jsx
 *
 * AI Strategic Prediction Engine UI
 * Premium forecast center with scenario cards, risk meters, confidence panels,
 * linked drivers, and UAE sports forecasts.
 */
import React, { useEffect, useRef, useState, useMemo } from "react";

const C = {
  bg:"#080c12", surface:"#0c1220", border:"rgba(56,189,248,0.1)",
  gold:"#f3d38a", blue:"#38bdf8", green:"#22c55e",
  red:"#ef4444", amber:"#f59e0b", purple:"#a78bfa",
  muted:"#475569", text:"#e2e8f0", dim:"#1e293b",
  teal:"#2dd4bf",
};

const CAT_COLOR = {
  conflict:   C.red, geopolitics: C.purple, diplomacy: C.blue,
  economy:    "#34d399", sports: "#fb923c",
  emerging:   C.muted, default: C.blue,
};
const HORIZON_LABEL = { "6h":"6 ساعات", "24h":"24 ساعة", "72h":"3 أيام", "168h":"7 أيام" };
const TREND_ICON = { rising:"↑", falling:"↓", stable:"→" };
const TREND_COLOR = { rising:C.green, falling:C.red, stable:C.amber };

// ── Probability Bar ───────────────────────────────────────────────────────────
function ProbBar({ value, color, label }) {
  const pct = Math.min(100, value || 0);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      {label && <span style={{ color:C.muted, fontSize:"11px", whiteSpace:"nowrap", minWidth:"60px" }}>{label}</span>}
      <div style={{ flex:1, height:"5px", background:C.dim, borderRadius:"3px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:"3px",
          transition:"width .5s ease" }} />
      </div>
      <span style={{ color, fontSize:"12px", fontWeight:800, minWidth:"34px" }}>{pct}%</span>
    </div>
  );
}

// ── Confidence Arc ────────────────────────────────────────────────────────────
function ConfidenceArc({ value, size = 64 }) {
  const pct = Math.min(100, value || 0);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100) * 0.75; // 270° sweep
  const color = pct >= 65 ? C.green : pct >= 40 ? C.amber : C.muted;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.dim} strokeWidth="5"
          strokeDasharray={`${circ*0.75} ${circ}`}
          strokeDashoffset={circ * 0.125} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ * 0.125} strokeLinecap="round"
          style={{ transition:"stroke-dasharray .5s ease" }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle"
          fill={color} fontSize="13" fontWeight="800">{pct}</text>
      </svg>
      <span style={{ color:C.muted, fontSize:"9px", letterSpacing:".04em" }}>CONFIDENCE</span>
    </div>
  );
}

// ── Risk Meter ────────────────────────────────────────────────────────────────
function RiskMeter({ risk }) {
  const color = risk.riskScore >= 70 ? C.red : risk.riskScore >= 50 ? C.amber : risk.riskScore >= 30 ? C.blue : C.muted;
  return (
    <div style={{
      background:"rgba(255,255,255,.025)", border:`1px solid ${color}22`,
      borderRadius:"10px", padding:"10px 14px",
      display:"flex", alignItems:"center", gap:"12px"
    }}>
      <span style={{ fontSize:"18px", flexShrink:0 }}>{risk.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:C.text, fontSize:"12px", fontWeight:700, marginBottom:"4px" }}>
          {risk.riskType}
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <div style={{ flex:1, height:"4px", background:C.dim, borderRadius:"2px" }}>
            <div style={{ width:`${risk.riskScore}%`, height:"100%", background:color,
              borderRadius:"2px", transition:"width .4s" }} />
          </div>
          <span style={{ color, fontSize:"11px", fontWeight:800, minWidth:"28px" }}>
            {risk.riskScore}
          </span>
        </div>
        <div style={{ color:C.muted, fontSize:"10px", marginTop:"3px" }}>
          احتمالية {risk.probability}% · ثقة {risk.confidence}% ·{" "}
          {risk.linkedSignals} إشارة
        </div>
      </div>
    </div>
  );
}

// ── Scenario Card ─────────────────────────────────────────────────────────────
function ScenarioCard({ label, text, icon, color, probability }) {
  return (
    <div style={{
      background:`${color}0a`, border:`1px solid ${color}25`,
      borderRadius:"10px", padding:"12px 14px",
      flex:1, minWidth:0
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
        <span style={{ color, fontSize:"12px", fontWeight:800 }}>{icon} {label}</span>
        {probability != null && (
          <span style={{ color:C.muted, fontSize:"10px" }}>{probability}%</span>
        )}
      </div>
      <p style={{ color:"#94a3b8", fontSize:"12px", lineHeight:1.7, margin:0 }}>{text}</p>
    </div>
  );
}

// ── Drivers Panel ─────────────────────────────────────────────────────────────
function LinkedDriversPanel({ drivers, risks, signalCount, entities }) {
  return (
    <div style={{
      background:"rgba(255,255,255,.02)",
      border:"1px solid rgba(255,255,255,.05)",
      borderRadius:"10px", padding:"12px 14px",
      display:"grid", gap:"8px"
    }}>
      <div style={{ color:C.muted, fontSize:"10px", fontWeight:700, letterSpacing:".04em" }}>
        المحركات والمخاطر
      </div>
      <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
        {(drivers || []).map((d, i) => (
          <span key={i} style={{ background:"rgba(56,189,248,.06)",
            border:"1px solid rgba(56,189,248,.12)", color:C.blue,
            fontSize:"10px", padding:"2px 8px", borderRadius:"999px" }}>
            📌 {d}
          </span>
        ))}
        {(entities || []).slice(0, 3).map((e, i) => (
          <span key={`e${i}`} style={{ background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)", color:"#94a3b8",
            fontSize:"10px", padding:"2px 8px", borderRadius:"999px" }}>
            {e}
          </span>
        ))}
      </div>
      <div style={{ display:"flex", gap:"12px", marginTop:"2px" }}>
        <span style={{ color:C.muted, fontSize:"10px" }}>
          إشارات: <span style={{ color:C.blue, fontWeight:700 }}>{signalCount}</span>
        </span>
        {(risks || []).slice(0, 2).map((r, i) => (
          <span key={i} style={{ color:C.muted, fontSize:"10px" }}>
            ⚠️ {typeof r === "string" ? r : r.riskType}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Full Forecast Card ────────────────────────────────────────────────────────
function ForecastCard({ forecast }) {
  const [open, setOpen] = useState(false);
  const color = CAT_COLOR[forecast.category] || CAT_COLOR.default;
  const trendColor = TREND_COLOR[forecast.trendDirection] || C.muted;

  // Scenario probabilities (must sum to ~100)
  const pUp   = Math.round(forecast.probability * 0.35);
  const pBase = Math.round(forecast.probability * 0.50);
  const pDown = 100 - pUp - pBase;

  return (
    <div style={{
      background:`linear-gradient(160deg,${C.surface},#0a1428)`,
      border:`1px solid ${color}28`,
      borderRadius:"16px", overflow:"hidden",
      opacity: forecast.isWeak ? 0.82 : 1,
    }}>
      {/* Top accent bar */}
      <div style={{ height:"3px", background:`linear-gradient(90deg,${color},transparent)` }} />

      <div style={{ padding:"16px 18px", display:"grid", gap:"14px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
          <ConfidenceArc value={forecast.confidence} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap", marginBottom:"4px" }}>
              <span style={{ background:`${color}18`, color,
                border:`1px solid ${color}30`, fontSize:"10px", fontWeight:800,
                padding:"2px 9px", borderRadius:"999px" }}>
                {forecast.category}
              </span>
              <span style={{ background:`${trendColor}12`, color:trendColor,
                fontSize:"10px", fontWeight:700, padding:"2px 8px", borderRadius:"999px" }}>
                {TREND_ICON[forecast.trendDirection]} {
                  forecast.trendDirection === "rising" ? "إشارات صاعدة" :
                  forecast.trendDirection === "falling" ? "إشارات هابطة" : "مستقر"
                }
              </span>
              <span style={{ color:C.muted, fontSize:"10px" }}>
                ⏱ {HORIZON_LABEL[forecast.timeHorizon] || forecast.timeHorizon}
              </span>
              {forecast.isWeak && (
                <span style={{ color:C.muted, fontSize:"10px", fontStyle:"italic" }}>
                  إشارة ضعيفة
                </span>
              )}
            </div>
            <h3 style={{ color:C.text, fontSize:"14px", fontWeight:800, margin:0, lineHeight:1.4 }}>
              {forecast.topic}
            </h3>
            <div style={{ color:C.muted, fontSize:"11px", marginTop:"3px" }}>
              {forecast.region} · {forecast.signalCount} إشارة · {forecast.linkedEvents?.length || 0} حدث
            </div>
          </div>
          {/* Probability circle */}
          <div style={{
            width:"52px", height:"52px", borderRadius:"50%", flexShrink:0,
            border:`3px solid ${color}`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            background:`${color}08`
          }}>
            <span style={{ color, fontSize:"14px", fontWeight:900, lineHeight:1 }}>
              {forecast.probability}%
            </span>
            <span style={{ color:C.muted, fontSize:"8px" }}>احتمال</span>
          </div>
        </div>

        {/* Probability bar */}
        <ProbBar value={forecast.probability} color={color} label="الاحتمالية" />

        {/* Scenarios */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <ScenarioCard label="السيناريو الأساسي" text={forecast.baseCase}
            icon="📌" color={C.blue}   probability={pBase} />
        </div>
        {open && (
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <ScenarioCard label="السيناريو الإيجابي" text={forecast.upsideCase}
              icon="↑" color={C.green}  probability={pUp} />
            <ScenarioCard label="السيناريو السلبي"   text={forecast.downsideCase}
              icon="↓" color={C.red}    probability={pDown} />
          </div>
        )}
        <button onClick={() => setOpen(p => !p)} style={{
          background:"transparent", border:"none",
          color:C.blue, fontSize:"12px", fontWeight:700, cursor:"pointer",
          padding:"2px 0", textAlign:"right"
        }}>
          {open ? "▲ إخفاء السيناريوهات" : "▼ عرض كامل السيناريوهات"}
        </button>

        {/* Explanation */}
        <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)",
          borderRadius:"8px", padding:"9px 12px" }}>
          <div style={{ color:C.muted, fontSize:"10px", fontWeight:700, marginBottom:"3px",
            letterSpacing:".04em" }}>لماذا هذا التوقع موجود؟</div>
          <p style={{ color:"#94a3b8", fontSize:"12px", lineHeight:1.7, margin:0 }}>
            {forecast.explanation}
          </p>
        </div>

        {/* Drivers */}
        <LinkedDriversPanel
          drivers={forecast.drivers}
          risks={forecast.risks}
          signalCount={forecast.signalCount}
          entities={forecast.entities}
        />

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          color:C.muted, fontSize:"10px" }}>
          <span>آخر تحديث: {forecast.localTimeUAE}</span>
          <span style={{ color: forecast.confidence >= 60 ? C.green : C.amber }}>
            ثقة النظام: {forecast.confidence}%
          </span>
        </div>

        {/* Disclaimer */}
        <div style={{ color:"#374151", fontSize:"10px", fontStyle:"italic", borderTop:"1px solid rgba(255,255,255,.04)", paddingTop:"8px" }}>
          ⚠️ هذه توقعات احتمالية مبنية على الإشارات — ليست حقائق ولا تنبؤات مؤكدة.
        </div>
      </div>
    </div>
  );
}

// ── Sports Club Card ──────────────────────────────────────────────────────────
function SportsForecastCard({ forecast }) {
  const [open, setOpen] = useState(false);
  const hasSig = forecast.signalCount > 0;

  return (
    <div style={{
      background:C.surface, border:"1px solid rgba(251,146,60,.15)",
      borderRadius:"14px", padding:"14px 16px",
      display:"grid", gap:"10px",
      opacity: hasSig ? 1 : 0.75,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:"#fb923c", fontSize:"10px", fontWeight:800,
            letterSpacing:".04em", marginBottom:"3px" }}>⚽ دوري أدنوك</div>
          <div style={{ color:C.text, fontWeight:800, fontSize:"14px" }}>{forecast.club}</div>
          {!hasSig && (
            <div style={{ color:C.muted, fontSize:"10px", marginTop:"2px" }}>
              لا توجد إشارات مباشرة — توقع عام
            </div>
          )}
        </div>
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          background:"rgba(251,146,60,.08)", border:"1px solid rgba(251,146,60,.2)",
          borderRadius:"10px", padding:"6px 12px"
        }}>
          <span style={{ color:"#fb923c", fontWeight:900, fontSize:"16px" }}>
            {forecast.probability}%
          </span>
          <span style={{ color:C.muted, fontSize:"9px" }}>احتمال</span>
        </div>
      </div>

      <ProbBar value={forecast.probability} color="#fb923c" label="احتمالية" />

      <div style={{ background:"rgba(251,146,60,.05)", border:"1px solid rgba(251,146,60,.1)",
        borderRadius:"8px", padding:"9px 12px" }}>
        <p style={{ color:"#94a3b8", fontSize:"12px", lineHeight:1.7, margin:0 }}>
          {forecast.baseCase}
        </p>
      </div>

      {open && (
        <div style={{ display:"grid", gap:"7px" }}>
          <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.15)",
            borderRadius:"8px", padding:"9px 12px" }}>
            <div style={{ color:C.green, fontSize:"10px", fontWeight:700, marginBottom:"3px" }}>↑ سيناريو إيجابي</div>
            <p style={{ color:"#94a3b8", fontSize:"12px", lineHeight:1.6, margin:0 }}>{forecast.upsideCase}</p>
          </div>
          <div style={{ background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.12)",
            borderRadius:"8px", padding:"9px 12px" }}>
            <div style={{ color:C.red, fontSize:"10px", fontWeight:700, marginBottom:"3px" }}>↓ سيناريو سلبي</div>
            <p style={{ color:"#94a3b8", fontSize:"12px", lineHeight:1.6, margin:0 }}>{forecast.downsideCase}</p>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(p => !p)} style={{
        background:"transparent", border:"none",
        color:"#fb923c", fontSize:"11px", fontWeight:700,
        cursor:"pointer", padding:"2px 0", textAlign:"right"
      }}>
        {open ? "▲ إخفاء" : "▼ السيناريوهات الكاملة"}
      </button>
    </div>
  );
}

// ── Stats Header ──────────────────────────────────────────────────────────────
function ForecastStats({ forecasts, risks, signalCount, eventCount, updated }) {
  const highConf = forecasts.filter(f => f.confidence >= 55).length;
  const maxRisk = risks.length ? Math.max(...risks.map(r => r.riskScore)) : 0;

  return (
    <div style={{
      background:"linear-gradient(135deg,#0a0f1a,#0d1628)",
      border:"1px solid rgba(243,211,138,.15)",
      borderRadius:"14px", padding:"16px 20px",
      display:"grid", gap:"12px"
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"8px", height:"8px", borderRadius:"50%",
          background:C.gold, boxShadow:`0 0 8px ${C.gold}80` }} />
        <span style={{ color:C.gold, fontWeight:800, fontSize:"14px", letterSpacing:".04em" }}>
          مركز التوقعات الاستراتيجية
        </span>
        <span style={{ color:C.muted, fontSize:"11px" }}>AI Strategic Forecast Center</span>
      </div>
      <div style={{ display:"flex", gap:"20px", flexWrap:"wrap" }}>
        <Stat label="توقع نشط" value={forecasts.length} color={C.blue} />
        <Stat label="ثقة عالية" value={highConf} color={C.green} />
        <Stat label="إشارة مُدخلة" value={signalCount} color={C.purple} />
        <Stat label="حدث مرتبط" value={eventCount} color={C.amber} />
        <Stat label="أعلى خطر" value={maxRisk} color={C.red} />
        {updated && (
          <span style={{ color:C.muted, fontSize:"11px", marginRight:"auto" }}>
            {updated}
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display:"flex", gap:"4px", alignItems:"baseline" }}>
      <span style={{ color, fontWeight:800, fontSize:"15px" }}>{value}</span>
      <span style={{ color:C.muted, fontSize:"11px" }}>{label}</span>
    </div>
  );
}

// ── View Tabs ─────────────────────────────────────────────────────────────────
const VIEW_TABS = [
  { id:"all",     label:"كل التوقعات",   icon:"🎯" },
  { id:"conflict",label:"نزاع / جيو",    icon:"⚔️" },
  { id:"economy", label:"اقتصاد / طاقة", icon:"📊" },
  { id:"diplomacy",label:"دبلوماسية",    icon:"🤝" },
  { id:"sports",  label:"رياضة UAE",     icon:"⚽" },
  { id:"risks",   label:"مخاطر نشطة",   icon:"⚠️" },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StrategicForecastCenter() {
  const [forecasts, setForecasts]       = useState([]);
  const [sportsForecasts, setSports]    = useState([]);
  const [risks, setRisks]               = useState([]);
  const [signalCount, setSignalCount]   = useState(0);
  const [eventCount, setEventCount]     = useState(0);
  const [updated, setUpdated]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [activeView, setActiveView]     = useState("all");
  const intervalRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/strategic-forecast")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setForecasts(Array.isArray(data.forecasts) ? data.forecasts : []);
        setSports(Array.isArray(data.sportsForecasts) ? data.sportsForecasts : []);
        setRisks(Array.isArray(data.risks) ? data.risks : []);
        setSignalCount(data.signalCount || 0);
        setEventCount(data.eventCount || 0);
        if (data.updated) {
          try {
            const t = new Intl.DateTimeFormat("ar-AE", {
              timeZone:"Asia/Dubai", hour:"2-digit", minute:"2-digit",
              day:"2-digit", month:"2-digit", hour12:false
            }).format(new Date(data.updated));
            setUpdated(t + " (توقيت الإمارات)");
          } catch { setUpdated(""); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 40000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const displayed = useMemo(() => {
    if (activeView === "all")       return forecasts;
    if (activeView === "sports")    return [];
    if (activeView === "risks")     return [];
    if (activeView === "economy")   return forecasts.filter(f => f.category === "economy");
    if (activeView === "diplomacy") return forecasts.filter(f => f.category === "diplomacy");
    if (activeView === "conflict")  return forecasts.filter(f => ["conflict","geopolitics"].includes(f.category));
    return forecasts;
  }, [forecasts, activeView]);

  return (
    <section style={{ maxWidth:"1400px", margin:"0 auto", display:"grid", gap:"20px" }}>

      {/* Header stats */}
      <ForecastStats
        forecasts={forecasts} risks={risks}
        signalCount={signalCount} eventCount={eventCount}
        updated={updated}
      />

      {/* View tabs */}
      <div style={{
        display:"flex", gap:"6px", flexWrap:"wrap",
        padding:"8px 12px",
        background:"rgba(255,255,255,.02)",
        border:"1px solid rgba(255,255,255,.04)",
        borderRadius:"10px"
      }}>
        {VIEW_TABS.map(tab => {
          const active = activeView === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{
              background: active ? "rgba(243,211,138,.12)" : "transparent",
              color: active ? C.gold : C.muted,
              border: active ? "1px solid rgba(243,211,138,.25)" : "1px solid transparent",
              borderRadius:"7px", padding:"6px 14px",
              fontSize:"12px", fontWeight: active ? 800 : 600,
              cursor:"pointer", transition:"all .15s",
              display:"flex", gap:"4px", alignItems:"center"
            }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
        {loading && <span style={{ color:C.muted, fontSize:"11px", alignSelf:"center", marginRight:"auto" }}>
          يحدّث التوقعات…
        </span>}
      </div>

      {/* Risk dashboard */}
      {activeView === "risks" && (
        <div>
          <div style={{ color:C.muted, fontSize:"12px", marginBottom:"14px" }}>
            مستوى المخاطر النشطة المحسوبة من الإشارات الحية
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"10px" }}>
            {risks.map((r, i) => <RiskMeter key={i} risk={r} />)}
          </div>
        </div>
      )}

      {/* Sports forecasts */}
      {activeView === "sports" && (
        <div>
          <div style={{ color:C.muted, fontSize:"12px", marginBottom:"14px" }}>
            توقعات دوري أدنوك للمحترفين — مبنية على إشارات الأندية المرصودة
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"12px" }}>
            {sportsForecasts.map(fc => <SportsForecastCard key={fc.id} forecast={fc} />)}
          </div>
        </div>
      )}

      {/* Main forecast grid */}
      {activeView !== "risks" && activeView !== "sports" && (
        displayed.length === 0 && !loading ? (
          <div style={{ textAlign:"center", padding:"50px", color:C.muted, fontSize:"13px" }}>
            لا توجد توقعات في هذه الفئة — الإشارات غير كافية حالياً
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))", gap:"16px" }}>
            {displayed.map(fc => <ForecastCard key={fc.id} forecast={fc} />)}
          </div>
        )
      )}

      {/* Bottom disclaimer */}
      <div style={{ textAlign:"center", color:"#374151", fontSize:"11px",
        padding:"14px 20px", background:"rgba(255,255,255,.01)",
        border:"1px solid rgba(255,255,255,.04)", borderRadius:"10px" }}>
        جميع التوقعات المعروضة هي تحليلات احتمالية مبنية على إشارات حية — ليست حقائق ولا تنبؤات مؤكدة.
        لا يتجاوز الحد الأقصى للاحتمالية 82% تجنباً للادعاء بالتيقن.
        التوقعات تتحسن مع تراكم الإشارات وتنوع المصادر.
      </div>

      {/* Refresh */}
      <div style={{ textAlign:"center" }}>
        <button onClick={fetchData} disabled={loading} style={{
          background:"rgba(243,211,138,.07)", color:C.gold,
          border:"1px solid rgba(243,211,138,.2)",
          borderRadius:"8px", padding:"9px 22px",
          fontSize:"12px", fontWeight:700,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1
        }}>
          {loading ? "يحدّث التوقعات…" : "🔄 تحديث التوقعات الاستراتيجية"}
        </button>
      </div>
    </section>
  );
}
