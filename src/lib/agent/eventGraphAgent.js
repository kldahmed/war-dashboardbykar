/**
 * Event Graph Agent — converts incoming events into structured nodes
 * and automatically links events sharing actors, locations, or keywords.
 *
 * Each EventNode contains: actors, location, time, event category, severity.
 * Edges are created between nodes that share 2+ entities or the same region.
 */

import { agentMemory } from "./memoryAgent";

// ── Severity scorer ──────────────────────────────────────────────────────────
const HIGH_SEVERITY_KEYS = [
  "war","invasion","missile","airstrike","bomb","nuclear","killed","attack",
  "حرب","غزو","صاروخ","غارة","قنبلة","نووي","قتل","هجوم",
];
const MEDIUM_SEVERITY_KEYS = [
  "sanctions","crisis","escalation","protest","military","coup","drought","collapse",
  "عقوبات","أزمة","تصعيد","احتجاج","عسكري","انقلاب","جفاف","انهيار",
];

function computeSeverity(item) {
  const text = `${item.title || ""} ${item.text || ""}`.toLowerCase();
  if (HIGH_SEVERITY_KEYS.some(k => text.includes(k))) return 9;
  if (MEDIUM_SEVERITY_KEYS.some(k => text.includes(k))) return 6;
  if (item.urgency === "high") return 7;
  if (item.urgency === "medium") return 4;
  return 2;
}

// ── Actor extractor ──────────────────────────────────────────────────────────
function extractActors(item) {
  // Use the entities already detected in ingestion, filtered to person/org names
  return (item.entities || []).slice(0, 5);
}

// ── Location resolver ────────────────────────────────────────────────────────
function resolveLocation(item) {
  if (item.region && item.region.length > 0) return item.region[0];
  return "Global";
}

// ── Convert a single item to an EventNode ────────────────────────────────────
export function toEventNode(item) {
  return {
    id:        item.id,
    title:     item.title || item.text?.slice(0, 80) || "Unknown Event",
    actors:    extractActors(item),
    location:  resolveLocation(item),
    regions:   item.region || ["Global"],
    time:      item.timestamp,
    category:  item.category || "general",
    eventType: item.eventType || "general_event",
    severity:  computeSeverity(item),
    keywords:  item.keywords || [],
    entities:  item.entities || [],
    source:    item.source || "unknown",
    impactVector: item.impactVector || "situational_awareness",
    // edges will be populated by the graph builder
    linkedIds: [],
  };
}

// ── Edge detector ────────────────────────────────────────────────────────────
function shouldLink(nodeA, nodeB) {
  // Same primary location
  if (nodeA.location === nodeB.location && nodeA.location !== "Global") return true;

  // Share 2+ entities
  const setA = new Set(nodeA.entities);
  const shared = nodeB.entities.filter(e => setA.has(e));
  if (shared.length >= 2) return true;

  // Share a region + same category
  const regA = new Set(nodeA.regions);
  const sharedReg = nodeB.regions.filter(r => regA.has(r));
  if (sharedReg.length > 0 && nodeA.category === nodeB.category) return true;

  return false;
}

// ── Event graph builder ──────────────────────────────────────────────────────

/**
 * Build a full event graph from agent memory.
 * Returns { nodes, edges, chains, hotNodes }
 */
export function buildEventGraph() {
  const items = agentMemory.getItems();

  // Only process the 200 most-recent items for performance
  const recent = items
    .slice(-200)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const nodes = recent.map(toEventNode);
  const edges = [];
  const adjMap = {}; // nodeId → Set of connected nodeIds

  for (let i = 0; i < nodes.length; i++) {
    adjMap[nodes[i].id] = new Set();
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (shouldLink(nodes[i], nodes[j])) {
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          sharedEntities: nodes[j].entities.filter(e => new Set(nodes[i].entities).has(e)),
          sharedRegions: nodes[j].regions.filter(r => new Set(nodes[i].regions).has(r)),
          strength: nodes[i].severity + nodes[j].severity,
        });
        adjMap[nodes[i].id].add(nodes[j].id);
        adjMap[nodes[j].id].add(nodes[i].id);
        nodes[i].linkedIds.push(nodes[j].id);
        nodes[j].linkedIds.push(nodes[i].id);
      }
    }
  }

  // ── Detect evolving chains (connected components with 3+ nodes) ──────────
  const visited = new Set();
  const chains = [];

  function dfs(nodeId, chain) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    chain.push(nodeId);
    (adjMap[nodeId] || new Set()).forEach(neighbor => dfs(neighbor, chain));
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && (adjMap[node.id]?.size || 0) >= 1) {
      const chain = [];
      dfs(node.id, chain);
      if (chain.length >= 2) {
        chains.push({
          nodeIds: chain,
          size: chain.length,
          maxSeverity: Math.max(...chain.map(id => nodes.find(n => n.id === id)?.severity || 0)),
          regions: [...new Set(chain.flatMap(id => nodes.find(n => n.id === id)?.regions || []))],
          categories: [...new Set(chain.map(id => nodes.find(n => n.id === id)?.category || "general"))],
        });
      }
    }
  }

  // Sort chains by size desc
  chains.sort((a, b) => b.maxSeverity - a.maxSeverity || b.size - a.size);

  // ── Hot nodes: most connected and highest severity ───────────────────────
  const hotNodes = nodes
    .filter(n => n.linkedIds.length > 0)
    .sort((a, b) => (b.linkedIds.length * b.severity) - (a.linkedIds.length * a.severity))
    .slice(0, 8);

  return {
    nodes,
    edges,
    chains: chains.slice(0, 10),
    hotNodes,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    chainCount: chains.length,
    analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
