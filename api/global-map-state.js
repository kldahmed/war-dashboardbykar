const CACHE_TTL_MS = 20000;

const SPECIAL_ZONES = [
  { id: "red-sea", name: "Red Sea", region: "Middle East", centerCoordinates: [20.6, 38.2], keywords: [/red sea/i, /البحر الأحمر/i, /bab al[- ]mandab/i, /باب المندب/i] },
  { id: "gulf", name: "Arabian Gulf", region: "Middle East", centerCoordinates: [26.2, 51.7], keywords: [/gulf/i, /الخليج/i, /arabian gulf/i, /persian gulf/i] },
  { id: "black-sea", name: "Black Sea", region: "Europe", centerCoordinates: [43.2, 35.1], keywords: [/black sea/i, /البحر الأسود/i] },
  { id: "taiwan-strait", name: "Taiwan Strait", region: "Asia-Pacific", centerCoordinates: [24.3, 119.7], keywords: [/taiwan strait/i, /مضيق تايوان/i] },
  { id: "east-med", name: "Eastern Mediterranean", region: "Middle East", centerCoordinates: [34.3, 31.6], keywords: [/eastern mediterranean/i, /شرق المتوسط/i, /eastern med/i] }
];

const COUNTRY_HINTS = [
  { id: "sa", name: "Saudi Arabia", region: "Middle East", centerCoordinates: [24.0, 45.0], keys: [/saudi/i, /السعودية/i, /riyadh/i, /الرياض/i] },
  { id: "ae", name: "United Arab Emirates", region: "Middle East", centerCoordinates: [24.3, 54.4], keys: [/uae/i, /emirates/i, /الإمارات/i, /dubai/i, /abu dhabi/i, /دبي/i, /أبوظبي/i] },
  { id: "qa", name: "Qatar", region: "Middle East", centerCoordinates: [25.3, 51.2], keys: [/qatar/i, /قطر/i, /doha/i, /الدوحة/i] },
  { id: "kw", name: "Kuwait", region: "Middle East", centerCoordinates: [29.4, 47.6], keys: [/kuwait/i, /الكويت/i] },
  { id: "bh", name: "Bahrain", region: "Middle East", centerCoordinates: [26.1, 50.5], keys: [/bahrain/i, /البحرين/i] },
  { id: "om", name: "Oman", region: "Middle East", centerCoordinates: [20.5, 57.4], keys: [/oman/i, /عمان/i, /muscat/i, /مسقط/i] },
  { id: "iq", name: "Iraq", region: "Middle East", centerCoordinates: [33.2, 43.7], keys: [/iraq/i, /العراق/i, /baghdad/i, /بغداد/i] },
  { id: "ir", name: "Iran", region: "Middle East", centerCoordinates: [32.2, 53.7], keys: [/iran/i, /إيران/i, /tehran/i, /طهران/i] },
  { id: "sy", name: "Syria", region: "Middle East", centerCoordinates: [35.1, 38.5], keys: [/syria/i, /سوريا/i, /damascus/i, /دمشق/i] },
  { id: "lb", name: "Lebanon", region: "Middle East", centerCoordinates: [33.9, 35.8], keys: [/lebanon/i, /لبنان/i, /beirut/i, /بيروت/i] },
  { id: "il", name: "Israel", region: "Middle East", centerCoordinates: [31.4, 35.1], keys: [/israel/i, /إسرائيل/i, /تل أبيب/i, /gaza/i, /غزة/i] },
  { id: "ye", name: "Yemen", region: "Middle East", centerCoordinates: [15.6, 48.3], keys: [/yemen/i, /اليمن/i, /sanaa/i, /صنعاء/i] },
  { id: "eg", name: "Egypt", region: "Middle East", centerCoordinates: [26.8, 30.8], keys: [/egypt/i, /مصر/i, /cairo/i, /القاهرة/i] },
  { id: "tr", name: "Turkey", region: "Europe", centerCoordinates: [39.0, 35.0], keys: [/turkey/i, /تركيا/i, /ankara/i, /أنقرة/i] },
  { id: "ua", name: "Ukraine", region: "Europe", centerCoordinates: [49.0, 31.2], keys: [/ukraine/i, /أوكرانيا/i, /kyiv/i, /كييف/i] },
  { id: "ru", name: "Russia", region: "Europe", centerCoordinates: [61.5, 105.3], keys: [/russia/i, /روسيا/i, /moscow/i, /موسكو/i] },
  { id: "gb", name: "United Kingdom", region: "Europe", centerCoordinates: [54.2, -2.9], keys: [/uk\b/i, /britain/i, /united kingdom/i, /بريطانيا/i, /لندن/i] },
  { id: "fr", name: "France", region: "Europe", centerCoordinates: [46.2, 2.2], keys: [/france/i, /فرنسا/i, /paris/i, /باريس/i] },
  { id: "de", name: "Germany", region: "Europe", centerCoordinates: [51.2, 10.4], keys: [/germany/i, /ألمانيا/i, /berlin/i, /برلين/i] },
  { id: "it", name: "Italy", region: "Europe", centerCoordinates: [41.9, 12.5], keys: [/italy/i, /إيطاليا/i, /rome/i, /روما/i] },
  { id: "es", name: "Spain", region: "Europe", centerCoordinates: [40.4, -3.7], keys: [/spain/i, /إسبانيا/i, /madrid/i, /مدريد/i] },
  { id: "us", name: "United States", region: "North America", centerCoordinates: [39.8, -98.6], keys: [/united states/i, /usa/i, /america/i, /أمريكا/i, /washington/i, /ترامب/i, /بايدن/i] },
  { id: "ca", name: "Canada", region: "North America", centerCoordinates: [56.1, -106.3], keys: [/canada/i, /كندا/i] },
  { id: "mx", name: "Mexico", region: "North America", centerCoordinates: [23.6, -102.5], keys: [/mexico/i, /المكسيك/i] },
  { id: "cn", name: "China", region: "Asia-Pacific", centerCoordinates: [35.8, 104.1], keys: [/china/i, /الصين/i, /beijing/i, /بكين/i] },
  { id: "jp", name: "Japan", region: "Asia-Pacific", centerCoordinates: [36.2, 138.2], keys: [/japan/i, /اليابان/i, /tokyo/i, /طوكيو/i] },
  { id: "kr", name: "South Korea", region: "Asia-Pacific", centerCoordinates: [36.4, 127.9], keys: [/south korea/i, /كوريا الجنوبية/i, /seoul/i, /سيول/i] },
  { id: "tw", name: "Taiwan", region: "Asia-Pacific", centerCoordinates: [23.7, 121.0], keys: [/taiwan/i, /تايوان/i, /taipei/i, /تايبيه/i] },
  { id: "in", name: "India", region: "Asia-Pacific", centerCoordinates: [22.8, 79.0], keys: [/india/i, /الهند/i, /new delhi/i, /نيودلهي/i] },
  { id: "pk", name: "Pakistan", region: "Asia-Pacific", centerCoordinates: [30.3, 69.3], keys: [/pakistan/i, /باكستان/i] },
  { id: "za", name: "South Africa", region: "Africa", centerCoordinates: [-30.6, 22.9], keys: [/south africa/i, /جنوب أفريقيا/i] },
  { id: "sd", name: "Sudan", region: "Africa", centerCoordinates: [13.5, 30.2], keys: [/sudan/i, /السودان/i] },
  { id: "et", name: "Ethiopia", region: "Africa", centerCoordinates: [9.1, 40.5], keys: [/ethiopia/i, /إثيوبيا/i] },
  { id: "ng", name: "Nigeria", region: "Africa", centerCoordinates: [9.1, 8.7], keys: [/nigeria/i, /نيجيريا/i] },
  { id: "ma", name: "Morocco", region: "Africa", centerCoordinates: [31.8, -7.1], keys: [/morocco/i, /المغرب/i] },
  { id: "br", name: "Brazil", region: "Latin America", centerCoordinates: [-14.2, -51.9], keys: [/brazil/i, /البرازيل/i] },
  { id: "ar", name: "Argentina", region: "Latin America", centerCoordinates: [-34.0, -64.0], keys: [/argentina/i, /الأرجنتين/i] },
  { id: "co", name: "Colombia", region: "Latin America", centerCoordinates: [4.6, -74.1], keys: [/colombia/i, /كولومبيا/i] },
  { id: "ve", name: "Venezuela", region: "Latin America", centerCoordinates: [6.4, -66.6], keys: [/venezuela/i, /فنزويلا/i] }
];

let cached = { expiresAt: 0, payload: null };

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapCategory(text) {
  const t = String(text || "").toLowerCase();
  if (/sports|كرة|دوري|match|tournament|transfer|انتقالات/.test(t)) return "sports";
  if (/oil|energy|نفط|inflation|market|shipping|econom/.test(t)) return "economy";
  if (/sanction|military|conflict|war|diplom|حرب|عقوبات|تصعيد|توتر/.test(t)) return "geopolitics";
  return "news";
}

function mapImpact(item) {
  const urgency = String(item.urgency || "").toLowerCase();
  if (urgency === "high") return 0.85;
  if (urgency === "medium") return 0.62;
  return 0.38;
}

function mapConfidence(item) {
  const explicit = Number(item.confidence || item.confidenceScore || 0);
  if (explicit > 0) return Math.min(0.95, Math.max(0.2, explicit / 100));
  const urgency = String(item.urgency || "").toLowerCase();
  if (urgency === "high") return 0.72;
  if (urgency === "medium") return 0.58;
  return 0.45;
}

function detectMentions(item) {
  const body = `${item.title || ""} ${item.summary || ""} ${item.region || ""}`;
  const countries = COUNTRY_HINTS.filter((c) => c.keys.some((re) => re.test(body))).map((c) => c.id);
  const zones = SPECIAL_ZONES.filter((z) => z.keywords.some((re) => re.test(body))).map((z) => z.id);
  return { countries: [...new Set(countries)], zones: [...new Set(zones)] };
}

function resolvePrimaryCountry(item, mentions) {
  if (mentions.countries.length) {
    return COUNTRY_HINTS.find((c) => c.id === mentions.countries[0]) || null;
  }
  const regional = String(item.region || "");
  const regionMatch = COUNTRY_HINTS.find((c) => regional.includes(c.name) || regional.includes(c.region));
  return regionMatch || null;
}

function toDubaiTime(iso) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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

function groupByRegion(countries) {
  const groups = new Map();
  countries.forEach((country) => {
    const key = country.region;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key.toLowerCase().replace(/\s+/g, "-"),
        name: key,
        region: key,
        centerCoordinates: country.centerCoordinates,
        signalCount: 0,
        pressureLevel: "low",
        trendDirection: "stable",
        topEntities: [],
        topEvents: [],
        lastUpdated: country.lastUpdated
      });
    }
    const entry = groups.get(key);
    entry.signalCount += country.signalCount;
    entry.lastUpdated = entry.lastUpdated > country.lastUpdated ? entry.lastUpdated : country.lastUpdated;
    entry.topEntities.push(...country.topEntities);
    entry.topEvents.push(...country.topEvents);
  });

  return [...groups.values()].map((region) => {
    const pressure = region.signalCount > 15 ? "high" : region.signalCount > 7 ? "medium" : "low";
    return {
      ...region,
      pressureLevel: pressure,
      topEntities: [...new Set(region.topEntities)].slice(0, 6),
      topEvents: [...new Set(region.topEvents)].slice(0, 5)
    };
  });
}

function buildLinks(mapSignals) {
  const pairScore = new Map();

  mapSignals.forEach((signal) => {
    const nodes = [...new Set([signal.country, ...safeArray(signal.zones)])].filter(Boolean);
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const key = [a, b].sort().join("::");
        const score = pairScore.get(key) || { count: 0, categories: new Set() };
        score.count += 1;
        score.categories.add(signal.category);
        pairScore.set(key, score);
      }
    }
  });

  return [...pairScore.entries()]
    .filter(([, value]) => value.count >= 2)
    .map(([key, value]) => {
      const [source, target] = key.split("::");
      return {
        id: `link-${source}-${target}`,
        source,
        target,
        strength: Math.min(1, value.count / 7),
        linkedEventCount: value.count,
        categories: [...value.categories],
        explainability: `${value.count} co-referenced signals connected these nodes.`
      };
    });
}

async function safeFetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "global-pulse-map/1.0" }
    });

    if (!res.ok) {
      console.warn("[global-map-state] upstream non-200", url, res.status);
      return null;
    }

    try {
      return await res.json();
    } catch {
      console.warn("[global-map-state] upstream malformed json", url);
      return null;
    }
  } catch {
    console.warn("[global-map-state] upstream fetch failed", url);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildTimeline(signals) {
  const now = Date.now();
  const windows = {
    "30m": 30 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000
  };

  const timeline = {};
  Object.entries(windows).forEach(([key, ms]) => {
    timeline[key] = signals
      .filter((signal) => now - new Date(signal.time).getTime() <= ms)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((signal) => ({
        id: signal.id,
        country: signal.country,
        category: signal.category,
        impact: signal.impact,
        confidence: signal.confidence,
        urgency: signal.urgency,
        time: signal.time,
        clusterId: signal.clusterId
      }));
  });

  return timeline;
}

function compilePayload(items) {
  const mapSignals = items
    .map((item, idx) => {
      const mentions = detectMentions(item);
      const country = resolvePrimaryCountry(item, mentions);
      if (!country) return null;
      return {
        id: item.id || `signal-${idx}`,
        title: item.title || "",
        summary: item.summary || "",
        source: item.source || "",
        time: item.time || new Date().toISOString(),
        category: mapCategory(item.category || item.domain || item.title),
        impact: mapImpact(item),
        confidence: mapConfidence(item),
        urgency: item.urgency || "low",
        linkedEventCluster: item.clusterId || null,
        country: country.id,
        region: country.region,
        centerCoordinates: country.centerCoordinates,
        zones: mentions.zones
      };
    })
    .filter(Boolean);

  const byCountry = new Map();
  mapSignals.forEach((signal) => {
    const bucket = byCountry.get(signal.country) || {
      id: signal.country,
      name: COUNTRY_HINTS.find((c) => c.id === signal.country)?.name || signal.country,
      region: signal.region,
      centerCoordinates: signal.centerCoordinates,
      signalCount: 0,
      pressureLevel: "low",
      trendDirection: "stable",
      topEntities: [],
      topEvents: [],
      lastUpdated: signal.time,
      confidence: 0,
      categories: {}
    };

    bucket.signalCount += 1;
    bucket.lastUpdated = new Date(signal.time) > new Date(bucket.lastUpdated) ? signal.time : bucket.lastUpdated;
    bucket.confidence += signal.confidence;
    bucket.topEvents.push(signal.title);
    bucket.topEntities.push(signal.source);
    bucket.categories[signal.category] = (bucket.categories[signal.category] || 0) + 1;

    byCountry.set(signal.country, bucket);
  });

  const countries = [...byCountry.values()].map((country) => {
    const avgConfidence = country.signalCount ? country.confidence / country.signalCount : 0;
    const pressureScore = country.signalCount * 0.55 + avgConfidence * 10;
    const dominantCategory = Object.entries(country.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "news";

    return {
      id: country.id,
      name: country.name,
      region: country.region,
      centerCoordinates: country.centerCoordinates,
      signalCount: country.signalCount,
      pressureLevel: pressureScore > 8 ? "high" : pressureScore > 4 ? "medium" : "low",
      trendDirection: country.signalCount > 5 ? "up" : country.signalCount < 2 ? "down" : "stable",
      topEntities: [...new Set(country.topEntities)].slice(0, 5),
      topEvents: [...new Set(country.topEvents)].slice(0, 4),
      lastUpdated: country.lastUpdated,
      confidence: Number(avgConfidence.toFixed(2)),
      dominantCategory
    };
  });

  const regions = groupByRegion(countries);
  const links = buildLinks(mapSignals);
  const timeline = buildTimeline(mapSignals);

  return {
    generatedAt: new Date().toISOString(),
    generatedAtDubai: toDubaiTime(new Date().toISOString()),
    countries,
    regions,
    links,
    signals: mapSignals,
    zones: SPECIAL_ZONES,
    timeline,
    explainability: {
      sourcesUsed: ["news", "sports", "x-signals"],
      totalSignals: mapSignals.length,
      countryCount: countries.length,
      linkCount: links.length,
      note: "All highlights are derived from real ingested items and mapped by explicit geographic evidence."
    }
  };
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (Date.now() < cached.expiresAt && cached.payload) {
    return res.status(200).json({ ...cached.payload, cache: "hit" });
  }

  const baseUrl = internalApiBase(req);

  const [newsData, sportsData, xData] = await Promise.all([
    safeFetchJson(`${baseUrl}/api/news?category=all`),
    safeFetchJson(`${baseUrl}/api/sports?competition=all`),
    safeFetchJson(`${baseUrl}/api/x-feed`)
  ]);

  const news = safeArray(newsData?.news);
  const sports = safeArray(sportsData?.news);
  const xSignals = safeArray(xData?.signals || xData?.items || xData?.news);

  const normalizedX = xSignals.map((item, i) => ({
    id: item.id || `x-${i}`,
    title: item.title || item.text || "",
    summary: item.summary || item.explanation || "",
    source: item.source || item.author || "X",
    time: item.time || item.timestamp || item.createdAt || new Date().toISOString(),
    urgency: item.urgency || "medium",
    category: item.category || item.domain || "news",
    region: item.region || ""
  }));

  const payload = compilePayload([...news, ...sports, ...normalizedX]);

  cached = {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return res.status(200).json({ ...payload, cache: "miss" });
}
