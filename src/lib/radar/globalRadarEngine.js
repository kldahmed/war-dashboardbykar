/**
 * Global Intelligence Radar Engine
 *
 * Core engine that continuously consumes all platform data sources,
 * normalizes them into radar signals, scores, classifies, and ranks them.
 *
 * Data sources:
 *   - news articles (news, fastnews, intelnews)
 *   - X radar signals
 *   - global events engine events
 *   - intelligence memory
 *   - forecast engine signals
 *   - sports intelligence
 *   - market/economic alerts
 */

import { getGlobalEvents, subscribeEvents } from "../globalEventsEngine";
import { scoreRadarSignal } from "./radarScoring";
import { classifySignal, classifyRegion } from "./radarClassifier";

// ── Constants ──────────────────────────────────────────────────────
const POLL_INTERVAL = 25_000; // 25s
const MAX_SIGNALS = 120;
const SIGNAL_TTL = 18 * 60 * 60 * 1000; // 18h
const DEDUP_WINDOW = 2 * 60 * 60 * 1000; // 2h dedup window

// ── Coordinate Database (expanded) ─────────────────────────────────
const COORDS = {
  "غزة":            { lat: 31.5, lon: 34.4, region: "الشرق الأوسط", country: "فلسطين" },
  "إسرائيل":        { lat: 31.5, lon: 34.9, region: "الشرق الأوسط", country: "إسرائيل" },
  "إيران":          { lat: 32.4, lon: 53.7, region: "الشرق الأوسط", country: "إيران" },
  "لبنان":          { lat: 33.9, lon: 35.9, region: "الشرق الأوسط", country: "لبنان" },
  "اليمن":          { lat: 15.6, lon: 47.5, region: "الشرق الأوسط", country: "اليمن" },
  "سوريا":          { lat: 34.8, lon: 38.0, region: "الشرق الأوسط", country: "سوريا" },
  "العراق":         { lat: 33.2, lon: 43.7, region: "الشرق الأوسط", country: "العراق" },
  "أوكرانيا":       { lat: 49.0, lon: 31.2, region: "أوروبا", country: "أوكرانيا" },
  "روسيا":          { lat: 55.7, lon: 37.6, region: "أوروبا", country: "روسيا" },
  "الصين":          { lat: 39.9, lon: 116.4, region: "آسيا والمحيط الهادئ", country: "الصين" },
  "السعودية":       { lat: 23.9, lon: 45.1, region: "الشرق الأوسط", country: "السعودية" },
  "الإمارات":       { lat: 24.5, lon: 54.4, region: "الشرق الأوسط", country: "الإمارات" },
  "البحر الأحمر":   { lat: 21.0, lon: 43.0, region: "الشرق الأوسط", country: "دولي" },
  "مضيق هرمز":      { lat: 26.6, lon: 56.6, region: "الشرق الأوسط", country: "دولي" },
  "الأردن":         { lat: 30.6, lon: 36.2, region: "الشرق الأوسط", country: "الأردن" },
  "مصر":            { lat: 30.0, lon: 31.2, region: "الشرق الأوسط", country: "مصر" },
  "تركيا":          { lat: 39.9, lon: 32.9, region: "أوروبا", country: "تركيا" },
  "الهند":          { lat: 28.6, lon: 77.2, region: "آسيا والمحيط الهادئ", country: "الهند" },
  "باكستان":        { lat: 33.7, lon: 73.0, region: "آسيا والمحيط الهادئ", country: "باكستان" },
  "تايوان":         { lat: 25.0, lon: 121.5, region: "آسيا والمحيط الهادئ", country: "تايوان" },
  "كوريا الشمالية": { lat: 39.0, lon: 125.8, region: "آسيا والمحيط الهادئ", country: "كوريا الشمالية" },
  "الولايات المتحدة":{ lat: 38.9, lon: -77.0, region: "أمريكا الشمالية", country: "الولايات المتحدة" },
  "فرنسا":          { lat: 48.9, lon: 2.35, region: "أوروبا", country: "فرنسا" },
  "بريطانيا":       { lat: 51.5, lon: -0.12, region: "أوروبا", country: "بريطانيا" },
  "ألمانيا":        { lat: 52.5, lon: 13.4, region: "أوروبا", country: "ألمانيا" },
  "النفط":          { lat: 25.0, lon: 55.0, region: "الأسواق العالمية", country: "دولي" },
  "الذهب":          { lat: 40.7, lon: -74.0, region: "الأسواق العالمية", country: "دولي" },
  "الدولار":        { lat: 40.7, lon: -74.0, region: "الأسواق العالمية", country: "دولي" },
  "الناتو":         { lat: 50.8, lon: 4.4, region: "أوروبا", country: "بلجيكا" },
  "ليبيا":          { lat: 32.9, lon: 13.2, region: "أفريقيا", country: "ليبيا" },
  "السودان":        { lat: 15.6, lon: 32.5, region: "أفريقيا", country: "السودان" },
  "الصومال":        { lat: 2.0, lon: 45.3, region: "أفريقيا", country: "الصومال" },
  "البرازيل":       { lat: -15.8, lon: -47.9, region: "أمريكا اللاتينية", country: "البرازيل" },
  "المكسيك":        { lat: 19.4, lon: -99.1, region: "أمريكا اللاتينية", country: "المكسيك" },
  "اليابان":        { lat: 35.7, lon: 139.7, region: "آسيا والمحيط الهادئ", country: "اليابان" },
  "أستراليا":       { lat: -33.9, lon: 151.2, region: "آسيا والمحيط الهادئ", country: "أستراليا" },
  "نيجيريا":        { lat: 9.1, lon: 7.5, region: "أفريقيا", country: "نيجيريا" },
  "جنوب أفريقيا":   { lat: -33.9, lon: 18.4, region: "أفريقيا", country: "جنوب أفريقيا" },
  "كندا":           { lat: 45.4, lon: -75.7, region: "أمريكا الشمالية", country: "كندا" },
};

// ── Entity Patterns ────────────────────────────────────────────────
const ENTITY_PATTERNS = [
  { r: /\b(Gaza|غزة)\b/i,                   name: "غزة",              type: "region",   weight: 10 },
  { r: /\b(Red Sea|البحر الأحمر)\b/i,       name: "البحر الأحمر",     type: "region",   weight: 9  },
  { r: /\b(Strait of Hormuz|هرمز)\b/i,      name: "مضيق هرمز",        type: "region",   weight: 9  },
  { r: /\b(Taiwan|تايوان)\b/i,              name: "تايوان",           type: "region",   weight: 8  },
  { r: /\b(Iran|إيران|ايران)\b/i,           name: "إيران",            type: "country",  weight: 9  },
  { r: /\b(Israel|إسرائيل|اسرائيل)\b/i,    name: "إسرائيل",          type: "country",  weight: 9  },
  { r: /\b(Ukraine|أوكرانيا)\b/i,           name: "أوكرانيا",         type: "country",  weight: 8  },
  { r: /\b(Russia|روسيا)\b/i,               name: "روسيا",            type: "country",  weight: 8  },
  { r: /\b(China|الصين)\b/i,                name: "الصين",            type: "country",  weight: 7  },
  { r: /\b(Saudi|السعودية)\b/i,             name: "السعودية",         type: "country",  weight: 6  },
  { r: /\b(UAE|الإمارات|Emirates)\b/i,      name: "الإمارات",         type: "country",  weight: 6  },
  { r: /\b(Lebanon|لبنان)\b/i,              name: "لبنان",            type: "country",  weight: 7  },
  { r: /\b(Yemen|اليمن)\b/i,                name: "اليمن",            type: "country",  weight: 8  },
  { r: /\b(Syria|سوريا)\b/i,                name: "سوريا",            type: "country",  weight: 8  },
  { r: /\b(Iraq|العراق)\b/i,                name: "العراق",           type: "country",  weight: 7  },
  { r: /\b(Egypt|مصر)\b/i,                  name: "مصر",              type: "country",  weight: 6  },
  { r: /\b(Turkey|تركيا)\b/i,               name: "تركيا",            type: "country",  weight: 6  },
  { r: /\b(Pakistan|باكستان)\b/i,            name: "باكستان",          type: "country",  weight: 6  },
  { r: /\b(India|الهند)\b/i,                name: "الهند",            type: "country",  weight: 6  },
  { r: /\b(North Korea|كوريا الشمالية)\b/i, name: "كوريا الشمالية",   type: "country",  weight: 7  },
  { r: /\b(USA|United States|أمريكا|الولايات المتحدة)\b/i, name: "الولايات المتحدة", type: "country", weight: 7 },
  { r: /\b(France|فرنسا)\b/i,               name: "فرنسا",            type: "country",  weight: 5  },
  { r: /\b(UK|Britain|بريطانيا)\b/i,        name: "بريطانيا",         type: "country",  weight: 5  },
  { r: /\b(Germany|ألمانيا)\b/i,             name: "ألمانيا",          type: "country",  weight: 5  },
  { r: /\b(Libya|ليبيا)\b/i,                name: "ليبيا",            type: "country",  weight: 6  },
  { r: /\b(Sudan|السودان)\b/i,              name: "السودان",          type: "country",  weight: 7  },
  { r: /\b(Somalia|الصومال)\b/i,             name: "الصومال",          type: "country",  weight: 6  },
  { r: /\b(Hamas|حماس)\b/i,                 name: "حماس",             type: "org",      weight: 9  },
  { r: /\b(Hezbollah|حزب الله)\b/i,         name: "حزب الله",         type: "org",      weight: 9  },
  { r: /\b(Houthis|الحوثيون|Houthi)\b/i,   name: "الحوثيون",         type: "org",      weight: 9  },
  { r: /\b(OPEC|أوبك)\b/i,                  name: "أوبك",             type: "org",      weight: 7  },
  { r: /\b(NATO|الناتو)\b/i,                name: "الناتو",           type: "org",      weight: 8  },
  { r: /\b(oil|crude|نفط|بترول)\b/i,        name: "النفط",            type: "market",   weight: 7  },
  { r: /\b(gold|ذهب)\b/i,                   name: "الذهب",            type: "market",   weight: 6  },
  { r: /\b(dollar|دولار)\b/i,               name: "الدولار",          type: "market",   weight: 6  },
  { r: /\b(shipping|ناقلة|سفينة|شحن)\b/i,   name: "الشحن البحري",     type: "sector",   weight: 7  },
  { r: /\b(nuclear|نووي)\b/i,                name: "نووي",             type: "sector",   weight: 9  },
  { r: /\b(sanctions|عقوبات)\b/i,            name: "عقوبات",           type: "sector",   weight: 7  },
  // Sports entities
  { r: /\b(الشارقة|Sharjah FC)\b/i,         name: "الشارقة",          type: "sports",   weight: 5  },
  { r: /\b(العين|Al Ain)\b/i,               name: "العين",            type: "sports",   weight: 5  },
  { r: /\b(شباب الأهلي|Shabab Al Ahli)\b/i, name: "شباب الأهلي",      type: "sports",   weight: 5  },
  { r: /\b(الوصل|Al Wasl)\b/i,              name: "الوصل",            type: "sports",   weight: 5  },
  { r: /\b(الجزيرة|Al Jazira)\b/i,          name: "الجزيرة",          type: "sports",   weight: 5  },
  { r: /\b(الوحدة|Al Wahda)\b/i,            name: "الوحدة",           type: "sports",   weight: 5  },
  { r: /\b(Champions League|دوري الأبطال)\b/i, name: "دوري الأبطال",   type: "sports",   weight: 6  },
  { r: /\b(World Cup|كأس العالم)\b/i,       name: "كأس العالم",       type: "sports",   weight: 7  },
  { r: /\b(Premier League|الدوري الإنجليزي)\b/i, name: "الدوري الإنجليزي", type: "sports", weight: 5 },
  { r: /\b(transfer|انتقال|صفقة)\b/i,       name: "انتقالات",         type: "sports",   weight: 5  },
  { r: /\b(injury|إصابة)\b/i,               name: "إصابة",            type: "sports",   weight: 4  },
];

// ── Internal State ─────────────────────────────────────────────────
let _signals = [];
let _listeners = [];
let _pollTimer = null;
let _running = false;
let _lastUpdate = null;
let _stats = { totalProcessed: 0, activeSignals: 0, lastPollDuration: 0 };

// ── Entity & Geo Extraction ────────────────────────────────────────
function extractEntities(text) {
  const clean = String(text || "").replace(/https?:\/\/\S+/g, "").trim();
  const found = [];
  const seen = new Set();
  for (const p of ENTITY_PATTERNS) {
    if (p.r.test(clean) && !seen.has(p.name)) {
      seen.add(p.name);
      found.push({ name: p.name, type: p.type, weight: p.weight });
    }
  }
  return found;
}

function resolveGeo(entities) {
  for (const e of entities) {
    const geo = COORDS[e.name];
    if (geo) return { region: geo.region, country: geo.country, coordinates: [geo.lon, geo.lat] };
  }
  return { region: "دولي", country: "غير محدد", coordinates: null };
}

// ── Category Inference ─────────────────────────────────────────────
function inferCategory(text) {
  const t = String(text || "").toLowerCase();
  if (/attack|strike|missile|drone|explosion|war|غارة|قصف|صاروخ|انفجار|حرب|اشتباك|تصعيد/i.test(t)) return "صراع / تصعيد";
  if (/ceasefire|diplomacy|talks|summit|agreement|هدنة|محادثات|اتفاق|مفاوضات|دبلوماس/i.test(t)) return "دبلوماسية";
  if (/oil|crude|opec|نفط|أوبك|energy|طاقة|شحن|ناقلة/i.test(t)) return "طاقة / نفط / شحن";
  if (/market|stock|gold|inflation|سوق|ذهب|تضخم|بورصة|اقتصاد|gdp|trade|تجارة/i.test(t)) return "اقتصاد / أسواق";
  if (/transfer|انتقال|صفقة|تعاقد/i.test(t)) return "انتقالات";
  if (/football|soccer|match|league|goal|دوري|مباراة|كرة|بطولة|كأس/i.test(t)) return "رياضة";
  if (/breaking|urgent|عاجل/i.test(t)) return "أحداث عالمية";
  if (/election|government|parliament|president|minister|انتخاب|حكومة|رئيس|وزير|عسكري|جيش/i.test(t)) return "أحداث عالمية";
  return "إشارات ناشئة";
}

function inferSubcategory(text, category) {
  const t = String(text || "").toLowerCase();
  if (category === "صراع / تصعيد") {
    if (/missile|صاروخ/i.test(t)) return "هجوم صاروخي";
    if (/drone|مسيّرة/i.test(t)) return "هجوم بمسيّرات";
    if (/ground|بري/i.test(t)) return "عمليات برية";
    return "تصعيد عسكري";
  }
  if (category === "رياضة") {
    if (/transfer|انتقال|صفقة/i.test(t)) return "انتقالات";
    if (/injury|إصابة/i.test(t)) return "إصابات";
    if (/match|مباراة/i.test(t)) return "مباريات";
    return "أخبار رياضية";
  }
  if (category === "اقتصاد / أسواق") {
    if (/oil|نفط/i.test(t)) return "نفط";
    if (/gold|ذهب/i.test(t)) return "ذهب";
    return "أسواق مالية";
  }
  return "";
}

// ── Trend Direction ────────────────────────────────────────────────
function computeTrend(signalId, currentScore) {
  const prev = _signalHistory.get(signalId);
  if (!prev) return "مستقر";
  if (currentScore > prev + 5) return "صاعد";
  if (currentScore < prev - 5) return "متراجع";
  return "مستقر";
}
const _signalHistory = new Map();

// ── Raw Signal → Normalized Radar Signal ───────────────────────────
function normalizeSignal(raw) {
  const text = `${raw.title || ""} ${raw.summary || raw.text || ""}`;
  const entities = extractEntities(text);
  const geo = resolveGeo(entities);
  const category = raw.radarCategory || inferCategory(text);
  const subcategory = inferSubcategory(text, category);

  const signal = {
    id: raw.id || `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: raw.title || text.slice(0, 120),
    category,
    subcategory,
    region: geo.region,
    country: geo.country,
    coordinates: geo.coordinates,
    severity: "متوسط",
    urgency: raw.urgency || "medium",
    confidence: 50,
    sourceCount: raw.sourceCount || 1,
    linkedEntities: entities.map(e => e.name),
    linkedEvents: raw.linkedEvents || [],
    trendDirection: "مستقر",
    timestamp: raw.time || raw.timestamp || new Date().toISOString(),
    radarScore: 0,
    source: raw.source || "غير محدد",
    sourceType: raw.sourceType || "news",
    text: text.slice(0, 300),
    entities,
    isEmerging: false,
    alertBadge: null,
  };

  // Score it
  signal.radarScore = scoreRadarSignal(signal);

  // Classify severity
  const classified = classifySignal(signal);
  signal.severity = classified.severity;
  signal.isEmerging = classified.isEmerging;
  signal.alertBadge = classified.alertBadge;

  // Trend
  signal.trendDirection = computeTrend(signal.id, signal.radarScore);
  _signalHistory.set(signal.id, signal.radarScore);

  return signal;
}

// ── Deduplicate ────────────────────────────────────────────────────
function deduplicateSignals(existing, fresh) {
  const merged = new Map();
  const cutoff = Date.now() - SIGNAL_TTL;

  // Keep valid existing
  for (const s of existing) {
    if (new Date(s.timestamp).getTime() > cutoff) {
      merged.set(s.id, s);
    }
  }

  // Merge fresh (update if exists, add if new)
  for (const s of fresh) {
    const existingKey = findSimilar(merged, s);
    if (existingKey) {
      const prev = merged.get(existingKey);
      merged.set(existingKey, {
        ...prev,
        radarScore: Math.max(prev.radarScore, s.radarScore),
        confidence: Math.min(95, Math.max(prev.confidence, s.confidence) + 3),
        sourceCount: prev.sourceCount + 1,
        timestamp: new Date(s.timestamp) > new Date(prev.timestamp) ? s.timestamp : prev.timestamp,
        trendDirection: s.radarScore > prev.radarScore ? "صاعد" : prev.trendDirection,
      });
    } else {
      merged.set(s.id, s);
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.radarScore - a.radarScore)
    .slice(0, MAX_SIGNALS);
}

function findSimilar(map, signal) {
  const cutoff = Date.now() - DEDUP_WINDOW;
  for (const [key, existing] of map) {
    if (new Date(existing.timestamp).getTime() < cutoff) continue;
    // Same entities overlap
    const overlap = signal.linkedEntities.filter(e => existing.linkedEntities.includes(e));
    if (overlap.length >= 2 && signal.category === existing.category) return key;
  }
  return null;
}

// ── Fetch All Sources ──────────────────────────────────────────────
async function fetchAllSources() {
  const raw = [];
  const start = Date.now();

  try {
    const [newsRes, xRes, sportsRes, eventsRes] = await Promise.allSettled([
      fetch("/api/news").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/x-feed").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/sports").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/liveevents").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // News
    if (newsRes.status === "fulfilled" && newsRes.value?.news) {
      for (const item of newsRes.value.news.slice(0, 60)) {
        raw.push({
          id: item.id || item.url,
          title: item.title,
          summary: item.summary,
          source: item.source,
          sourceType: item.urgency === "high" ? "breaking" : "news",
          urgency: item.urgency || "low",
          time: item.time || item.publishedAt,
          sourceCount: 1,
        });
      }
    }

    // X signals
    if (xRes.status === "fulfilled" && xRes.value?.posts) {
      for (const post of xRes.value.posts.slice(0, 50)) {
        raw.push({
          id: post.id,
          title: post.translated || post.text,
          source: post.authorName || "𝕏",
          sourceType: "x_signal",
          urgency: post.impactScore > 70 ? "high" : post.impactScore > 40 ? "medium" : "low",
          time: post.createdAt,
          sourceCount: 1,
        });
      }
    }

    // Sports
    if (sportsRes.status === "fulfilled" && sportsRes.value?.news) {
      for (const item of sportsRes.value.news.slice(0, 30)) {
        raw.push({
          id: item.id,
          title: item.title,
          summary: item.summary,
          source: item.source,
          sourceType: "sports",
          radarCategory: "رياضة",
          urgency: "low",
          time: item.time,
          sourceCount: 1,
        });
      }
    }

    // Live events
    if (eventsRes.status === "fulfilled" && eventsRes.value?.events) {
      for (const item of eventsRes.value.events.slice(0, 30)) {
        raw.push({
          id: item.id,
          title: item.title || item.text,
          source: item.source || "Live",
          sourceType: "live_event",
          urgency: item.urgency || "medium",
          time: item.time || item.timestamp,
          sourceCount: 1,
        });
      }
    }

    // Global Events Engine (already running)
    const globalEvents = getGlobalEvents();
    for (const ev of globalEvents.slice(0, 40)) {
      raw.push({
        id: `ge-${ev.id}`,
        title: ev.title,
        source: ev.sources?.[0] || "Global Events",
        sourceType: "global_event",
        urgency: ev.severity > 70 ? "high" : ev.severity > 40 ? "medium" : "low",
        time: ev.timestamp,
        sourceCount: ev.sources?.length || 1,
        linkedEvents: [ev.id],
      });
    }
  } catch {
    // Non-critical — engine continues with whatever we got
  }

  _stats.lastPollDuration = Date.now() - start;
  return raw;
}

// ── Poll Cycle ─────────────────────────────────────────────────────
async function pollCycle() {
  if (!_running) return;

  try {
    const rawSignals = await fetchAllSources();
    const normalized = rawSignals.map(normalizeSignal);
    _signals = deduplicateSignals(_signals, normalized);
    _stats.totalProcessed += rawSignals.length;
    _stats.activeSignals = _signals.length;
    _lastUpdate = new Date().toISOString();
    notifyListeners();
  } catch {
    // Continue silently
  }
}

function notifyListeners() {
  for (const fn of _listeners) {
    try { fn(_signals); } catch { /* ignore */ }
  }
}

// ── Public API ─────────────────────────────────────────────────────

export function startRadarEngine() {
  if (_running) return;
  _running = true;
  pollCycle();
  _pollTimer = setInterval(pollCycle, POLL_INTERVAL);
}

export function stopRadarEngine() {
  _running = false;
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

export function getRadarSignals() {
  return _signals;
}

export function getRadarSignalsByRegion(region) {
  return _signals.filter(s => s.region === region);
}

export function getRadarSignalsByCategory(category) {
  return _signals.filter(s => s.category === category);
}

export function getTopRadarSignals(n = 15) {
  return _signals.slice(0, n);
}

export function getCriticalSignals() {
  return _signals.filter(s => s.severity === "حرج" || s.radarScore >= 75);
}

export function getEmergingSignals() {
  return _signals.filter(s => s.isEmerging);
}

export function getRadarForMap() {
  return _signals.filter(s => s.coordinates).map(s => ({
    id: s.id,
    title: s.title,
    category: s.category,
    coordinates: s.coordinates,
    radarScore: s.radarScore,
    severity: s.severity,
    trendDirection: s.trendDirection,
    alertBadge: s.alertBadge,
  }));
}

export function getRegionSummary() {
  const regions = [
    "الشرق الأوسط", "أوروبا", "أمريكا الشمالية",
    "آسيا والمحيط الهادئ", "أفريقيا", "أمريكا اللاتينية",
    "الأسواق العالمية", "الرياضة"
  ];

  return regions.map(region => {
    const signals = region === "الرياضة"
      ? _signals.filter(s => s.category === "رياضة" || s.category === "انتقالات")
      : _signals.filter(s => s.region === region);

    const avgScore = signals.length
      ? Math.round(signals.reduce((sum, s) => sum + s.radarScore, 0) / signals.length)
      : 0;

    const maxScore = signals.length ? Math.max(...signals.map(s => s.radarScore)) : 0;

    const trending = signals.filter(s => s.trendDirection === "صاعد").length;
    const trend = trending > signals.length * 0.4 ? "صاعد"
      : signals.filter(s => s.trendDirection === "متراجع").length > signals.length * 0.4 ? "متراجع"
      : "مستقر";

    let pressure = "منخفض";
    if (avgScore >= 65) pressure = "حرج";
    else if (avgScore >= 45) pressure = "مرتفع";
    else if (avgScore >= 25) pressure = "متوسط";

    return {
      region,
      signalCount: signals.length,
      avgScore,
      maxScore,
      trend,
      pressure,
      topSignal: signals[0] || null,
    };
  });
}

export function getRadarStats() {
  const critical = _signals.filter(s => s.severity === "حرج").length;
  const high = _signals.filter(s => s.severity === "مرتفع").length;
  const topRegion = getRegionSummary()
    .filter(r => r.region !== "الرياضة")
    .sort((a, b) => b.maxScore - a.maxScore)[0];
  const topSignal = _signals[0];

  return {
    totalActive: _signals.length,
    critical,
    high,
    lastUpdate: _lastUpdate,
    topRegion: topRegion?.region || "—",
    topRegionPressure: topRegion?.pressure || "—",
    topSignal: topSignal?.title || "—",
    topSignalScore: topSignal?.radarScore || 0,
    globalActivityLevel: critical > 3 ? "حرج" : critical > 0 || high > 5 ? "مرتفع" : high > 0 ? "متوسط" : "منخفض",
    ..._stats,
  };
}

export function subscribeRadar(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter(l => l !== listener);
  };
}

export function isRadarRunning() {
  return _running;
}
