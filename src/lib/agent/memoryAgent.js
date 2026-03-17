/**
 * Memory Agent — localStorage-backed structured agent memory.
 *
 * Tracks:
 * - All ingested items (circular buffer, max 1000)
 * - Tracked entities (frequency map)
 * - Active patterns (signal clusters)
 * - Linked events (shared entity/keyword pairs)
 * - Repeated signals (deduplication + count)
 * - Source diversity map
 * - Forecast success/failure history
 *
 * NO fabricated data. Every entry comes from real ingested items.
 */

const AGENT_STORE_KEY   = "kar_agent_items_v1";
const AGENT_MEMORY_KEY  = "kar_agent_memory_v1";
const MAX_ITEMS         = 1000;

// ── Persistent read/write ────────────────────────────────────────────────────
function readItems() {
  try { return JSON.parse(localStorage.getItem(AGENT_STORE_KEY) || "[]"); }
  catch { return []; }
}

function writeItems(items) {
  try {
    localStorage.setItem(AGENT_STORE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    try { localStorage.setItem(AGENT_STORE_KEY, JSON.stringify(items.slice(-200))); } catch { /* full */ }
  }
}

function readMeta() {
  try { return JSON.parse(localStorage.getItem(AGENT_MEMORY_KEY) || "{}"); }
  catch { return {}; }
}

function writeMeta(meta) {
  try { localStorage.setItem(AGENT_MEMORY_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

// ── Default meta structure ───────────────────────────────────────────────────
function defaultMeta() {
  return {
    trackedEntities:  {},  // entity → count
    sourceMap:        {},  // source → count
    signalCounts:     {},  // signal/keyword → count
    linkedEventPairs: [],  // [{a, b, sharedEntities, ts}]
    forecastHistory:  [],  // [{id, category, probability, confidence, ts, outcome}]
    lastFeedAt:       null,
    totalIngested:    0,
  };
}

// ── Core memory API ──────────────────────────────────────────────────────────
export const agentMemory = {
  /**
   * Store a single enriched agent item.
   * Also updates entity map, source map, signal counts.
   */
  store(item) {
    const items = readItems();
    const exists = items.some(i => i.id === item.id);
    if (exists) return; // deduplicate

    items.push(item);
    writeItems(items);

    const meta = readMeta() || defaultMeta();

    // Track entities
    (item.entities || []).forEach(e => {
      meta.trackedEntities = meta.trackedEntities || {};
      meta.trackedEntities[e] = (meta.trackedEntities[e] || 0) + 1;
    });

    // Track sources
    if (item.source) {
      meta.sourceMap = meta.sourceMap || {};
      meta.sourceMap[item.source] = (meta.sourceMap[item.source] || 0) + 1;
    }

    // Track signals / keywords
    (item.keywords || []).forEach(k => {
      meta.signalCounts = meta.signalCounts || {};
      meta.signalCounts[k] = (meta.signalCounts[k] || 0) + 1;
    });

    meta.lastFeedAt  = item.timestamp;
    meta.totalIngested = (meta.totalIngested || 0) + 1;

    writeMeta(meta);
  },

  /** Get all stored items. */
  getItems() { return readItems(); },

  /** Get metadata (entity map, source map, signal counts, etc.) */
  getMeta() {
    const meta = readMeta();
    if (!meta || !meta.trackedEntities) return defaultMeta();
    return meta;
  },

  /** Record a forecast snapshot for feedback tracking. */
  recordForecastSnapshot(snapshot) {
    const meta = readMeta() || defaultMeta();
    meta.forecastHistory = meta.forecastHistory || [];
    meta.forecastHistory.push({ ...snapshot, outcome: null, ts: Date.now() });
    if (meta.forecastHistory.length > 300) {
      meta.forecastHistory = meta.forecastHistory.slice(-300);
    }
    writeMeta(meta);
  },

  /** Mark a forecast outcome (success/failure). */
  markForecastOutcome(forecastId, outcome) {
    const meta = readMeta() || defaultMeta();
    meta.forecastHistory = meta.forecastHistory || [];
    const unresolved = meta.forecastHistory.filter(f => f.id === forecastId && f.outcome === null);
    if (unresolved.length) {
      unresolved[unresolved.length - 1].outcome = outcome;
    }
    writeMeta(meta);
  },

  /**
   * Compute deep memory statistics.
   * Returns the full memory depth object.
   */
  getMemoryDepth() {
    const items = readItems();
    const meta  = readMeta() || defaultMeta();

    const trackedEntities = Object.keys(meta.trackedEntities || {}).length;
    const sourceDiversity = Object.keys(meta.sourceMap || {}).length;

    // Count repeated signals (appeared > 1 time)
    const repeatedSignals = Object.values(meta.signalCounts || {}).filter(c => c > 1).length;

    // Count linked events (items sharing ≥2 entities)
    const linkedEvents = computeLinkedEventCount(items);

    // Active patterns: distinct high-frequency keywords
    const activePatterns = Object.entries(meta.signalCounts || {})
      .filter(([, c]) => c >= 3)
      .length;

    // Forecast feedback stats
    const forecastHistory = meta.forecastHistory || [];
    const resolved = forecastHistory.filter(f => f.outcome !== null);
    const successes = resolved.filter(f => f.outcome === "success").length;
    const failures  = resolved.filter(f => f.outcome === "failure").length;

    return {
      totalMemoryItems:  items.length,
      trackedEntities,
      activePatterns,
      linkedEvents,
      repeatedSignals,
      sourceDiversity,
      forecastResolved:  resolved.length,
      forecastSuccesses: successes,
      forecastFailures:  failures,
      forecastAccuracy:  resolved.length > 0 ? Math.round((successes / resolved.length) * 100) : null,
      lastFeedAt:        meta.lastFeedAt,
      totalIngested:     meta.totalIngested || items.length,
      topEntities:       topN(meta.trackedEntities || {}, 8),
      topSources:        topN(meta.sourceMap || {}, 6),
      topSignals:        topN(meta.signalCounts || {}, 8),
    };
  },

  /** Clear all agent memory (debug/reset). */
  clear() {
    localStorage.removeItem(AGENT_STORE_KEY);
    localStorage.removeItem(AGENT_MEMORY_KEY);
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Count pairs of items that share ≥2 entities. */
function computeLinkedEventCount(items) {
  let count = 0;
  for (let i = 0; i < Math.min(items.length, 200); i++) {
    for (let j = i + 1; j < Math.min(items.length, 200); j++) {
      const a = new Set(items[i].entities || []);
      const b = items[j].entities || [];
      const shared = b.filter(e => a.has(e));
      if (shared.length >= 2) count++;
    }
  }
  return count;
}

/** Return top N entries from a frequency map, sorted descending. */
function topN(map, n) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}
