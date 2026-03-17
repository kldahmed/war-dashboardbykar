/**
 * XNewsFeed.jsx — X Intelligence Radar
 *
 * Replaces account feed with signal-discovery UI:
 *   - X Signal Priority (top impact)
 *   - Rising Signal Clusters
 *   - Category signal tabs
 *   - Full intelligence cards
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import XPostCard from "./XPostCard";

const C = {
  bg:"#080c12", surface:"#0c1220", border:"rgba(56,189,248,0.12)",
  gold:"#f3d38a", blue:"#38bdf8", green:"#22c55e",
  red:"#ef4444", amber:"#f59e0b", purple:"#a78bfa",
  muted:"#475569", text:"#e2e8f0", dim:"#1e293b",
};

const SIGNAL_TABS = [
  { id:"priority",  label:"أعلى تأثير",    icon:"🎯" },
  { id:"urgent",    label:"عاجل",          icon:"🔴" },
  { id:"regional",  label:"إقليمي",        icon:"🌍" },
  { id:"uae",       label:"إماراتي",       icon:"🇦🇪" },
  { id:"economy",   label:"اقتصاد",        icon:"📊" },
  { id:"sports",    label:"رياضة",         icon:"⚽" },
  { id:"clusters",  label:"مجموعات صاعدة", icon:"🔗" },
  { id:"all",       label:"كل الإشارات",   icon:"📡" },
];

// ── Signal Priority Strip ─────────────────────────────────────────────────────
function SignalPriorityStrip({ signals }) {
  if (!signals?.length) return null;
  return (
    <div style={{
      background:"linear-gradient(135deg,#0a0f1a,#0d1628)",
      border:"1px solid rgba(239,68,68,.2)",
      borderRadius:"14px", padding:"18px 20px",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
        <div style={{ width:"7px", height:"7px", borderRadius:"50%",
          background:C.red, boxShadow:`0 0 8px ${C.red}80`,
          animation:"pulse 1.4s ease-in-out infinite" }} />
        <span style={{ color:C.gold, fontWeight:800, fontSize:"14px", letterSpacing:".04em" }}>
          X Signal Priority
        </span>
        <span style={{ color:C.muted, fontSize:"12px" }}>أقوى الإشارات المرصودة الآن</span>
      </div>
      <div style={{ display:"grid", gap:"8px" }}>
        {signals.slice(0, 5).map((sig, i) => (
          <div key={sig.id || i} style={{
            display:"flex", gap:"10px", alignItems:"flex-start",
            background:"rgba(255,255,255,.025)", borderRadius:"9px",
            padding:"9px 12px", border:"1px solid rgba(255,255,255,.04)"
          }}>
            <span style={{ color: i === 0 ? C.gold : C.muted, fontWeight:900,
              fontSize:"16px", lineHeight:1, minWidth:"18px" }}>{i + 1}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:C.text, fontSize:"12px", lineHeight:1.65,
                display:"-webkit-box", WebkitLineClamp:2,
                WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {sig.translated || sig.text}
              </div>
              <div style={{ display:"flex", gap:"10px", marginTop:"5px", flexWrap:"wrap" }}>
                {sig.region && <span style={{ color:C.blue, fontSize:"11px" }}>📍 {sig.region}</span>}
                <span style={{ color:C.muted, fontSize:"11px" }}>
                  تأثير: <span style={{ color: sig.impactScore >= 70 ? C.red : C.amber, fontWeight:700 }}>
                    {sig.impactScore}
                  </span>
                </span>
                {sig.explanation && (
                  <span style={{ color:"#475569", fontSize:"10px" }}>{sig.explanation}</span>
                )}
              </div>
            </div>
            <div style={{
              width:"34px", height:"34px", borderRadius:"50%", flexShrink:0,
              border:`2px solid ${sig.impactScore >= 70 ? C.red : sig.impactScore >= 50 ? C.amber : C.blue}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color: sig.impactScore >= 70 ? C.red : sig.impactScore >= 50 ? C.amber : C.blue,
              fontSize:"11px", fontWeight:800
            }}>{sig.impactScore}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rising Cluster Card ───────────────────────────────────────────────────────
function ClusterCard({ cluster }) {
  const typeColor = cluster.urgencyCount > 0 ? C.red :
    cluster.category === "economy" ? "#34d399" :
    cluster.category === "sports"  ? "#fb923c" : C.purple;

  return (
    <div style={{
      background:C.surface, border:`1px solid ${typeColor}33`,
      borderRadius:"12px", padding:"14px 16px",
      display:"flex", flexDirection:"column", gap:"8px"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:typeColor, fontSize:"10px", fontWeight:800,
            letterSpacing:".06em", marginBottom:"4px" }}>
            {cluster.label || "إشارة ناشئة"}
          </div>
          <div style={{ color:C.text, fontWeight:700, fontSize:"13px" }}>{cluster.topic}</div>
        </div>
        <div style={{
          background:`${typeColor}18`, color:typeColor,
          border:`1px solid ${typeColor}44`,
          borderRadius:"999px", padding:"3px 10px",
          fontSize:"11px", fontWeight:800, whiteSpace:"nowrap"
        }}>
          {cluster.volume} إشارة
        </div>
      </div>
      <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
        {(cluster.entities || []).slice(0, 3).map((e, i) => (
          <span key={i} style={{ background:"rgba(255,255,255,.04)",
            color:"#94a3b8", border:"1px solid rgba(255,255,255,.07)",
            fontSize:"10px", padding:"2px 7px", borderRadius:"999px" }}>{e}</span>
        ))}
        {cluster.region && (
          <span style={{ background:"rgba(56,189,248,.06)", color:C.blue,
            border:"1px solid rgba(56,189,248,.12)",
            fontSize:"10px", padding:"2px 7px", borderRadius:"999px" }}>
            📍 {cluster.region}
          </span>
        )}
      </div>
      <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
        <div style={{ flex:1, height:"3px", background:C.dim, borderRadius:"2px" }}>
          <div style={{ width:`${cluster.confidence}%`, height:"100%",
            background:typeColor, borderRadius:"2px" }} />
        </div>
        <span style={{ color:C.muted, fontSize:"10px", whiteSpace:"nowrap" }}>
          ثقة: <span style={{ color:typeColor, fontWeight:700 }}>{cluster.confidence}%</span>
        </span>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats, live, updated }) {
  return (
    <div style={{
      display:"flex", gap:"16px", flexWrap:"wrap", alignItems:"center",
      padding:"10px 16px", background:"rgba(255,255,255,.02)",
      border:"1px solid rgba(255,255,255,.05)", borderRadius:"10px"
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
        <div style={{ width:"6px", height:"6px", borderRadius:"50%",
          background: live ? C.green : C.muted }} />
        <span style={{ color: live ? C.green : C.muted, fontSize:"11px", fontWeight:700 }}>
          {live ? "بث مباشر" : "بيانات محلية"}
        </span>
      </div>
      {stats && <>
        <Pill label="إشارة" value={stats.total} color={C.blue} />
        <Pill label="عاجل"  value={stats.urgent} color={C.red} />
        <Pill label="مجموعة" value={stats.clusterCount} color={C.purple} />
        <Pill label="نطاق"  value={stats.domains} color={C.amber} />
      </>}
      {updated && <span style={{ color:C.muted, fontSize:"11px", marginRight:"auto" }}>{updated}</span>}
    </div>
  );
}

function Pill({ label, value, color }) {
  return (
    <div style={{ display:"flex", gap:"5px", alignItems:"baseline" }}>
      <span style={{ color, fontWeight:800, fontSize:"14px" }}>{value}</span>
      <span style={{ color:C.muted, fontSize:"11px" }}>{label}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function XNewsFeed() {
  const [posts, setPosts]         = useState([]);
  const [clusters, setClusters]   = useState([]);
  const [layers, setLayers]       = useState(null);
  const [stats, setStats]         = useState(null);
  const [live, setLive]           = useState(false);
  const [updated, setUpdated]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState("priority");
  const [lowSignal, setLowSignal] = useState(false);
  const [debug, setDebug]         = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/x-feed")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setClusters(Array.isArray(data.clusters) ? data.clusters : []);
        setLayers(data.layers || null);
        setStats(data.stats || null);
        setLive(!!data.live);
        setLowSignal(!!data.lowSignal);
        setDebug(data.debug || null);
        if (data.updated) {
          try {
            const t = new Intl.DateTimeFormat("ar-AE", {
              timeZone:"Asia/Dubai", hour:"2-digit", minute:"2-digit", hour12:false
            }).format(new Date(data.updated));
            setUpdated(t + " (توقيت الإمارات)");
          } catch { setUpdated(data.updated); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const displayedItems = useMemo(() => {
    if (!posts.length && !clusters.length) return [];
    const L = layers || {};

    if (activeTab === "clusters") return null; // clusters rendered separately
    const rankFn = p => (p.impactScore || 0) + (p.urgency === "high" ? 20 : p.urgency === "medium" ? 8 : 0);

    switch (activeTab) {
      case "priority":  return (L.topSignals || [...posts].sort((a,b) => rankFn(b) - rankFn(a)).slice(0, 30));
      case "urgent":    return (L.urgent     || posts.filter(p => p.urgency === "high")).sort((a,b) => rankFn(b)-rankFn(a));
      case "regional":  return (L.regional   || posts.filter(p => ["الإمارات","الخليج","الشرق الأوسط","إيران","اليمن"].includes(p.region))).sort((a,b)=>rankFn(b)-rankFn(a));
      case "uae":       return (L.uae        || posts.filter(p => p.category === "uae")).sort((a,b)=>rankFn(b)-rankFn(a));
      case "economy":   return (L.economy    || posts.filter(p => p.category === "economy")).sort((a,b)=>rankFn(b)-rankFn(a));
      case "sports":    return (L.sports     || posts.filter(p => p.category === "sports")).sort((a,b)=>rankFn(b)-rankFn(a));
      default:          return [...posts];
    }
  }, [posts, layers, activeTab]);

  const topSignals = layers?.topSignals || [];
  const risingClusters = clusters.filter(c => c.volume >= 2);

  return (
    <section style={{ maxWidth:"1400px", margin:"0 auto", display:"grid", gap:"18px" }}>

      {/* Header */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"5px" }}>
          <span style={{ color:"#f8fafc", fontSize:"26px", fontWeight:900 }}>رادار 𝕏 الاستخباراتي</span>
          <span style={{ background:"rgba(239,68,68,.1)", color:C.red,
            border:"1px solid rgba(239,68,68,.18)", fontSize:"10px", fontWeight:800,
            padding:"3px 9px", borderRadius:"999px", letterSpacing:".06em" }}>
            LIVE SIGNAL ENGINE
          </span>
          {loading && <span style={{ color:C.muted, fontSize:"12px" }}>يجلب الإشارات…</span>}
        </div>
        <p style={{ color:C.muted, fontSize:"12px", margin:0, lineHeight:1.6 }}>
          محرك استشعار حي يفحص 𝕏 بحثاً عن إشارات عالمية — جيوسياسية، اقتصادية، رياضية — دون تحديد حسابات مسبقة
        </p>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} live={live} updated={updated} />

      {/* Low Signal Activity Banner */}
      {lowSignal && (
        <div style={{
          background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.2)",
          borderRadius:"10px", padding:"12px 16px",
          display:"flex", alignItems:"center", gap:"10px"
        }}>
          <span style={{ fontSize:"18px" }}>📡</span>
          <div>
            <span style={{ color:"#f59e0b", fontWeight:800, fontSize:"13px" }}>
              نشاط إشارة منخفض
            </span>
            <span style={{ color:"#94a3b8", fontSize:"12px", marginRight:"8px" }}>
              — تم توسيع نطاق البحث تلقائياً. تُعرض أفضل الإشارات المتاحة.
            </span>
          </div>
        </div>
      )}

      {/* Signal Priority */}
      {topSignals.length > 0 && <SignalPriorityStrip signals={topSignals} />}

      {/* Tabs */}
      <div style={{
        display:"flex", gap:"6px", flexWrap:"wrap",
        padding:"8px 12px",
        background:"rgba(255,255,255,.02)",
        border:"1px solid rgba(255,255,255,.04)",
        borderRadius:"10px"
      }}>
        {SIGNAL_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: active ? "rgba(56,189,248,.15)" : "transparent",
              color: active ? C.blue : C.muted,
              border: active ? "1px solid rgba(56,189,248,.25)" : "1px solid transparent",
              borderRadius:"7px", padding:"6px 12px",
              fontSize:"12px", fontWeight: active ? 800 : 600,
              cursor:"pointer", transition:"all .15s",
              display:"flex", gap:"4px", alignItems:"center"
            }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Clusters view */}
      {activeTab === "clusters" && (
        <div>
          <div style={{ color:C.muted, fontSize:"12px", marginBottom:"12px" }}>
            {risingClusters.length} مجموعة إشارات نشطة — مجموعات من منشورات متعددة حول نفس الموضوع
          </div>
          {risingClusters.length === 0 ? (
            <div style={{ color:C.muted, textAlign:"center", padding:"40px" }}>
              لا توجد مجموعات نشطة بعد — ستظهر عند تجمع إشارات متعددة حول موضوع واحد
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"12px" }}>
              {risingClusters.map(cl => <ClusterCard key={cl.clusterId} cluster={cl} />)}
            </div>
          )}
        </div>
      )}

      {/* Posts grid */}
      {activeTab !== "clusters" && (
        displayedItems?.length === 0 ? (
          <div style={{ color:C.muted, textAlign:"center", padding:"40px", fontSize:"13px" }}>
            لا توجد إشارات في هذه الفئة حالياً
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:"14px" }}>
            {(displayedItems || []).map(post => <XPostCard key={post.id} post={post} />)}
          </div>
        )
      )}

      {/* Refresh */}
      <div style={{ textAlign:"center", display:"flex", gap:"10px", justifyContent:"center", alignItems:"center" }}>
        <button onClick={fetchData} disabled={loading} style={{
          background:"rgba(56,189,248,.07)", color:C.blue,
          border:"1px solid rgba(56,189,248,.18)",
          borderRadius:"8px", padding:"9px 22px",
          fontSize:"12px", fontWeight:700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1
        }}>
          {loading ? "جاري المسح…" : "🔄 مسح الإشارات الجديدة"}
        </button>
        <button onClick={() => setShowDebug(v => !v)} style={{
          background:"rgba(167,139,250,.06)", color:"#a78bfa",
          border:"1px solid rgba(167,139,250,.15)",
          borderRadius:"8px", padding:"9px 14px",
          fontSize:"11px", fontWeight:700, cursor:"pointer"
        }}>
          {showDebug ? "إخفاء" : "🛠 مقاييس"}
        </button>
      </div>

      {/* Debug Panel */}
      {showDebug && debug && (
        <div style={{
          background:"#0a0f1a", border:"1px solid rgba(167,139,250,.15)",
          borderRadius:"10px", padding:"14px 16px",
          display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"10px"
        }}>
          {[
            ["إشارات مجلوبة", debug.signalsFetched],
            ["مجموعات منشأة", debug.clustersCreated],
            ["استعلامات منفذة", debug.queriesExecuted],
            ["أخطاء API", debug.apiErrors],
            ["إشارات RSS", debug.rssSignals],
            ["توسيع تلقائي", debug.broadeningTriggered],
            ["الذاكرة الحالية", debug.memorySize ?? stats?.total],
            ["إشارات الدورة", debug.cycleSignals],
          ].map(([label, val]) => (
            <div key={label} style={{
              background:"rgba(255,255,255,.02)", borderRadius:"7px",
              padding:"8px 12px", border:"1px solid rgba(255,255,255,.04)"
            }}>
              <div style={{ color:"#a78bfa", fontSize:"18px", fontWeight:800 }}>{val ?? "—"}</div>
              <div style={{ color:"#475569", fontSize:"10px", marginTop:"2px" }}>{label}</div>
            </div>
          ))}
          {debug.lastCycle && (
            <div style={{ gridColumn:"1/-1", color:"#334155", fontSize:"10px", paddingTop:"4px" }}>
              آخر دورة: {debug.lastCycle} · {debug.broadened ? "🔍 تم التوسيع" : ""} {debug.usedRSS ? "📰 RSS مُستخدم" : ""}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
