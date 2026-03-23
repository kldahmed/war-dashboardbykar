import { applyApiHeaders, handlePreflight, rejectUnsupportedMethod } from "../_api-utils";
import { getHighCapacityAnalyticsPayload } from "../_high-capacity-news-core.js";

export default async function handler(req, res) {
  applyApiHeaders(req, res);
  if (handlePreflight(req, res)) return;
  if (rejectUnsupportedMethod(req, res, "GET")) return;

  try {
    const payload = await getHighCapacityAnalyticsPayload(req.query || {});
    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_load_analytics",
      details: error?.message || "unknown_error",
    });
  }
}
