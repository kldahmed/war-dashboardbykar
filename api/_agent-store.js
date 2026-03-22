const MAX_ITEMS = 2000;
const MAX_FEEDBACK = 1000;

const CATEGORY_RULES = [
  { category: "conflict", keys: ["war", "attack", "strike", "missile", "military", "حرب", "هجوم", "ضربة", "صاروخ", "عسكري"] },
  { category: "politics", keys: ["election", "president", "minister", "sanctions", "government", "انتخاب", "رئيس", "وزير", "عقوبات", "حكومة"] },
  { category: "economy", keys: ["inflation", "market", "oil", "bank", "stock", "اقتصاد", "تضخم", "سوق", "نفط", "بنك"] },
  { category: "sports", keys: ["goal", "match", "football", "league", "transfer", "هدف", "مباراة", "كرة", "دوري", "انتقال"] },
  { category: "regional", keys: ["gaza", "iran", "israel", "middle east", "غزة", "إيران", "إسرائيل", "الشرق الأوسط"] }
];

const REGION_RULES = [
  { region: "UAE", keys: ["uae", "emirates", "dubai", "abu dhabi", "الإمارات", "دبي", "أبوظبي"] },
  { region: "Middle East", keys: ["gaza", "israel", "iran", "iraq", "syria", "saudi", "غزة", "إسرائيل", "إيران", "العراق", "سوريا", "السعودية"] },
  { region: "Europe", keys: ["ukraine", "russia", "nato", "أوكرانيا", "روسيا", "الناتو"] },
  { region: "Global", keys: ["global", "world", "عالمي", "دولي"] }
];

const DEFAULT_STORE = {
  items: [],
  feedback: [],
  patternReliability: {},
  stats: {
    totalIngested: 0,
    lastFeedAt: null,
    apiFailures: 0
  }
};

const globalScope = globalThis;
if (!globalScope.__KAR_AGENT_SERVER_STORE__) {
  globalScope.__KAR_AGENT_SERVER_STORE__ = JSON.parse(JSON.stringify(DEFAULT_STORE));
}

function storeRef() {
  return globalScope.__KAR_AGENT_SERVER_STORE__;
}

function dubaiTimestamp() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }).replace(" ", "T") + "+04:00";
}

function classifyCategory(text) {
  const t = String(text || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((k) => t.includes(k))) return rule.category;
  }
  return "general";
}

function detectRegion(text) {
  const t = String(text || "").toLowerCase();
  const regions = REGION_RULES.filter((r) => r.keys.some((k) => t.includes(k))).map((r) => r.region);
  return regions.length ? regions : ["Global"];
}

function extractKeywords(text) {
  const t = String(text || "").toLowerCase();
  const kws = [];
  for (const rule of CATEGORY_RULES) {
    for (const k of rule.keys) {
      if (t.includes(k.toLowerCase())) kws.push(k);
    }
  }
  return [...new Set(kws)].slice(0, 12);
}

function computeMeta(items, feedback) {
  const trackedEntities = {};
  const sourceMap = {};
  const signalCounts = {};

  for (const item of items) {
    for (const e of item.entities || []) trackedEntities[e] = (trackedEntities[e] || 0) + 1;
    if (item.source) sourceMap[item.source] = (sourceMap[item.source] || 0) + 1;
    for (const s of item.keywords || []) signalCounts[s] = (signalCounts[s] || 0) + 1;
  }

  const resolved = feedback.filter((f) => f.outcome === "success" || f.outcome === "failure");
  const successes = resolved.filter((f) => f.outcome === "success").length;
  const failures = resolved.filter((f) => f.outcome === "failure").length;

  return {
    trackedEntities,
    sourceMap,
    signalCounts,
    forecastHistory: feedback,
    forecastResolved: resolved.length,
    forecastSuccesses: successes,
    forecastFailures: failures,
    forecastAccuracy: resolved.length ? Math.round((successes / resolved.length) * 100) : null
  };
}

export function ingestServerItems(items, sourceType = "news") {
  const store = storeRef();
  const ts = dubaiTimestamp();

  const normalized = (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((raw) => {
      const text = `${raw.title || ""} ${raw.summary || raw.text || raw.body || ""}`;
      const category = raw.category || classifyCategory(text);
      return {
        id: raw.id || `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceType,
        title: raw.title || "",
        text: raw.summary || raw.text || raw.body || "",
        summary: raw.summary || raw.text || "",
        category,
        region: Array.isArray(raw.region) ? raw.region : detectRegion(text),
        entities: Array.isArray(raw.entities) ? raw.entities : [],
        keywords: Array.isArray(raw.keywords) ? raw.keywords : extractKeywords(text),
        urgency: raw.urgency || "low",
        relevanceScore: Number(raw.relevanceScore || 0),
        confidence: Number(raw.confidence || 0),
        timestamp: raw.timestamp || raw.time || ts,
        source: raw.source || "unknown",
        ingestedAt: ts
      };
    });

  const existingIds = new Set(store.items.map((i) => i.id));
  for (const item of normalized) {
    if (!existingIds.has(item.id)) store.items.push(item);
  }

  if (store.items.length > MAX_ITEMS) {
    store.items = store.items.slice(-MAX_ITEMS);
  }

  store.stats.totalIngested += normalized.length;
  store.stats.lastFeedAt = ts;

  return { accepted: normalized.length, items: normalized, timestamp: ts };
}

export function recordServerFeedback(payload) {
  const store = storeRef();
  const ts = dubaiTimestamp();
  const { forecastId, outcome, category = "unknown", signals = [] } = payload || {};

  const entry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    forecastId,
    category,
    outcome,
    signals: Array.isArray(signals) ? signals : [],
    ts
  };

  store.feedback.push(entry);
  if (store.feedback.length > MAX_FEEDBACK) {
    store.feedback = store.feedback.slice(-MAX_FEEDBACK);
  }

  for (const signal of entry.signals) {
    if (!store.patternReliability[signal]) {
      store.patternReliability[signal] = { weight: 1, successes: 0, failures: 0 };
    }
    const cur = store.patternReliability[signal];
    if (entry.outcome === "success") {
      cur.successes += 1;
      cur.weight = Math.min(2, cur.weight + 0.1);
    } else if (entry.outcome === "failure") {
      cur.failures += 1;
      cur.weight = Math.max(0.1, cur.weight - 0.15);
    }
  }

  return { accepted: true, timestamp: ts, entry };
}

export function getServerAgentSnapshot() {
  const store = storeRef();
  const items = store.items.slice(-MAX_ITEMS);
  const feedback = store.feedback.slice(-MAX_FEEDBACK);
  const meta = computeMeta(items, feedback);

  return {
    status: "active",
    serverTime: dubaiTimestamp(),
    timezone: "Asia/Dubai",
    memory: {
      items,
      meta,
      stats: {
        totalIngested: store.stats.totalIngested,
        lastFeedAt: store.stats.lastFeedAt,
        sourceDiversity: Object.keys(meta.sourceMap || {}).length
      }
    },
    feedback: {
      patternReliability: store.patternReliability,
      recent: feedback.slice(-50)
    }
  };
}

export function computeAgentAuditFromSnapshot(snapshot, benchmarkDataset = []) {
  const memory = snapshot?.memory || {};
  const items = Array.isArray(memory.items) ? memory.items : [];
  const feedback = Array.isArray(snapshot?.feedback?.recent) ? snapshot.feedback.recent : [];

  let classificationHits = 0;
  let classificationTotal = 0;
  for (const row of benchmarkDataset) {
    classificationTotal += 1;
    if (classifyCategory(`${row.title || ""} ${row.text || row.summary || ""}`) === row.expectedCategory) {
      classificationHits += 1;
    }
  }
  const classificationAccuracy = classificationTotal ? Math.round((classificationHits / classificationTotal) * 100) : 0;

  const clusterSignals = new Map();
  for (const item of items.slice(-300)) {
    const keys = item.keywords || [];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const key = [keys[i], keys[j]].sort().join("|");
        clusterSignals.set(key, (clusterSignals.get(key) || 0) + 1);
      }
    }
  }
  const strongClusters = [...clusterSignals.values()].filter((v) => v >= 2).length;
  const patternDetection = Math.min(100, 25 + strongClusters * 8 + Math.min(30, items.length / 10));

  const resolved = feedback.filter((f) => f.outcome === "success" || f.outcome === "failure");
  const forecastHits = resolved.filter((f) => f.outcome === "success").length;
  const forecastHitRate = resolved.length ? Math.round((forecastHits / resolved.length) * 100) : 0;

  const uniqueSources = new Set(items.map((i) => i.source).filter(Boolean)).size;
  const repeatedSignals = Object.values(memory?.meta?.signalCounts || {}).filter((c) => c > 1).length;
  const memoryQuality = Math.min(100, Math.round(20 + Math.min(35, items.length / 15) + uniqueSources * 4 + Math.min(20, repeatedSignals)));

  const recentItems = items.filter((i) => {
    const age = Date.now() - new Date(i.timestamp).getTime();
    return Number.isFinite(age) && age < 24 * 60 * 60 * 1000;
  }).length;
  const resilience = Math.min(100, Math.round(25 + Math.min(35, recentItems / 3) + Math.min(20, uniqueSources * 2) + (resolved.length >= 5 ? 20 : resolved.length * 2)));

  return {
    classification_accuracy: classificationAccuracy,
    pattern_detection: patternDetection,
    forecast_hit_rate: forecastHitRate,
    memory_quality: memoryQuality,
    resilience: resilience
  };
}
