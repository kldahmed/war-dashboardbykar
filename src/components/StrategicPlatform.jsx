import React, { useEffect, useMemo, useState } from "react";
import { formatDisplayTime } from "../AppHelpers";
import { getSourceCredibility } from "../lib/agent/credibilityAgent";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import WeatherPanel from "./WeatherPanel";

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function summarizeText(value, maxLength = 150) {
  const text = normalizeWhitespace(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function parseTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function deriveRegion(item) {
  const region = toArray(item?.region)[0];
  return region || item?.location || "Global";
}

function deriveImpactLevel(item) {
  const severity = Number(item?.severityScore || item?.severity || item?.confidenceAdjusted || item?.confidence || 0);
  const urgency = String(item?.urgency || item?.impact || "").toLowerCase();
  if (urgency === "high" || severity >= 75) return "high";
  if (urgency === "medium" || severity >= 45) return "medium";
  return "low";
}

function dedupeByHeadline(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeWhitespace(item?.headline || item?.title || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionCopy(language) {
  const isAr = language === "ar";
  return {
    heroLabel: isAr ? "منصة مراقبة استخباراتية مبسطة" : "Simplified intelligence monitoring platform",
    heroTitle: isAr ? "الصورة العالمية الأوضح في ثلاث طبقات" : "The clearest global picture in three layers",
    heroText: isAr
      ? "تابع الأخبار الأهم، والإشارات الحية، ثم اقرأ تفسيراً استراتيجياً واضحاً لما يتغير الآن وما قد يحدث خلال 72 ساعة."
      : "Track the most important news, the live signal stream, and a clear strategic explanation of what is changing now and what may happen over the next 72 hours.",
    navigation: [
      { id: "news-section",    label: isAr ? "الأخبار"    : "NEWS" },
      { id: "live-feed-section", label: isAr ? "البث الحي" : "LIVE FEED" },
      { id: "weather-section",  label: isAr ? "الطقس"     : "WEATHER" },
      { id: "world-eye-section", label: isAr ? "عين العالم" : "WORLD EYE" },
    ],
    newsTitle: isAr ? "الأخبار" : "NEWS",
    newsSubtitle: isAr ? "أهم التطورات العالمية في بطاقات قصيرة وسريعة القراءة." : "The most important global developments in compact, easy-scan cards.",
    liveTitle: isAr ? "البث الحي" : "LIVE FEED",
    liveSubtitle: isAr ? "مراقبة زمنية مباشرة للأحداث العاجلة والإشارات الجيوسياسية والتطورات الحرجة." : "A real-time monitor for breaking events, geopolitical signals, and urgent developments.",
    worldEyeTitle: isAr ? "عين العالم" : "WORLD EYE",
    worldEyeSubtitle: isAr ? "طبقة التفسير الاستراتيجي التي تشرح ما يحدث الآن ولماذا يهم." : "The intelligence layer that explains what is happening now and why it matters.",
    newsFallback: isAr ? "لا توجد أخبار بارزة متاحة حالياً." : "No top stories are available right now.",
    liveFallback: isAr ? "لا توجد إشارات حية كافية بعد. النظام يواصل المراقبة." : "There are not enough live signals yet. The system is still monitoring.",
    retry: isAr ? "إعادة التحديث" : "Retry refresh",
    region: isAr ? "المنطقة" : "Region",
    source: isAr ? "المصدر" : "Source",
    impact: isAr ? "التأثير" : "Impact",
    location: isAr ? "الموقع" : "Location",
    time: isAr ? "الوقت" : "Time",
    unconfirmed: isAr ? "إشارة غير مؤكدة" : "Unconfirmed signal",
    situationSummary: isAr ? "ملخص الوضع العالمي" : "Global Situation Summary",
    topRisks: isAr ? "أبرز المخاطر العالمية" : "Top Global Risks",
    hotspots: isAr ? "المناطق الأكثر سخونة" : "Hotspot Regions",
    outlook: isAr ? "نظرة 72 ساعة" : "72-Hour Outlook",
    explanation: isAr ? "التفسير الاستراتيجي" : "Strategic Explanation",
    liveMonitor: isAr ? "مراقب مباشر" : "Live monitor",
    nowWatching: isAr ? "يراقب الآن" : "Watching now",
    updated: isAr ? "آخر تحديث" : "Updated",
    risk: isAr ? "مستوى المخاطر" : "Risk Level",
  };
}

function impactLabel(level, language) {
  const map = {
    low: language === "ar" ? "منخفض" : "Low",
    medium: language === "ar" ? "متوسط" : "Medium",
    high: language === "ar" ? "مرتفع" : "High",
  };
  return map[level] || map.low;
}

function buildReadableSummary(worldState, language) {
  const isAr = language === "ar";
  const riskLevel = worldState?.strategicGlobalRisk?.level || "LOW";
  const hotspots = (worldState?.strategicSummary?.regionsWithHighestTension || []).slice(0, 3);
  const actors = (worldState?.strategicSummary?.majorActorsInvolved || []).slice(0, 4);
  const leadRisk = worldState?.strategicSummary?.topGlobalEvents?.[0];

  if (isAr) {
    return [
      `مستوى المخاطر العالمي حالياً ${riskLevel}.`,
      hotspots.length ? `الضغط الأعلى يتركز في ${hotspots.join("، ")}.` : null,
      leadRisk?.title ? `الخطر الأبرز الآن يتمحور حول ${leadRisk.title}.` : null,
      actors.length ? `الأطراف الأكثر حضوراً: ${actors.join("، ")}.` : null,
    ].filter(Boolean).join(" ");
  }

  return [
    `Global risk is currently ${riskLevel}.`,
    hotspots.length ? `The strongest pressure is concentrated in ${hotspots.join(", ")}.` : null,
    leadRisk?.title ? `The leading risk cluster centers on ${leadRisk.title}.` : null,
    actors.length ? `Main actors in focus: ${actors.join(", ")}.` : null,
  ].filter(Boolean).join(" ");
}

export default function StrategicPlatform({
  language = "en",
  lastUpdated = "",
  displayedNews = [],
  loading = false,
  error = "",
  feedStatus = null,
  liveBreakingHeadlines = [],
  streamStatus = "",
  activeAlert = null,
  weatherCities = [],
  weatherAlerts = [],
  weatherLoading = false,
  weatherError = "",
  weatherFetchedAt = "",
  onRetry,
  onOpenArticle,
  onOpenWorldEye,
}) {
  const copy = sectionCopy(language);
  const [worldState, setWorldState] = useState(() => getWorldState());

  useEffect(() => {
    setWorldState(getWorldState());
  }, [displayedNews, feedStatus, activeAlert, language]);

  const newsFallbackEntries = useMemo(() => {
    return dedupeByHeadline(displayedNews)
      .slice(0, 10)
      .map((item) => ({
        id: item.id || item.url || item.title,
        headline: normalizeWhitespace(item.title || item.headline),
        location: deriveRegion(item),
        timestamp: item.time || item.timestamp || new Date().toISOString(),
        severity: deriveImpactLevel(item),
        source: item.source || "News feed",
        isUnconfirmed: getSourceCredibility(item.source).tier === "low",
      }))
      .filter((item) => item.headline);
  }, [displayedNews]);

  useEffect(() => {
    setWorldState(getWorldState());
    return subscribeWorldState((nextState) => {
      setWorldState(nextState);
    });
  }, []);

  const newsCards = useMemo(() => {
    return dedupeByHeadline(displayedNews)
      .slice(0, 12)
      .map((item) => ({
        id: item.id || item.url || item.title,
        headline: normalizeWhitespace(item.title || item.headline),
        source: normalizeWhitespace(item.source) || "Unknown",
        summary: summarizeText(item.summary || item.text || item.description, 148),
        region: deriveRegion(item),
        impactLevel: deriveImpactLevel(item),
        article: item,
      }))
      .filter((item) => item.headline);
  }, [displayedNews]);

  const liveEntries = useMemo(() => {
    const alertEntry = activeAlert?.title
      ? [{
          id: activeAlert.id || activeAlert.title,
          headline: normalizeWhitespace(activeAlert.title),
          location: deriveRegion(activeAlert),
          timestamp: activeAlert.time || activeAlert.timestamp || new Date().toISOString(),
          severity: deriveImpactLevel(activeAlert),
          source: activeAlert.source || "Live alert",
          isUnconfirmed: getSourceCredibility(activeAlert.source).tier === "low",
        }]
      : [];

    const breakingEntries = toArray(feedStatus?.breaking)
      .slice(0, 10)
      .map((item) => ({
        id: item.id || item.title,
        headline: normalizeWhitespace(item.title || item.headline),
        location: deriveRegion(item),
        timestamp: item.time || item.timestamp || new Date().toISOString(),
        severity: deriveImpactLevel(item),
        source: item.source || "Live intake",
        isUnconfirmed: getSourceCredibility(item.source).tier === "low",
      }));

    const strategicEntries = toArray(worldState?.topEvents)
      .slice(0, 10)
      .map((item) => ({
        id: item.id || item.title,
        headline: normalizeWhitespace(item.title || item.headline),
        location: deriveRegion(item),
        timestamp: item.time || item.timestamp || new Date().toISOString(),
        severity: deriveImpactLevel(item),
        source: item.source || "System",
        isUnconfirmed: getSourceCredibility(item.source).tier === "low",
      }));

    return dedupeByHeadline([...alertEntry, ...breakingEntries, ...strategicEntries, ...newsFallbackEntries])
      .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
      .slice(0, 14);
  }, [activeAlert, feedStatus?.breaking, newsFallbackEntries, worldState?.topEvents]);

  const derivedRiskLevel = useMemo(() => {
    if (worldState?.strategicGlobalRisk?.level) return worldState.strategicGlobalRisk.level;
    const highCount = newsFallbackEntries.filter((item) => item.severity === "high").length;
    const mediumCount = newsFallbackEntries.filter((item) => item.severity === "medium").length;
    if (highCount >= 4) return "HIGH";
    if (highCount >= 2 || mediumCount >= 4) return "MODERATE";
    return "LOW";
  }, [newsFallbackEntries, worldState?.strategicGlobalRisk?.level]);

  const summaryText = useMemo(() => buildReadableSummary(worldState, language), [worldState, language]);
  const topRisks = useMemo(() => {
    const strategicRisks = toArray(worldState?.strategicSummary?.topGlobalEvents).slice(0, 3);
    if (strategicRisks.length > 0) return strategicRisks;
    return dedupeByHeadline(displayedNews)
      .slice(0, 3)
      .map((item) => ({
        title: normalizeWhitespace(item.title || item.headline),
        region: deriveRegion(item),
        why: summarizeText(item.summary || item.text || item.description, 150),
      }));
  }, [displayedNews, worldState?.strategicSummary?.topGlobalEvents]);

  const hotspotRegions = useMemo(() => {
    const strategicHotspots = toArray(worldState?.strategicSummary?.regionsWithHighestTension).slice(0, 5);
    if (strategicHotspots.length > 0) return strategicHotspots;

    const regionalScores = new Map();
    newsFallbackEntries.forEach((entry) => {
      const current = regionalScores.get(entry.location) || 0;
      const weight = entry.severity === "high" ? 3 : entry.severity === "medium" ? 2 : 1;
      regionalScores.set(entry.location, current + weight);
    });

    return [...regionalScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region]) => region);
  }, [newsFallbackEntries, worldState?.strategicSummary?.regionsWithHighestTension]);

  const outlookText = worldState?.strategicSummary?.likelyNext72Hours
    || (worldState?.interpretation ? (language === "ar" ? worldState.interpretation.ar : worldState.interpretation.en) : "")
    || (newsFallbackEntries[0]?.headline
      ? (language === "ar" ? `خلال الساعات الـ72 القادمة يتركز الانتباه على ${newsFallbackEntries[0].headline}.` : `Over the next 72 hours, attention is centered on ${newsFallbackEntries[0].headline}.`)
      : "");

  const explanationText = worldState?.strategicSummary?.narrative
    || worldState?.strategicCausalLinks?.[0]?.explanation
    || (worldState?.interpretation ? (language === "ar" ? worldState.interpretation.ar : worldState.interpretation.en) : "")
    || summaryText;

  const riskLevel = derivedRiskLevel;

  return (
    <div className="intel-platform">
      <section className="intel-hero">
        <div className="intel-hero__copy">
          <div className="intel-eyebrow">{copy.heroLabel}</div>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroText}</p>
        </div>

        <div className="intel-hero__status-card">
          <div className="intel-status-badge">{copy.liveMonitor}</div>
          <div className="intel-status-badge intel-status-badge--risk">{copy.risk}: {riskLevel}</div>
          <div className="intel-hero__status-line">
            <span className="intel-live-dot" />
            <strong>{copy.nowWatching}</strong>
          </div>
          <p>{streamStatus || (liveBreakingHeadlines.length > 0 ? liveBreakingHeadlines[0] : summaryText)}</p>
          <div className="intel-hero__meta">{copy.updated}: {lastUpdated}</div>
        </div>
      </section>

      <nav className="intel-section-nav" aria-label="Primary sections">
        {copy.navigation.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="intel-section-nav__link">
            {item.label}
          </a>
        ))}
      </nav>

      <section id="news-section" className="intel-section">
        <div className="intel-section__heading">
          <div>
            <div className="intel-section__eyebrow">{copy.newsTitle}</div>
            <h2>{copy.newsSubtitle}</h2>
          </div>
          {error ? <div className="intel-inline-note">{error}</div> : null}
        </div>

        {loading && newsCards.length === 0 ? <div className="intel-empty-state">Loading latest brief...</div> : null}

        {!loading && newsCards.length === 0 ? (
          <div className="intel-empty-state">
            <span>{copy.newsFallback}</span>
            {typeof onRetry === "function" ? (
              <button type="button" className="intel-action" onClick={onRetry}>{copy.retry}</button>
            ) : null}
          </div>
        ) : null}

        <div className="intel-news-grid">
          {newsCards.map((item) => (
            <article key={item.id} className={`intel-news-card intel-news-card--${item.impactLevel}`}>
              <div className="intel-news-card__topline">
                <span className="intel-tag">{item.source}</span>
                <span className={`intel-impact intel-impact--${item.impactLevel}`}>{impactLabel(item.impactLevel, language)}</span>
              </div>
              <h3>{item.headline}</h3>
              <p>{item.summary}</p>
              <div className="intel-news-card__footer">
                <span>{copy.region}: {item.region}</span>
                <button type="button" className="intel-link-button" onClick={() => onOpenArticle?.(item.article)}>
                  {language === "ar" ? "التفاصيل" : "Details"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="live-feed-section" className="intel-section">
        <div className="intel-section__heading">
          <div>
            <div className="intel-section__eyebrow">{copy.liveTitle}</div>
            <h2>{copy.liveSubtitle}</h2>
          </div>
          <div className="intel-inline-note">{streamStatus || feedStatus?.sourceMode || copy.liveMonitor}</div>
        </div>

        {liveEntries.length === 0 ? <div className="intel-empty-state">{copy.liveFallback}</div> : null}

        <div className="intel-live-feed">
          {liveEntries.map((entry) => (
            <article key={entry.id} className={`intel-live-item intel-live-item--${entry.severity}`}>
              <div className="intel-live-item__rail" />
              <div className="intel-live-item__content">
                <div className="intel-live-item__topline">
                  <span className={`intel-severity-dot intel-severity-dot--${entry.severity}`} />
                  <span className="intel-live-item__headline">{entry.headline}</span>
                  {entry.isUnconfirmed ? <span className="intel-live-item__flag">{copy.unconfirmed}</span> : null}
                </div>
                <div className="intel-live-item__meta">
                  <span>{copy.location}: {entry.location}</span>
                  <span>{copy.time}: {formatDisplayTime(entry.timestamp, language)}</span>
                  <span>{copy.source}: {entry.source}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="weather-section" className="intel-section intel-section--weather">
        <WeatherPanel
          cities={weatherCities}
          alerts={weatherAlerts}
          loading={weatherLoading}
          error={weatherError}
          language={language}
          fetchedAt={weatherFetchedAt}
        />
      </section>

      <section id="world-eye-section" className="intel-section">
        <div className="intel-section__heading">
          <div>
            <div className="intel-section__eyebrow">{copy.worldEyeTitle}</div>
            <h2>{copy.worldEyeSubtitle}</h2>
          </div>
          <div className="intel-world-actions">
            <div className={`intel-risk-pill intel-risk-pill--${String(riskLevel).toLowerCase()}`}>{riskLevel}</div>
            {typeof onOpenWorldEye === "function" ? (
              <button type="button" className="intel-action" onClick={onOpenWorldEye}>
                {language === "ar" ? "فتح عين العالم" : "Open World Eye"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="intel-world-grid">
          <article className="intel-world-card intel-world-card--summary">
            <h3>{copy.situationSummary}</h3>
            <p>{summaryText}</p>
          </article>

          <article className="intel-world-card">
            <h3>{copy.topRisks}</h3>
            <div className="intel-risk-list">
              {topRisks.map((risk) => (
                <div key={risk.title} className="intel-risk-item">
                  <strong>{risk.title}</strong>
                  <span>{risk.region}</span>
                  <p>{summarizeText(risk.why, 150)}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="intel-world-card">
            <h3>{copy.hotspots}</h3>
            <div className="intel-chip-list">
              {hotspotRegions.map((region) => (
                <span key={region} className="intel-chip">{region}</span>
              ))}
            </div>
          </article>

          <article className="intel-world-card">
            <h3>{copy.outlook}</h3>
            <p>{outlookText || summaryText}</p>
          </article>

          <article className="intel-world-card intel-world-card--wide">
            <h3>{copy.explanation}</h3>
            <p>{explanationText || summaryText}</p>
          </article>
        </div>
      </section>
    </div>
  );
}