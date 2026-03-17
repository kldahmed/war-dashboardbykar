/**
 * API: /api/agent-feedback
 *
 * Accepts POST requests to submit forecast outcome feedback.
 *
 * Body: { forecastId: string, outcome: "success"|"failure", category: string }
 * Response: { accepted: true, forecastId, outcome, timestamp }
 *
 * Actual memory update happens on the client via feedbackAgent.markOutcome().
 * This endpoint validates and logs the feedback event server-side.
 */

export default function handler(req, res) {
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

  const dubaiTimestamp = new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Dubai",
  }).replace(" ", "T") + "+04:00";

  res.status(200).json({
    accepted:   true,
    forecastId,
    outcome,
    category:   category || "unknown",
    timestamp:  dubaiTimestamp,
    timezone:   "Asia/Dubai",
    message:    "Feedback accepted. Apply via feedbackAgent.markOutcome() on the client.",
  });
}
