import { applyApiHeaders, handlePreflight } from "../_api-utils";
import { getHighCapacitySourcesPayload, updateHighCapacitySource } from "../_high-capacity-news-core.js";

export default async function handler(req, res) {
  applyApiHeaders(req, res, "GET, PATCH, OPTIONS");
  if (handlePreflight(req, res)) return;

  if (req.method === "GET") {
    try {
      const payload = await getHighCapacitySourcesPayload();
      res.setHeader("Cache-Control", "s-maxage=8, stale-while-revalidate=16");
      return res.status(200).json(payload);
    } catch (error) {
      return res.status(500).json({
        error: "failed_to_load_sources",
        details: error?.message || "unknown_error",
      });
    }
  }

  if (req.method === "PATCH") {
    try {
      const update = await updateHighCapacitySource(req.body || {});
      if (!update.ok) return res.status(404).json(update);
      return res.status(200).json(update);
    } catch (error) {
      return res.status(500).json({
        error: "failed_to_update_source",
        details: error?.message || "unknown_error",
      });
    }
  }

  if (rejectUnsupportedMethod(req, res, "GET")) return;
}
