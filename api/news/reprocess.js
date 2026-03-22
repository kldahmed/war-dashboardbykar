import { applyApiHeaders, handlePreflight } from "../_api-utils";
import { reprocessRecentBatch } from "../_high-capacity-news-core.js";

export default async function handler(req, res) {
  applyApiHeaders(req, res, "POST, OPTIONS");
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await reprocessRecentBatch(req.body || {});
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_reprocess",
      details: error?.message || "unknown_error",
    });
  }
}
