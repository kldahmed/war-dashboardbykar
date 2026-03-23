import { getSourceDuplicateTendency } from "./sourceRegistry";

function normalizeToken(token = "") {
  return String(token || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function tokenize(value = "") {
  return Array.from(new Set(
    String(value || "")
      .split(/\s+/)
      .map(normalizeToken)
      .filter((token) => token.length >= 3)
  ));
}

function jaccardSimilarity(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  if (!union.size) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  return intersection / union.size;
}

function extractEntities(value = "") {
  const text = String(value || "");
  const entities = [];
  const arabicCandidates = text.match(/[\u0600-\u06FF]{3,}(?:\s+[\u0600-\u06FF]{3,})*/g) || [];
  const latinCandidates = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*/g) || [];
  [...arabicCandidates, ...latinCandidates].forEach((entry) => {
    const normalized = normalizeToken(entry);
    if (normalized.length >= 3) entities.push(normalized);
  });
  return Array.from(new Set(entities));
}

function timeProximityScore(aTime, bTime) {
  const a = new Date(aTime).getTime();
  const b = new Date(bTime).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const deltaMinutes = Math.abs(a - b) / 60000;
  if (deltaMinutes <= 20) return 1;
  if (deltaMinutes <= 120) return 0.75;
  if (deltaMinutes <= 360) return 0.5;
  if (deltaMinutes <= 1440) return 0.25;
  return 0;
}

function storySimilarity(a, b) {
  const titleTokensA = tokenize(a?.title || "");
  const titleTokensB = tokenize(b?.title || "");
  const summaryTokensA = tokenize(a?.summary || "");
  const summaryTokensB = tokenize(b?.summary || "");
  const entitiesA = extractEntities(`${a?.title || ""} ${a?.summary || ""}`);
  const entitiesB = extractEntities(`${b?.title || ""} ${b?.summary || ""}`);

  const titleSim = jaccardSimilarity(titleTokensA, titleTokensB);
  const summarySim = jaccardSimilarity(summaryTokensA, summaryTokensB);
  const entitySim = jaccardSimilarity(entitiesA, entitiesB);
  const timeSim = timeProximityScore(a?.time || a?.published_at, b?.time || b?.published_at);

  return (titleSim * 0.4) + (summarySim * 0.25) + (entitySim * 0.25) + (timeSim * 0.1);
}

function chooseCanonical(items = []) {
  return [...items].sort((a, b) => {
    const qualityDelta = Number(b?.qualityScore || 0) - Number(a?.qualityScore || 0);
    if (qualityDelta !== 0) return qualityDelta;
    const timeA = new Date(a?.time || a?.published_at || 0).getTime();
    const timeB = new Date(b?.time || b?.published_at || 0).getTime();
    return timeB - timeA;
  })[0] || null;
}

export function clusterStories(items = [], { threshold = 0.62 } = {}) {
  const clusters = [];
  const consumed = new Set();

  items.forEach((item, index) => {
    if (consumed.has(index)) return;
    const clusterItems = [item];
    consumed.add(index);

    for (let i = index + 1; i < items.length; i += 1) {
      if (consumed.has(i)) continue;
      const candidate = items[i];
      const similarity = storySimilarity(item, candidate);
      if (similarity >= threshold) {
        clusterItems.push({ ...candidate, similarityWithCanonical: Number(similarity.toFixed(3)) });
        consumed.add(i);
      }
    }

    const canonical = chooseCanonical(clusterItems);
    const supporting = clusterItems.filter((entry) => (entry?.id || entry?.title) !== (canonical?.id || canonical?.title));

    // Duplicate Risk Score: high when many sources cover same story, adjusted by source duplicate tendency
    const avgDuplicateTendency = clusterItems.reduce((sum, entry) => {
      return sum + getSourceDuplicateTendency(entry?.source || "");
    }, 0) / Math.max(1, clusterItems.length);
    const duplicateRiskScore = Math.min(100, Math.round(
      (clusterItems.length > 1 ? 35 : 0)
      + (clusterItems.length - 1) * 15
      + avgDuplicateTendency * 40
    ));

    clusters.push({
      id: canonical?.id || canonical?.title || `cluster-${clusters.length + 1}`,
      canonical,
      items: clusterItems,
      supporting,
      sources: Array.from(new Set(clusterItems.map((entry) => entry?.source).filter(Boolean))),
      size: clusterItems.length,
      duplicateRiskScore,
      updatedAt: clusterItems
        .map((entry) => new Date(entry?.time || entry?.published_at || 0).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0] || Date.now(),
    });
  });

  const canonicalStories = clusters
    .map((cluster) => ({
      ...(cluster.canonical || {}),
      clusterId: cluster.id,
      clusterSize: cluster.size,
      supportingSources: cluster.sources,
      supportingItems: cluster.supporting,
      duplicateRiskScore: cluster.duplicateRiskScore,
      whatChanged: cluster.size > 1
        ? `+${cluster.size - 1} source updates`
        : "single-source update",
    }))
    .filter(Boolean);

  return {
    clusters,
    canonicalStories,
    duplicateCount: Math.max(0, items.length - canonicalStories.length),
    reductionRate: items.length > 0 ? Number(((items.length - canonicalStories.length) / items.length).toFixed(4)) : 0,
  };
}
