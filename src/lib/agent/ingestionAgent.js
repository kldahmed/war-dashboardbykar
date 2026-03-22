/**
 * Ingestion Agent — normalizes, classifies, and enriches all incoming platform data.
 * Every item passing through this agent becomes a structured intelligence record.
 *
 * Sources processed: news, X signals, sports, standings, markets, regional events, forecasts.
 * All timestamps use Asia/Dubai (UTC+4).
 *
 * NO fabricated data. Every field is derived from real input.
 */

import { agentMemory } from "./memoryAgent";

// ── Dubai timestamp helper ───────────────────────────────────────────────────
export function dubaiTimestamp() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }).replace(" ", "T") + "+04:00";
}

// ── Category classifier ──────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { category: "conflict",  keys: ["war","attack","strike","bomb","missile","troops","military","invasion","killing","airstrike","حرب","هجوم","ضربة","عسكري","صاروخ","قوات"] },
  { category: "politics",  keys: ["election","president","minister","parliament","diplomat","sanctions","treaty","government","انتخاب","رئيس","وزير","برلمان","دبلوماسي","عقوبات","حكومة"] },
  { category: "economy",   keys: ["gdp","inflation","market","oil","dollar","trade","bank","stock","investment","debt","اقتصاد","تضخم","سوق","نفط","دولار","استثمار","بنك","أسهم"] },
  { category: "sports",    keys: ["goal","match","football","league","transfer","coach","player","cup","هدف","مباراة","كرة","دوري","انتقال","مدرب","لاعب","كأس"] },
  { category: "energy",    keys: ["opec","oil","gas","energy","barrel","pipeline","refinery","أوبك","نفط","غاز","طاقة","برميل","مصفاة"] },
  { category: "regional",  keys: ["middle east","gulf","uae","saudi","iran","iraq","yemen","الشرق الأوسط","الخليج","الإمارات","السعودية","إيران","العراق","اليمن"] },
];

function classifyCategory(text) {
  const t = (text || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some(k => t.includes(k))) return rule.category;
  }
  return "general";
}

// ── Region detector ──────────────────────────────────────────────────────────
const REGION_RULES = [
  { region: "UAE",           keys: ["uae","emirates","dubai","abu dhabi","الإمارات","دبي","أبوظبي"] },
  { region: "Middle East",   keys: ["israel","gaza","iran","iraq","syria","lebanon","saudi","yemen","الشرق الأوسط","غزة","إسرائيل","إيران","العراق","سوريا","لبنان","السعودية","اليمن"] },
  { region: "Europe",        keys: ["ukraine","russia","france","germany","uk","nato","أوروبا","أوكرانيا","روسيا","فرنسا","ألمانيا","بريطانيا","الناتو"] },
  { region: "Americas",      keys: ["usa","america","trump","canada","mexico","أمريكا","الولايات المتحدة","ترامب","كندا"] },
  { region: "Asia",          keys: ["china","japan","india","korea","taiwan","الصين","اليابان","الهند","كوريا","تايوان"] },
  { region: "Africa",        keys: ["africa","sudan","egypt","ethiopia","أفريقيا","السودان","مصر","إثيوبيا"] },
  { region: "Global",        keys: ["global","world","international","international","عالمي","دولي"] },
];

function detectRegion(text) {
  const t = (text || "").toLowerCase();
  const found = REGION_RULES.filter(r => r.keys.some(k => t.includes(k))).map(r => r.region);
  return found.length ? found : ["Global"];
}

// ── Entity extractor ─────────────────────────────────────────────────────────
const KNOWN_ENTITIES = [
  "Trump","Biden","Putin","Netanyahu","Zelensky","Xi Jinping","Biden","MBS","Khamenei",
  "Hamas","Hezbollah","NATO","OPEC","UN","EU","IMF","FIFA","UEFA",
  "Real Madrid","Barcelona","Manchester City","Liverpool","Al Ain","Sharjah","Al Ahli",
  "ترامب","بوتين","نتنياهو","زيلينسكي","حماس","حزب الله","الناتو","أوبك","الأمم المتحدة",
  "العين","الشارقة","شباب الأهلي","الوصل",
];

function extractEntities(text) {
  const t = text || "";
  return KNOWN_ENTITIES.filter(e => t.toLowerCase().includes(e.toLowerCase()));
}

// ── Keyword extractor ────────────────────────────────────────────────────────
const SIGNAL_WORDS = [
  "nuclear","missile","military","sanctions","oil","ceasefire","election","transfer",
  "inflation","recession","strike","airstrike","troops","deal","treaty","crisis","collapse",
  "نووي","صاروخ","عسكري","عقوبات","نفط","هدنة","انتخاب","انتقال",
  "تضخم","ركود","ضربة","غارة","قوات","اتفاق","معاهدة","أزمة","انهيار",
];

function extractKeywords(text) {
  const t = (text || "").toLowerCase();
  return SIGNAL_WORDS.filter(k => t.includes(k.toLowerCase())).slice(0, 10);
}

// ── Urgency scorer ───────────────────────────────────────────────────────────
const HIGH_URGENCY = ["breaking","urgent","alert","war","attack","killed","bomb","عاجل","خبر عاجل","حرب","هجوم","قتل","انفجار"];
const MEDIUM_URGENCY = ["crisis","sanction","escalation","election","transfer","أزمة","عقوبات","تصعيد","انتقال","انتخاب"];

function computeUrgency(text) {
  const t = (text || "").toLowerCase();
  if (HIGH_URGENCY.some(k => t.includes(k))) return "high";
  if (MEDIUM_URGENCY.some(k => t.includes(k))) return "medium";
  return "low";
}

// ── Relevance scorer ─────────────────────────────────────────────────────────
function computeRelevance(text, category, entities) {
  const entityScore = Math.min(40, entities.length * 8);
  const kwScore = Math.min(30, extractKeywords(text).length * 5);
  const catScore = category !== "general" ? 20 : 5;
  const urgScore = computeUrgency(text) === "high" ? 10 : computeUrgency(text) === "medium" ? 5 : 0;
  return Math.min(100, entityScore + kwScore + catScore + urgScore);
}

// ── Summary builder ──────────────────────────────────────────────────────────
function buildSummary(item) {
  const text = item.summary || item.text || item.title || "";
  if (text.length <= 120) return text;
  return text.slice(0, 117) + "…";
}

// ── Confidence scorer ────────────────────────────────────────────────────────
function computeConfidence(entities, keywords, regions) {
  const base = 20;
  return Math.min(90, base + entities.length * 5 + keywords.length * 3 + regions.length * 5);
}

// ── Main ingestion function ──────────────────────────────────────────────────

/**
 * Normalize and enrich a single raw data item from any platform source.
 * Returns a structured AgentItem object.
 *
 * @param {Object} raw - Raw item (news article, X post, sports update, etc.)
 * @param {string} sourceType - "news"|"xsignal"|"sports"|"standings"|"market"|"regional"|"forecast"
 */
export function ingestItem(raw, sourceType = "news") {
  const text = `${raw.title || ""} ${raw.summary || raw.text || raw.body || ""}`;
  const category = raw.category || classifyCategory(text);
  const region = detectRegion(text);
  const entities = extractEntities(text);
  const keywords = extractKeywords(text);
  const urgency = raw.urgency || computeUrgency(text);
  const relevanceScore = computeRelevance(text, category, entities);
  const confidence = computeConfidence(entities, keywords, region);

  const item = {
    id: raw.id || `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceType,
    title: raw.title || "",
    text: raw.summary || raw.text || raw.body || "",
    summary: buildSummary(raw),
    category,
    region,
    entities,
    keywords,
    urgency,
    relevanceScore,
    confidence,
    timestamp: raw.time || raw.timestamp || raw.publishedAt || dubaiTimestamp(),
    linkedClusterId: null, // set by patternAgent later
    source: raw.source || raw.sourceName || "unknown",
    sentiment: raw.sentiment || null,
  };

  // Store in agent memory
  agentMemory.store(item);

  return item;
}

/**
 * Ingest a batch of items.
 * @param {Array} items - Array of raw items
 * @param {string} sourceType
 */
export function ingestBatch(items, sourceType = "news") {
  if (!Array.isArray(items)) return [];
  const normalized = items.map(item => ingestItem(item, sourceType));

  // Server-primary ingestion, local memory remains fallback.
  fetch("/api/agent-ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: normalized, sourceType })
  })
    .then(() => {
      // Keep best-effort transport only; local fallback already persisted.
    })
    .catch(() => {
      // Network failures should not block local ingestion.
    });

  return normalized;
}
