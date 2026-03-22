import { AGENT_BENCHMARK_DATASET } from "../src/lib/agent/benchmarkDataset.js";
import { computeAgentAuditFromSnapshot, getServerAgentSnapshot } from "./_agent-store.js";

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const snapshot = getServerAgentSnapshot();
  const scores = computeAgentAuditFromSnapshot(snapshot, AGENT_BENCHMARK_DATASET);

  return res.status(200).json({
    ok: true,
    audit_version: "1.0",
    generatedAt: new Date().toISOString(),
    benchmark_size: AGENT_BENCHMARK_DATASET.length,
    scores
  });
}
