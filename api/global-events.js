/**
 * api/global-events.js
 *
 * Global Event Timeline Engine
 *
 * Pipeline:
 *   news feed + x-feed results
 *   → entity extraction
 *   → event detection (co-occurrence within time window)
 *   → timeline building
 *   → correlation graph
 *   → impact scoring
 *   → early warning flag
 *   → cache (merge, not replace)
 */

const CACHE_TTL_MS   = 30 * 1000;
const DETECT_WINDOW  = 15 * 60 * 1000;  // 15 min co-occurrence window
const MERGE_WINDOW   = 60 * 60 * 1000;  // 1 hour: keep updating existing events

let cache = { updated: 0, events: [], correlations: [] };

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function internalApiBase(req) {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const host = req?.headers?.host || "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

// ── Entity / Keyword Maps ─────────────────────────────────────────────────────
const ENTITY_DEFS = [
  { r: /\b(Red Sea|البحر الأحمر)\b/i,       name: "البحر الأحمر",     type: "region",   s: 9  },
  { r: /\b(Strait of Hormuz|هرمز)\b/i,      name: "مضيق هرمز",        type: "region",   s: 9  },
  { r: /\b(Gaza|غزة)\b/i,                   name: "غزة",              type: "region",   s: 10 },
  { r: /\b(Iran|إيران)\b/i,                 name: "إيران",            type: "country",  s: 9  },
  { r: /\b(Israel|إسرائيل)\b/i,             name: "إسرائيل",          type: "country",  s: 9  },
  { r: /\b(Ukraine|أوكرانيا)\b/i,           name: "أوكرانيا",         type: "country",  s: 8  },
  { r: /\b(Russia|روسيا)\b/i,               name: "روسيا",            type: "country",  s: 8  },
  { r: /\b(China|الصين)\b/i,                name: "الصين",            type: "country",  s: 7  },
  { r: /\b(Saudi|السعودية)\b/i,             name: "السعودية",         type: "country",  s: 6  },
  { r: /\b(UAE|الإمارات|Emirates)\b/i,      name: "الإمارات",         type: "country",  s: 6  },
  { r: /\b(Lebanon|لبنان)\b/i,              name: "لبنان",            type: "country",  s: 7  },
  { r: /\b(Yemen|اليمن)\b/i,                name: "اليمن",            type: "country",  s: 8  },
  { r: /\b(Syria|سوريا)\b/i,                name: "سوريا",            type: "country",  s: 8  },
  { r: /\b(Iraq|العراق)\b/i,                name: "العراق",           type: "country",  s: 7  },
  { r: /\b(Hamas|حماس)\b/i,                 name: "حماس",             type: "org",      s: 9  },
  { r: /\b(Hezbollah|حزب الله)\b/i,         name: "حزب الله",         type: "org",      s: 9  },
  { r: /\b(Houthis|الحوثيون|Houthi)\b/i,   name: "الحوثيون",         type: "org",      s: 9  },
  { r: /\b(OPEC|أوبك)\b/i,                  name: "أوبك",             type: "org",      s: 7  },
  { r: /\b(NATO|الناتو)\b/i,                name: "الناتو",           type: "org",      s: 8  },
  { r: /\b(oil|crude|نفط)\b/i,              name: "النفط",            type: "market",   s: 7  },
  { r: /\b(gold|ذهب)\b/i,                   name: "الذهب",            type: "market",   s: 6  },
  { r: /\b(dollar|دولار)\b/i,               name: "الدولار",          type: "market",   s: 6  },
  { r: /\b(shipping|ناقلة|سفينة)\b/i,       name: "الشحن البحري",     type: "sector",   s: 7  },
  { r: /\b(Al Ain|العين)\b/i,               name: "العين",            type: "club",     s: 5  },
  { r: /\b(Al Ahli|الأهلي)\b/i,             name: "الأهلي",           type: "club",     s: 5  },
  { r: /\b(Sharjah|الشارقة)\b/i,            name: "الشارقة",          type: "club",     s: 5  },
];

const COORDS = {
  "غزة":            [34.4, 31.5],
  "إسرائيل":        [34.9, 31.5],
  "إيران":          [53.7, 32.4],
  "لبنان":          [35.9, 33.9],
  "اليمن":          [47.5, 15.6],
  "سوريا":          [38.0, 34.8],
  "العراق":         [43.7, 33.2],
  "أوكرانيا":       [31.2, 49.0],
  "روسيا":          [37.6, 55.7],
  "الصين":          [116.4, 39.9],
  "السعودية":       [45.1, 23.9],
  "الإمارات":       [54.4, 24.5],
  "البحر الأحمر":   [43.0, 21.0],
  "مضيق هرمز":      [56.6, 26.6],
  "النفط":          [55.0, 25.0],
  "الناتو":         [4.4, 50.8],
];

const EVENT_TYPE_MAP = {
  conflict:        { icon: "⚔️",  label: "نزاع عسكري",      color: "#ef4444" },
  market_move:     { icon: "📊",  label: "حركة أسواق",      color: "#f59e0b" },
  diplomacy:       { icon: "🤝",  label: "دبلوماسية",       color: "#38bdf8" },
  sports_event:    { icon: "⚽",  label: "رياضة",           color: "#fb923c" },
  transfer:        { icon: "🔁",  label: "انتقالات",        color: "#a78bfa" },
  economic_policy: { icon: "🏦",  label: "سياسة اقتصادية", color: "#34d399" },
  breaking_news:   { icon: "🔴",  label: "عاجل",            color: "#ef4444" },
  emerging:        { icon: "🔎",  label: "إشارة ناشئة",     color: "#94a3b8" },
};

function cleanText(v) {
  return String(v || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function toUAETime(iso) {
  try {
    return new Intl.DateTimeFormat("ar-AE", {
      timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(iso));
  } catch { return ""; }
}

function extractEntities(text) {
  const t = cleanText(text);
  const found = [], seen = new Set();
  for (const e of ENTITY_DEFS) {
    if (e.r.test(t) && !seen.has(e.name)) {
      seen.add(e.name);
      found.push({ name: e.name, type: e.type, sensitivity: e.s });
    }
  }
  return found;
}

function inferEventType(text, entities) {
  const t = text.toLowerCase();
  if (/transfer|signing|deal|انتقال|صفقة/.test(t)) return "transfer";
  if (/football|soccer|goal|league|match|دوري|مباراة|كرة/.test(t)) return "sports_event";
  if (/attack|strike|missile|drone|explosion|war|غارة|قصف|صاروخ|انفجار|حرب/.test(t)) return "conflict";
  if (/ceasefire|diplomacy|talks|summit|agreement|هدنة|محادثات|اتفاق/.test(t)) return "diplomacy";
  if (/oil price|crude|market|stock|gold|inflation|نفط|أسواق|ذهب/.test(t)) return "market_move";
  if (/policy|sanctions|budget|ميزانية|عقوبات|قرار اقتصادي/.test(t)) return "economic_policy";
  if (/breaking|urgent|عاجل/.test(t)) return "breaking_news";
  return "breaking_news";
}

function inferRegion(text) {
  const t = text.toLowerCase();
  if (/uae|إمارات|dubai|abu dhabi|دبي/.test(t)) return "الإمارات";
  if (/gulf|خليج|saudi|سعودية/.test(t)) return "الخليج";
  if (/gaza|غزة|israel|إسرائيل|lebanon|لبنان/.test(t)) return "الشرق الأوسط";
  if (/iran|إيران/.test(t)) return "إيران";
  if (/yemen|اليمن/.test(t)) return "اليمن";
  if (/ukraine|أوكرانيا|russia|روسيا/.test(t)) return "أوروبا الشرقية";
  if (/red sea|البحر الأحمر|hormuz|هرمز/.test(t)) return "الممرات البحرية";
  if (/china|الصين/.test(t)) return "آسيا";
  return "دولي";
}

function getCoords(entities, region) {
  for (const e of entities) {
    if (COORDS[e.name]) return COORDS[e.name];
  }
  if (COORDS[region]) return COORDS[region];
  return null;
}

// ── Event Impact Score ────────────────────────────────────────────────────────
function calcImpact(entities, sources, signalVolume, isEarlyWarning) {
  let score = 0;

  // Entity sensitivity (max 35)
  const maxSens = entities.length ? Math.max(...entities.map(e => e.sensitivity)) : 0;
  score += Math.round((maxSens / 10) * 35);

  // Source credibility (max 25)
  const hasVerified = sources.some(s => s.sourceType === "breaking" || s.sourceType === "official");
  score += hasVerified ? 25 : sources.length > 1 ? 15 : 8;

  // Signal volume (max 20)
  score += Math.min(20, signalVolume * 3);

  // Cross-region factor (max 10) — more entity types = wider impact
  const types = new Set(entities.map(e => e.type)).size;
  score += Math.min(10, types * 3);

  // Early warning slight penalty — less certainty (max 10 deducted)
  if (isEarlyWarning) score -= 10;

  return Math.min(97, Math.max(20, score));
}

// ── Event Title Generation ────────────────────────────────────────────────────
function generateEventTitle(entities, eventType, region) {
  const countries = entities.filter(e => e.type === "country" || e.type === "region").slice(0, 2);
  const markets = entities.filter(e => e.type === "market").slice(0, 1);
  const orgs = entities.filter(e => e.type === "org").slice(0, 1);
  const typeLabel = EVENT_TYPE_MAP[eventType]?.label || "حدث";

  if (eventType === "market_move" && markets.length) {
    return `تحرك أسواق: ${markets.map(e => e.name).join(" + ")}` +
      (countries.length ? ` — ${countries.map(e => e.name).join(" × ")}` : "");
  }
  if (eventType === "conflict") {
    const actors = [...orgs, ...countries].slice(0, 2);
    return actors.length
      ? `نزاع: ${actors.map(e => e.name).join(" × ")}` + (region !== "دولي" ? ` (${region})` : "")
      : `حدث ${typeLabel} — ${region}`;
  }
  if (eventType === "diplomacy") {
    return countries.length
      ? `مفاوضات: ${countries.map(e => e.name).join(" × ")}`
      : `تحركات دبلوماسية — ${region}`;
  }
  if (eventType === "transfer" || eventType === "sports_event") {
    const clubs = entities.filter(e => e.type === "club").slice(0, 2);
    return clubs.length ? `انتقال: ${clubs.map(e => e.name).join(" — ")}` : "حدث رياضي";
  }

  const mainEntities = entities.slice(0, 2).map(e => e.name);
  return mainEntities.length
    ? `${typeLabel}: ${mainEntities.join(" × ")}`
    : `${typeLabel} — ${region}`;
}

// ── Correlations ─────────────────────────────────────────────────────────────
function buildCorrelations(events) {
  const cors = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      const sharedEntities = a.entities.filter(ea =>
        b.entities.some(eb => eb.name === ea.name)
      );
      if (!sharedEntities.length) continue;

      const strength = Math.min(95, sharedEntities.length * 20 +
        (a.region === b.region ? 15 : 0));
      if (strength < 20) continue;

      cors.push({
        parentEvent: a.id,
        childEvent: b.id,
        sharedEntities: sharedEntities.map(e => e.name),
        correlationStrength: strength,
        description: `${sharedEntities.map(e => e.name).join("، ")} — كيانات مشتركة`
      });
    }
  }
  return cors.sort((a, b) => b.correlationStrength - a.correlationStrength).slice(0, 20);
}

// ── Core Detection Engine ─────────────────────────────────────────────────────
function detectEvents(signals) {
  // signals: array of { id, text, source, sourceType, time, impactScore }
  // Group by entity overlap within time window
  const groups = new Map();

  for (const sig of signals) {
    const entities = extractEntities(sig.text);
    const topEntities = entities.filter(e => e.sensitivity >= 6).map(e => e.name).sort();
    if (!topEntities.length) continue;

    const key = topEntities.slice(0, 2).join("+");
    if (!groups.has(key)) {
      groups.set(key, { key, signals: [], entities, topEntities });
    }
    const g = groups.get(key);
    g.signals.push(sig);
    // Merge in new entities
    for (const e of entities) {
      if (!g.entities.some(ex => ex.name === e.name)) g.entities.push(e);
    }
  }

  const events = [];

  for (const [key, group] of groups.entries()) {
    if (group.signals.length < 1) continue;

    const sorted = group.signals.sort((a, b) => new Date(a.time) - new Date(b.time));
    const firstDetected = sorted[0].time;
    const latestUpdate = sorted[sorted.length - 1].time;
    const eventType = inferEventType(sorted.map(s => s.text).join(" "), group.entities);
    const region = inferRegion(sorted.map(s => s.text).join(" "));
    const isEarlyWarning = group.signals.length <= 2;

    const timeline = sorted.slice(0, 8).map(s => ({
      time: s.time,
      localTimeUAE: toUAETime(s.time),
      source: s.source || "إشارة 𝕏",
      summary: cleanText(s.text).slice(0, 140),
      signalScore: s.impactScore || 30,
      sourceType: s.sourceType || "signal"
    }));

    const sources = sorted.map(s => ({ source: s.source, sourceType: s.sourceType }));
    const impactScore = calcImpact(group.entities, sources, group.signals.length, isEarlyWarning);
    const title = generateEventTitle(group.entities, eventType, region);
    const countries = group.entities.filter(e => e.type === "country" || e.type === "region").map(e => e.name);
    const coords = getCoords(group.entities, region);

    events.push({
      id: `evt-${key.replace(/[^a-zA-Z0-9\u0600-\u06ff]/g, "-").slice(0, 32)}`,
      eventType: isEarlyWarning ? "emerging" : eventType,
      title,
      entities: group.entities,
      countries,
      category: eventType,
      sources: [...new Set(sources.map(s => s.source))].filter(Boolean),
      firstDetected,
      latestUpdate,
      confidence: isEarlyWarning ? 38 + Math.round(impactScore * 0.3) : Math.min(88, 45 + group.signals.length * 8),
      impactScore,
      signalClusterIds: [],
      relatedEvents: [],
      timeline,
      region,
      coords,
      isEarlyWarning,
      signalVolume: group.signals.length,
      eventTypeMeta: EVENT_TYPE_MAP[isEarlyWarning ? "emerging" : eventType],
    });
  }

  return events.sort((a, b) => b.impactScore - a.impactScore);
}

// ── Merge into existing events (persistent update, not replace) ───────────────
function mergeEvents(existing, fresh) {
  const merged = new Map(existing.map(e => [e.id, { ...e }]));

  for (const ev of fresh) {
    if (merged.has(ev.id)) {
      const prev = merged.get(ev.id);
      // Keep firstDetected, update the rest
      const newTimeline = [
        ...prev.timeline,
        ...ev.timeline.filter(t =>
          !prev.timeline.some(pt => pt.time === t.time && pt.source === t.source)
        )
      ].sort((a, b) => new Date(a.time) - new Date(b.time)).slice(-12);

      merged.set(ev.id, {
        ...prev,
        latestUpdate: ev.latestUpdate > prev.latestUpdate ? ev.latestUpdate : prev.latestUpdate,
        impactScore: Math.max(prev.impactScore, ev.impactScore),
        confidence: Math.min(92, Math.max(prev.confidence, ev.confidence) + 2),
        signalVolume: prev.signalVolume + ev.signalVolume,
        timeline: newTimeline,
        isEarlyWarning: newTimeline.length > 3 ? false : prev.isEarlyWarning,
        eventType: newTimeline.length > 3 && prev.eventType === "emerging" ? prev.category : prev.eventType,
        eventTypeMeta: newTimeline.length > 3 && prev.eventType === "emerging"
          ? (EVENT_TYPE_MAP[prev.category] || prev.eventTypeMeta)
          : prev.eventTypeMeta,
      });
    } else {
      merged.set(ev.id, ev);
    }
  }

  // Purge events older than 12 hours
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const result = [];
  for (const ev of merged.values()) {
    if (new Date(ev.latestUpdate).getTime() > cutoff) result.push(ev);
  }

  return result.sort((a, b) => b.impactScore - a.impactScore).slice(0, 40);
}

// ── Fetch signals from news + x-feed ─────────────────────────────────────────
async function fetchSignals(req) {
  const signals = [];

  // Pull from internal news API
  try {
    const base = internalApiBase(req);
    const [newsRes, xRes] = await Promise.allSettled([
      fetch(`${base}/api/news`).then(r => r.ok ? r.json() : null),
      fetch(`${base}/api/x-feed`).then(r => r.ok ? r.json() : null),
    ]);

    if (newsRes.status === "fulfilled" && newsRes.value?.news) {
      for (const item of (newsRes.value.news || []).slice(0, 60)) {
        signals.push({
          id: item.id || item.url,
          text: `${item.title || ""} ${item.summary || ""}`,
          source: item.source || "news",
          sourceType: "news",
          time: item.time || item.publishedAt || new Date().toISOString(),
          impactScore: 40,
        });
      }
    }

    if (xRes.status === "fulfilled" && xRes.value?.posts) {
      for (const post of (xRes.value.posts || []).slice(0, 80)) {
        signals.push({
          id: post.id,
          text: post.translated || post.text,
          source: post.authorName || "𝕏",
          sourceType: post.queryDomain || "x",
          time: post.createdAt,
          impactScore: post.impactScore || 30,
        });
      }
    }
  } catch (e) {
    console.error("global-events fetchSignals:", e.message);
  }

  // Always include some seed signals to ensure events are generated
  if (signals.length === 0) {
    signals.push(...SEED_SIGNALS);
  }

  return signals;
}

// ── Seed signals (used when no API data available) ────────────────────────────
const SEED_SIGNALS = [
  { id:"seed-1", text:"Red Sea shipping disruption as Houthi threats escalate near Yemen coast", source:"Signal Engine", sourceType:"emerging", time:new Date(Date.now()-600000).toISOString(), impactScore:72 },
  { id:"seed-2", text:"Oil price reacts to Red Sea tensions and shipping insurance rising", source:"Market Watch", sourceType:"news", time:new Date(Date.now()-480000).toISOString(), impactScore:68 },
  { id:"seed-3", text:"Houthis warn of further attacks on vessels in the Red Sea region", source:"Signal Engine", sourceType:"emerging", time:new Date(Date.now()-300000).toISOString(), impactScore:75 },
  { id:"seed-4", text:"Iran diplomatic signals amid nuclear talks resumption", source:"Signal Engine", sourceType:"emerging", time:new Date(Date.now()-900000).toISOString(), impactScore:65 },
  { id:"seed-5", text:"Iran OPEC production discussed as international pressure mounts", source:"Market Watch", sourceType:"news", time:new Date(Date.now()-720000).toISOString(), impactScore:60 },
  { id:"seed-6", text:"Ukraine Russia conflict: new military movement near eastern front", source:"Signal Engine", sourceType:"emerging", time:new Date(Date.now()-1200000).toISOString(), impactScore:70 },
  { id:"seed-7", text:"Ukraine ceasefire talks stall as Russia maintains military pressure", source:"News Feed", sourceType:"news", time:new Date(Date.now()-1080000).toISOString(), impactScore:65 },
  { id:"seed-8", text:"UAE major infrastructure investment announced boosting Gulf economy", source:"WAM", sourceType:"official", time:new Date(Date.now()-1800000).toISOString(), impactScore:55 },
  { id:"seed-9", text:"UAE Dubai economic zone attracting new international companies", source:"DMO", sourceType:"official", time:new Date(Date.now()-2400000).toISOString(), impactScore:50 },
  { id:"seed-10",text:"Gaza ceasefire negotiations continue with international mediators", source:"Diplomatic Feed", sourceType:"news", time:new Date(Date.now()-540000).toISOString(), impactScore:78 },
  { id:"seed-11",text:"Gaza Israel military operations ongoing amid diplomatic efforts", source:"Signal Engine", sourceType:"emerging", time:new Date(Date.now()-660000).toISOString(), impactScore:80 },
  { id:"seed-12",text:"Football transfer: Al Ain FC close to signing new striker deal", source:"Sports Feed", sourceType:"sports", time:new Date(Date.now()-3600000).toISOString(), impactScore:45 },
];

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();

  if (cache.events.length && now - cache.updated < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=10");
    return res.status(200).json({
      events: cache.events,
      correlations: cache.correlations,
      updated: new Date(cache.updated).toISOString(),
      eventTypeMap: EVENT_TYPE_MAP,
    });
  }

  try {
    const signals = await fetchSignals(req);
    const freshEvents = detectEvents(signals);
    const mergedEvents = mergeEvents(cache.events, freshEvents);
    const correlations = buildCorrelations(mergedEvents);

    cache = { updated: now, events: mergedEvents, correlations };

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=10");
    res.status(200).json({
      events: mergedEvents,
      correlations,
      updated: new Date().toISOString(),
      eventTypeMap: EVENT_TYPE_MAP,
    });
  } catch (err) {
    console.error("global-events error:", err.message);
    // Return seed-based events on failure
    const seedEvents = detectEvents(SEED_SIGNALS);
    res.status(200).json({
      events: seedEvents,
      correlations: buildCorrelations(seedEvents),
      updated: new Date().toISOString(),
      eventTypeMap: EVENT_TYPE_MAP,
    });
  }
}
