/**
 * API: /api/agent-ingest
 *
 * Accepts POST requests with a batch of raw items to queue for ingestion.
 * Items are timestamped server-side using Asia/Dubai time.
 *
 * Body: { items: Array, sourceType: string }
 * Response: { accepted: number, timestamp: string }
 *
 * Note: Actual ingestion and memory storage run client-side.
 * This endpoint normalises items and adds server-side Dubai timestamps.
 */

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, sourceType = "news" } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array required" });
  }

  const dubaiTimestamp = new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Dubai",
  }).replace(" ", "T") + "+04:00";

  // Stamp each item with Dubai time if missing
  const stamped = items.map(item => ({
    ...item,
    sourceType,
    ingestedAt: dubaiTimestamp,
    timestamp: item.timestamp || item.time || dubaiTimestamp,
  }));

  res.status(200).json({
    accepted:  stamped.length,
    items:     stamped,
    timestamp: dubaiTimestamp,
    timezone:  "Asia/Dubai",
  });
}
