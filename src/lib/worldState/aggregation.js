const COUNTRY_INDEX = [
  { id: "sa", name: "Saudi Arabia", region: "Middle East", centerCoordinates: [24.0, 45.0], patterns: [/saudi/i, /السعودية/i, /riyadh/i, /الرياض/i] },
  { id: "ae", name: "United Arab Emirates", region: "Middle East", centerCoordinates: [24.3, 54.4], patterns: [/uae/i, /emirates/i, /الإمارات/i, /dubai/i, /abu dhabi/i, /دبي/i, /أبوظبي/i] },
  { id: "ir", name: "Iran", region: "Middle East", centerCoordinates: [32.2, 53.7], patterns: [/iran/i, /إيران/i, /tehran/i, /طهران/i] },
  { id: "il", name: "Israel", region: "Middle East", centerCoordinates: [31.4, 35.1], patterns: [/israel/i, /إسرائيل/i, /gaza/i, /غزة/i] },
  { id: "ye", name: "Yemen", region: "Middle East", centerCoordinates: [15.6, 48.3], patterns: [/yemen/i, /اليمن/i, /houthi/i, /الحوثي/i] },
  { id: "eg", name: "Egypt", region: "Middle East", centerCoordinates: [26.8, 30.8], patterns: [/egypt/i, /مصر/i, /cairo/i, /القاهرة/i] },
  { id: "ua", name: "Ukraine", region: "Europe", centerCoordinates: [49.0, 31.2], patterns: [/ukraine/i, /أوكرانيا/i, /kyiv/i, /كييف/i] },
  { id: "ru", name: "Russia", region: "Europe", centerCoordinates: [61.5, 105.3], patterns: [/russia/i, /روسيا/i, /moscow/i, /موسكو/i] },
  { id: "cn", name: "China", region: "Asia-Pacific", centerCoordinates: [35.8, 104.1], patterns: [/china/i, /الصين/i, /beijing/i, /بكين/i] },
  { id: "us", name: "United States", region: "North America", centerCoordinates: [39.8, -98.6], patterns: [/united states/i, /usa/i, /america/i, /أمريكا/i, /washington/i] },
  { id: "sd", name: "Sudan", region: "Africa", centerCoordinates: [13.5, 30.2], patterns: [/sudan/i, /السودان/i] },
  { id: "br", name: "Brazil", region: "Latin America", centerCoordinates: [-14.2, -51.9], patterns: [/brazil/i, /البرازيل/i] },
];

const REGION_INDEX = [
  { region: "Middle East", patterns: [/middle east/i, /الشرق الأوسط/i, /gulf/i, /الخليج/i], fallbackCountryId: "sa" },
  { region: "Europe", patterns: [/europe/i, /أوروبا/i], fallbackCountryId: "ua" },
  { region: "Asia-Pacific", patterns: [/asia/i, /asia-pacific/i, /آسيا/i], fallbackCountryId: "cn" },
  { region: "North America", patterns: [/north america/i, /america/i, /أمريكا/i], fallbackCountryId: "us" },
  { region: "Africa", patterns: [/africa/i, /أفريقيا/i], fallbackCountryId: "sd" },
  { region: "Latin America", patterns: [/latin america/i, /أمريكا اللاتينية/i], fallbackCountryId: "br" },
];

const STOP_WORDS = new Set([
  "the", "and", "with", "from", "near", "amid", "after", "into", "over", "under", "this", "that",
  "في", "من", "على", "إلى", "عن", "مع", "بعد", "قبل", "حول", "عند", "بين", "هذا", "هذه"
]);

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleKey(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 12)
    .join(" ");
}

function toIsoTime(value) {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function inferCategory(text, fallbackCategory = "news") {
  const t = normalizeText(text);
  if (/attack|strike|missile|drone|war|conflict|sanction|هجوم|قصف|صاروخ|حرب|عقوبات/.test(t)) return "geopolitics";
  if (/market|oil|inflation|economy|shipping|نفط|اقتصاد|تضخم|أسواق|شحن/.test(t)) return "economy";
  if (/talks|summit|ceasefire|election|policy|محادثات|قمة|هدنة|انتخابات|سياسة/.test(t)) return "politics";
  if (/football|match|league|transfer|كرة|مباراة|دوري|انتقالات/.test(t)) return "sports";
  if (/aircraft|radar|flight|track|رادار|طائرة/.test(t)) return "air";
  return fallbackCategory || "news";
}

function sourceWeight(source) {
  const s = normalizeText(source);
  if (/reuters|bbc|al jazeera|sky news|nytimes/.test(s)) return 82;
  if (/global events|global-events|intelnews/.test(s)) return 76;
  if (/radar/.test(s)) return 70;
  if (/x|twitter/.test(s)) return 64;
  return 58;
}

function urgencyWeight(text) {
  const t = normalizeText(text);
  if (/urgent|breaking|missile|drone|attack|explosion|عاجل|هجوم|انفجار|صاروخ/.test(t)) return 24;
  if (/market|oil|summit|talks|economy|نفط|قمة|محادثات|اقتصاد/.test(t)) return 15;
  return 8;
}

function inferImportance(signal) {
  if (Number.isFinite(Number(signal.importanceScore))) {
    return Math.min(100, Math.max(20, Number(signal.importanceScore)));
  }
  const category = String(signal.category || "").toLowerCase();
  const categoryWeight = /geopolitics|air/.test(category) ? 16 : /economy|politics|regional/.test(category) ? 12 : 7;
  const confidence = Number(signal.confidence || 0);
  const confidenceWeight = confidence > 1 ? Math.min(12, confidence / 8) : Math.min(12, confidence * 12);
  return Math.min(100, Math.round(sourceWeight(signal.source) * 0.56 + urgencyWeight(`${signal.title} ${signal.summary}`) + categoryWeight + confidenceWeight));
}

function inferCountry(signal) {
  const body = `${signal.title || ""} ${signal.summary || ""} ${signal.region || ""}`;
  const match = COUNTRY_INDEX.find((entry) => entry.patterns.some((pattern) => pattern.test(body)));
  if (match) return match;
  const regionMatch = REGION_INDEX.find((entry) => entry.patterns.some((pattern) => pattern.test(body)));
  if (!regionMatch) return null;
  return COUNTRY_INDEX.find((entry) => entry.id === regionMatch.fallbackCountryId) || null;
}

function deriveEntities(signal) {
  const body = normalizeText(`${signal.title || ""} ${signal.summary || ""} ${signal.region || ""}`);
  const countryEntities = COUNTRY_INDEX.filter((entry) => entry.patterns.some((pattern) => pattern.test(body))).map((entry) => entry.name);
  const regionEntities = REGION_INDEX.filter((entry) => entry.patterns.some((pattern) => pattern.test(body))).map((entry) => entry.region);
  const sourceEntity = signal.source ? [String(signal.source)] : [];
  const categoryEntity = signal.category ? [String(signal.category)] : [];
  const tokens = body.split(" ").filter((token) => token.length > 4 && !STOP_WORDS.has(token)).slice(0, 4);
  return [...new Set([...countryEntities, ...regionEntities, ...sourceEntity, ...categoryEntity, ...tokens])].slice(0, 8);
}

function baseSignal(source, item, index) {
  const title = item.title || item.headline || item.label || item.translated || item.text || item.callsign || `${source}-${index}`;
  const summary = item.summary || item.description || item.explanation || item.text || "";
  const region = item.region || "";
  const category = inferCategory(`${item.category || item.type || item.domain || item.queryDomain || ""} ${title} ${summary}`, item.category || item.type || item.domain || "news");
  const timestamp = toIsoTime(item.timestamp || item.time || item.updatedAt || item.createdAt || item.publishedAt);
  const signal = {
    id: item.id || `${source}-${index}`,
    title,
    summary,
    category,
    source: item.source || item.authorName || item.author || source,
    region,
    timestamp,
    tags: safeArray(item.tags),
    raw: item,
  };
  const country = inferCountry(signal);
  const entities = deriveEntities(signal);
  return {
    ...signal,
    country: country?.id || "",
    region: country?.region || region || "Global",
    centerCoordinates: country?.centerCoordinates || null,
    entities,
    importanceScore: inferImportance({ ...signal, category, source: signal.source }),
  };
}

export function normalizeEndpointPayload(endpoint, payload) {
  if (!payload || typeof payload !== "object") {
    return { aircraft: [], events: [], signals: [] };
  }

  if (endpoint === "/api/global-map-state") {
    const signals = safeArray(payload.signals).map((item, index) => ({
      ...baseSignal("global-map-state", item, index),
      country: item.country || baseSignal("global-map-state", item, index).country,
      region: item.region || baseSignal("global-map-state", item, index).region,
      importanceScore: inferImportance(item),
      tags: [...new Set([...(safeArray(item.tags)), ...(safeArray(item.zones)), ...(safeArray(item.entities))])],
      entities: safeArray(item.entities).length ? safeArray(item.entities) : deriveEntities(item),
    }));

    return {
      aircraft: safeArray(payload.aircraft),
      events: safeArray(payload.events),
      signals,
      links: safeArray(payload.links),
      countries: safeArray(payload.countries),
    };
  }

  if (endpoint === "/api/global-events") {
    const events = safeArray(payload.events);
    return {
      aircraft: [],
      events,
      signals: events.map((item, index) => baseSignal("global-events", item, index)),
      links: [],
      countries: [],
    };
  }

  if (endpoint === "/api/radar") {
    const aircraft = safeArray(payload.aircraft);
    return {
      aircraft,
      events: [],
      signals: aircraft.map((item, index) => baseSignal("radar", {
        ...item,
        title: `Aircraft track ${item.callsign || `Track ${index + 1}`}`,
        summary: `Live radar track at altitude ${Math.round(Number(item.altitude || 0))} ft`,
        region: Number(item.lng || item.lon || 0) > 42 ? "Middle East" : "Europe",
        category: "air",
      }, index)),
      links: [],
      countries: [],
    };
  }

  if (endpoint === "/api/live-intake" || endpoint === "/api/news?category=all" || endpoint === "/api/intelnews") {
    const items = safeArray(payload.news);
    const sourceLabel = endpoint.includes("live-intake") ? "live-intake" : endpoint.includes("intelnews") ? "intelnews" : "news";
    return {
      aircraft: [],
      events: [],
      signals: items.map((item, index) => ({
        ...baseSignal(sourceLabel, item, index),
        tags: [...new Set([...(safeArray(item.tags)), ...(safeArray(item.keywords)), item.reliability, item.sourceFeed].filter(Boolean))],
      })),
      links: [],
      countries: [],
    };
  }

  if (endpoint === "/api/x-feed") {
    const items = safeArray(payload.posts || payload.signals || payload.items || payload.news);
    return {
      aircraft: [],
      events: [],
      signals: items.map((item, index) => baseSignal("x-feed", item, index)),
      links: [],
      countries: [],
    };
  }

  return { aircraft: [], events: [], signals: [], links: [], countries: [] };
}

export function dedupeSignals(signals) {
  const seen = new Map();
  safeArray(signals).forEach((signal, index) => {
    const titleKey = normalizeTitleKey(signal.title || signal.summary || signal.id || `signal-${index}`);
    const key = titleKey || `${normalizeText(signal.source)}-${index}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, signal);
      return;
    }

    const prevScore = Number(prev.importanceScore || 0);
    const nextScore = Number(signal.importanceScore || 0);
    const prevTime = new Date(prev.timestamp || 0).getTime() || 0;
    const nextTime = new Date(signal.timestamp || 0).getTime() || 0;
    if (nextScore > prevScore || (nextScore === prevScore && nextTime > prevTime)) {
      seen.set(key, signal);
    }
  });
  return [...seen.values()];
}

export function buildCountries(signals, existingCountries = []) {
  const grouped = new Map();
  safeArray(signals).forEach((signal) => {
    if (!signal?.country) return;
    const existing = grouped.get(signal.country) || {
      id: signal.country,
      name: COUNTRY_INDEX.find((entry) => entry.id === signal.country)?.name || signal.country,
      region: signal.region,
      centerCoordinates: signal.centerCoordinates || null,
      signalCount: 0,
      topEvents: [],
      topEntities: [],
      importanceScore: 0,
      lastUpdated: signal.timestamp,
      categories: {},
    };

    existing.signalCount += 1;
    existing.topEvents.push(signal.title);
    existing.topEntities.push(...safeArray(signal.entities));
    existing.importanceScore += Number(signal.importanceScore || 0);
    existing.lastUpdated = new Date(signal.timestamp) > new Date(existing.lastUpdated) ? signal.timestamp : existing.lastUpdated;
    existing.categories[signal.category] = (existing.categories[signal.category] || 0) + 1;
    grouped.set(signal.country, existing);
  });

  const merged = [...grouped.values()].map((country) => ({
    id: country.id,
    name: country.name,
    region: country.region,
    centerCoordinates: country.centerCoordinates,
    signalCount: country.signalCount,
    pressureLevel: country.importanceScore / Math.max(1, country.signalCount) > 72 ? "high" : country.signalCount > 2 ? "medium" : "low",
    trendDirection: country.signalCount > 5 ? "up" : country.signalCount < 2 ? "down" : "stable",
    topEvents: [...new Set(country.topEvents)].slice(0, 4),
    topEntities: [...new Set(country.topEntities)].slice(0, 6),
    lastUpdated: country.lastUpdated,
    dominantCategory: Object.entries(country.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "news",
  }));

  if (merged.length > 0) {
    return merged.sort((a, b) => b.signalCount - a.signalCount);
  }

  return safeArray(existingCountries);
}

export function buildLinks(signals, existingLinks = []) {
  const pairScore = new Map();
  safeArray(signals).forEach((signal) => {
    const nodes = [...new Set([signal.country, ...safeArray(signal.entities), ...safeArray(signal.tags)])].filter(Boolean);
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const key = [nodes[i], nodes[j]].sort().join("::");
        const current = pairScore.get(key) || { count: 0, categories: new Set() };
        current.count += 1;
        current.categories.add(signal.category);
        pairScore.set(key, current);
      }
    }
  });

  const links = [...pairScore.entries()]
    .filter(([, value]) => value.count >= 2)
    .map(([key, value]) => {
      const [source, target] = key.split("::");
      return {
        id: `link-${source}-${target}`,
        source,
        target,
        strength: Math.min(1, value.count / 6),
        linkedEventCount: value.count,
        categories: [...value.categories],
        explainability: `${value.count} correlated signals linked these nodes.`,
      };
    });

  return links.length > 0 ? links : safeArray(existingLinks);
}

export function buildWorldSummary(signals, countries, links) {
  const topRegions = Object.entries(
    safeArray(signals).reduce((acc, signal) => {
      acc[signal.region || "Global"] = (acc[signal.region || "Global"] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([region, count]) => ({ region, count }));

  const topCategories = Object.entries(
    safeArray(signals).reduce((acc, signal) => {
      acc[signal.category || "news"] = (acc[signal.category || "news"] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([category, count]) => ({ category, count }));

  const dominantDrivers = Object.entries(
    safeArray(signals).flatMap((signal) => safeArray(signal.entities)).reduce((acc, entity) => {
      acc[entity] = (acc[entity] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([entity, count]) => ({ entity, count }));

  const connectedEntities = safeArray(links)
    .map((link) => ({ entity: `${link.source} ↔ ${link.target}`, count: link.linkedEventCount }))
    .slice(0, 5);

  return {
    topRegions,
    topCategories,
    dominantDrivers,
    connectedEntities,
    totalSignals: safeArray(signals).length,
    totalCountries: safeArray(countries).length,
    totalLinks: safeArray(links).length,
  };
}

export function mergeWorldStateSources(sourceResults) {
  const mergedAircraft = [];
  const mergedEvents = [];
  const mergedSignals = [];
  let fallbackLinks = [];
  let fallbackCountries = [];

  safeArray(sourceResults).forEach((result) => {
    mergedAircraft.push(...safeArray(result.aircraft));
    mergedEvents.push(...safeArray(result.events));
    mergedSignals.push(...safeArray(result.signals));
    if (!fallbackLinks.length && safeArray(result.links).length) fallbackLinks = safeArray(result.links);
    if (!fallbackCountries.length && safeArray(result.countries).length) fallbackCountries = safeArray(result.countries);
  });

  const signals = dedupeSignals(mergedSignals)
    .sort((a, b) => {
      const scoreDiff = Number(b.importanceScore || 0) - Number(a.importanceScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

  const countries = buildCountries(signals, fallbackCountries);
  const links = buildLinks(signals, fallbackLinks);
  const summary = buildWorldSummary(signals, countries, links);

  return {
    aircraft: mergedAircraft,
    events: mergedEvents,
    signals,
    links,
    countries,
    summary,
  };
}