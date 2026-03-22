/**
 * api/global-radar.js
 *
 * Server-side radar endpoint.
 * Aggregates news, X signals, sports, and live events into
 * normalized radar signals with scoring and classification.
 */

const CACHE_TTL_MS = 20_000;

let cache = { updated: 0, signals: [], stats: {} };

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

// ── Entity Patterns (lightweight server-side version) ──────────────
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
  { r: /\b(Yemen|اليمن)\b/i,                name: "اليمن",            type: "country",  weight: 8  },
  { r: /\b(Lebanon|لبنان)\b/i,              name: "لبنان",            type: "country",  weight: 7  },
  { r: /\b(Syria|سوريا)\b/i,                name: "سوريا",            type: "country",  weight: 8  },
  { r: /\b(Iraq|العراق)\b/i,                name: "العراق",           type: "country",  weight: 7  },
  { r: /\b(Egypt|مصر)\b/i,                  name: "مصر",              type: "country",  weight: 6  },
  { r: /\b(Turkey|تركيا)\b/i,               name: "تركيا",            type: "country",  weight: 6  },
  { r: /\b(Pakistan|باكستان)\b/i,            name: "باكستان",          type: "country",  weight: 6  },
  { r: /\b(India|الهند)\b/i,                name: "الهند",            type: "country",  weight: 6  },
  { r: /\b(North Korea|كوريا الشمالية)\b/i, name: "كوريا الشمالية",   type: "country",  weight: 7  },
  { r: /\b(Libya|ليبيا)\b/i,                name: "ليبيا",            type: "country",  weight: 6  },
  { r: /\b(Sudan|السودان)\b/i,              name: "السودان",          type: "country",  weight: 7  },
  { r: /\b(oil|crude|نفط|بترول)\b/i,        name: "النفط",            type: "market",   weight: 7  },
  { r: /\b(gold|ذهب)\b/i,                   name: "الذهب",            type: "market",   weight: 6  },
  { r: /\b(dollar|دولار)\b/i,               name: "الدولار",          type: "market",   weight: 6  },
  { r: /\b(Hamas|حماس)\b/i,                 name: "حماس",             type: "org",      weight: 9  },
  { r: /\b(Hezbollah|حزب الله)\b/i,         name: "حزب الله",         type: "org",      weight: 9  },
  { r: /\b(Houthis|الحوثيون|Houthi)\b/i,   name: "الحوثيون",         type: "org",      weight: 9  },
  { r: /\b(NATO|الناتو)\b/i,                name: "الناتو",           type: "org",      weight: 8  },
  { r: /\b(OPEC|أوبك)\b/i,                  name: "أوبك",             type: "org",      weight: 7  },
  // UAE Sports Clubs
  { r: /\b(الشارقة|Sharjah FC|Sharjah Club)\b/i, name: "الشارقة",    type: "sports",   weight: 5  },
  { r: /\b(العين|Al Ain)\b/i,               name: "العين",            type: "sports",   weight: 5  },
  { r: /\b(شباب الأهلي|Shabab Al Ahli)\b/i, name: "شباب الأهلي",      type: "sports",   weight: 5  },
  { r: /\b(الوصل|Al Wasl)\b/i,              name: "الوصل",            type: "sports",   weight: 5  },
  { r: /\b(الجزيرة|Al Jazira)\b/i,          name: "الجزيرة",          type: "sports",   weight: 5  },
  { r: /\b(الوحدة|Al Wahda)\b/i,            name: "الوحدة",           type: "sports",   weight: 5  },
  // Major sports
  { r: /\b(Champions League|دوري الأبطال)\b/i, name: "دوري الأبطال",  type: "sports",   weight: 6  },
  { r: /\b(World Cup|كأس العالم)\b/i,       name: "كأس العالم",       type: "sports",   weight: 7  },
  { r: /\b(Premier League|الدوري الإنجليزي)\b/i, name: "الدوري الإنجليزي", type: "sports", weight: 5 },
  { r: /\b(transfer|انتقال|صفقة)\b/i,       name: "انتقالات",         type: "sports",   weight: 5  },
];

const COORDS = {
  "غزة":           { lat: 31.5, lon: 34.4, region: "الشرق الأوسط" },
  "إيران":         { lat: 32.4, lon: 53.7, region: "الشرق الأوسط" },
  "إسرائيل":       { lat: 31.5, lon: 34.9, region: "الشرق الأوسط" },
  "أوكرانيا":      { lat: 49.0, lon: 31.2, region: "أوروبا" },
  "روسيا":         { lat: 55.7, lon: 37.6, region: "أوروبا" },
  "الصين":         { lat: 39.9, lon: 116.4, region: "آسيا والمحيط الهادئ" },
  "السعودية":      { lat: 23.9, lon: 45.1, region: "الشرق الأوسط" },
  "الإمارات":      { lat: 24.5, lon: 54.4, region: "الشرق الأوسط" },
  "اليمن":         { lat: 15.6, lon: 47.5, region: "الشرق الأوسط" },
  "لبنان":         { lat: 33.9, lon: 35.9, region: "الشرق الأوسط" },
  "سوريا":         { lat: 34.8, lon: 38.0, region: "الشرق الأوسط" },
  "العراق":        { lat: 33.2, lon: 43.7, region: "الشرق الأوسط" },
  "مصر":           { lat: 30.0, lon: 31.2, region: "الشرق الأوسط" },
  "تركيا":         { lat: 39.9, lon: 32.9, region: "أوروبا" },
  "باكستان":       { lat: 33.7, lon: 73.0, region: "آسيا والمحيط الهادئ" },
  "الهند":         { lat: 28.6, lon: 77.2, region: "آسيا والمحيط الهادئ" },
  "تايوان":        { lat: 25.0, lon: 121.5, region: "آسيا والمحيط الهادئ" },
  "كوريا الشمالية":{ lat: 39.0, lon: 125.8, region: "آسيا والمحيط الهادئ" },
  "ليبيا":         { lat: 32.9, lon: 13.2, region: "أفريقيا" },
  "السودان":       { lat: 15.6, lon: 32.5, region: "أفريقيا" },
  "النفط":         { lat: 25.0, lon: 55.0, region: "الأسواق العالمية" },
  "الذهب":         { lat: 40.7, lon: -74.0, region: "الأسواق العالمية" },
  "الدولار":       { lat: 40.7, lon: -74.0, region: "الأسواق العالمية" },
  "مضيق هرمز":     { lat: 26.6, lon: 56.6, region: "الشرق الأوسط" },
  "البحر الأحمر":  { lat: 21.0, lon: 43.0, region: "الشرق الأوسط" },
  "حماس":          { lat: 31.5, lon: 34.4, region: "الشرق الأوسط" },
  "حزب الله":      { lat: 33.9, lon: 35.9, region: "الشرق الأوسط" },
  "الحوثيون":      { lat: 15.6, lon: 47.5, region: "الشرق الأوسط" },
  "الناتو":        { lat: 50.8, lon: 4.4, region: "أوروبا" },
  "أوبك":          { lat: 25.0, lon: 55.0, region: "الأسواق العالمية" },
  // UAE clubs → UAE coords
  "الشارقة":       { lat: 25.4, lon: 55.5, region: "الرياضة" },
  "العين":         { lat: 24.2, lon: 55.7, region: "الرياضة" },
  "شباب الأهلي":   { lat: 25.2, lon: 55.3, region: "الرياضة" },
  "الوصل":         { lat: 25.2, lon: 55.3, region: "الرياضة" },
  "الجزيرة":       { lat: 24.5, lon: 54.7, region: "الرياضة" },
  "الوحدة":        { lat: 24.5, lon: 54.4, region: "الرياضة" },
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
    if (geo) return { region: geo.region, country: e.name, coordinates: [geo.lon, geo.lat] };
  }
  return { region: "دولي", country: "غير محدد", coordinates: null };
}

function inferCategory(text) {
  const t = String(text || "").toLowerCase();
  if (/attack|strike|missile|drone|explosion|war|غارة|قصف|صاروخ|حرب|تصعيد|اشتباك/i.test(t)) return "صراع / تصعيد";
  if (/ceasefire|diplomacy|talks|summit|هدنة|محادثات|اتفاق|مفاوضات|دبلوماس/i.test(t)) return "دبلوماسية";
  if (/oil|crude|opec|نفط|طاقة|شحن|ناقلة/i.test(t)) return "طاقة / نفط / شحن";
  if (/market|stock|gold|inflation|سوق|ذهب|تضخم|بورصة|اقتصاد/i.test(t)) return "اقتصاد / أسواق";
  if (/transfer|انتقال|صفقة|تعاقد/i.test(t)) return "انتقالات";
  if (/football|soccer|match|league|goal|دوري|مباراة|كرة|بطولة|كأس|الشارقة|العين|شباب الأهلي|الوصل|الجزيرة|الوحدة/i.test(t)) return "رياضة";
  if (/breaking|urgent|عاجل/i.test(t)) return "أحداث عالمية";
  if (/election|government|parliament|president|minister|انتخاب|حكومة|رئيس|وزير/i.test(t)) return "أحداث عالمية";
  return "إشارات ناشئة";
}

function inferSubcategory(text, category) {
  const t = String(text || "").toLowerCase();
  if (category === "صراع / تصعيد") {
    if (/missile|صاروخ/i.test(t)) return "هجوم صاروخي";
    if (/drone|مسيّرة/i.test(t)) return "هجوم بمسيّرات";
    return "تصعيد عسكري";
  }
  if (category === "رياضة") {
    if (/transfer|انتقال|صفقة/i.test(t)) return "انتقالات";
    if (/injury|إصابة/i.test(t)) return "إصابات";
    return "أخبار رياضية";
  }
  return "";
}

function classifyAlertBadge(score, text, urgency) {
  const t = String(text || "").toLowerCase();
  if (urgency === "high" || /عاجل|breaking|urgent/i.test(t)) return "عاجل";
  if (score >= 75 && /تصعيد|escalat|strike|offensive/i.test(t)) return "تصعيد حرج";
  if (score >= 60 && /diplomacy|هدنة|ceasefire/i.test(t)) return "تطور دبلوماسي";
  if (score >= 50 && /market|oil|نفط|سوق/i.test(t)) return "تحذير اقتصادي";
  return null;
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
  const isSports = signal.category === "رياضة" || signal.category === "انتقالات";

  if (isSports) {
    const sportsImp = Math.min(100, 30 + (signal.title?.match(/final|نهائي|كلاسيكو|ديربي/i) ? 30 : 0));
    score = urgScore * 0.15 + (catW * 100) * 0.10 +
      Math.min(100, (signal.sourceCount || 1) * 25) * 0.10 +
      (entityMax / 10 * 100) * 0.10 + sportsImp * 0.30 + 30 * 0.15;
  } else {
    score = urgScore * 0.20 + (catW * 100) * 0.15 + (entityMax / 10 * 100) * 0.10 +
      Math.min(100, (signal.sourceCount || 1) * 25) * 0.15 + 30 * 0.10 +
      40 * 0.10 + 30 * 0.05 + 30 * 0.05 + 30 * 0.10;
  }

  return Math.round(Math.min(97, Math.max(5, score)));
}

function classifySeverity(score) {
  if (score >= 75) return "حرج";
  if (score >= 50) return "مرتفع";
  if (score >= 25) return "متوسط";
  return "منخفض";
}

async function buildRadar(req) {
  const signals = [];
  const base = internalApiBase(req);
  const hasExternalNewsApiKey = Boolean(process.env.NEWS_API_KEY);
  const newsFallback = hasExternalNewsApiKey
    ? `https://newsdata.io/api/1/latest?apikey=${process.env.NEWS_API_KEY}&language=ar,en&category=top,politics,world,business&size=50`
    : null;
  const sportsFallback = hasExternalNewsApiKey
    ? `https://newsdata.io/api/1/latest?apikey=${process.env.NEWS_API_KEY}&language=ar,en&category=sports&size=25`
    : null;

  const fetches = await Promise.allSettled([
    fetch(`${base}/api/news`)
      .then(r => r.ok ? r.json() : null)
      .catch(async () => {
        if (!newsFallback) return null;
        try {
          const r = await fetch(newsFallback);
          return r.ok ? r.json() : null;
        } catch {
          return null;
        }
      }),
    fetch(`${base}/api/sports`)
      .then(r => r.ok ? r.json() : null)
      .catch(async () => {
        if (!sportsFallback) return null;
        try {
          const r = await fetch(sportsFallback);
          return r.ok ? r.json() : null;
        } catch {
          return null;
        }
      }),
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
        text: text.slice(0, 300),
        category,
        subcategory: inferSubcategory(text, category),
        region: geo.region,
        country: geo.country,
        coordinates: geo.coordinates,
        severity: "متوسط",
        urgency,
        confidence: 50,
        sourceCount: 1,
        sourceType: urgency === "high" ? "breaking" : "news",
        linkedEntities: entities.map(e => e.name),
        linkedEvents: [],
        trendDirection: "مستقر",
        timestamp: item.time || item.pubDate || new Date().toISOString(),
        radarScore: 0,
        source: item.source || item.source_id || "News",
        entities,
        isEmerging: false,
        alertBadge: null,
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
        text: text.slice(0, 300),
        category: "رياضة",
        subcategory: inferSubcategory(text, "رياضة"),
        region: geo.region || "الرياضة",
        country: geo.country || "غير محدد",
        coordinates: geo.coordinates,
        severity: "منخفض",
        urgency: "low",
        confidence: 40,
        sourceCount: 1,
        sourceType: "sports",
        linkedEntities: entities.map(e => e.name),
        linkedEvents: [],
        trendDirection: "مستقر",
        timestamp: item.time || item.pubDate || new Date().toISOString(),
        radarScore: 0,
        source: item.source || "Sports",
        entities,
        isEmerging: false,
        alertBadge: null,
      };
      sig.radarScore = scoreSignal(sig);
      sig.severity = classifySeverity(sig.radarScore);
      signals.push(sig);
    }
  }

  // Sort by score
  signals.sort((a, b) => b.radarScore - a.radarScore);

  // Assign alert badges
  for (const sig of signals) {
    sig.alertBadge = classifyAlertBadge(sig.radarScore, sig.text || sig.title, sig.urgency);
    sig.isEmerging = sig.sourceCount <= 2 && sig.confidence < 50 && sig.radarScore < 50 && sig.radarScore >= 15;
  }

  // Stats
  const critical = signals.filter(s => s.severity === "حرج").length;
  const high = signals.filter(s => s.severity === "مرتفع").length;

  // Region summaries
  const regionNames = [
    "الشرق الأوسط", "أوروبا", "أمريكا الشمالية",
    "آسيا والمحيط الهادئ", "أفريقيا", "أمريكا اللاتينية",
    "الأسواق العالمية", "الرياضة"
  ];
  const regions = regionNames.map(region => {
    const rSigs = region === "الرياضة"
      ? signals.filter(s => s.category === "رياضة" || s.category === "انتقالات")
      : signals.filter(s => s.region === region);
    const avgScore = rSigs.length ? Math.round(rSigs.reduce((sum, s) => sum + s.radarScore, 0) / rSigs.length) : 0;
    const maxScore = rSigs.length ? Math.max(...rSigs.map(s => s.radarScore)) : 0;
    let pressure = "منخفض";
    if (avgScore >= 65) pressure = "حرج";
    else if (avgScore >= 45) pressure = "مرتفع";
    else if (avgScore >= 25) pressure = "متوسط";
    return { region, signalCount: rSigs.length, avgScore, maxScore, pressure, trend: "مستقر" };
  });

  const topRegion = regions.filter(r => r.region !== "الرياضة").sort((a, b) => b.maxScore - a.maxScore)[0];
  const topSignal = signals[0];

  return {
    signals: signals.slice(0, 120),
    regions,
    stats: {
      totalActive: signals.length,
      critical,
      high,
      lastUpdate: new Date().toISOString(),
      globalActivityLevel: critical > 3 ? "حرج" : critical > 0 || high > 5 ? "مرتفع" : high > 0 ? "متوسط" : "منخفض",
      topRegion: topRegion?.region || "—",
      topRegionPressure: topRegion?.pressure || "—",
      topSignal: topSignal?.title || "—",
      topSignalScore: topSignal?.radarScore || 0,
    },
  };
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const now = Date.now();
    if (now - cache.updated < CACHE_TTL_MS && cache.signals.length > 0) {
      return res.status(200).json(cache);
    }

    const result = await buildRadar(req);
    cache = { updated: now, ...result };
    return res.status(200).json(cache);
  } catch (err) {
    console.error("Global radar error:", err);
    return res.status(200).json({ signals: cache.signals || [], stats: cache.stats || {}, error: true });
  }
}
