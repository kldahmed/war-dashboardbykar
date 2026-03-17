/**
 * Global Live Events Engine
 *
 * Continuously detects and surfaces major world events by aggregating:
 *   - global news APIs
 *   - verified X signals
 *   - sports match feeds
 *   - financial market alerts
 *   - government/official feeds
 *
 * Each event is a structured object:
 *   { id, title, category, region, country, coordinates, entities,
 *     severity, confidence, timestamp, relatedSignals }
 *
 * Events are ranked by urgency, impact, and signal density.
 */

// ── Constants ──────────────────────────────────────────────────────────────────
const POLL_INTERVAL    = 20_000;   // 20s polling
const MERGE_WINDOW_MS  = 12 * 60 * 60 * 1000; // 12h event lifetime
const MAX_EVENTS       = 60;

// ── Coordinate Database ────────────────────────────────────────────────────────
const COORDS_DB = {
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
  "البحر الأحمر":   { lat: 21.0, lon: 43.0, region: "الممرات البحرية", country: "دولي" },
  "مضيق هرمز":      { lat: 26.6, lon: 56.6, region: "الممرات البحرية", country: "دولي" },
  "الأردن":         { lat: 30.6, lon: 36.2, region: "الشرق الأوسط", country: "الأردن" },
  "مصر":            { lat: 30.0, lon: 31.2, region: "شمال أفريقيا", country: "مصر" },
  "تركيا":          { lat: 39.9, lon: 32.9, region: "أوروبا", country: "تركيا" },
  "باكستان":        { lat: 33.7, lon: 73.0, region: "آسيا والمحيط الهادئ", country: "باكستان" },
  "الهند":          { lat: 28.6, lon: 77.2, region: "آسيا والمحيط الهادئ", country: "الهند" },
  "تايوان":         { lat: 25.0, lon: 121.5, region: "آسيا والمحيط الهادئ", country: "تايوان" },
  "كوريا الشمالية": { lat: 39.0, lon: 125.8, region: "آسيا والمحيط الهادئ", country: "كوريا الشمالية" },
  "الولايات المتحدة":{ lat: 38.9, lon: -77.0, region: "أمريكا الشمالية", country: "الولايات المتحدة" },
  "فرنسا":          { lat: 48.9, lon: 2.35, region: "أوروبا", country: "فرنسا" },
  "بريطانيا":       { lat: 51.5, lon: -0.12, region: "أوروبا", country: "بريطانيا" },
  "ألمانيا":        { lat: 52.5, lon: 13.4, region: "أوروبا", country: "ألمانيا" },
  "النفط":          { lat: 25.0, lon: 55.0, region: "الأسواق", country: "دولي" },
  "الذهب":          { lat: 40.7, lon: -74.0, region: "الأسواق", country: "دولي" },
  "الدولار":        { lat: 40.7, lon: -74.0, region: "الأسواق", country: "دولي" },
  "الناتو":         { lat: 50.8, lon: 4.4, region: "أوروبا", country: "بلجيكا" },
  "ليبيا":          { lat: 32.9, lon: 13.2, region: "شمال أفريقيا", country: "ليبيا" },
  "السودان":        { lat: 15.6, lon: 32.5, region: "شمال أفريقيا", country: "السودان" },
  "الصومال":        { lat: 2.0, lon: 45.3, region: "شرق أفريقيا", country: "الصومال" },
};

// ── Entity Patterns ────────────────────────────────────────────────────────────
const ENTITY_PATTERNS = [
  // Regions
  { r: /\b(Red Sea|البحر الأحمر)\b/i,       name: "البحر الأحمر",     type: "region",   weight: 9  },
  { r: /\b(Strait of Hormuz|هرمز)\b/i,      name: "مضيق هرمز",        type: "region",   weight: 9  },
  { r: /\b(Gaza|غزة)\b/i,                   name: "غزة",              type: "region",   weight: 10 },
  { r: /\b(Taiwan|تايوان)\b/i,              name: "تايوان",           type: "region",   weight: 8  },
  // Countries
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
  { r: /\b(Jordan|الأردن)\b/i,              name: "الأردن",           type: "country",  weight: 5  },
  // Organizations
  { r: /\b(Hamas|حماس)\b/i,                 name: "حماس",             type: "org",      weight: 9  },
  { r: /\b(Hezbollah|حزب الله)\b/i,         name: "حزب الله",         type: "org",      weight: 9  },
  { r: /\b(Houthis|الحوثيون|Houthi)\b/i,   name: "الحوثيون",         type: "org",      weight: 9  },
  { r: /\b(OPEC|أوبك)\b/i,                  name: "أوبك",             type: "org",      weight: 7  },
  { r: /\b(NATO|الناتو)\b/i,                name: "الناتو",           type: "org",      weight: 8  },
  { r: /\b(UN|الأمم المتحدة|United Nations)\b/i, name: "الأمم المتحدة", type: "org",   weight: 6  },
  { r: /\b(EU|الاتحاد الأوروبي)\b/i,        name: "الاتحاد الأوروبي", type: "org",     weight: 5  },
  { r: /\b(FIFA|فيفا)\b/i,                  name: "فيفا",             type: "org",      weight: 5  },
  { r: /\b(ICC|المحكمة الجنائية)\b/i,       name: "المحكمة الجنائية", type: "org",      weight: 6  },
  // Markets
  { r: /\b(oil|crude|نفط|بترول)\b/i,        name: "النفط",            type: "market",   weight: 7  },
  { r: /\b(gold|ذهب)\b/i,                   name: "الذهب",            type: "market",   weight: 6  },
  { r: /\b(dollar|دولار)\b/i,               name: "الدولار",          type: "market",   weight: 6  },
  { r: /\b(bitcoin|بتكوين|crypto)\b/i,      name: "العملات الرقمية",  type: "market",   weight: 5  },
  // Sectors
  { r: /\b(shipping|ناقلة|سفينة|شحن)\b/i,   name: "الشحن البحري",     type: "sector",   weight: 7  },
  { r: /\b(nuclear|نووي)\b/i,                name: "نووي",             type: "sector",   weight: 9  },
  { r: /\b(sanctions|عقوبات)\b/i,            name: "عقوبات",           type: "sector",   weight: 7  },
];

// ── Category Definitions ───────────────────────────────────────────────────────
const CATEGORIES = {
  conflict:     { icon: "⚔️", label: "نزاع مسلح",       color: "#ef4444", severity: 9 },
  military:     { icon: "🎖️", label: "تحرك عسكري",      color: "#dc2626", severity: 8 },
  terrorism:    { icon: "💥", label: "إرهاب",           color: "#b91c1c", severity: 9 },
  diplomacy:    { icon: "🤝", label: "دبلوماسية",       color: "#38bdf8", severity: 4 },
  political:    { icon: "🏛️", label: "سياسي",           color: "#818cf8", severity: 5 },
  economic:     { icon: "📊", label: "اقتصادي",         color: "#f59e0b", severity: 6 },
  market:       { icon: "📈", label: "أسواق مالية",     color: "#eab308", severity: 5 },
  energy:       { icon: "⛽", label: "طاقة",            color: "#f97316", severity: 7 },
  humanitarian: { icon: "🏥", label: "إنساني",          color: "#ec4899", severity: 7 },
  sports:       { icon: "⚽", label: "رياضة",           color: "#22c55e", severity: 2 },
  technology:   { icon: "💻", label: "تكنولوجيا",       color: "#06b6d4", severity: 3 },
  environment:  { icon: "🌍", label: "بيئة",            color: "#10b981", severity: 5 },
  breaking:     { icon: "🔴", label: "عاجل",            color: "#ef4444", severity: 8 },
  emerging:     { icon: "🔎", label: "إشارة ناشئة",     color: "#64748b", severity: 3 },
};

// ── Entity Extraction ──────────────────────────────────────────────────────────
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

// ── Category Inference ─────────────────────────────────────────────────────────
function inferCategory(text) {
  const t = String(text || "").toLowerCase();
  if (/attack|strike|missile|drone|explosion|war|غارة|قصف|صاروخ|انفجار|حرب|اشتباك/i.test(t)) return "conflict";
  if (/military|army|troops|deployment|عسكري|جيش|انتشار|تعزيزات/i.test(t)) return "military";
  if (/terror|bombing|هجوم إرهابي|تفجير/i.test(t)) return "terrorism";
  if (/nuclear|نووي|تخصيب|uranium/i.test(t)) return "conflict";
  if (/ceasefire|diplomacy|talks|summit|agreement|هدنة|محادثات|اتفاق|مفاوضات/i.test(t)) return "diplomacy";
  if (/election|government|parliament|president|minister|انتخاب|حكومة|رئيس|وزير/i.test(t)) return "political";
  if (/oil|crude|opec|نفط|أوبك|energy|طاقة/i.test(t)) return "energy";
  if (/market|stock|gold|inflation|سوق|ذهب|تضخم|بورصة/i.test(t)) return "market";
  if (/economy|gdp|trade|sanctions|اقتصاد|تجارة|عقوبات|ميزانية/i.test(t)) return "economic";
  if (/humanitarian|refugee|aid|لاجئ|إنساني|مساعدات/i.test(t)) return "humanitarian";
  if (/football|soccer|match|league|goal|transfer|دوري|مباراة|كرة|انتقال/i.test(t)) return "sports";
  if (/technology|cyber|هجوم سيبراني|تكنولوج/i.test(t)) return "technology";
  if (/climate|earthquake|flood|زلزال|فيضان|مناخ/i.test(t)) return "environment";
  if (/breaking|urgent|عاجل/i.test(t)) return "breaking";
  return "emerging";
}

// ── Region Inference ───────────────────────────────────────────────────────────
function inferRegion(entities) {
  for (const e of entities) {
    const geo = COORDS_DB[e.name];
    if (geo) return geo.region;
  }
  return "دولي";
}

function inferCountry(entities) {
  for (const e of entities) {
    const geo = COORDS_DB[e.name];
    if (geo) return geo.country;
  }
  return "غير محدد";
}

function getCoordinates(entities) {
  for (const e of entities) {
    const geo = COORDS_DB[e.name];
    if (geo) return [geo.lon, geo.lat];
  }
  return null;
}

// ── Severity Scoring (0-100) ───────────────────────────────────────────────────
function calcSeverity(category, entities, signalCount, sourceCount) {
  let score = 0;
  const catDef = CATEGORIES[category];
  score += (catDef?.severity || 3) * 6; // max 54

  // Entity weight contribution (max 20)
  const maxWeight = entities.length ? Math.max(...entities.map(e => e.weight)) : 0;
  score += Math.round((maxWeight / 10) * 20);

  // Signal volume (max 15)
  score += Math.min(15, signalCount * 3);

  // Source diversity (max 11)
  score += Math.min(11, sourceCount * 4);

  return Math.min(97, Math.max(10, score));
}

// ── Confidence Scoring (0-100) ─────────────────────────────────────────────────
function calcConfidence(signalCount, sourceCount, hasOfficialSource) {
  let conf = 25;
  conf += Math.min(30, signalCount * 6);
  conf += Math.min(20, sourceCount * 5);
  if (hasOfficialSource) conf += 15;
  return Math.min(92, conf);
}

// ── Event Title Generation ─────────────────────────────────────────────────────
function generateTitle(entities, category, region) {
  const catDef = CATEGORIES[category];
  const label = catDef?.label || "حدث";
  const countries = entities.filter(e => e.type === "country" || e.type === "region").slice(0, 2);
  const orgs = entities.filter(e => e.type === "org").slice(0, 1);
  const markets = entities.filter(e => e.type === "market").slice(0, 1);

  if (category === "market" && markets.length) {
    return `تحرك أسواق: ${markets.map(e => e.name).join(" + ")}` +
      (countries.length ? ` — ${countries.map(e => e.name).join(" × ")}` : "");
  }
  if ((category === "conflict" || category === "military") && (orgs.length || countries.length)) {
    const actors = [...orgs, ...countries].slice(0, 2);
    return `${label}: ${actors.map(e => e.name).join(" × ")}` +
      (region !== "دولي" ? ` (${region})` : "");
  }
  if (category === "diplomacy" && countries.length) {
    return `مفاوضات: ${countries.map(e => e.name).join(" × ")}`;
  }
  const main = entities.slice(0, 2).map(e => e.name);
  return main.length ? `${label}: ${main.join(" × ")}` : `${label} — ${region}`;
}

// ── Signal Grouping & Event Detection ──────────────────────────────────────────
function groupSignalsToEvents(signals) {
  const groups = new Map();

  for (const sig of signals) {
    const entities = extractEntities(sig.text);
    const topEntities = entities.filter(e => e.weight >= 5).map(e => e.name).sort();
    if (!topEntities.length) continue;

    const key = topEntities.slice(0, 3).join("+");
    if (!groups.has(key)) {
      groups.set(key, { key, signals: [], entities, topEntities });
    }
    const g = groups.get(key);
    g.signals.push(sig);
    for (const e of entities) {
      if (!g.entities.some(ex => ex.name === e.name)) g.entities.push(e);
    }
  }

  const events = [];
  const now = Date.now();

  for (const [key, group] of groups.entries()) {
    if (group.signals.length < 1) continue;

    const sorted = group.signals.sort((a, b) => new Date(a.time) - new Date(b.time));
    const category = inferCategory(sorted.map(s => s.text).join(" "));
    const region = inferRegion(group.entities);
    const country = inferCountry(group.entities);
    const coordinates = getCoordinates(group.entities);
    const sources = [...new Set(sorted.map(s => s.source).filter(Boolean))];
    const hasOfficial = sorted.some(s => s.sourceType === "official" || s.sourceType === "government");

    const severity = calcSeverity(category, group.entities, group.signals.length, sources.length);
    const confidence = calcConfidence(group.signals.length, sources.length, hasOfficial);

    const relatedSignals = sorted.slice(0, 8).map(s => ({
      text: String(s.text || "").slice(0, 160),
      source: s.source,
      sourceType: s.sourceType,
      time: s.time,
      score: s.impactScore || 30,
    }));

    const catDef = CATEGORIES[category];

    events.push({
      id: `gle-${key.replace(/[^a-zA-Z0-9\u0600-\u06ff]/g, "-").slice(0, 40)}`,
      title: generateTitle(group.entities, category, region),
      category,
      categoryMeta: catDef,
      region,
      country,
      coordinates,
      entities: group.entities,
      severity,
      confidence,
      timestamp: sorted[sorted.length - 1].time,
      firstDetected: sorted[0].time,
      relatedSignals,
      sources,
      signalCount: group.signals.length,
      isEarlyWarning: group.signals.length <= 2 && confidence < 50,
    });
  }

  return events;
}

// ── Ranking: urgency × impact × signalDensity ─────────────────────────────────
function rankEvents(events) {
  return events
    .map(ev => {
      const urgency = ev.severity; // 0-100
      const impact = (ev.entities.length * 8) + (ev.sources.length * 5); // entity reach + source breadth
      const signalDensity = Math.min(40, ev.signalCount * 5);
      const recency = Math.max(0, 1 - (Date.now() - new Date(ev.timestamp).getTime()) / (6 * 3600_000));
      ev.rankScore = Math.round(
        urgency * 0.40 +
        Math.min(100, impact) * 0.25 +
        signalDensity * 0.20 +
        recency * 100 * 0.15
      );
      return ev;
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

// ── Merge with existing events (persistent, not replace) ───────────────────────
function mergeEvents(existing, fresh) {
  const merged = new Map(existing.map(e => [e.id, { ...e }]));

  for (const ev of fresh) {
    if (merged.has(ev.id)) {
      const prev = merged.get(ev.id);
      // De-dupe signals
      const existingSigs = new Set(prev.relatedSignals.map(s => s.text));
      const newSigs = ev.relatedSignals.filter(s => !existingSigs.has(s.text));
      const allSigs = [...prev.relatedSignals, ...newSigs].slice(-12);

      merged.set(ev.id, {
        ...prev,
        timestamp: new Date(ev.timestamp) > new Date(prev.timestamp) ? ev.timestamp : prev.timestamp,
        severity: Math.max(prev.severity, ev.severity),
        confidence: Math.min(95, Math.max(prev.confidence, ev.confidence) + 2),
        signalCount: prev.signalCount + ev.signalCount,
        relatedSignals: allSigs,
        isEarlyWarning: allSigs.length > 3 ? false : prev.isEarlyWarning,
        sources: [...new Set([...prev.sources, ...ev.sources])],
      });
    } else {
      merged.set(ev.id, ev);
    }
  }

  // Purge events older than merge window
  const cutoff = Date.now() - MERGE_WINDOW_MS;
  const result = [];
  for (const ev of merged.values()) {
    if (new Date(ev.timestamp).getTime() > cutoff) result.push(ev);
  }
  return result.slice(0, MAX_EVENTS);
}

// ── Public: Engine State ───────────────────────────────────────────────────────
let _events = [];
let _lastFetch = 0;
let _listeners = [];

export function getGlobalEvents() {
  return _events;
}

export function getEventsByRegion(region) {
  return _events.filter(e => e.region === region);
}

export function getEventsByCategory(category) {
  return _events.filter(e => e.category === category);
}

export function getTopUrgentEvents(n = 10) {
  return _events.slice(0, n);
}

export function getEventsForMap() {
  return _events.filter(e => e.coordinates).map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    coordinates: e.coordinates,
    severity: e.severity,
    confidence: e.confidence,
    color: e.categoryMeta?.color || "#64748b",
    icon: e.categoryMeta?.icon || "🌍",
  }));
}

export function getEventsForForecast() {
  return _events.map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    region: e.region,
    severity: e.severity,
    confidence: e.confidence,
    signalCount: e.signalCount,
    entities: e.entities.map(en => en.name),
    timestamp: e.timestamp,
  }));
}

export function subscribeEvents(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  _listeners.forEach(l => {
    try { l(_events); } catch { /* ignore */ }
  });
}

// ── Fetch & Aggregate from All Sources ─────────────────────────────────────────
async function fetchAllSignals() {
  const signals = [];

  const fetches = [
    // News API
    fetch("/api/news").then(r => r.ok ? r.json() : null).catch(() => null),
    // Fast news API
    fetch("/api/fastnews").then(r => r.ok ? r.json() : null).catch(() => null),
    // Intel news API
    fetch("/api/intelnews").then(r => r.ok ? r.json() : null).catch(() => null),
    // X-feed API (verified social signals)
    fetch("/api/x-feed").then(r => r.ok ? r.json() : null).catch(() => null),
    // Sports
    fetch("/api/sports").then(r => r.ok ? r.json() : null).catch(() => null),
    // Live events
    fetch("/api/liveevents").then(r => r.ok ? r.json() : null).catch(() => null),
  ];

  const results = await Promise.allSettled(fetches);

  // News sources
  for (const idx of [0, 1, 2]) {
    const result = results[idx];
    if (result.status === "fulfilled" && result.value?.news) {
      for (const item of (result.value.news || []).slice(0, 50)) {
        signals.push({
          id: item.id || item.url || `news-${Date.now()}-${Math.random()}`,
          text: `${item.title || ""} ${item.summary || ""}`,
          source: item.source || "News",
          sourceType: item.urgency === "high" ? "breaking" : "news",
          time: item.time || item.publishedAt || new Date().toISOString(),
          impactScore: item.urgency === "high" ? 80 : item.urgency === "medium" ? 55 : 35,
        });
      }
    }
  }

  // X-feed (social signals)
  const xResult = results[3];
  if (xResult.status === "fulfilled" && xResult.value?.posts) {
    for (const post of (xResult.value.posts || []).slice(0, 60)) {
      signals.push({
        id: post.id || `x-${Date.now()}-${Math.random()}`,
        text: post.translated || post.text || "",
        source: post.authorName || "𝕏",
        sourceType: "x_signal",
        time: post.createdAt || new Date().toISOString(),
        impactScore: post.impactScore || 30,
      });
    }
  }

  // Sports
  const sportsResult = results[4];
  if (sportsResult.status === "fulfilled" && sportsResult.value?.news) {
    for (const item of (sportsResult.value.news || []).slice(0, 30)) {
      signals.push({
        id: item.id || `sport-${Date.now()}-${Math.random()}`,
        text: `${item.title || ""} ${item.summary || ""}`,
        source: item.source || "Sports",
        sourceType: "sports",
        time: item.time || new Date().toISOString(),
        impactScore: 30,
      });
    }
  }

  // Live events
  const liveResult = results[5];
  if (liveResult.status === "fulfilled" && liveResult.value?.events) {
    for (const item of (liveResult.value.events || []).slice(0, 40)) {
      signals.push({
        id: item.id || `live-${Date.now()}-${Math.random()}`,
        text: `${item.title || ""} ${item.summary || ""}`,
        source: item.source || "Live",
        sourceType: item.urgency === "high" ? "breaking" : "live",
        time: item.time || new Date().toISOString(),
        impactScore: item.urgency === "high" ? 75 : 45,
      });
    }
  }

  return signals;
}

// ── Engine Tick ─────────────────────────────────────────────────────────────────
async function tick() {
  try {
    const signals = await fetchAllSignals();
    if (!signals.length) return;

    const freshEvents = groupSignalsToEvents(signals);
    const ranked = rankEvents(freshEvents);
    _events = mergeEvents(_events, ranked);
    _events = rankEvents(_events);
    _lastFetch = Date.now();
    notifyListeners();
  } catch (err) {
    console.error("[GlobalEventsEngine] tick error:", err.message);
  }
}

// ── Start / Stop Engine ────────────────────────────────────────────────────────
let _intervalId = null;

export function startEngine() {
  if (_intervalId) return;
  tick(); // immediate first tick
  _intervalId = setInterval(tick, POLL_INTERVAL);
}

export function stopEngine() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

export function isEngineRunning() {
  return _intervalId !== null;
}

// ── Stats ──────────────────────────────────────────────────────────────────────
export function getEngineStats() {
  const total = _events.length;
  const urgent = _events.filter(e => e.severity >= 70).length;
  const high = _events.filter(e => e.severity >= 50 && e.severity < 70).length;
  const moderate = _events.filter(e => e.severity >= 30 && e.severity < 50).length;
  const low = _events.filter(e => e.severity < 30).length;
  const emerging = _events.filter(e => e.isEarlyWarning).length;

  const regionBreakdown = {};
  _events.forEach(e => {
    regionBreakdown[e.region] = (regionBreakdown[e.region] || 0) + 1;
  });

  const categoryBreakdown = {};
  _events.forEach(e => {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + 1;
  });

  const avgSeverity = total ? Math.round(_events.reduce((s, e) => s + e.severity, 0) / total) : 0;
  const avgConfidence = total ? Math.round(_events.reduce((s, e) => s + e.confidence, 0) / total) : 0;

  return {
    total, urgent, high, moderate, low, emerging,
    avgSeverity, avgConfidence,
    regionBreakdown, categoryBreakdown,
    lastUpdate: _lastFetch,
  };
}

export { CATEGORIES as EVENT_CATEGORIES };
