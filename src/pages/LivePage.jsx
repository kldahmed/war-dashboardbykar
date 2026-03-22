import React, { useEffect, useRef, useState } from "react";
import { getGlobalEvents, subscribeEvents } from "../lib/globalEventsEngine";
import { formatDisplayTime } from "../AppHelpers";
import { pageShell, panelStyle } from "./shared/pagePrimitives";

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeWhitespace(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function parseTimestamp(v) {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function deriveRegion(item) {
  const r = Array.isArray(item?.region) ? item.region[0] : item?.region;
  return r || item?.location || item?.country || "—";
}

function deriveSeverity(item) {
  const s = Number(item?.severity || item?.severityScore || item?.confidenceAdjusted || item?.confidence || 0);
  const u = String(item?.urgency || item?.impact || "").toLowerCase();
  if (u === "high" || u === "critical" || s >= 70) return "high";
  if (u === "medium" || s >= 40) return "medium";
  return "low";
}

function deriveStatus(item, language) {
  const isAr = language === "ar";
  const urgency = String(item?.urgency || "").toLowerCase();
  if (urgency === "high" || urgency === "critical") return isAr ? "عاجل" : "Breaking";
  if (item?.isLive) return isAr ? "مباشر" : "Live";
  return isAr ? "متابعة" : "Ongoing";
}

function dedupeEvents(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeWhitespace(item?.headline || item?.title || "").toLowerCase().slice(0, 60);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEntries(events, feedStatus, activeAlert, liveBreakingHeadlines) {
  const fromEngine = (events || []).slice(0, 20).map((item) => ({
    id: item.id || item.title,
    headline: normalizeWhitespace(item.title),
    region: deriveRegion(item),
    timestamp: item.timestamp || item.time || new Date().toISOString(),
    severity: deriveSeverity(item),
    source: normalizeWhitespace(item.source) || "Live Feed",
    statusKey: item.urgency || "ongoing",
    category: item.category || "",
  }));

  const fromBreaking = (Array.isArray(feedStatus?.breaking) ? feedStatus.breaking : []).slice(0, 8).map((item) => ({
    id: item.id || item.title,
    headline: normalizeWhitespace(item.title || item.headline),
    region: deriveRegion(item),
    timestamp: item.time || item.timestamp || new Date().toISOString(),
    severity: deriveSeverity(item),
    source: normalizeWhitespace(item.source) || "Live Intake",
    statusKey: "high",
    category: item.category || "",
  }));

  const fromAlert = activeAlert?.title
    ? [{
        id: activeAlert.id || activeAlert.title,
        headline: normalizeWhitespace(activeAlert.title),
        region: deriveRegion(activeAlert),
        timestamp: activeAlert.time || activeAlert.timestamp || new Date().toISOString(),
        severity: "high",
        source: normalizeWhitespace(activeAlert.source) || "Alert",
        statusKey: "high",
        category: "",
      }]
    : [];

  const fromHeadlines = (liveBreakingHeadlines || []).slice(0, 5).map((headline, i) => ({
    id: `headline-${i}`,
    headline: normalizeWhitespace(headline),
    region: "—",
    timestamp: new Date().toISOString(),
    severity: "high",
    source: "Breaking",
    statusKey: "high",
    category: "",
  }));

  const merged = dedupeEvents([...fromAlert, ...fromBreaking, ...fromEngine, ...fromHeadlines])
    .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
    .slice(0, 30);

  return merged;
}

// ── severity colors ─────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  high:   { dot: "#f87171", rail: "#f8717130", badge: "rgba(248,113,113,0.15)", text: "#f87171" },
  medium: { dot: "#fb923c", rail: "#fb923c30", badge: "rgba(251,146,60,0.12)",  text: "#fb923c" },
  low:    { dot: "#4ade80", rail: "#4ade8020", badge: "rgba(74,222,128,0.10)",  text: "#94a3b8" },
};

// ── sub-components ──────────────────────────────────────────────────────────

function SeverityDot({ severity }) {
  const color = SEVERITY_COLOR[severity]?.dot || "#94a3b8";
  return (
    <span
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        boxShadow: severity === "high" ? `0 0 6px ${color}` : "none",
        flexShrink: 0,
        marginTop: 2,
      }}
    />
  );
}

function StatusBadge({ severity, statusKey, language }) {
  const isAr = language === "ar";
  const color = SEVERITY_COLOR[severity]?.text || "#94a3b8";
  const bg   = SEVERITY_COLOR[severity]?.badge || "rgba(255,255,255,0.06)";
  let label;
  if (statusKey === "high" || severity === "high") label = isAr ? "عاجل" : "Breaking";
  else if (statusKey === "live" || statusKey === "medium") label = isAr ? "مباشر" : "Live";
  else label = isAr ? "متابعة" : "Ongoing";

  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 800, letterSpacing: "0.03em" }}>
      {label}
    </span>
  );
}

function LiveEntry({ entry, language }) {
  const sc = SEVERITY_COLOR[entry.severity] || SEVERITY_COLOR.low;
  const isAr = language === "ar";

  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "4px 1fr",
        gap: "0 14px",
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* rail */}
      <div style={{ background: sc.rail, borderRadius: 4, minHeight: 40 }} />

      {/* content */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <SeverityDot severity={entry.severity} />
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, lineHeight: 1.4, flex: 1 }}>
            {entry.headline}
          </span>
          <StatusBadge severity={entry.severity} statusKey={entry.statusKey} language={language} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
          <span>📍 {entry.region}</span>
          <span>🕐 {formatDisplayTime(entry.timestamp, language)}</span>
          <span>📡 {entry.source}</span>
        </div>
      </div>
    </article>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function LivePage({ language = "ar", feedStatus, activeAlert, streamStatus, liveBreakingHeadlines = [] }) {
  const isAr = language === "ar";
  const [events, setEvents] = useState(() => getGlobalEvents() || []);
  const [loading, setLoading] = useState(events.length === 0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const retryRef = useRef(null);

  // Subscribe to engine events
  useEffect(() => {
    const unsub = subscribeEvents((nextEvents) => {
      setEvents(Array.isArray(nextEvents) ? nextEvents : []);
      setLoading(false);
      setLastRefresh(Date.now());
    });

    // Also set loading=false if events already exist
    const initial = getGlobalEvents();
    if (Array.isArray(initial) && initial.length > 0) {
      setEvents(initial);
      setLoading(false);
    }

    return unsub;
  }, []);

  // Manual fallback fetch every 30s if engine is slow
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/global-events");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const items = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
        if (items.length > 0) {
          setEvents(items);
          setLoading(false);
          setLastRefresh(Date.now());
        }
      } catch {
        // fallback to news API
        try {
          const res2 = await fetch("/api/news?category=all");
          if (!res2.ok) return;
          const data2 = await res2.json();
          const items2 = Array.isArray(data2?.articles) ? data2.articles : Array.isArray(data2) ? data2 : [];
          if (items2.length > 0) {
            setEvents(items2);
            setLoading(false);
            setLastRefresh(Date.now());
          }
        } catch {
          setLoading(false);
        }
      }
    };

    if (loading) poll();
    retryRef.current = setInterval(poll, 30_000);
    return () => clearInterval(retryRef.current);
  }, [loading]);

  const entries = buildEntries(events, feedStatus, activeAlert, liveBreakingHeadlines);
  const hasHigh = entries.filter((e) => e.severity === "high").length;

  const L = {
    title:    isAr ? "البث الحي" : "Live Feed",
    subtitle: isAr ? "تسلسل زمني مباشر للأحداث العاجلة والتطورات الجيوسياسية" : "Real-time timeline of breaking events and geopolitical developments",
    status:   streamStatus || (isAr ? "الرصد الحي متصل" : "Live monitoring active"),
    high:     isAr ? `${hasHigh} حدث عاجل` : `${hasHigh} breaking events`,
    loading:  isAr ? "جارٍ تحميل الأحداث الحية…" : "Loading live events…",
    empty:    isAr ? "لا توجد أحداث حية حالياً. النظام يواصل المراقبة." : "No live events available yet. The system is monitoring.",
    retry:    isAr ? "إعادة المحاولة" : "Retry",
    updated:  isAr ? "آخر تحديث" : "Last updated",
  };

  return (
    <div style={pageShell}>
      {/* ── hero ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #f87171", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#f87171", textTransform: "uppercase" }}>
            {L.title}
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>
          {L.subtitle}
        </h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
          <span style={{ color: "#67e8f9" }}>{L.status}</span>
          {hasHigh > 0 ? <span style={{ color: "#f87171", fontWeight: 700 }}>{L.high}</span> : null}
          {!loading ? (
            <span style={{ color: "#475569" }}>
              {L.updated}: {new Date(lastRefresh).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── loading state ── */}
      {loading ? (
        <div style={{ ...panelStyle, padding: "32px 20px", textAlign: "center", color: "#67e8f9", fontSize: 15 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div>{L.loading}</div>
        </div>
      ) : null}

      {/* ── empty state ── */}
      {!loading && entries.length === 0 ? (
        <div style={{ ...panelStyle, padding: "32px 20px", textAlign: "center", color: "#64748b", fontSize: 15 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ marginBottom: 16 }}>{L.empty}</div>
          <button
            type="button"
            onClick={() => setLoading(true)}
            style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#f1f5f9", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {L.retry}
          </button>
        </div>
      ) : null}

      {/* ── feed ── */}
      {!loading && entries.length > 0 ? (
        <section style={{ ...panelStyle, padding: "16px 20px" }}>
          {entries.map((entry) => (
            <LiveEntry key={entry.id} entry={entry} language={language} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
