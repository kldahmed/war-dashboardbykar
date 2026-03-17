/**
 * AI Briefing Generator Engine
 *
 * Analyzes top signals from the Global Events Engine and news feeds,
 * then generates structured voice-ready briefings in Arabic.
 *
 * Briefing structure:
 *   1. Opening — time stamp & event count
 *   2. Top urgent events (severity ≥ 70) — headlines + region
 *   3. Regional spotlight — most active region
 *   4. Market/economic pulse — if relevant
 *   5. Diplomatic & political developments
 *   6. Sports flash — if present
 *   7. Closing — confidence summary & next update
 *
 * Refreshes every 60 minutes. Cached for performance.
 */

import {
  getGlobalEvents,
  getEngineStats,
  getTopUrgentEvents,
  EVENT_CATEGORIES,
} from "./globalEventsEngine";

// ── Cache ──────────────────────────────────────────────────────────────────────
const BRIEFING_TTL = 60 * 60 * 1000; // 1 hour
let _cache = { briefing: null, timestamp: 0, segments: [] };

// ── Time Formatting ────────────────────────────────────────────────────────────
function dubaiTime() {
  try {
    return new Intl.DateTimeFormat("ar-AE", {
      timeZone: "Asia/Dubai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString("ar-AE");
  }
}

function dubaiDate() {
  try {
    return new Intl.DateTimeFormat("ar-AE", {
      timeZone: "Asia/Dubai",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

// ── Segment Builders ───────────────────────────────────────────────────────────

function buildOpening(stats) {
  const time = dubaiTime();
  const date = dubaiDate();
  const lines = [
    `الموجز الصوتي العالمي.`,
    `${date}، الساعة ${time} بتوقيت الإمارات.`,
  ];
  if (stats.total > 0) {
    lines.push(`نرصد الآن ${stats.total} حدثاً عالمياً نشطاً، منها ${stats.urgent} بدرجة حرجة و${stats.high} بدرجة مرتفعة.`);
  } else {
    lines.push(`لا توجد أحداث عالمية نشطة حالياً في نظام الرصد.`);
  }
  return {
    id: "opening",
    label: "الافتتاحية",
    icon: "🎙️",
    text: lines.join(" "),
    priority: 100,
  };
}

function buildUrgentSegment(events) {
  const urgent = events.filter(e => e.severity >= 70).slice(0, 5);
  if (!urgent.length) return null;

  const lines = [`أبرز الأحداث الحرجة:`];
  urgent.forEach((ev, i) => {
    const catMeta = ev.categoryMeta || EVENT_CATEGORIES[ev.category] || {};
    lines.push(
      `${i + 1}. ${ev.title}. المنطقة: ${ev.region}. الخطورة: ${ev.severity} بالمئة. ${ev.signalCount} إشارة مرصودة.`
    );
  });

  return {
    id: "urgent",
    label: "أحداث حرجة",
    icon: "🔴",
    text: lines.join(" "),
    priority: 95,
  };
}

function buildHighPrioritySegment(events) {
  const high = events.filter(e => e.severity >= 50 && e.severity < 70).slice(0, 4);
  if (!high.length) return null;

  const lines = [`تطورات عالية الأهمية:`];
  high.forEach((ev, i) => {
    lines.push(`${ev.title}. ${ev.region}.`);
  });

  return {
    id: "high",
    label: "تطورات مرتفعة",
    icon: "🟠",
    text: lines.join(" "),
    priority: 80,
  };
}

function buildRegionalSpotlight(events, stats) {
  const regions = Object.entries(stats.regionBreakdown || {}).sort((a, b) => b[1] - a[1]);
  if (!regions.length) return null;

  const [topRegion, topCount] = regions[0];
  const regionEvents = events.filter(e => e.region === topRegion).slice(0, 3);

  const lines = [`أكثر المناطق نشاطاً: ${topRegion} بواقع ${topCount} حدث.`];
  regionEvents.forEach(ev => {
    lines.push(`${ev.title}.`);
  });

  return {
    id: "regional",
    label: "المنطقة الأنشط",
    icon: "📍",
    text: lines.join(" "),
    priority: 70,
  };
}

function buildConflictSegment(events) {
  const conflicts = events.filter(e =>
    e.category === "conflict" || e.category === "military" || e.category === "terrorism"
  ).slice(0, 4);
  if (!conflicts.length) return null;

  const lines = [`على صعيد النزاعات والتحركات العسكرية:`];
  conflicts.forEach(ev => {
    const entities = ev.entities?.slice(0, 3).map(e => e.name).join("، ") || "";
    lines.push(`${ev.title}. الأطراف: ${entities || "غير محدد"}.`);
  });

  return {
    id: "conflict",
    label: "نزاعات",
    icon: "⚔️",
    text: lines.join(" "),
    priority: 90,
  };
}

function buildDiplomacySegment(events) {
  const diplo = events.filter(e => e.category === "diplomacy" || e.category === "political").slice(0, 3);
  if (!diplo.length) return null;

  const lines = [`في الملف الدبلوماسي والسياسي:`];
  diplo.forEach(ev => {
    lines.push(`${ev.title}.`);
  });

  return {
    id: "diplomacy",
    label: "دبلوماسية",
    icon: "🤝",
    text: lines.join(" "),
    priority: 60,
  };
}

function buildMarketSegment(events) {
  const market = events.filter(e =>
    e.category === "market" || e.category === "economic" || e.category === "energy"
  ).slice(0, 3);
  if (!market.length) return null;

  const lines = [`في حركة الأسواق والاقتصاد:`];
  market.forEach(ev => {
    lines.push(`${ev.title}.`);
  });

  return {
    id: "market",
    label: "الأسواق",
    icon: "📊",
    text: lines.join(" "),
    priority: 55,
  };
}

function buildSportsSegment(events) {
  const sports = events.filter(e => e.category === "sports").slice(0, 2);
  if (!sports.length) return null;

  const lines = [`وفي الأخبار الرياضية:`];
  sports.forEach(ev => {
    lines.push(`${ev.title}.`);
  });

  return {
    id: "sports",
    label: "رياضة",
    icon: "⚽",
    text: lines.join(" "),
    priority: 30,
  };
}

function buildEmergingSegment(events) {
  const emerging = events.filter(e => e.isEarlyWarning).slice(0, 3);
  if (!emerging.length) return null;

  const lines = [`إشارات ناشئة تحت المراقبة:`];
  emerging.forEach(ev => {
    lines.push(`${ev.title}. ثقة: ${ev.confidence} بالمئة.`);
  });

  return {
    id: "emerging",
    label: "إشارات ناشئة",
    icon: "🔎",
    text: lines.join(" "),
    priority: 40,
  };
}

function buildClosing(stats) {
  const time = dubaiTime();
  const lines = [];

  if (stats.avgConfidence > 0) {
    lines.push(`متوسط مستوى الثقة في البيانات المرصودة: ${stats.avgConfidence} بالمئة.`);
  }
  if (stats.avgSeverity > 0) {
    lines.push(`متوسط الخطورة العالمي: ${stats.avgSeverity} بالمئة.`);
  }
  lines.push(`هذا الموجز تم توليده تلقائياً بواسطة محرك الذكاء الاصطناعي في منصة نبض العالم.`);
  lines.push(`التحديث القادم خلال ساعة. الساعة الآن ${time} بتوقيت الإمارات.`);

  return {
    id: "closing",
    label: "الختام",
    icon: "📡",
    text: lines.join(" "),
    priority: 0,
  };
}

// ── Headline briefing from plain news (fallback) ───────────────────────────────
function buildHeadlineFallback(headlines) {
  if (!headlines?.length) return null;

  const lines = [`أبرز العناوين من غرفة الأخبار:`];
  headlines.slice(0, 6).forEach((h, i) => {
    lines.push(`${i + 1}. ${h}.`);
  });

  return {
    id: "headlines",
    label: "العناوين",
    icon: "📰",
    text: lines.join(" "),
    priority: 50,
  };
}

// ── Main Generator ─────────────────────────────────────────────────────────────

/**
 * Generate a full voice briefing.
 * @param {string[]} headlines — fallback headline strings from news feed
 * @returns {{ segments: Array<{id,label,icon,text,priority}>, fullText: string, generatedAt: number, stats: object }}
 */
export function generateBriefing(headlines = []) {
  const now = Date.now();

  // Return cache if fresh
  if (_cache.briefing && now - _cache.timestamp < BRIEFING_TTL) {
    return _cache.briefing;
  }

  const events = getGlobalEvents();
  const stats = getEngineStats();

  const candidateSegments = [
    buildOpening(stats),
    buildUrgentSegment(events),
    buildConflictSegment(events),
    buildHighPrioritySegment(events),
    buildRegionalSpotlight(events, stats),
    buildDiplomacySegment(events),
    buildMarketSegment(events),
    buildEmergingSegment(events),
    buildSportsSegment(events),
    buildHeadlineFallback(headlines),
    buildClosing(stats),
  ].filter(Boolean);

  // Sort by priority (opening and closing stay at edges)
  const opening = candidateSegments.find(s => s.id === "opening");
  const closing = candidateSegments.find(s => s.id === "closing");
  const middle = candidateSegments
    .filter(s => s.id !== "opening" && s.id !== "closing")
    .sort((a, b) => b.priority - a.priority);

  const segments = [opening, ...middle, closing].filter(Boolean);

  const fullText = segments.map(s => s.text).join(" \n\n ");

  const briefing = {
    segments,
    fullText,
    generatedAt: now,
    stats,
    eventCount: events.length,
  };

  _cache = { briefing, timestamp: now, segments };
  return briefing;
}

/**
 * Force refresh — clear cache and regenerate.
 */
export function refreshBriefing(headlines = []) {
  _cache = { briefing: null, timestamp: 0, segments: [] };
  return generateBriefing(headlines);
}

/**
 * Get a quick 1-line summary for notification display.
 */
export function getQuickSummary() {
  const events = getGlobalEvents();
  const stats = getEngineStats();
  if (!events.length) return "لا توجد أحداث عالمية نشطة حالياً";
  const top = events[0];
  return `${stats.total} حدث نشط · أعلى خطورة: ${top.title} (${top.severity}%)`;
}
