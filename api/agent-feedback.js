import { recordServerFeedback } from "./_agent-store.js";

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

  const { forecastId, outcome, category } = req.body || {};

  if (!forecastId || !outcome) {
    return res.status(400).json({ error: "forecastId and outcome are required" });
  }

  if (!["success", "failure"].includes(outcome)) {
    return res.status(400).json({ error: "outcome must be 'success' or 'failure'" });
  }

  const result = recordServerFeedback({
    forecastId,
    outcome,
    category,
    signals: req.body?.signals || []
  });

  res.status(200).json({
    accepted:   result.accepted,
    forecastId,
    outcome,
    category:   category || "unknown",
    timestamp:  result.timestamp,
    timezone:   "Asia/Dubai",
    message:    "Feedback accepted and persisted in server memory.",
  });
}
