/**
 * WorldEyePage — /world-eye
 *
 * The main intelligence page. Shows a clear, human-readable strategic brief:
 * 1. Executive summary
 * 2. Top 3 current developments
 * 3. Most sensitive regions
 * 4. 72-hour forecast
 * 5. Why it matters
 * 6. World Eye conclusion
 *
 * Internal technical metrics (signal counts, agent memory, pattern strength, etc.)
 * are consumed internally but never displayed to the visitor.
 */

import React, { useEffect, useMemo, useState } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { formatDisplayTime } from "../AppHelpers";
import { pageShell, panelStyle } from "./shared/pagePrimitives";
import EyeViewer from "../components/EyeViewer";
import DeadlineCountdownCard from "../components/DeadlineCountdownCard";

// ── helpers ────────────────────────────────────────────────────────────────

function safe(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return v;
}

function safeStr(v, fallback = "—") {
  const s = String(v || "").trim();
  return s || fallback;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

// Translate risk level to Arabic
function translateRisk(level, isAr) {
  if (!isAr) return level || "LOW";
  const map = {
    CRITICAL: "حرج",
    HIGH:     "مرتفع",
    MODERATE: "متوسط",
    LOW:      "منخفض",
    ELEVATED: "مرتفع",
  };
  return map[String(level || "").toUpperCase()] || (level || "منخفض");
}

function riskColor(level) {
  const l = String(level || "").toUpperCase();
  if (l === "CRITICAL") return "#f87171";
  if (l === "HIGH" || l === "ELEVATED") return "#fb923c";
  if (l === "MODERATE") return "#fbbf24";
  return "#4ade80";
}

// Build a readable executive summary from the world state
function buildExecutiveSummary(worldState, displayedNews, language) {
  const isAr = language === "ar";

  // Try strategic summary narrative first
  const narrative = safeStr(worldState?.strategicSummary?.narrative || worldState?.strategicCausalLinks?.[0]?.explanation, "");
  if (narrative) return narrative;

  // Try interpretation
  const interp = worldState?.interpretation;
  if (interp) {
    const candidate = isAr ? interp.ar : interp.en;
    if (safeStr(candidate)) return candidate;
  }

  // Build from components
  const riskLevel = worldState?.strategicGlobalRisk?.level || "LOW";
  const hotspots  = safeArray(worldState?.strategicSummary?.regionsWithHighestTension).slice(0, 3);
  const leadEvent = worldState?.strategicSummary?.topGlobalEvents?.[0];
  const actors    = safeArray(worldState?.strategicSummary?.majorActorsInvolved).slice(0, 3);

  if (isAr) {
    const parts = [
      `مستوى المخاطر العالمي حالياً ${translateRisk(riskLevel, true)}.`,
      hotspots.length ? `يتركز التوتر الأعلى في: ${hotspots.join("، ")}.` : null,
      leadEvent?.title ? `أبرز حدث محوري: ${leadEvent.title}.` : null,
      actors.length ? `اللاعبون الأكثر حضوراً: ${actors.join("، ")}.` : null,
    ];
    return parts.filter(Boolean).join(" ") || "يواصل النظام مراقبة المشهد الاستراتيجي العالمي.";
  }

  const parts = [
    `Global risk is currently ${riskLevel}.`,
    hotspots.length ? `Highest tension concentrates in: ${hotspots.join(", ")}.` : null,
    leadEvent?.title ? `Key pivotal event: ${leadEvent.title}.` : null,
    actors.length ? `Main actors in focus: ${actors.join(", ")}.` : null,
  ];
  return parts.filter(Boolean).join(" ") || "The system continues monitoring the global strategic landscape.";
}

// Build top 3 developments
function buildTopDevelopments(worldState, displayedNews, language) {
  const isAr = language === "ar";
  const strategic = safeArray(worldState?.strategicSummary?.topGlobalEvents).slice(0, 3);
  if (strategic.length > 0) {
    return strategic.map((e) => ({
      title:  safeStr(e.title),
      region: safeStr(e.region || e.country, isAr ? "عالمي" : "Global"),
      why:    safeStr(e.why || e.summary || e.description, ""),
    }));
  }

  // Fall back to top news
  return safeArray(displayedNews).slice(0, 3).map((item) => ({
    title:  safeStr(item.title || item.headline),
    region: safeStr(item.region || item.location, isAr ? "عالمي" : "Global"),
    why:    safeStr(item.summary || item.text || item.description, ""),
  }));
}

// Build 72h outlook
function buildOutlook(worldState, isAr) {
  const outlook = worldState?.strategicSummary?.likelyNext72Hours;
  if (safeStr(outlook)) return safeStr(outlook);

  const interp = worldState?.interpretation;
  if (interp) {
    const candidate = isAr ? interp.ar : interp.en;
    if (safeStr(candidate)) return safeStr(candidate);
  }

  const topEvent = worldState?.topEvents?.[0];
  if (topEvent?.title) {
    return isAr
      ? `خلال الـ72 ساعة القادمة يتمحور الانتباه على: ${topEvent.title}.`
      : `Over the next 72 hours, attention centres on: ${topEvent.title}.`;
  }

  return isAr
    ? "النظام يواصل رصد المشهد. لا توقعات حادة خلال الـ72 ساعة القادمة."
    : "The system continues monitoring. No acute forecasts for the next 72 hours.";
}

// "Why it matters" bullets
function buildWhyItMatters(worldState, language) {
  const isAr = language === "ar";
  const causal = safeArray(worldState?.strategicCausalLinks).slice(0, 3);
  if (causal.length > 0) {
    return causal.map((link) => safeStr(link.explanation || link.why, ""));
  }

  const hotspots = safeArray(worldState?.strategicSummary?.regionsWithHighestTension).slice(0, 3);
  const topEvent = worldState?.strategicSummary?.topGlobalEvents?.[0];

  if (isAr) {
    return [
      hotspots.length ? `المناطق الأكثر حساسية (${hotspots.join("، ")}) تشهد تصعيداً يستدعي متابعة دقيقة.` : null,
      topEvent?.title ? `الحدث الأبرز يؤثر على موازين القوى الإقليمية والدولية.` : null,
      "التطورات المتسارعة قد تؤثر على الأسواق والقرارات الاستراتيجية خلال الأيام القادمة.",
    ].filter(Boolean);
  }

  return [
    hotspots.length ? `The most sensitive regions (${hotspots.join(", ")}) are experiencing escalation requiring close attention.` : null,
    topEvent?.title ? `The leading event is shifting regional and global balances of power.` : null,
    "Accelerating developments may impact markets and strategic decisions in the coming days.",
  ].filter(Boolean);
}

// World Eye conclusion
function buildConclusion(worldState, language) {
  const isAr = language === "ar";
  const riskLevel = worldState?.strategicGlobalRisk?.level || "LOW";
  const dominantPattern = worldState?.dominantPattern;
  const patternLabel = isAr
    ? (dominantPattern?.label || dominantPattern?.signal || "")
    : (dominantPattern?.labelEn || dominantPattern?.signal || "");

  if (isAr) {
    return `خلاصة عين العالم: المشهد الاستراتيجي في مستوى ${translateRisk(riskLevel, true)}${patternLabel ? `، مع نمط سائد هو "${patternLabel}"` : ""}. استمر في المتابعة للاطلاع على التطورات الجديدة.`;
  }

  return `World Eye conclusion: The strategic landscape reads at ${riskLevel}${patternLabel ? `, with a dominant pattern of "${patternLabel}"` : ""}. Continue monitoring for new developments.`;
}

// ── sub-components ─────────────────────────────────────────────────────────

function Section({ title, children, accent = "#67e8f9" }) {
  return (
    <section style={{ ...panelStyle, padding: "20px 22px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", color: accent, textTransform: "uppercase", marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function RegionPill({ region }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: 999,
      background: "rgba(251,146,60,0.12)",
      border: "1px solid rgba(251,146,60,0.25)",
      color: "#fb923c",
      fontSize: 13,
      fontWeight: 700,
      margin: "3px 4px 3px 0",
    }}>
      {region}
    </span>
  );
}

function TopDevelopmentCard({ item, index, language }) {
  const isAr = language === "ar";
  const numbers = ["①", "②", "③", "④", "⑤"];
  return (
    <div style={{
      padding: "14px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 18, color: "#67e8f9", flexShrink: 0 }}>{numbers[index] || "•"}</span>
        <strong style={{ color: "#f1f5f9", fontSize: 15, lineHeight: 1.45, flex: 1 }}>
          {item.title}
        </strong>
      </div>
      {item.region && item.region !== "—" ? (
        <div style={{ marginInlineStart: 28, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>📍 {item.region}</span>
        </div>
      ) : null}
      {item.why ? (
        <p style={{ marginInlineStart: 28, margin: "4px 0 0 28px", color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
          {String(item.why).slice(0, 200)}{String(item.why).length > 200 ? "…" : ""}
        </p>
      ) : null}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function WorldEyePage({ language = "ar", feedStatus, activeAlert, displayedNews = [], streamStatus }) {
  const isAr = language === "ar";
  const [worldState, setWorldState] = useState(() => {
    try { return getWorldState(); } catch { return null; }
  });
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    try {
      setWorldState(getWorldState());
    } catch {
      // ignore
    }
    const unsub = subscribeWorldState((next) => {
      setWorldState(next);
      setLastUpdated(Date.now());
    });
    return unsub;
  }, []);

  // Also refresh when news or feedStatus changes
  useEffect(() => {
    try {
      setWorldState(getWorldState());
    } catch {
      // ignore
    }
  }, [displayedNews, feedStatus, activeAlert]);

  const riskLevel       = worldState?.strategicGlobalRisk?.level || "LOW";
  const hotspots        = useMemo(() => safeArray(worldState?.strategicSummary?.regionsWithHighestTension).slice(0, 6), [worldState]);
  const executiveSummary = useMemo(() => buildExecutiveSummary(worldState, displayedNews, language), [worldState, displayedNews, language]);
  const topDevelopments  = useMemo(() => buildTopDevelopments(worldState, displayedNews, language), [worldState, displayedNews, language]);
  const outlook          = useMemo(() => buildOutlook(worldState, isAr), [worldState, isAr]);
  const whyItMatters     = useMemo(() => buildWhyItMatters(worldState, language), [worldState, language]);
  const conclusion       = useMemo(() => buildConclusion(worldState, language), [worldState, language]);

  const L = {
    hero:         isAr ? "عين العالم" : "World Eye",
    heroDesc:     isAr ? "تقرير استخباراتي واضح عما يجري الآن ولماذا يهم" : "A clear intelligence brief on what is happening now and why it matters",
    risk:         isAr ? "مستوى المخاطر" : "Risk Level",
    updated:      isAr ? "آخر تحديث" : "Last updated",
    summary:      isAr ? "الملخص التنفيذي العالمي" : "Global Executive Summary",
    topDev:       isAr ? "أهم 3 تطورات الآن" : "Top 3 Developments Now",
    regions:      isAr ? "المناطق الأكثر حساسية" : "Most Sensitive Regions",
    forecast:     isAr ? "التوقع خلال 72 ساعة" : "72-Hour Forecast",
    why:          isAr ? "لماذا هذا مهم" : "Why This Matters",
    conclusion:   isAr ? "خلاصة عين العالم" : "World Eye Conclusion",
    noRegions:    isAr ? "لا بيانات إقليمية متاحة حالياً." : "No regional data available yet.",
  };

  return (
    <div style={pageShell}>
      <DeadlineCountdownCard language={language} />

      {/* ── Eye Viewer ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <EyeViewer worldState={worldState} feedStatus={feedStatus} language={language} mode="advanced" />
      </section>

      {/* ── Risk Status Strip ──────────────────────────────────────────────── */}
      <section style={{ ...panelStyle, padding: "12px 14px", marginBottom: 28, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          padding: "5px 14px",
          borderRadius: 999,
          background: `${riskColor(riskLevel)}18`,
          border: `1px solid ${riskColor(riskLevel)}40`,
          color: riskColor(riskLevel),
          fontSize: 13,
          fontWeight: 800,
        }}>
          {L.risk}: {translateRisk(riskLevel, isAr)}
        </span>
        <span style={{ color: "#475569", fontSize: 12 }}>
          {L.updated}: {new Date(lastUpdated).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
        </span>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          {isAr ? "نقاط بيانات نشطة" : "Active data points"}: {useMemo(() => {
            const hotspots = safeArray(worldState?.strategicSummary?.regionsWithHighestTension || []);
            const events = safeArray(worldState?.strategicSummary?.topGlobalEvents || []);
            return hotspots.length + events.length;
          }, [worldState])}
        </span>
      </section>

      {/* ── 1. Executive Summary ─────────────────────────────────────────── */}
      <Section title={L.summary} accent="#67e8f9">
        <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          {executiveSummary}
        </p>
      </Section>

      {/* ── 2. Top 3 Developments ────────────────────────────────────────── */}
      <Section title={L.topDev} accent="#a78bfa">
        {topDevelopments.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>
            {isAr ? "لا بيانات كافية حالياً." : "Insufficient data at this time."}
          </p>
        ) : (
          topDevelopments.map((item, i) => (
            <TopDevelopmentCard key={`dev-${i}`} item={item} index={i} language={language} />
          ))
        )}
      </Section>

      {/* ── 3. Most Sensitive Regions ────────────────────────────────────── */}
      <Section title={L.regions} accent="#fb923c">
        {hotspots.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 14 }}>{L.noRegions}</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {hotspots.map((region) => (
              <RegionPill key={region} region={region} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 4. 72h Forecast ──────────────────────────────────────────────── */}
      <Section title={L.forecast} accent="#fbbf24">
        <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
          {outlook}
        </p>
      </Section>

      {/* ── 5. Why it matters ────────────────────────────────────────────── */}
      {whyItMatters.length > 0 ? (
        <Section title={L.why} accent="#4ade80">
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {whyItMatters.map((bullet, i) => (
              <li key={`why-${i}`} style={{ display: "flex", gap: 10, marginBottom: 10, color: "#94a3b8", fontSize: 14, lineHeight: 1.65 }}>
                <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── 6. World Eye Conclusion ───────────────────────────────────────── */}
      <section style={{
        ...panelStyle,
        padding: "20px 22px",
        background: "linear-gradient(135deg, rgba(103,232,249,0.07) 0%, rgba(167,139,250,0.05) 100%)",
        border: "1px solid rgba(103,232,249,0.18)",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>👁️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#67e8f9", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              {L.conclusion}
            </div>
            <p style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
              {conclusion}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
