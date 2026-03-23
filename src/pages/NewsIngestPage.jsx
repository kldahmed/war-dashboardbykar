import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

// ─── Small stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accentColor = "#38bdf8" }) {
  return (
    <div style={{ ...panelStyle, padding: "14px 16px", borderRadius: 16, minWidth: 130 }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color: accentColor, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub ? <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

// ─── Inline mini progress bar ────────────────────────────────────────────────
function MiniBar({ value, max, accent = "#38bdf8" }) {
  const pct = Math.max(2, Math.min(100, max > 0 ? Math.round((value / max) * 100) : 2));
  return (
    <div style={{ background: "rgba(71,85,105,0.35)", borderRadius: 999, overflow: "hidden", height: 6, width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: accent, transition: "width 0.4s" }} />
    </div>
  );
}

// ─── Helper: format ISO timestamp to short time ──────────────────────────────
function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function fmtMs(ms) {
  const n = Number(ms || 0);
  if (n <= 0) return "—";
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

function pct(ratio) {
  return `${(Number(ratio || 0) * 100).toFixed(1)}%`;
}

// ─── Health badge ────────────────────────────────────────────────────────────
function HealthBadge({ status, failures, circuitOpenUntil }) {
  const isCircuit = circuitOpenUntil && new Date(circuitOpenUntil) > new Date();
  const isHighFail = Number(failures || 0) > 5;
  const color = isCircuit ? "#fca5a5" : isHighFail ? "#fdba74" : "#4ade80";
  const label = isCircuit ? "circuit" : isHighFail ? "degraded" : (status || "ok");
  return (
    <span style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}55`, color, borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const SORT_FIELDS = ["raw_today", "unique_today", "duplicate_today", "pulls", "successes", "failures", "last_latency_ms", "trust_base_score"];
const TABS = [
  { id: "all", ar: "الكل", en: "All" },
  { id: "active", ar: "نشط", en: "Active" },
  { id: "failing", ar: "متعثر", en: "Failing" },
  { id: "top", ar: "الأعلى", en: "Top fetchers" },
];

export default function NewsIngestPage({ language = "ar", adminKey = "", onLogout }) {
  const isAr = language === "ar";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState("raw_today");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/news/ingest-metrics", {
        headers: { "X-Admin-Key": String(adminKey || "").trim() },
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const json = await res.json();
      setData(json);
    } catch {
      setError(isAr ? "تعذّر تحميل بيانات الجلب" : "Failed to load ingest metrics");
    } finally {
      setLoading(false);
    }
  }, [adminKey, isAr]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const summary = data?.summary || {};
  const rawSources = data?.sources || [];
  const hourly = data?.hourly_chart || [];
  const maxHourly = Math.max(1, ...hourly.map((h) => Number(h.value || 0)));

  // Filter & sort
  const filteredSources = useMemo(() => {
    let list = rawSources;

    if (tab === "active") list = list.filter((s) => s.active);
    else if (tab === "failing") list = list.filter((s) => Number(s.failures || 0) > 0 && Number(s.failure_ratio || 0) > 0.15);
    else if (tab === "top") list = list.slice().sort((a, b) => Number(b.raw_today || 0) - Number(a.raw_today || 0)).slice(0, 30);

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.type || "").toLowerCase().includes(q) || (s.language || "").toLowerCase().includes(q));

    return list.slice().sort((a, b) => {
      const av = Number(a[sortBy] || 0);
      const bv = Number(b[sortBy] || 0);
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [rawSources, tab, search, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSources.length / PAGE_SIZE));
  const paginated = filteredSources.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(field); setSortDir("desc"); }
    setPage(1);
  };

  const thStyle = (field) => ({
    padding: "8px 6px",
    color: sortBy === field ? "#38bdf8" : "#94a3b8",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    fontSize: 11,
  });

  const maxRaw = Math.max(1, ...filteredSources.map((s) => Number(s.raw_today || 0)));

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={isAr ? "قياس الجلب" : "Ingest Monitor"}
        title={isAr ? "لوحة قياس الجلب وأداء المصادر" : "Fetch Counter & Source Performance"}
        description={isAr
          ? "عدادات دقيقة لكل خبر تم جلبه من كل مصدر — raw، unique، مكرر، محاولات، نجاحات، إخفاقات، وزمن الاستجابة."
          : "Precise counters for every article fetched from every source — raw, unique, duplicate, pulls, successes, failures, and latency."}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 14px", fontWeight: 700, fontSize: 12 }}
            >
              {loading ? (isAr ? "جارٍ..." : "Loading...") : (isAr ? "تحديث" : "Refresh")}
            </button>
            {typeof onLogout === "function" ? (
              <button type="button" onClick={onLogout} style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "8px 12px", fontWeight: 700, fontSize: 12 }}>
                {isAr ? "خروج" : "Logout"}
              </button>
            ) : null}
          </div>
        }
      />

      {/* ── SUMMARY CARDS ─────────────────────────────────────────────────── */}
      <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginBottom: 14 }}>
        <StatCard label={isAr ? "Raw اليوم" : "Raw today"} value={(summary.raw_ingested_today || 0).toLocaleString()} sub={isAr ? "إجمالي الخام" : "Total fetched"} accentColor="#f8fafc" />
        <StatCard label={isAr ? "Unique اليوم" : "Unique today"} value={(summary.unique_ingested_today || 0).toLocaleString()} sub={isAr ? "أخبار فريدة" : "Unique articles"} accentColor="#4ade80" />
        <StatCard label={isAr ? "مكرر اليوم" : "Duplicates today"} value={(summary.duplicates_today || 0).toLocaleString()} sub={`${summary.dup_rate_pct || 0}%`} accentColor="#f97316" />
        <StatCard label={isAr ? "آخر ساعة" : "Last hour"} value={(summary.last_hour || 0).toLocaleString()} accentColor="#38bdf8" />
        <StatCard label={isAr ? "إجمالي المحاولات" : "Total pulls"} value={(summary.total_pulls || 0).toLocaleString()} sub={`✓ ${(summary.total_successes || 0).toLocaleString()} / ✗ ${(summary.total_failures || 0).toLocaleString()}`} accentColor="#a78bfa" />
        <StatCard label={isAr ? "معدل النجاح" : "Success rate"} value={`${summary.overall_success_rate || 0}%`} sub={isAr ? "عبر كل المصادر" : "Across all sources"} accentColor={Number(summary.overall_success_rate || 0) >= 80 ? "#4ade80" : "#fca5a5"} />
        <StatCard label={isAr ? "مصادر نشطة" : "Active sources"} value={summary.active_count || 0} sub={`/ ${summary.total_sources || 0}`} accentColor="#94a3b8" />
        <StatCard label={isAr ? "متعثرة" : "Failing"} value={summary.failing_count || 0} sub={`circuit ${summary.circuit_open_count || 0}`} accentColor="#fca5a5" />
        <StatCard label={isAr ? "الهدف اليومي" : "Daily goal"} value={`${summary.daily_goal_pct || 0}%`} sub={`${(summary.unique_ingested_today || 0).toLocaleString()} / ${(summary.daily_goal_min || 10000).toLocaleString()}`} accentColor={summary.daily_goal_reached ? "#4ade80" : "#f97316"} />
        <StatCard label={isAr ? "نُشر اليوم" : "Published today"} value={(summary.published_today || 0).toLocaleString()} accentColor="#fbbf24" />
        <StatCard label={isAr ? "متوسط الجودة" : "Avg quality"} value={summary.avg_quality || 0} accentColor="#38bdf8" />
        <StatCard label={isAr ? "متوسط الثقة" : "Avg trust"} value={summary.avg_trust || 0} accentColor="#38bdf8" />
      </section>

      {/* ── DAILY GOAL BAR ────────────────────────────────────────────────── */}
      <section style={{ ...panelStyle, padding: "12px 16px", borderRadius: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13 }}>{isAr ? "تقدم الهدف اليومي" : "Daily goal progress"}</span>
          <span style={{ color: summary.daily_goal_reached ? "#4ade80" : "#f97316", fontSize: 12, fontWeight: 700 }}>
            {(summary.unique_ingested_today || 0).toLocaleString()} / {(summary.daily_goal_min || 10000).toLocaleString()}
          </span>
        </div>
        <div style={{ background: "rgba(71,85,105,0.35)", borderRadius: 999, overflow: "hidden", height: 10 }}>
          <div style={{ width: `${Math.min(100, summary.daily_goal_pct || 0)}%`, height: "100%", background: summary.daily_goal_reached ? "#4ade80" : "#f97316", transition: "width 0.6s" }} />
        </div>
      </section>

      {/* ── HOURLY CHART ──────────────────────────────────────────────────── */}
      {hourly.length > 0 ? (
        <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{isAr ? "معدل الجلب بالساعة (أخر 24 ساعة)" : "Fetch rate per hour (last 24h)"}</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 64, overflowX: "auto" }}>
            {hourly.map((bucket) => {
              const h = Number(bucket.value || 0);
              const barH = Math.max(4, Math.round((h / maxHourly) * 60));
              const label = String(bucket.period || "").slice(11, 16);
              return (
                <div key={bucket.period} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 28 }}>
                  <div style={{ color: "#94a3b8", fontSize: 9 }}>{h > 0 ? h : ""}</div>
                  <div style={{ width: 20, height: barH, background: "#38bdf8", borderRadius: "4px 4px 0 0" }} title={`${label}: ${h}`} />
                  <div style={{ color: "#64748b", fontSize: 9, transform: "rotate(-45deg)", transformOrigin: "top center", marginTop: 2 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── SOURCE TABLE ──────────────────────────────────────────────────── */}
      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
        {/* Tabs + search */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setPage(1); }}
              style={{ borderRadius: 10, border: `1px solid ${tab === t.id ? "rgba(56,189,248,0.6)" : "rgba(71,85,105,0.6)"}`, background: tab === t.id ? "rgba(56,189,248,0.14)" : "rgba(15,23,42,0.6)", color: tab === t.id ? "#bae6fd" : "#94a3b8", padding: "6px 12px", fontWeight: 700, fontSize: 12 }}
            >
              {isAr ? t.ar : t.en}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={isAr ? "بحث في المصادر..." : "Search sources..."}
            style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "6px 12px", fontSize: 12, flex: 1, minWidth: 160 }}
          />
          <span style={{ color: "#64748b", fontSize: 11 }}>{filteredSources.length} {isAr ? "مصدر" : "sources"}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: isAr ? "right" : "left" }}>
                <th style={{ ...thStyle(null), color: "#94a3b8", minWidth: 200 }}>{isAr ? "المصدر" : "Source"}</th>
                <th style={thStyle(null)}>{isAr ? "الحالة" : "Health"}</th>
                <th onClick={() => handleSort("raw_today")} style={thStyle("raw_today")}>{isAr ? "Raw اليوم" : "Raw today"} {sortBy === "raw_today" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th onClick={() => handleSort("unique_today")} style={thStyle("unique_today")}>{isAr ? "Unique" : "Unique"} {sortBy === "unique_today" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th onClick={() => handleSort("duplicate_today")} style={thStyle("duplicate_today")}>{isAr ? "مكرر" : "Dup"} {sortBy === "duplicate_today" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th style={{ padding: "8px 6px", color: "#94a3b8", minWidth: 90, fontSize: 11 }}>{isAr ? "نسبة التكرار" : "Dup %"}</th>
                <th onClick={() => handleSort("pulls")} style={thStyle("pulls")}>{isAr ? "المحاولات" : "Pulls"} {sortBy === "pulls" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th onClick={() => handleSort("successes")} style={thStyle("successes")}>{isAr ? "نجح" : "OK"} {sortBy === "successes" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th onClick={() => handleSort("failures")} style={thStyle("failures")}>{isAr ? "فشل" : "Fail"} {sortBy === "failures" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th style={{ padding: "8px 6px", color: "#94a3b8", fontSize: 11 }}>{isAr ? "نسبة الفشل" : "Fail %"}</th>
                <th onClick={() => handleSort("last_latency_ms")} style={thStyle("last_latency_ms")}>{isAr ? "زمن الاستجابة" : "Latency"} {sortBy === "last_latency_ms" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th onClick={() => handleSort("trust_base_score")} style={thStyle("trust_base_score")}>{isAr ? "الثقة" : "Trust"} {sortBy === "trust_base_score" ? (sortDir === "desc" ? "↓" : "↑") : ""}</th>
                <th style={{ padding: "8px 6px", color: "#94a3b8", fontSize: 11 }}>{isAr ? "آخر نجاح" : "Last OK"}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((source) => (
                <tr key={source.source_id || source.name} style={{ borderTop: "1px solid rgba(71,85,105,0.35)", color: "#e2e8f0" }}>
                  <td style={{ padding: "7px 6px", minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 11 }}>{source.name}</div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{source.type} · {source.language} · {source.region || "global"}</div>
                  </td>
                  <td style={{ padding: "7px 6px" }}>
                    <HealthBadge status={source.health_status || source.status} failures={source.failures} circuitOpenUntil={source.circuit_open_until} />
                  </td>
                  <td style={{ padding: "7px 6px" }}>
                    <div style={{ fontWeight: 700, color: Number(source.raw_today || 0) > 0 ? "#f8fafc" : "#475569" }}>
                      {Number(source.raw_today || 0).toLocaleString()}
                    </div>
                    <MiniBar value={Number(source.raw_today || 0)} max={maxRaw} accent="#38bdf8" />
                  </td>
                  <td style={{ padding: "7px 6px", color: "#4ade80" }}>{Number(source.unique_today || 0).toLocaleString()}</td>
                  <td style={{ padding: "7px 6px", color: Number(source.duplicate_today || 0) > 0 ? "#f97316" : "#475569" }}>{Number(source.duplicate_today || 0).toLocaleString()}</td>
                  <td style={{ padding: "7px 6px", color: Number(source.duplicate_ratio || 0) > 0.5 ? "#fca5a5" : "#94a3b8" }}>{pct(source.duplicate_ratio)}</td>
                  <td style={{ padding: "7px 6px", color: "#94a3b8" }}>{Number(source.pulls || 0).toLocaleString()}</td>
                  <td style={{ padding: "7px 6px", color: "#4ade80" }}>{Number(source.successes || 0).toLocaleString()}</td>
                  <td style={{ padding: "7px 6px", color: Number(source.failures || 0) > 0 ? "#fca5a5" : "#475569" }}>{Number(source.failures || 0).toLocaleString()}</td>
                  <td style={{ padding: "7px 6px", color: Number(source.failure_ratio || 0) > 0.4 ? "#fca5a5" : "#94a3b8" }}>{pct(source.failure_ratio)}</td>
                  <td style={{ padding: "7px 6px", color: "#94a3b8" }}>{fmtMs(source.last_latency_ms)}</td>
                  <td style={{ padding: "7px 6px", color: "#94a3b8" }}>{Number(source.trust_base_score || 0)}</td>
                  <td style={{ padding: "7px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(source.last_success_at)}</td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: "20px 6px", color: "#475569", textAlign: "center" }}>
                    {isAr ? "لا توجد مصادر تطابق الفلتر" : "No sources match the filter"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
          <span style={{ color: "#64748b", fontSize: 11 }}>
            {isAr
              ? `${filteredSources.length} مصدر | الصفحة ${page} من ${totalPages}`
              : `${filteredSources.length} sources | Page ${page} of ${totalPages}`}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "5px 10px", fontSize: 11 }}>
              {isAr ? "السابق" : "Prev"}
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "5px 10px", fontSize: 11 }}>
              {isAr ? "التالي" : "Next"}
            </button>
          </div>
        </div>
      </section>

      {error ? <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 10 }}>{error}</div> : null}
    </div>
  );
}
