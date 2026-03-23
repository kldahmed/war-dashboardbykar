import { applyApiHeaders, handlePreflight, rejectUnsupportedMethod } from "./_api-utils";
import { getHighCapacityNewsPayload } from "./_high-capacity-news-core.js";

function normalizeCategory(category = "all") {
  const value = String(category || "all").toLowerCase();
  if (["all", "regional", "politics", "military", "economy", "sports", "technology", "health", "culture", "local", "international", "emergency", "variety", "misc"].includes(value)) {
    return value;
  }
  return "all";
}

function normalizeHealthEntries(entries = []) {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        id: entry.id,
        ok: Boolean(entry.ok),
        count: Number(entry.count || 0),
        source: entry.source || entry.id,
        status: entry.status || (entry.ok ? "healthy" : "degraded"),
        category: entry.category || "general",
        language: entry.language || "ar",
        trustBaseScore: Number(entry.trustBaseScore || 0),
        updated: entry.updated || "",
        latencyMs: Number(entry.latencyMs || 0),
        error: entry.error || "",
        quarantined: Boolean(entry.status === "circuit_open"),
        quarantinedUntil: Number(entry.circuitOpenUntil || 0),
      }))
    : [];
}

export default async function handler(req, res) {
  applyApiHeaders(req, res);
  if (handlePreflight(req, res)) return;
  if (rejectUnsupportedMethod(req, res, "GET")) return;

  try {
    const category = normalizeCategory(req.query?.category || "all");
    const payload = await getHighCapacityNewsPayload(req, {
      category,
      limit: 150,
    });

    const response = {
      news: Array.isArray(payload.news) ? payload.news : [],
      updated: payload.updated || new Date().toISOString(),
      source: "ok",
      sourceMode: "live-intake-open-source",
      sourceTypes: payload.sourceTypes || ["rss", "manual-curated", "optional-news-api"],
      sourceFilters: Array.isArray(req.query?.source) ? req.query.source : String(req.query?.source || "").split(",").filter(Boolean),
      health: normalizeHealthEntries(payload.health),
      stats: payload.stats || null,
      breaking: Array.isArray(payload.breaking) ? payload.breaking.slice(0, 20) : [],
      featuredAlert: payload.featuredAlert || null,
      sections: payload.sections || {},
      dashboard: payload.dashboard || null,
      pipeline: payload.pipeline || null,
    };

    res.setHeader("Cache-Control", "s-maxage=8, stale-while-revalidate=16");
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_build_live_intake_payload",
      details: error?.message || "unknown_error",
      source: "fallback",
      sourceMode: "live-intake-open-source",
      sourceTypes: ["rss", "manual-curated", "optional-news-api"],
      news: [],
      health: [],
      stats: null,
      breaking: [],
      featuredAlert: null,
      updated: new Date().toISOString(),
    });
  }
}
