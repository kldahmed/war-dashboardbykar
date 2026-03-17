/**
 * API: /api/agent-state
 *
 * Returns current agent state summary.
 * This endpoint is intentionally lightweight — the heavy computation
 * happens in the client-side agent modules (localStorage-backed).
 *
 * Response: { status, message, serverTime, timezone }
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Dubai",
    year:    "numeric",
    month:   "2-digit",
    day:     "2-digit",
    hour:    "2-digit",
    minute:  "2-digit",
    second:  "2-digit",
    hour12:  false,
  });

  res.status(200).json({
    status:     "active",
    message:    "Agent is running. Memory and scoring are client-side (localStorage).",
    serverTime: now,
    timezone:   "Asia/Dubai",
  });
}
