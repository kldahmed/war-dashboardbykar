/**
 * Pattern Agent — detects emerging patterns, clusters, and signal trends.
 *
 * Detects:
 * - Emerging patterns (signals increasing over recent windows)
 * - Repeated clusters (same entities appearing together repeatedly)
 * - Rising signals (keywords/entities growing in frequency)
 * - Weakening signals (declining frequency)
 * - Regional pressure build-up
 * - Market sensitivity
 * - Sports momentum
 * - Title race pressure
 * - Transfer heat
 * - Geopolitical escalation
 *
 * All analysis is derived from stored agent memory — no fabrication.
 */

import { agentMemory } from "./memoryAgent";

const RECENT_WINDOW_MS  = 24 * 3600 * 1000;  // 24h
const OLDER_WINDOW_MS   = 72 * 3600 * 1000;  // 72h

// ── Time-window helpers ──────────────────────────────────────────────────────
function isRecent(ts) {
  try { return (Date.now() - new Date(ts).getTime()) < RECENT_WINDOW_MS; } catch { return false; }
}
function isOlder(ts) {
  try {
    const age = Date.now() - new Date(ts).getTime();
    return age >= RECENT_WINDOW_MS && age < OLDER_WINDOW_MS;
  } catch { return false; }
}

// ── Signal frequency in a subset ─────────────────────────────────────────────
function signalFrequency(items, key) {
  return items.filter(i =>
    (i.keywords || []).includes(key) || (i.entities || []).some(e => e.toLowerCase() === key.toLowerCase())
  ).length;
}

// ── Trend direction ──────────────────────────────────────────────────────────
function trendDir(recentCount, olderCount) {
  if (recentCount === 0 && olderCount === 0) return "flat";
  if (olderCount === 0) return "rising";
  const ratio = recentCount / olderCount;
  if (ratio >= 1.5) return "rising";
  if (ratio <= 0.5) return "falling";
  return "stable";
}

// ── Pattern detection runners ─────────────────────────────────────────────────

/** Detect top rising and falling signals. */
function detectSignalTrends(recent, older) {
  const allKeys = new Set([
    ...recent.flatMap(i => i.keywords || []),
    ...older.flatMap(i => i.keywords || []),
  ]);

  const trends = [];
  allKeys.forEach(k => {
    const r = signalFrequency(recent, k);
    const o = signalFrequency(older, k);
    const dir = trendDir(r, o);
    if (dir !== "flat" && (r + o) >= 2) {
      trends.push({ key: k, recentCount: r, olderCount: o, direction: dir });
    }
  });

  return {
    rising:  trends.filter(t => t.direction === "rising").sort((a, b) => b.recentCount - a.recentCount).slice(0, 6),
    falling: trends.filter(t => t.direction === "falling").sort((a, b) => b.olderCount - a.olderCount).slice(0, 4),
    stable:  trends.filter(t => t.direction === "stable").length,
  };
}

/** Detect regional pressure build-up. */
function detectRegionalPressure(recent) {
  const regionCounts = {};
  recent.forEach(i => {
    (i.region || []).forEach(r => {
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    });
  });
  return Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({
      region,
      count,
      pressure: count >= 5 ? "high" : count >= 3 ? "medium" : "low",
      label:    count >= 5 ? "ضغط مرتفع" : count >= 3 ? "ضغط متوسط" : "ضغط منخفض",
    }));
}

/** Detect sports momentum (increasing sports activity). */
function detectSportsMomentum(recent, older) {
  const rSports = recent.filter(i => i.category === "sports").length;
  const oSports = older.filter(i => i.category === "sports").length;

  // Transfer heat: items with transfer keywords
  const transferItems = recent.filter(i =>
    (i.keywords || []).some(k => k.includes("transfer") || k.includes("انتقال"))
  );

  // Title race: high-frequency club mentions
  const clubCounts = {};
  recent.filter(i => i.category === "sports").forEach(i => {
    (i.entities || []).forEach(e => { clubCounts[e] = (clubCounts[e] || 0) + 1; });
  });
  const topClub = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    momentum:     trendDir(rSports, oSports),
    momentumLabel: rSports > oSports * 1.3 ? "تصاعد نشاط رياضي" : rSports < oSports * 0.7 ? "تراجع نشاط رياضي" : "نشاط رياضي مستقر",
    transferHeat: transferItems.length,
    transferHeatLabel: transferItems.length >= 3 ? "سوق انتقالات ساخن" : "سوق انتقالات عادي",
    titleRacePressure: topClub ? `${topClub[0]} (${topClub[1]} إشارات)` : null,
    sportsItemsRecent: rSports,
  };
}

/** Detect geopolitical escalation signals. */
function detectGeopoliticalEscalation(recent) {
  const escalationKws = ["war","attack","missile","military","troops","bomb","airstrike","invasion",
    "حرب","هجوم","صاروخ","عسكري","قوات","قنبلة","غارة","غزو"];

  const escalationItems = recent.filter(i =>
    (i.keywords || []).some(k => escalationKws.includes(k)) ||
    i.category === "conflict"
  );

  const escalationLevel = escalationItems.length >= 5 ? "high"
    : escalationItems.length >= 3 ? "medium"
    : "low";

  return {
    level:  escalationLevel,
    label:  escalationLevel === "high" ? "تصعيد جيوسياسي مرتفع" : escalationLevel === "medium" ? "تصعيد جيوسياسي متوسط" : "هدوء جيوسياسي نسبي",
    color:  escalationLevel === "high" ? "#ef4444" : escalationLevel === "medium" ? "#f59e0b" : "#22c55e",
    count:  escalationItems.length,
  };
}

/** Detect market sensitivity. */
function detectMarketSensitivity(recent) {
  const marketKws = ["oil","inflation","recession","bank","stock","dollar","debt","trade",
    "نفط","تضخم","ركود","بنك","أسهم","دولار","دين","تجارة"];

  const marketItems = recent.filter(i =>
    (i.keywords || []).some(k => marketKws.includes(k)) ||
    i.category === "economy"
  );

  return {
    sensitivity: marketItems.length >= 5 ? "high" : marketItems.length >= 2 ? "medium" : "low",
    label:       marketItems.length >= 5 ? "حساسية سوقية مرتفعة" : marketItems.length >= 2 ? "حساسية سوقية معتدلة" : "حساسية سوقية منخفضة",
    count:       marketItems.length,
    color:       marketItems.length >= 5 ? "#f59e0b" : "#94a3b8",
  };
}

/** Detect entity clusters (pairs of entities appearing together frequently). */
function detectEntityClusters(recent) {
  const coMatrix = {};
  recent.forEach(item => {
    const ents = item.entities || [];
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        const key = [ents[i], ents[j]].sort().join("↔");
        coMatrix[key] = (coMatrix[key] || 0) + 1;
      }
    }
  });
  return Object.entries(coMatrix)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([pair, count]) => {
      const [a, b] = pair.split("↔");
      return { entityA: a, entityB: b, coCount: count, strength: count >= 4 ? "قوي" : "معتدل" };
    });
}

// ── Master pattern analysis ───────────────────────────────────────────────────

/**
 * Run full pattern analysis on current memory.
 * @returns {Object} Full pattern report
 */
export function analyzePatterns() {
  const all    = agentMemory.getItems();
  const recent = all.filter(i => isRecent(i.timestamp));
  const older  = all.filter(i => isOlder(i.timestamp));

  const signalTrends   = detectSignalTrends(recent, older);
  const regionalPressure = detectRegionalPressure(recent);
  const sports         = detectSportsMomentum(recent, older);
  const geopolitical   = detectGeopoliticalEscalation(recent);
  const market         = detectMarketSensitivity(recent);
  const clusters       = detectEntityClusters(recent);

  // Overall pattern strength (0-100)
  const patternStrength = Math.min(100, Math.round(
    signalTrends.rising.length * 8 +
    clusters.length * 6 +
    (geopolitical.level === "high" ? 20 : geopolitical.level === "medium" ? 10 : 0) +
    (market.sensitivity === "high" ? 15 : market.sensitivity === "medium" ? 8 : 0) +
    sports.transferHeat * 4 +
    recent.length * 0.5
  ));

  return {
    patternStrength,
    patternStrengthLabel: patternStrength >= 70 ? "أنماط قوية ونشطة" : patternStrength >= 40 ? "أنماط معتدلة" : "أنماط ضعيفة",
    signalTrends,
    regionalPressure,
    sports,
    geopolitical,
    market,
    clusters,
    recentItemCount:  recent.length,
    olderItemCount:   older.length,
    analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
