/**
 * Strategic Forecast Engine — Phase 4
 * Scenario-driven probabilistic forecasting based on live intelligence signals.
 *
 * Rules:
 * - Probability derived from real signal counts only (max 78%)
 * - Confidence degrades with weak evidence
 * - Never claims certainty
 * - All outputs are evidence-linked
 */

import { getStore, getByCategory, getBySignal, getByRegion, getStoreStats } from "./intelligenceStore";
import { getForecastMemory, recordForecast } from "./forecastMemory";

// ── Time windows ─────────────────────────────────────────────────────────────
const WINDOW = {
  "6h":  6  * 3600 * 1000,
  "24h": 24 * 3600 * 1000,
  "3d":  72 * 3600 * 1000,
  "7d":  168 * 3600 * 1000,
};
const RECENT_48H = 48 * 3600 * 1000;

function inWindow(item, ms) {
  try { return Date.now() - new Date(item.timestamp).getTime() < ms; } catch { return false; }
}

function recentItems(items, ms = RECENT_48H) {
  return items.filter(i => inWindow(i, ms));
}

// ── Probability engine ────────────────────────────────────────────────────────
/**
 * Compute probability score (30-78) from multiple weighted factors.
 */
function computeProbability({
  signalCount,
  totalItems,
  sourceDiversity,
  crossSourceConfirm,
  entitySensitivity = 0,
  trendAcceleration = 0,
  memoryPattern = 0,
}) {
  if (totalItems === 0 || signalCount === 0) return 30;

  const signalVolume      = Math.min(15, Math.round((signalCount / Math.max(1, totalItems)) * 15));
  const signalConsistency = Math.min(10, Math.round(signalCount * 0.7));
  const sourceTrust       = Math.min(10, sourceDiversity * 2);
  const crossConfirm      = Math.min(10, crossSourceConfirm * 3);
  const entityFactor      = Math.min(8, entitySensitivity);
  const trend             = Math.min(7, trendAcceleration);
  const pattern           = Math.min(8, memoryPattern);

  const raw = 30 + signalVolume + signalConsistency + sourceTrust + crossConfirm + entityFactor + trend + pattern;
  return Math.min(78, Math.round(raw));
}

/**
 * Compute confidence score (15-75).
 */
function computeConfidence({
  trustedSourceCount,
  linkedEventCount,
  storeDepth,
  recencyScore,
  contradictionLevel = 0,
}) {
  const sourcePoints   = Math.min(20, trustedSourceCount * 3);
  const linkedPoints   = Math.min(15, linkedEventCount * 2);
  const depthPoints    = Math.min(15, Math.round(storeDepth / 10));
  const recencyPoints  = Math.min(15, recencyScore * 3);
  const contradiction  = Math.min(20, contradictionLevel * 5);

  const raw = 15 + sourcePoints + linkedPoints + depthPoints + recencyPoints - contradiction;
  return Math.max(15, Math.min(75, Math.round(raw)));
}

/** Count how many sources agree on the same signals. */
function crossSourceScore(items) {
  if (!items.length) return 0;
  const sigSources = {};
  items.forEach(i => {
    const src = i.source || "unknown";
    (i.derivedSignals || []).forEach(s => {
      if (!sigSources[s]) sigSources[s] = new Set();
      sigSources[s].add(src);
    });
  });
  return Math.max(...Object.values(sigSources).map(s => s.size), 0);
}

/** How many positive vs negative items (contradiction = balance near 0.5). */
function contradictionScore(items) {
  if (!items.length) return 0;
  const neg = items.filter(i => i.sentiment === "negative").length;
  const pos = items.filter(i => i.sentiment === "positive").length;
  const ratio = (neg + pos) ? Math.abs(neg - pos) / (neg + pos) : 0;
  return Math.round((1 - ratio) * 4);
}

/** Recency score: items in last 6h weighted highest. */
function recencyScore(items) {
  const r6  = recentItems(items, WINDOW["6h"]).length;
  const r24 = recentItems(items, WINDOW["24h"]).length;
  return Math.min(5, r6 * 2 + r24 * 0.5);
}

/** Trend acceleration: compare 24h vs prior 24h. */
function trendAcceleration(items) {
  const recent = recentItems(items, WINDOW["24h"]).length;
  const older  = items.filter(i => {
    const t = new Date(i.timestamp).getTime();
    const now = Date.now();
    return t < now - WINDOW["24h"] && t > now - 2 * WINDOW["24h"];
  }).length;
  if (recent > older * 1.5) return 3;
  if (recent > older) return 1;
  return 0;
}

// ── Entity sensitivity map ────────────────────────────────────────────────────
const HIGH_SENS_ENTITIES = new Set([
  "إيران","إسرائيل","أوبك","ناتو","الأمم المتحدة","روسيا","الصين","حماس","حزب الله",
  "iran","israel","opec","nato","un","russia","china","hamas","hezbollah","داعش","isis",
]);

function entitySensitivityScore(items) {
  const allEntities = items.flatMap(i => [
    ...(i.organizations || []),
    ...(i.uaeClubs || []),
    ...(i.globalClubs || []),
  ]);
  return Math.min(8, allEntities.filter(e => HIGH_SENS_ENTITIES.has(e.toLowerCase())).length * 2);
}

// ── Signal collectors ─────────────────────────────────────────────────────────
function topDrivers(items, max = 5) {
  const freq = {};
  items.forEach(i => (i.derivedSignals || []).forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, max).map(([s]) => s);
}

function topEntities(items, max = 6) {
  const freq = {};
  items.forEach(i => [
    ...(i.organizations || []),
    ...(i.uaeClubs || []),
    ...(i.globalClubs || []),
  ].forEach(e => { freq[e] = (freq[e] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, max).map(([e]) => e);
}

function topLinkedEvents(items, max = 4) {
  return items
    .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
    .slice(0, max)
    .map(i => ({ id: i.id, title: i.title, source: i.source, timestamp: i.timestamp }));
}

// ── Trend direction label ─────────────────────────────────────────────────────
function trendDirection(items) {
  const recent = recentItems(items, WINDOW["24h"]).length;
  const older  = items.filter(i => {
    const t = new Date(i.timestamp).getTime();
    const now = Date.now();
    return t < now - WINDOW["24h"] && t > now - 2 * WINDOW["24h"];
  }).length;
  if (recent > older * 1.3) return { dir: "تصاعد", arrow: "↑", color: "#ef4444" };
  if (recent < older * 0.7) return { dir: "تراجع", arrow: "↓", color: "#22c55e" };
  return { dir: "استقرار", arrow: "→", color: "#94a3b8" };
}

// ── Scenario generators ───────────────────────────────────────────────────────

const SCENARIOS = {
  conflict: {
    base:    (n) => `استمرار مستوى التوتر الأمني الراهن بناءً على ${n} إشارة رُصدت — دون توسع ميداني مباشر`,
    upside:  () => "تراجع حدة التوتر مع استئناف القنوات الدبلوماسية وتقليص التحركات العسكرية",
    downside:() => "تصاعد عسكري مباشر يرفع المخاطر الإقليمية ويؤثر على الأسواق والشحن",
  },
  geopolitics: {
    base:    (n) => `استمرار الضغوط الجيوسياسية بالمستوى الحالي — ${n} حدث يغذي الحسابات المتشابكة`,
    upside:  () => "تقارب دبلوماسي أو تحرك أممي يخفف حدة التوترات",
    downside:() => "تدهور دبلوماسي أو تصريحات تصعيدية تدفع الأسواق نحو تسعير مخاطر أعلى",
  },
  diplomacy: {
    base:    (n) => `النشاط الدبلوماسي مستمر بوتيرة متوازنة — ${n} إشارة سلام ومفاوضات مرصودة`,
    upside:  () => "إبرام اتفاق أو هدنة رسمية يُعيد رسم خارطة التوترات الإقليمية",
    downside:() => "انهيار مسار التفاوض وعودة التصعيد الميداني",
  },
  energy: {
    base:    (n) => `أسواق الطاقة تحت ضغط معتدل — ${n} إشارة طاقوية واقتصادية مرصودة`,
    upside:  () => "تراجع الإشارات العسكرية وانخفاض العلاوة الجيوسياسية على النفط",
    downside:() => "تصاعد عسكري أو قرار أوبكي يرفع النفط ويضغط على الممرات البحرية",
  },
  markets: {
    base:    (n) => `تقلبات السوق ضمن النطاق المتوقع — ${n} إشارة اقتصادية مرصودة`,
    upside:  () => "بيانات اقتصادية إيجابية تستعيد ثقة المستثمرين",
    downside:() => "صدمة خارجية أو بيانات سلبية تدفع الأسواق نحو موجة بيع",
  },
  sanctions: {
    base:    (n) => `منظومة العقوبات قائمة بالضغط الراهن — ${n} إشارة تشير إلى استمرار التوتر`,
    upside:  () => "رفع جزئي للعقوبات أو استئناف المحادثات الدبلوماسية",
    downside:() => "حزمة عقوبات جديدة تُوسع الضغط وتُعمق التداعيات الاقتصادية",
  },
  sports: {
    base:    (n) => `مشهد رياضي نشط — ${n} إشارة رصدت خلال آخر 48 ساعة`,
    upside:  () => "نتائج إيجابية تعزز ترتيب الأندية وتصعّد المنافسة",
    downside:() => "إصابات أو نتائج سلبية تضغط على المشهد التنافسي",
  },
  transfers: {
    base:    (n) => `سوق الانتقالات نشط — ${n} إشارة انتقالات مرصودة`,
    upside:  () => "إتمام صفقة كبرى ترفع القيمة التنافسية لنادٍ إقليمي أو عالمي",
    downside:() => "تعثر صفقات أو نزاعات عقدية تُربك التخطيط الموسمي",
  },
  uae_title: {
    base:    (n) => `سباق لقب الدوري الإماراتي مفتوح — ${n} إشارة تُحرّك موازين الصدارة`,
    upside:  () => "الفريق المتصدر يحافظ على ضغطه ويمتد بمسافة آمنة على المنافسين",
    downside:() => "تعثر المتصدر وتقارب النقاط يُعيد خلط الأوراق في سباق البطولة",
  },
  regional_instability: {
    base:    (n) => `مستوى عدم الاستقرار الإقليمي يُشير إلى ضغط مستمر — ${n} مؤشر مرصود`,
    upside:  () => "تهدئة سياسية ومساعٍ دبلوماسية تخفض درجة الخطر",
    downside:() => "احتقان متراكم يتحول إلى صدام مفتوح أو أزمة إنسانية",
  },
};

function buildScenarios(key, signalCount) {
  const tpl = SCENARIOS[key] || SCENARIOS.geopolitics;
  return {
    baseCase:    tpl.base(signalCount),
    upsideCase:  tpl.upside(),
    downsideCase: tpl.downside(),
  };
}

// ── Risk engine ───────────────────────────────────────────────────────────────
const RISK_TYPES = [
  { id: "regional_conflict",  label: "مخاطر الصراع الإقليمي",    icon: "⚔️",  signal: "conflict_escalation" },
  { id: "oil_disruption",     label: "انقطاع الطاقة والنفط",     icon: "🛢️",  signal: "energy_signal" },
  { id: "shipping_risk",      label: "مخاطر الشحن البحري",       icon: "🚢",  signal: "conflict_escalation" },
  { id: "market_shock",       label: "صدمة الأسواق المالية",     icon: "📉",  signal: "economic_pressure" },
  { id: "sanctions_risk",     label: "مخاطر العقوبات",           icon: "⚖️",  signal: "sanctions_pressure" },
  { id: "sports_instability", label: "عدم استقرار رياضي",        icon: "⚽",  signal: "sports_activity" },
  { id: "transfer_volatility",label: "تقلبات سوق الانتقالات",   icon: "🔁",  signal: "transfer_market" },
];

export function computeStrategicRisks() {
  const store = getStore();
  if (!store.length) return [];

  return RISK_TYPES.map(rt => {
    const items   = getBySignal(rt.signal);
    const recent  = recentItems(items, WINDOW["24h"]);
    const sources = new Set(recent.map(i => i.source)).size;
    const riskScore = Math.min(100, Math.round(30 + recent.length * 5 + sources * 3));
    const probability = Math.min(78, Math.round(25 + recent.length * 4 + sources * 2));
    const confidence  = Math.min(70, Math.round(20 + sources * 5 + (recent.length >= 3 ? 15 : 0)));
    const linkedSignals = [...new Set(recent.flatMap(i => i.derivedSignals || []))].slice(0, 4);

    return {
      riskType:     rt.id,
      label:        rt.label,
      icon:         rt.icon,
      riskScore,
      probability,
      confidence,
      linkedSignals,
      evidenceCount: recent.length,
      sourceCount:   sources,
    };
  });
}

// ── UAE club forecast generator ───────────────────────────────────────────────
const UAE_CLUBS_DATA = [
  { id: "sharjah",       name: "الشارقة",       nameEn: "sharjah",        color: "#8b0000" },
  { id: "al_ain",        name: "العين",          nameEn: "al ain",         color: "#8b4513" },
  { id: "shabab_ahli",   name: "شباب الأهلي",   nameEn: "shabab al ahli", color: "#dc143c" },
  { id: "al_wasl",       name: "الوصل",          nameEn: "al wasl",        color: "#ffd700" },
  { id: "al_jazira",     name: "الجزيرة",        nameEn: "al jazira",      color: "#808080" },
  { id: "al_wahda",      name: "الوحدة",         nameEn: "al wahda",       color: "#006400" },
];

function buildUaeClubForecast(club, allStore) {
  const clubItems = allStore.filter(i =>
    (i.uaeClubs || []).some(c => c.toLowerCase().includes(club.nameEn.toLowerCase()) || c.includes(club.name))
  );
  const recent = recentItems(clubItems, RECENT_48H);
  const transfers = recent.filter(i => (i.derivedSignals || []).includes("transfer_market")).length;
  const positive = recent.filter(i => i.sentiment === "positive").length;
  const negative = recent.filter(i => i.sentiment === "negative").length;

  const momentum = recent.length >= 3
    ? (positive > negative ? "صاعد" : negative > positive ? "هابط" : "ثابت")
    : "بيانات محدودة";

  const titleProb  = Math.min(78, Math.round(30 + recent.length * 3 + positive * 4));
  const pressScore = Math.min(100, Math.round(30 + negative * 8 + (transfers > 0 ? 10 : 0)));
  const fixtureRisk = recent.length >= 5 ? "مرتفع" : recent.length >= 2 ? "متوسط" : "منخفض";

  const scenarios = buildScenarios("uae_title", recent.length);

  return {
    id: `uae_${club.id}`,
    topic: `سباق اللقب — ${club.name}`,
    category: "uae_title",
    region: "الإمارات",
    entities: [club.name],
    linkedEvents: topLinkedEvents(recent),
    signalCount: recent.length,
    trendDirection: trendDirection(recent),
    ...scenarios,
    probability: titleProb,
    confidence: computeConfidence({
      trustedSourceCount: new Set(recent.map(i => i.source)).size,
      linkedEventCount: recent.length,
      storeDepth: allStore.length,
      recencyScore: recencyScore(recent),
      contradictionLevel: contradictionScore(recent),
    }),
    timeHorizon: "7d",
    lastUpdated: new Date().toISOString(),
    drivers: topDrivers(recent),
    risks: ["fixture_congestion", "injury_risk"],
    explanation: recent.length >= 3
      ? `رُصدت ${recent.length} إشارة تتعلق بـ${club.name} في 48 ساعة. الزخم: ${momentum}. إشارات الانتقالات: ${transfers}.`
      : `تغطية محدودة لـ${club.name} في قاعدة البيانات الحالية — ${recent.length} إشارة فقط.`,
    clubMeta: { color: club.color, momentum, pressScore, fixtureRisk, transfers },
  };
}

// ── Core forecast builders ────────────────────────────────────────────────────

function buildForecast({ id, topic, category, region, items, scenarioKey, timeHorizon, storeSize }) {
  const recent    = recentItems(items, WINDOW["24h"]);
  const sources   = new Set(recent.map(i => i.source));
  const crossConf = crossSourceScore(recent);
  const accel     = trendAcceleration(items);
  const trend     = trendDirection(items);
  const memory    = getForecastMemory(id);
  const memBonus  = memory.successRate ? Math.round(memory.successRate * 5) : 0;

  const probability = computeProbability({
    signalCount:        recent.length,
    totalItems:         Math.max(1, storeSize),
    sourceDiversity:    sources.size,
    crossSourceConfirm: crossConf,
    entitySensitivity:  entitySensitivityScore(recent),
    trendAcceleration:  accel,
    memoryPattern:      memBonus,
  });

  const confidence = computeConfidence({
    trustedSourceCount: sources.size,
    linkedEventCount:   recent.length,
    storeDepth:         storeSize,
    recencyScore:       recencyScore(recent),
    contradictionLevel: contradictionScore(recent),
  });

  const scenarios = buildScenarios(scenarioKey, recent.length);

  const forecast = {
    id,
    topic,
    category,
    region,
    entities:     topEntities(recent),
    linkedEvents: topLinkedEvents(recent),
    signalCount:  recent.length,
    trendDirection: trend,
    ...scenarios,
    probability,
    confidence,
    timeHorizon,
    lastUpdated: new Date().toISOString(),
    drivers:  topDrivers(recent),
    risks:    [], // filled per category
    explanation: buildExplanation({ topic, recent, sources: sources.size, probability, confidence, trend }),
    evidenceStrength: recent.length >= 6 ? "strong" : recent.length >= 3 ? "moderate" : "weak",
  };

  // Record to memory for feedback loop
  recordForecast(id, { probability, confidence, signalCount: recent.length });

  return forecast;
}

function buildExplanation({ topic, recent, sources, probability, confidence, trend }) {
  if (!recent.length) return `بيانات غير كافية لبناء توقع قاطع في موضوع "${topic}".`;

  const confLabel = confidence >= 60 ? "ثقة مرتفعة" : confidence >= 40 ? "ثقة متوسطة" : "ثقة محدودة";
  return (
    `رُصدت ${recent.length} إشارة من ${sources} مصدر تتعلق بـ"${topic}". ` +
    `الاتجاه: ${trend.dir}. ` +
    `الاحتمالية المحسوبة: ${probability}% (${confLabel} — ${confidence}%). ` +
    (confidence < 40 ? "عدد المصادر محدود — يُنصح بمزيد من الرصد قبل اتخاذ موقف حاسم." :
     confidence >= 60 ? "الإشارات متعددة المصادر وحديثة — التوقع مبني على أساس معلوماتي جيد." :
     "التوقع مبني على أساس معتدل من الإشارات — المراقبة المستمرة توفر تحديثاً أدق.")
  );
}

// ── Category forecast map ─────────────────────────────────────────────────────

export function generateStrategicForecasts(timeHorizon = "24h") {
  const store = getStore();
  if (!store.length) return { forecasts: [], risks: [], uaeClubs: [] };

  const storeSize = store.length;
  const stats = (() => {
    const cutoff = Date.now() - WINDOW["6h"];
    return store.filter(i => { try { return new Date(i.timestamp).getTime() > cutoff; } catch { return false; } }).length;
  })();

  const forecasts = [];

  // --- Conflict Escalation ---
  const conflictItems = getBySignal("conflict_escalation");
  forecasts.push(buildForecast({
    id: "conflict_escalation",
    topic: "التصعيد العسكري والأمني",
    category: "conflict escalation",
    region: detectTopRegion(conflictItems) || "الشرق الأوسط",
    items: conflictItems,
    scenarioKey: "conflict",
    timeHorizon,
    storeSize,
  }));

  // --- Geopolitics ---
  const geoItems = [...getBySignal("political_transition"), ...getBySignal("conflict_escalation")];
  const geoUniq = dedupe(geoItems);
  forecasts.push(buildForecast({
    id: "geopolitics",
    topic: "الجيوسياسة والديناميكيات الدولية",
    category: "geopolitics",
    region: detectTopRegion(geoUniq) || "عالمي",
    items: geoUniq,
    scenarioKey: "geopolitics",
    timeHorizon,
    storeSize,
  }));

  // --- Diplomacy ---
  const diploItems = [...getBySignal("peace_signal"), ...getBySignal("political_transition")];
  forecasts.push(buildForecast({
    id: "diplomacy",
    topic: "المسارات الدبلوماسية وحل النزاعات",
    category: "diplomacy",
    region: detectTopRegion(dedupe(diploItems)) || "عالمي",
    items: dedupe(diploItems),
    scenarioKey: "diplomacy",
    timeHorizon,
    storeSize,
  }));

  // --- Energy / Oil ---
  const energyItems = getBySignal("energy_signal");
  forecasts.push(buildForecast({
    id: "oil_energy",
    topic: "أسواق النفط والطاقة",
    category: "oil / energy",
    region: "عالمي",
    items: energyItems,
    scenarioKey: "energy",
    timeHorizon,
    storeSize,
  }));

  // --- Markets ---
  const marketItems = [...getBySignal("economic_pressure"), ...getByCategory("economy")];
  forecasts.push(buildForecast({
    id: "markets",
    topic: "الأسواق المالية والاقتصاد الكلي",
    category: "markets",
    region: "عالمي",
    items: dedupe(marketItems),
    scenarioKey: "markets",
    timeHorizon,
    storeSize,
  }));

  // --- Sanctions ---
  const sanctItems = getBySignal("sanctions_pressure");
  forecasts.push(buildForecast({
    id: "sanctions",
    topic: "العقوبات والضغوط الاقتصادية",
    category: "sanctions",
    region: detectTopRegion(sanctItems) || "عالمي",
    items: sanctItems,
    scenarioKey: "sanctions",
    timeHorizon,
    storeSize,
  }));

  // --- Regional Instability ---
  const mideastItems = getByRegion("الشرق الأوسط");
  forecasts.push(buildForecast({
    id: "regional_instability",
    topic: "الاستقرار الإقليمي — الشرق الأوسط",
    category: "regional instability",
    region: "الشرق الأوسط",
    items: mideastItems,
    scenarioKey: "regional_instability",
    timeHorizon,
    storeSize,
  }));

  // --- Sports ---
  const sportsItems = getByCategory("sports");
  forecasts.push(buildForecast({
    id: "sports_general",
    topic: "المشهد الرياضي العالمي",
    category: "sports",
    region: "عالمي",
    items: sportsItems,
    scenarioKey: "sports",
    timeHorizon,
    storeSize,
  }));

  // --- Transfers ---
  const transferItems = getBySignal("transfer_market");
  forecasts.push(buildForecast({
    id: "transfers",
    topic: "سوق الانتقالات والصفقات",
    category: "transfers",
    region: "عالمي",
    items: transferItems,
    scenarioKey: "transfers",
    timeHorizon,
    storeSize,
  }));

  // Risks
  const risks = computeStrategicRisks();

  // UAE clubs
  const uaeClubs = UAE_CLUBS_DATA.map(club => buildUaeClubForecast(club, store));

  // Sort forecasts: strong evidence first, then by probability
  const sorted = forecasts.sort((a, b) => {
    const eOrder = { strong: 3, moderate: 2, weak: 1 };
    const eDiff = (eOrder[b.evidenceStrength] || 1) - (eOrder[a.evidenceStrength] || 1);
    if (eDiff !== 0) return eDiff;
    return b.probability - a.probability;
  });

  return { forecasts: sorted, risks, uaeClubs, stats, storeSize };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dedupe(items) {
  const seen = new Set();
  return items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
}

function detectTopRegion(items) {
  const freq = {};
  items.forEach(i => (i.regions || []).forEach(r => { freq[r] = (freq[r] || 0) + 1; }));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

/** Category icons & colors for UI. */
export const CATEGORY_META = {
  "conflict escalation": { icon: "⚔️",  color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  "geopolitics":         { icon: "🌐",  color: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
  "diplomacy":           { icon: "🕊️",  color: "#34d399", bg: "rgba(52,211,153,0.08)" },
  "oil / energy":        { icon: "🛢️",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  "markets":             { icon: "📈",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  "sanctions":           { icon: "⚖️",  color: "#fb923c", bg: "rgba(251,146,60,0.08)"  },
  "sports":              { icon: "⚽",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)"  },
  "transfers":           { icon: "🔁",  color: "#4ade80", bg: "rgba(74,222,128,0.08)"  },
  "uae_title":           { icon: "🇦🇪", color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
  "regional instability":{ icon: "🔥",  color: "#f87171", bg: "rgba(248,113,113,0.08)" },
};

export const TIME_HORIZONS = ["6h", "24h", "3d", "7d"];
export const TIME_HORIZON_LABELS = {
  "6h":  "الـ 6 ساعات القادمة",
  "24h": "الـ 24 ساعة القادمة",
  "3d":  "الـ 3 أيام القادمة",
  "7d":  "الـ 7 أيام القادمة",
};
