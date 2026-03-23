import { applyApiHeaders, handlePreflight, rejectUnsupportedMethod, requireAdmin } from "../_api-utils";
import { buildAnalyticsExportPayload } from "../_high-capacity-news-core.js";

export default async function handler(req, res) {
  applyApiHeaders(req, res);
  if (handlePreflight(req, res)) return;
  if (rejectUnsupportedMethod(req, res, "GET")) return;
  if (!requireAdmin(req, res)) return;

  try {
    const exportPayload = await buildAnalyticsExportPayload(req.query || {});
    const contentType = exportPayload.format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${exportPayload.fileName}\"`);
    return res.status(200).send(exportPayload.body);
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_export_analytics",
      details: error?.message || "unknown_error",
    });
  }
}
