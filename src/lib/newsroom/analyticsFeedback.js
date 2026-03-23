const ANALYTICS_KEY = "kar-newsroom-analytics-v1";

function readStorage() {
  if (typeof window === "undefined") return { interactions: [], profile: {} };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ANALYTICS_KEY) || "{}");
    return {
      interactions: Array.isArray(parsed?.interactions) ? parsed.interactions : [],
      profile: parsed?.profile && typeof parsed.profile === "object" ? parsed.profile : {},
    };
  } catch {
    return { interactions: [], profile: {} };
  }
}

function writeStorage(data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write issues.
  }
}

export function recordNewsInteraction(eventType, story = {}, metadata = {}) {
  const current = readStorage();
  const next = {
    ...current,
    interactions: [
      {
        eventType,
        storyId: story?.id || story?.clusterId || story?.title || "unknown",
        category: story?.category || "general",
        source: story?.source || "unknown",
        timestamp: Date.now(),
        dwellMs: Number(metadata?.dwellMs || 0),
        scrollDepth: Number(metadata?.scrollDepth || 0),
      },
      ...current.interactions,
    ].slice(0, 3000),
  };

  writeStorage(next);
  return next;
}

export function buildUserPreferenceProfile() {
  const current = readStorage();
  const recent = current.interactions.slice(0, 1200);

  const byCategory = new Map();
  const bySource = new Map();
  let dwellTotal = 0;
  let dwellCount = 0;

  recent.forEach((entry) => {
    const category = String(entry?.category || "general");
    const source = String(entry?.source || "unknown");

    byCategory.set(category, Number(byCategory.get(category) || 0) + 1);
    bySource.set(source, Number(bySource.get(source) || 0) + 1);

    const dwell = Number(entry?.dwellMs || 0);
    if (dwell > 0) {
      dwellTotal += dwell;
      dwellCount += 1;
    }
  });

  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category]) => category);

  const topSources = Array.from(bySource.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source]) => source);

  const profile = {
    totalInteractions: recent.length,
    topCategories,
    topSources,
    avgDwellMs: dwellCount > 0 ? Math.round(dwellTotal / dwellCount) : 0,
  };

  writeStorage({ ...current, profile });
  return profile;
}

export function getAnalyticsSnapshot() {
  const current = readStorage();
  const interactions = current.interactions.slice(0, 2500);
  if (!interactions.length) {
    return {
      ctrProxy: 0,
      avgDwellMs: 0,
      avgScrollDepth: 0,
      completionRate: 0,
      topicEngagement: [],
      sourceEngagement: [],
      headlineFormatEngagement: [],
      bounceRateProxy: 0,
    };
  }

  const opens = interactions.filter((item) => item.eventType === "open").length;
  const impressions = interactions.filter((item) => item.eventType === "impression").length || opens;
  const completions = interactions.filter((item) => Number(item.dwellMs || 0) >= 35000).length;
  const bounces = interactions.filter((item) => Number(item.dwellMs || 0) > 0 && Number(item.dwellMs || 0) < 6000).length;

  const avgDwellMs = interactions.reduce((sum, item) => sum + Number(item.dwellMs || 0), 0) / interactions.length;
  const avgScrollDepth = interactions.reduce((sum, item) => sum + Number(item.scrollDepth || 0), 0) / interactions.length;

  const topicMap = new Map();
  const sourceMap = new Map();
  const headlineFormatMap = new Map();
  const verificationStateMap = new Map();

  interactions.forEach((entry) => {
    const topic = String(entry.category || "general");
    const source = String(entry.source || "unknown");
    const format = Number(entry?.storyId?.length || 0) > 22 ? "descriptive" : "short";
    const vs = String(entry?.verificationState || "unknown");

    topicMap.set(topic, Number(topicMap.get(topic) || 0) + 1);
    sourceMap.set(source, Number(sourceMap.get(source) || 0) + 1);
    headlineFormatMap.set(format, Number(headlineFormatMap.get(format) || 0) + 1);
    verificationStateMap.set(vs, Number(verificationStateMap.get(vs) || 0) + 1);
  });

  return {
    ctrProxy: Number((opens / Math.max(1, impressions)).toFixed(3)),
    avgDwellMs: Math.round(avgDwellMs),
    avgScrollDepth: Math.round(avgScrollDepth),
    completionRate: Number((completions / interactions.length).toFixed(3)),
    bounceRateProxy: Number((bounces / interactions.length).toFixed(3)),
    topicEngagement: Array.from(topicMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
    sourceEngagement: Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
    headlineFormatEngagement: Array.from(headlineFormatMap.entries()).sort((a, b) => b[1] - a[1]),
    verificationStateEngagement: Array.from(verificationStateMap.entries()).sort((a, b) => b[1] - a[1]),
  };
}

/**
 * learnFromPerformance
 *
 * Derives actionable learning signals from the analytics snapshot.
 * Returns a LearningReport that the newsroom pipeline can act on each cycle.
 */
export function learnFromPerformance() {
  const snapshot = getAnalyticsSnapshot();
  const profile = buildUserPreferenceProfile();

  const topTopics = (snapshot.topicEngagement || []).slice(0, 3).map(([t]) => t);
  const topSources = (snapshot.sourceEngagement || []).slice(0, 3).map(([s]) => s);
  const preferDescriptive = (snapshot.headlineFormatEngagement || []).some(
    ([fmt, count]) => fmt === "descriptive" && count > 0
  );
  const confirmedEngagement = (snapshot.verificationStateEngagement || []).find(([vs]) => vs === "confirmed");
  const confirmedCount = confirmedEngagement ? confirmedEngagement[1] : 0;
  const underReviewCount = ((snapshot.verificationStateEngagement || []).find(([vs]) => vs === "under_review") || [])[1] || 0;

  // Derive quality signals
  const userPrefersConfirmed = confirmedCount > underReviewCount * 1.4;
  const highBounce = snapshot.bounceRateProxy > 0.45;
  const lowDwell = snapshot.avgDwellMs < 12000;

  const recommendations = [];
  if (highBounce) recommendations.push({ signal: "raise_quality_threshold", reason: "High bounce rate detected" });
  if (lowDwell) recommendations.push({ signal: "increase_summary_depth", reason: "Low average dwell time" });
  if (userPrefersConfirmed) recommendations.push({ signal: "prioritise_confirmed_stories", reason: "Confirmed stories drive more engagement" });
  if (preferDescriptive) recommendations.push({ signal: "prefer_longer_headlines", reason: "Descriptive headlines outperform short ones" });

  return {
    topTopics,
    topSources,
    preferDescriptive,
    userPrefersConfirmed,
    highBounce,
    lowDwell,
    recommendations,
    generatedAt: Date.now(),
  };
}
