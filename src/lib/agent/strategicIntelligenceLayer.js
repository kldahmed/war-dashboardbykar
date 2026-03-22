import { agentMemory } from "./memoryAgent";

const ANALYSIS_WINDOW_MS = 7 * 24 * 3600 * 1000;
const CAUSAL_WINDOW_MS = 72 * 3600 * 1000;
const MAX_GRAPH_NODES = 220;

const SOURCE_CREDIBILITY_RULES = [
  { pattern: /reuters/i, score: 96, label: "very high credibility", tier: "very_high" },
  { pattern: /bbc/i, score: 94, label: "very high credibility", tier: "very_high" },
  { pattern: /associated press|\bap\b/i, score: 93, label: "very high credibility", tier: "very_high" },
  { pattern: /financial times/i, score: 92, label: "very high credibility", tier: "very_high" },
  { pattern: /al jazeera/i, score: 86, label: "high credibility", tier: "high" },
  { pattern: /bloomberg/i, score: 89, label: "high credibility", tier: "high" },
  { pattern: /sky news/i, score: 74, label: "medium-high credibility", tier: "medium_high" },
  { pattern: /cnn|fox news|msnbc/i, score: 68, label: "medium credibility", tier: "medium" },
  { pattern: /twitter|x\.com|social media|telegram|facebook|instagram|tiktok/i, score: 32, label: "low credibility", tier: "low" },
  { pattern: /blog|forum|rumou?r|rumor/i, score: 28, label: "low credibility", tier: "low" },
];

const SOURCE_TYPE_FALLBACK = {
  news: { score: 78, label: "high credibility", tier: "high" },
  xsignal: { score: 35, label: "low credibility", tier: "low" },
  sports: { score: 72, label: "medium-high credibility", tier: "medium_high" },
  standings: { score: 82, label: "high credibility", tier: "high" },
  market: { score: 80, label: "high credibility", tier: "high" },
  regional: { score: 72, label: "medium-high credibility", tier: "medium_high" },
  forecast: { score: 58, label: "medium credibility", tier: "medium" },
  unknown: { score: 50, label: "medium credibility", tier: "medium" },
};

const LOCATION_TERMS = [
  "gaza", "israel", "iran", "iraq", "syria", "lebanon", "saudi", "uae", "emirates", "dubai", "abu dhabi",
  "ukraine", "russia", "china", "taiwan", "india", "pakistan", "red sea", "strait of hormuz", "middle east",
  "غزة", "إسرائيل", "ايران", "إيران", "العراق", "سوريا", "لبنان", "السعودية", "الإمارات", "دبي", "أبوظبي",
  "أوكرانيا", "روسيا", "الصين", "تايوان", "الهند", "باكستان", "البحر الأحمر", "هرمز", "الشرق الأوسط",
];

const ACTOR_EXCLUSIONS = new Set([
  "oil", "gas", "energy", "market", "inflation", "dollar", "trade",
  "النفط", "الغاز", "الطاقة", "السوق", "تضخم", "الدولار", "التجارة",
  ...LOCATION_TERMS,
]);

const HIGH_SENSITIVITY_ACTORS = new Set([
  "iran", "israel", "russia", "ukraine", "china", "taiwan", "usa", "united states", "nato", "opec",
  "hamas", "hezbollah", "الحوثيون", "iran", "إيران", "إسرائيل", "روسيا", "الصين", "الولايات المتحدة",
  "الناتو", "أوبك", "حماس", "حزب الله", "تايوان", "أوكرانيا",
]);

const CATEGORY_SEVERITY = {
  conflict: 88,
  military: 84,
  energy: 74,
  economy: 68,
  politics: 60,
  regional: 66,
  diplomacy: 48,
  sports: 20,
  general: 42,
};

const CAUSAL_RULES = [
  {
    id: "war_oil_spike",
    causeTokens: ["war", "attack", "strike", "missile", "airstrike", "drone", "troops", "military", "حرب", "هجوم", "ضربة", "صاروخ", "غارة", "قوات", "عسكري"],
    effectTokens: ["oil", "crude", "energy", "shipping", "tanker", "insurance", "market", "نفط", "طاقة", "شحن", "ناقلة", "سوق"],
    explanation: "Military escalation raises supply and transport risk, which usually feeds directly into energy prices and shipping costs.",
    type: "war_to_energy",
  },
  {
    id: "sanctions_currency_pressure",
    causeTokens: ["sanction", "sanctions", "tariff", "export ban", "عقوبات", "تعرفة"],
    effectTokens: ["currency", "inflation", "bank", "dollar", "market", "debt", "fx", "عملة", "تضخم", "بنك", "دولار", "دين", "سوق"],
    explanation: "Sanctions restrict capital, trade, or access to funding, which increases currency and inflation pressure.",
    type: "sanctions_to_currency",
  },
  {
    id: "election_policy_shift",
    causeTokens: ["election", "vote", "parliament", "president", "prime minister", "cabinet", "انتخاب", "تصويت", "برلمان", "رئيس", "وزير"],
    effectTokens: ["policy", "reform", "sanctions", "government", "budget", "regulation", "سياسة", "إصلاح", "عقوبات", "حكومة", "ميزانية", "تنظيم"],
    explanation: "Political transitions change decision-making authority, making policy adjustment the next logical development.",
    type: "election_to_policy",
  },
  {
    id: "mobilization_regional_tension",
    causeTokens: ["mobilization", "deployment", "exercise", "troops", "border attack", "حشد", "انتشار", "مناورة", "قوات", "هجوم حدودي"],
    effectTokens: ["tension", "border", "missile", "security", "air defense", "regional", "توتر", "حدود", "صاروخ", "أمن", "دفاع جوي", "إقليمي"],
    explanation: "Military mobilization increases readiness and threat perception, which tends to raise regional tension even before direct conflict expands.",
    type: "mobilization_to_tension",
  },
  {
    id: "diplomacy_deescalation",
    causeTokens: ["ceasefire", "mediation", "talks", "summit", "agreement", "corridor", "هدنة", "وساطة", "محادثات", "قمة", "اتفاق", "ممر"],
    effectTokens: ["aid", "withdrawal", "calm", "humanitarian", "de-escalation", "مساعدات", "انسحاب", "هدوء", "إنساني", "خفض التصعيد"],
    explanation: "Sustained diplomacy creates channels for coordination, which can reduce operational tempo and support de-escalation.",
    type: "diplomacy_to_deescalation",
  },
];

let cachedSignature = null;
let cachedAnalysis = null;

function nowMs() {
  return Date.now();
}

function parseTime(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function intersection(a = [], b = []) {
  if (!a.length || !b.length) return [];
  const setB = new Set(b.map((value) => lower(value)));
  return a.filter((value) => setB.has(lower(value)));
}

function textBundle(item) {
  return `${item?.title || ""} ${item?.summary || ""} ${item?.text || ""}`.trim();
}

function hasAnyToken(text, tokens = []) {
  const haystack = lower(text);
  return tokens.some((token) => haystack.includes(lower(token)));
}

function credibilityWeight(item) {
  return Math.max(0.2, (item?.sourceCredibility || getSourceCredibilityProfile(item?.source, item?.sourceType).score) / 100);
}

function actorSensitivity(actor) {
  return HIGH_SENSITIVITY_ACTORS.has(lower(actor)) ? 1 : 0;
}

function dominantValue(values = []) {
  const counts = {};
  values.forEach((value) => {
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function bucketLabel(score) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function impactLabel(score) {
  if (score >= 80) return "Severe global spillover likely";
  if (score >= 60) return "High cross-border impact likely";
  if (score >= 40) return "Regional spillover likely";
  return "Mostly localized impact likely";
}

export function getSourceCredibilityProfile(source, sourceType = "unknown") {
  const sourceText = String(source || "").trim();
  const explicit = SOURCE_CREDIBILITY_RULES.find((rule) => rule.pattern.test(sourceText));
  const fallback = SOURCE_TYPE_FALLBACK[sourceType] || SOURCE_TYPE_FALLBACK.unknown;
  const profile = explicit || fallback;
  const score = Math.max(10, Math.min(99, profile.score));
  return {
    score,
    weight: score / 100,
    label: profile.label,
    tier: profile.tier,
    isUnconfirmedSignal: score < 55,
  };
}

function inferLocation(item) {
  const text = textBundle(item);
  const entityLocations = (item?.entities || []).filter((entity) => LOCATION_TERMS.some((term) => lower(entity).includes(lower(term))));
  if (entityLocations.length) return entityLocations[0];

  const matchedTerm = LOCATION_TERMS.find((term) => lower(text).includes(lower(term)));
  if (matchedTerm) return matchedTerm;

  if (Array.isArray(item?.region) && item.region.length) return item.region[0];
  return "Global";
}

function inferActors(item, location) {
  const actors = (item?.entities || []).filter((entity) => {
    const key = lower(entity);
    if (!key || key === lower(location)) return false;
    return !ACTOR_EXCLUSIONS.has(key);
  });
  return unique(actors).slice(0, 6);
}

function inferEventCategory(item) {
  if (item?.eventCategory) return item.eventCategory;
  const text = textBundle(item);
  if (hasAnyToken(text, ["ceasefire", "mediation", "talks", "summit", "agreement", "هدنة", "وساطة", "محادثات", "اتفاق"])) return "diplomacy";
  if (hasAnyToken(text, ["deployment", "troops", "military", "mobilization", "انتشار", "قوات", "عسكري", "حشد"])) return "military";
  return item?.category || "general";
}

function computeSeverityScore(item, profile, eventCategory) {
  const base = CATEGORY_SEVERITY[eventCategory] || CATEGORY_SEVERITY[item?.category] || CATEGORY_SEVERITY.general;
  const urgencyBoost = item?.urgency === "high" ? 12 : item?.urgency === "medium" ? 7 : 2;
  const relevanceBoost = Math.round((item?.relevanceScore || 0) * 0.18);
  const confidenceBoost = Math.round((item?.confidence || 0) * 0.12 * profile.weight);
  const actorBoost = Math.min(8, (item?.entities || []).length * 2);
  const score = base * 0.55 + urgencyBoost + relevanceBoost + confidenceBoost + actorBoost;
  return Math.max(10, Math.min(100, Math.round(score)));
}

export function inferStrategicAttributes(item) {
  const profile = getSourceCredibilityProfile(item?.source, item?.sourceType);
  const location = inferLocation(item);
  const eventCategory = inferEventCategory(item);
  const actors = inferActors(item, location);
  const severityScore = computeSeverityScore(item, profile, eventCategory);

  return {
    actors,
    location,
    time: item?.timestamp || item?.time || null,
    eventCategory,
    severityScore,
    sourceCredibility: profile.score,
    sourceCredibilityWeight: profile.weight,
    sourceCredibilityLabel: profile.label,
    sourceCredibilityTier: profile.tier,
    isUnconfirmedSignal: profile.isUnconfirmedSignal,
  };
}

export function buildStrategicEventNode(item) {
  const attrs = inferStrategicAttributes(item);
  const text = textBundle(item);
  const adjustedConfidence = Math.round((item?.confidence || 0) * attrs.sourceCredibilityWeight);
  return {
    id: item.id,
    title: item.title || item.summary || "Untitled event",
    summary: item.summary || item.text || "",
    source: item.source || "unknown",
    sourceType: item.sourceType || "unknown",
    actors: attrs.actors,
    location: attrs.location,
    time: attrs.time,
    eventCategory: attrs.eventCategory,
    severityScore: attrs.severityScore,
    sourceCredibility: attrs.sourceCredibility,
    sourceCredibilityLabel: attrs.sourceCredibilityLabel,
    sourceCredibilityTier: attrs.sourceCredibilityTier,
    isUnconfirmedSignal: attrs.isUnconfirmedSignal,
    confidence: item.confidence || 0,
    confidenceAdjusted: adjustedConfidence,
    urgency: item.urgency || "low",
    region: item.region || [attrs.location],
    keywords: unique(item.keywords || []),
    entities: unique(item.entities || []),
    text,
  };
}

function buildAnalysisItems(items) {
  const cutoff = nowMs() - ANALYSIS_WINDOW_MS;
  return (items || [])
    .filter((item) => parseTime(item?.timestamp) >= cutoff)
    .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));
}

function buildEventGraph(nodes) {
  const working = [...nodes]
    .sort((a, b) => (b.severityScore * b.sourceCredibility) - (a.severityScore * a.sourceCredibility))
    .slice(0, MAX_GRAPH_NODES);

  const edges = [];
  for (let i = 0; i < working.length; i++) {
    for (let j = i + 1; j < working.length; j++) {
      const a = working[i];
      const b = working[j];
      const sharedActors = intersection(a.actors, b.actors);
      const sharedKeywords = intersection(a.keywords, b.keywords);
      const sharedEntities = intersection(a.entities, b.entities);
      const sameLocation = lower(a.location) === lower(b.location);
      const sameCategory = a.eventCategory === b.eventCategory;
      const timeGapHours = Math.abs(parseTime(a.time) - parseTime(b.time)) / 3600000;
      if (timeGapHours > 96) continue;

      const proximity = Math.max(0, 18 - Math.round(timeGapHours / 6));
      const weight =
        sharedActors.length * 18 +
        sharedKeywords.length * 8 +
        sharedEntities.length * 10 +
        (sameLocation ? 24 : 0) +
        (sameCategory ? 8 : 0) +
        proximity;

      if (weight < 34) continue;

      const relation = unique([
        sameLocation ? "shared_location" : null,
        sameCategory ? "shared_category" : null,
        sharedActors.length ? "shared_actor" : null,
        sharedKeywords.length ? "shared_signal" : null,
      ]);

      edges.push({
        id: `${a.id}__${b.id}`,
        source: a.id,
        target: b.id,
        weight,
        sharedActors,
        sharedKeywords,
        sharedEntities,
        relation,
      });
    }
  }

  return { nodes: working, edges };
}

function buildEventChains(graph) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map();
  graph.nodes.forEach((node) => adjacency.set(node.id, []));
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  const visited = new Set();
  const chains = [];

  graph.nodes.forEach((node) => {
    if (visited.has(node.id)) return;
    const stack = [node.id];
    const componentIds = [];
    while (stack.length) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      componentIds.push(current);
      (adjacency.get(current) || []).forEach((next) => {
        if (!visited.has(next)) stack.push(next);
      });
    }

    const componentNodes = componentIds.map((id) => nodesById.get(id)).filter(Boolean);
    const componentEdges = graph.edges.filter((edge) => componentIds.includes(edge.source) && componentIds.includes(edge.target));
    const actors = unique(componentNodes.flatMap((entry) => entry.actors || [])).slice(0, 8);
    const locations = unique(componentNodes.map((entry) => entry.location).filter(Boolean));
    const averageSeverity = componentNodes.length
      ? Math.round(componentNodes.reduce((sum, entry) => sum + entry.severityScore, 0) / componentNodes.length)
      : 0;
    const summary = componentNodes
      .slice()
      .sort((a, b) => b.severityScore - a.severityScore)[0]?.title || "Strategic event chain";

    chains.push({
      id: `chain-${chains.length + 1}`,
      nodeIds: componentIds,
      edgeIds: componentEdges.map((edge) => edge.id),
      eventCount: componentNodes.length,
      averageSeverity,
      actors,
      locations,
      dominantLocation: dominantValue(locations) || componentNodes[0]?.location || "Global",
      dominantCategory: dominantValue(componentNodes.map((entry) => entry.eventCategory)) || componentNodes[0]?.eventCategory || "general",
      summary,
      totalWeight: componentEdges.reduce((sum, edge) => sum + edge.weight, 0),
    });
  });

  return chains.sort((a, b) => (b.averageSeverity * 2 + b.totalWeight) - (a.averageSeverity * 2 + a.totalWeight));
}

function inferCausalLinks(nodes, graph) {
  const edgesByKey = new Set(graph.edges.flatMap((edge) => [`${edge.source}:${edge.target}`, `${edge.target}:${edge.source}`]));
  const sorted = [...nodes].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  const links = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const cause = sorted[i];
      const effect = sorted[j];
      const delta = parseTime(effect.time) - parseTime(cause.time);
      if (delta <= 0 || delta > CAUSAL_WINDOW_MS) continue;

      const sharedActors = intersection(cause.actors, effect.actors);
      const sharedLocation = lower(cause.location) === lower(effect.location);
      const linkedInGraph = edgesByKey.has(`${cause.id}:${effect.id}`);
      if (!linkedInGraph && !sharedActors.length && !sharedLocation) continue;

      for (const rule of CAUSAL_RULES) {
        if (!hasAnyToken(cause.text, rule.causeTokens)) continue;
        if (!(hasAnyToken(effect.text, rule.effectTokens) || effect.eventCategory === "energy" && rule.type === "war_to_energy" || effect.eventCategory === "economy" && rule.type === "sanctions_to_currency" || effect.eventCategory === "politics" && rule.type === "election_to_policy" || effect.eventCategory === "regional" && rule.type === "mobilization_to_tension" || effect.eventCategory === "diplomacy" && rule.type === "diplomacy_to_deescalation")) continue;

        const confidence = Math.max(
          35,
          Math.min(
            92,
            Math.round(
              ((cause.sourceCredibility + effect.sourceCredibility) / 2) * 0.45 +
              (sharedActors.length ? 10 : 0) +
              (sharedLocation ? 14 : 0) +
              ((cause.severityScore + effect.severityScore) / 2) * 0.18
            )
          )
        );

        links.push({
          id: `${rule.id}:${cause.id}:${effect.id}`,
          sourceEventId: cause.id,
          targetEventId: effect.id,
          type: rule.type,
          confidence,
          explanation: rule.explanation,
          why: `${cause.title} appears to be driving ${effect.title} because ${rule.explanation.toLowerCase()}`,
        });
        break;
      }
    }
  }

  return links.sort((a, b) => b.confidence - a.confidence);
}

function scenarioTimeframe(label, subject) {
  const severe = subject.averageSeverity >= 75;
  if (label === "escalation") return severe ? "24-72 hours" : "3-5 days";
  if (label === "de-escalation") return severe ? "48-96 hours" : "4-7 days";
  return severe ? "3-7 days" : "5-10 days";
}

function estimateGlobalImpact(subjectNodes) {
  const severity = subjectNodes.length
    ? subjectNodes.reduce((sum, node) => sum + node.severityScore, 0) / subjectNodes.length
    : 0;
  const actorScore = unique(subjectNodes.flatMap((node) => node.actors)).reduce((sum, actor) => sum + actorSensitivity(actor), 0);
  const energyCount = subjectNodes.filter((node) => ["energy", "economy"].includes(node.eventCategory) || hasAnyToken(node.text, ["oil", "gas", "shipping", "نفط", "غاز", "شحن"])).length;
  const impactScore = Math.min(100, Math.round(severity * 0.65 + actorScore * 7 + energyCount * 8));
  return {
    score: impactScore,
    label: impactLabel(impactScore),
  };
}

function buildScenarioSet(subject, subjectNodes, causalLinks) {
  const militaryCount = subjectNodes.filter((node) => ["conflict", "military"].includes(node.eventCategory)).length;
  const diplomacyCount = subjectNodes.filter((node) => node.eventCategory === "diplomacy" || hasAnyToken(node.text, ["ceasefire", "mediation", "talks", "هدنة", "وساطة", "محادثات"])).length;
  const economicCount = subjectNodes.filter((node) => ["energy", "economy"].includes(node.eventCategory)).length;
  const severity = subject.averageSeverity || Math.round(subjectNodes.reduce((sum, node) => sum + node.severityScore, 0) / Math.max(1, subjectNodes.length));
  const credibilityAvg = Math.round(subjectNodes.reduce((sum, node) => sum + node.sourceCredibility, 0) / Math.max(1, subjectNodes.length));
  const causalCount = causalLinks.length;
  const mixedSignals = militaryCount > 0 && diplomacyCount > 0 ? 10 : 0;

  const escalationRaw = Math.max(8, 24 + severity * 0.35 + militaryCount * 10 + economicCount * 4 + causalCount * 4 - diplomacyCount * 6);
  const stalemateRaw = Math.max(8, 28 + subjectNodes.length * 4 + mixedSignals + credibilityAvg * 0.08);
  const deescalationRaw = Math.max(8, 16 + diplomacyCount * 12 + credibilityAvg * 0.15 - militaryCount * 5 - severity * 0.12);
  const total = escalationRaw + stalemateRaw + deescalationRaw;
  const impact = estimateGlobalImpact(subjectNodes);

  return [
    {
      id: "A",
      label: "escalation",
      probability: Math.round((escalationRaw / total) * 100),
      timeframe: scenarioTimeframe("escalation", subject),
      globalImpact: impact.label,
      why: militaryCount
        ? "Military and security signals are still accumulating faster than de-escalatory signals."
        : "Pressure remains biased toward harder responses rather than stabilization.",
    },
    {
      id: "B",
      label: "stalemate",
      probability: Math.round((stalemateRaw / total) * 100),
      timeframe: scenarioTimeframe("stalemate", subject),
      globalImpact: impact.label,
      why: mixedSignals
        ? "The chain contains both pressure and restraint signals, which supports a prolonged stand-off."
        : "The event chain is active but not yet decisive enough to force a clear break in either direction.",
    },
    {
      id: "C",
      label: "de-escalation",
      probability: Math.max(1, 100 - Math.round((escalationRaw / total) * 100) - Math.round((stalemateRaw / total) * 100)),
      timeframe: scenarioTimeframe("de-escalation", subject),
      globalImpact: impact.label,
      why: diplomacyCount
        ? "Negotiation and ceasefire signals are present, which leaves room for near-term easing."
        : "De-escalation remains possible, but it currently lacks enough direct evidence to dominate.",
    },
  ];
}

function buildMajorEventAssessments(graph, chains, causalLinks) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const chainAssessments = chains.slice(0, 4).map((chain) => {
    const subjectNodes = chain.nodeIds.map((id) => nodesById.get(id)).filter(Boolean);
    const chainLinks = causalLinks.filter((link) => chain.nodeIds.includes(link.sourceEventId) || chain.nodeIds.includes(link.targetEventId));
    const why = chainLinks[0]?.explanation || "Events in this chain share actors, geography, and timing, indicating an evolving strategic storyline.";
    return {
      id: chain.id,
      title: chain.summary,
      region: chain.dominantLocation,
      actors: chain.actors.slice(0, 5),
      eventCount: chain.eventCount,
      averageSeverity: chain.averageSeverity,
      why,
      scenarios: buildScenarioSet(chain, subjectNodes, chainLinks),
    };
  });

  if (chainAssessments.length) return chainAssessments;

  return graph.nodes.slice(0, 4).map((node) => {
    const nodeLinks = causalLinks.filter((link) => link.sourceEventId === node.id || link.targetEventId === node.id);
    const subject = { averageSeverity: node.severityScore };
    return {
      id: node.id,
      title: node.title,
      region: node.location,
      actors: node.actors.slice(0, 5),
      eventCount: 1,
      averageSeverity: node.severityScore,
      why: nodeLinks[0]?.explanation || "This event is prominent because its severity, actors, and recency are above the current baseline.",
      scenarios: buildScenarioSet(subject, [node], nodeLinks),
    };
  });
}

function buildSourceCredibilityOverview(nodes) {
  const buckets = { very_high: 0, high: 0, medium_high: 0, medium: 0, low: 0 };
  nodes.forEach((node) => {
    buckets[node.sourceCredibilityTier] = (buckets[node.sourceCredibilityTier] || 0) + 1;
  });
  return buckets;
}

function buildRegionalTension(nodes) {
  const regions = {};
  nodes.forEach((node) => {
    const key = node.location || node.region?.[0] || "Global";
    regions[key] = regions[key] || { region: key, score: 0, events: 0, militarySignals: 0 };
    regions[key].score += Math.round(node.severityScore * (node.sourceCredibility / 100));
    regions[key].events += 1;
    if (["conflict", "military"].includes(node.eventCategory)) regions[key].militarySignals += 1;
  });

  return Object.values(regions)
    .map((entry) => ({
      ...entry,
      tensionLevel: bucketLabel(Math.min(100, Math.round(entry.score / Math.max(1, entry.events)))),
    }))
    .sort((a, b) => b.score - a.score);
}

function computeGlobalRisk(nodes, causalLinks, chains) {
  const highImpactEvents = nodes.filter((node) => node.severityScore >= 70 && node.sourceCredibility >= 60).length;
  const militarySignals = nodes.filter((node) => ["conflict", "military"].includes(node.eventCategory)).length;
  const sensitiveActors = unique(nodes.flatMap((node) => node.actors)).filter((actor) => actorSensitivity(actor)).length;
  const escalationSignals = chains.filter((chain) => chain.averageSeverity >= 68 || ["conflict", "military", "regional"].includes(chain.dominantCategory)).length;
  const score = Math.min(
    100,
    Math.round(
      highImpactEvents * 12 +
      militarySignals * 5 +
      sensitiveActors * 8 +
      escalationSignals * 9 +
      Math.min(18, causalLinks.length * 3)
    )
  );

  const level = score >= 78 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";
  return {
    score,
    level,
    drivers: [
      `${highImpactEvents} high-impact events`,
      `${militarySignals} military signals`,
      `${sensitiveActors} strategic actors`,
      `${escalationSignals} escalation chains`,
    ],
  };
}

function buildStrategicSummary(nodes, majorEventAssessments, regionalTension, globalRisk, causalLinks) {
  const topGlobalEvents = majorEventAssessments.slice(0, 3).map((assessment) => ({
    title: assessment.title,
    region: assessment.region,
    why: assessment.why,
    leadingScenario: assessment.scenarios.slice().sort((a, b) => b.probability - a.probability)[0],
  }));

  const majorActors = unique(nodes.flatMap((node) => node.actors))
    .map((actor) => ({ actor, weight: nodes.filter((node) => node.actors.includes(actor)).length }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((entry) => entry.actor);

  const hottestRegions = regionalTension.slice(0, 4).map((entry) => entry.region);
  const leadingScenario = topGlobalEvents[0]?.leadingScenario;
  const next72Hours = leadingScenario
    ? `${leadingScenario.label} is the lead case over the next 72 hours for ${topGlobalEvents[0].title.toLowerCase()}, with attention focused on ${hottestRegions[0] || "the main hotspot"}.`
    : "The next 72 hours are likely to be defined by monitoring whether current pressure turns into a broader chain reaction.";

  const narrative = [
    `${globalRisk.level} global risk driven by ${globalRisk.drivers[0]} and ${globalRisk.drivers[1]}.`,
    hottestRegions.length ? `Highest tension is concentrated in ${hottestRegions.join(", ")}.` : null,
    majorActors.length ? `Main actors in play: ${majorActors.join(", ")}.` : null,
    causalLinks[0]?.explanation ? `Key causal logic: ${causalLinks[0].explanation}` : null,
  ].filter(Boolean).join(" ");

  return {
    headline: `${globalRisk.level} strategic posture`,
    topGlobalEvents,
    regionsWithHighestTension: hottestRegions,
    majorActorsInvolved: majorActors,
    likelyNext72Hours: next72Hours,
    narrative,
  };
}

export function getStrategicIntelligenceAnalysis(items = agentMemory.getItems()) {
  const signature = JSON.stringify({
    count: items?.length || 0,
    lastTimestamp: items?.[items.length - 1]?.timestamp || null,
    lastId: items?.[items.length - 1]?.id || null,
  });

  if (signature === cachedSignature && cachedAnalysis) return cachedAnalysis;

  const analysisItems = buildAnalysisItems(items || []);
  const eventNodes = analysisItems.map((item) => buildStrategicEventNode(item));
  const eventGraph = buildEventGraph(eventNodes);
  const eventChains = buildEventChains(eventGraph);
  const causalLinks = inferCausalLinks(eventGraph.nodes, eventGraph);
  const majorEventAssessments = buildMajorEventAssessments(eventGraph, eventChains, causalLinks);
  const sourceCredibilityOverview = buildSourceCredibilityOverview(eventGraph.nodes);
  const regionalTension = buildRegionalTension(eventGraph.nodes);
  const globalRisk = computeGlobalRisk(eventGraph.nodes, causalLinks, eventChains);
  const strategicSummary = buildStrategicSummary(eventGraph.nodes, majorEventAssessments, regionalTension, globalRisk, causalLinks);

  cachedSignature = signature;
  cachedAnalysis = {
    eventNodes,
    eventGraph,
    eventChains,
    causalLinks,
    majorEventAssessments,
    sourceCredibilityOverview,
    regionalTension,
    globalRisk,
    strategicSummary,
    generatedAt: new Date().toISOString(),
  };

  return cachedAnalysis;
}