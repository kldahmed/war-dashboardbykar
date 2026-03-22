import { applyApiHeaders } from "./_api-utils";
import { getHighCapacityNewsPayload } from "./_high-capacity-news-core.js";

function normalizeCategory(category = "all") {
  const value = String(category || "all").toLowerCase();
  if (["all", "regional", "politics", "military", "economy", "sports", "technology", "health", "culture", "local", "international"].includes(value)) {
    return value;
  }
  return "all";
}

function normalizeLimit(rawLimit) {
  const limit = Number(rawLimit);
  if (!Number.isFinite(limit)) return 120;
  if (limit < 10) return 10;
  if (limit > 240) return 240;
  return Math.round(limit);
}

export default async function handler(req, res) {
  applyApiHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const category = normalizeCategory(req.query?.category || "all");
    const limit = normalizeLimit(req.query?.limit);

    const payload = await getHighCapacityNewsPayload(req, { category, limit });

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_build_news_payload",
      details: error?.message || "unknown_error",
      news: [],
      sourceMode: "high-capacity-open-source-ingestion",
      sourceTypes: ["rss", "manual-curated", "optional-news-api"],
      updated: new Date().toISOString(),
    });
  }
}
