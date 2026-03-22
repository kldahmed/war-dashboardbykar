import { ingestServerItems } from "./_agent-store.js";

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, sourceType = "news" } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array required" });
  }

  const result = ingestServerItems(items, sourceType);

  res.status(200).json({
    accepted:  result.accepted,
    items:     result.items,
    timestamp: result.timestamp,
    timezone:  "Asia/Dubai",
    mode: "server_primary_local_fallback",
  });
}
