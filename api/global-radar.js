/**
 * api/global-radar.js
 *
 * Server-side radar endpoint.
 * Aggregates news, X signals, sports, and live events into
 * normalized radar signals with scoring and classification.
 */

const CACHE_TTL_MS = 20_000;

let cache = { updated: 0, signals: [], stats: {} };

// ── Entity Patterns (lightweight server-side version) ──────────────
const ENTITY_PATTERNS = [
  { r: /\b(Gaza|غزة)\b/i,                   name: "غزة",              type: "region",   weight: 10 },
  { r: /\b(Red Sea|البحر الأحمر)\b/i,       name: "البحر الأحمر",     type: "region",   weight: 9  },
  { r: /\b(Iran|إيران|ايران)\b/i,           name: "إيران",            type: "country",  weight: 9  },
  { r: /\b(Israel|إسرائيل|اسرائيل)\b/i,    name: "إسرائيل",          type: "country",  weight: 9  },
  { r: /\b(Ukraine|أوكرانيا)\b/i,           name: "أوكرانيا",         type: "country",  weight: 8  },
  { r: /\b(Russia|روسيا)\b/i,               name: "روسيا",            type: "country",  weight: 8  },
  { r: /\b(China|الصين)\b/i,                name: "الصين",            type: "country",  weight: 7  },
  { r: /\b(Saudi|السعودية)\b/i,             name: "السعودية",         type: "country",  weight: 6  },
  { r: /\b(UAE|الإمارات|Emirates)\b/i,      name: "الإمارات",         type: "country",  weight: 6  },
  { r: /\b(Yemen|اليمن)\b/i,                name: "اليمن",            type: "country",  weight: 8  },
  { r: /\b(Lebanon|لبنان)\b/i,              name: "لبنان",            type: "country",  weight: 7  },
  { r: /\b(Syria|سوريا)\b/i,                name: "سوريا",            type: "country",  weight: 8  },
  { r: /\b(oil|crude|نفط|بترول)\b/i,        name: "النفط",            type: "market",   weight: 7  },
  { r: /\b(Hamas|حماس)\b/i,                 name: "حماس",             type: "org",      weight: 9  },
  { r: /\b(Hezbollah|حزب الله)\b/i,         name: "حزب الله",         type: "org",      weight: 9  },
  { r: /\b(Houthis|الحوثيون|Houthi)\b/i,   name: "الحوثيون",         type: "org",      weight: 9  },
  { r: /\b(NATO|الناتو)\b/i,                name: "الناتو",           type: "org",      weight: 8  },
];

const COORDS = {
  "غزة":       { lat: 31.5, lon: 34.4, region: "الشرق الأوسط" },
  "إيران":     { lat: 32.4, lon: 53.7, region: "الشرق الأوسط" },
  "إسرائيل":   { lat: 31.5, lon: 34.9, region: "الشرق الأوسط" },
  "أوكرانيا":  { lat: 49.0, lon: 31.2, region: "أوروبا" },
  "روسيا":     { lat: 55.7, lon: 37.6, region: "أوروبا" },
  "الصين":     { lat: 39.9, lon: 116.4, region: "آسيا والمحيط الهادئ" },
  "السعودية":  { lat: 23.9, lon: 45.1, region: "الشرق الأوسط" },
  "الإمارات":  { lat: 24.5, lon: 54.4, region: "الشرق الأوسط" },
  "اليمن":     { lat: 15.6, lon: 47.5, region: "الشرق الأوسط" },
  "لبنان":     { lat: 33.9, lon: 35.9, region: "الشرق الأوسط" },
  "سوريا":     { lat: 34.8, lon: 38.0, region: "الشرق الأوسط" },
  "النفط":     { lat: 25.0, lon: 55.0, region: "الأسواق العالمية" },
  "حماس":      { lat: 31.5, lon: 34.4, region: "الشرق الأوسط" },
  "حزب الله":  { lat: 33.9, lon: 35.9, region: "الشرق الأوسط" },
  "الحوثيون":  { lat: 15.6, lon: 47.5, region: "الشرق الأوسط" },
  "الناتو":    { lat: 50.8, lon: 4.4, region: "أوروبا" },
};

function extractEntities(text) {
  const clean = String(text || "");
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
    if (geo) return { region: geo.region, coordinates: [geo.lon, geo.lat] };
  }
  return { region: "دولي", coordinates: null };
}

function inferCategory(text) {
  const t = String(text || "").toLowerCase();
  if (/attack|strike|missile|drone|explosion|war|غارة|قصف|صاروخ|حرب|تصعيد/i.test(t)) return "صراع / تصعيد";
  if (/ceasefire|diplomacy|talks|summit|هدنة|محادثات|اتفاق|مفاوضات/i.test(t)) return "دبلوماسية";
  if (/oil|crude|opec|نفط|طاقة|شحن/i.test(t)) return "طاقة / نفط / شحن";
  if (/market|stock|gold|سوق|ذهب|تضخم|اقتصاد/i.test(t)) return "اقتصاد / أسواق";
  if (/transfer|انتقال|صفقة/i.test(t)) return "انتقالات";
  if (/football|soccer|match|league|دوري|مباراة|كرة/i.test(t)) return "رياضة";
  if (/breaking|urgent|عاجل/i.test(t)) return "أحداث عالمية";
  return "إشارات ناشئة";
}

function scoreSignal(signal) {
  let score = 0;
  const catWeights = {
    "صراع / تصعيد": 0.95, "دبلوماسية": 0.60, "اقتصاد / أسواق": 0.70,
    "طاقة / نفط / شحن": 0.80, "رياضة": 0.40, "انتقالات": 0.35,
    "أحداث عالمية": 0.75, "إشارات ناشئة": 0.30,
  };
  const urgScore = signal.urgency === "high" ? 90 : signal.urgency === "medium" ? 55 : 25;
  const catW = catWeights[signal.category] || 0.5;
  const entityMax = signal.entities?.length ? Math.max(...signal.entities.map(e => e.weight)) : 0;

  score = urgScore * 0.30 + (catW * 100) * 0.25 + (entityMax / 10 * 100) * 0.20 +
    Math.min(100, (signal.sourceCount || 1) * 25) * 0.15 + 30 * 0.10;

  return Math.round(Math.min(97, Math.max(5, score)));
}

function classifySeverity(score) {
  if (score >= 75) return "حرج";
  if (score >= 50) return "مرتفع";
  if (score >= 25) return "متوسط";
  return "منخفض";
}

async function buildRadar() {
  const signals = [];

  const fetches = await Promise.allSettled([
    fetch(process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/news`
      : "https://newsdata.io/api/1/latest?apikey=pub_626724e77dc2de7a3e8e4b8a5dea44e52d424&language=ar,en&category=top,politics,world,business&size=50"
    ).then(r => r.json()).catch(() => null),
    fetch(process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/sports`
      : "https://newsdata.io/api/1/latest?apikey=pub_626724e77dc2de7a3e8e4b8a5dea44e52d424&language=ar,en&category=sports&size=25"
    ).then(r => r.json()).catch(() => null),
  ]);

  // Process news
  const newsData = fetches[0].status === "fulfilled" ? fetches[0].value : null;
  if (newsData) {
    const articles = newsData.news || newsData.results || [];
    for (const item of articles.slice(0, 80)) {
      const text = `${item.title || ""} ${item.summary || item.description || ""}`;
      const entities = extractEntities(text);
      const geo = resolveGeo(entities);
      const category = inferCategory(text);
      const urgency = item.urgency || (/عاجل|breaking|urgent/i.test(text) ? "high" : "medium");

      const sig = {
        id: item.id || item.article_id || `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: (item.title || text.slice(0, 100)).slice(0, 150),
        category,
        region: geo.region,
        coordinates: geo.coordinates,
        severity: "متوسط",
        urgency,
        confidence: 50,
        sourceCount: 1,
        linkedEntities: entities.map(e => e.name),
        trendDirection: "مستقر",
        timestamp: item.time || item.pubDate || new Date().toISOString(),
        radarScore: 0,
        source: item.source || item.source_id || "News",
        entities,
      };
      sig.radarScore = scoreSignal(sig);
      sig.severity = classifySeverity(sig.radarScore);
      sig.confidence = Math.min(90, 30 + entities.length * 10 + (urgency === "high" ? 20 : 0));
      signals.push(sig);
    }
  }

  // Process sports
  const sportsData = fetches[1].status === "fulfilled" ? fetches[1].value : null;
  if (sportsData) {
    const articles = sportsData.news || sportsData.results || [];
    for (const item of articles.slice(0, 30)) {
      const text = `${item.title || ""} ${item.summary || item.description || ""}`;
      const entities = extractEntities(text);
      const geo = resolveGeo(entities);

      const sig = {
        id: item.id || `sr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: (item.title || text.slice(0, 100)).slice(0, 150),
        category: "رياضة",
        region: geo.region || "الرياضة",
        coordinates: geo.coordinates,
        severity: "منخفض",
        urgency: "low",
        confidence: 40,
        sourceCount: 1,
        linkedEntities: entities.map(e => e.name),
        trendDirection: "مستقر",
        timestamp: item.time || item.pubDate || new Date().toISOString(),
        radarScore: 0,
        source: item.source || "Sports",
        entities,
      };
      sig.radarScore = scoreSignal(sig);
      sig.severity = classifySeverity(sig.radarScore);
      signals.push(sig);
    }
  }

  // Sort by score
  signals.sort((a, b) => b.radarScore - a.radarScore);

  // Stats
  const critical = signals.filter(s => s.severity === "حرج").length;
  const high = signals.filter(s => s.severity === "مرتفع").length;

  return {
    signals: signals.slice(0, 100),
    stats: {
      totalActive: signals.length,
      critical,
      high,
      lastUpdate: new Date().toISOString(),
      globalActivityLevel: critical > 3 ? "حرج" : critical > 0 || high > 5 ? "مرتفع" : high > 0 ? "متوسط" : "منخفض",
    },
  };
}

export default async function handler(req, res) {
  try {
    const now = Date.now();
    if (now - cache.updated < CACHE_TTL_MS && cache.signals.length > 0) {
      return res.status(200).json(cache);
    }

    const result = await buildRadar();
    cache = { updated: now, ...result };
    return res.status(200).json(cache);
  } catch (err) {
    console.error("Global radar error:", err);
    return res.status(200).json({ signals: cache.signals || [], stats: cache.stats || {}, error: true });
  }
}
