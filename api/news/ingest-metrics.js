import { applyApiHeaders, handlePreflight, rejectUnsupportedMethod, requireAdmin } from "../_api-utils";
import { buildMetricsSnapshot, ensureNewsEngineStarted } from "../_high-capacity-news-core.js";

/**
 * GET /api/news/ingest-metrics
 * Lightweight admin endpoint: returns fetch counters + full per-source performance table.
 * No article pagination — purpose-built for the ingest monitoring panel.
 */
export default async function handler(req, res) {
  applyApiHeaders(req, res);
  if (handlePreflight(req, res)) return;
  if (rejectUnsupportedMethod(req, res, "GET")) return;
  if (!requireAdmin(req, res)) return;

  try {
    const store = await ensureNewsEngineStarted();
    const snapshot = buildMetricsSnapshot(store);

    const counters = snapshot.counters || {};
    const rates = snapshot.rates || {};
    const quality = snapshot.quality || {};
    const daily_goal = snapshot.daily_goal || {};
    const source_performance = snapshot.source_performance || [];

    // Totals derived from source_performance
    const total_pulls = source_performance.reduce((sum, s) => sum + Number(s.pulls || 0), 0);
    const total_successes = source_performance.reduce((sum, s) => sum + Number(s.successes || 0), 0);
    const total_failures = source_performance.reduce((sum, s) => sum + Number(s.failures || 0), 0);
    const total_raw_today = source_performance.reduce((sum, s) => sum + Number(s.raw_today || 0), 0);
    const total_unique_today = source_performance.reduce((sum, s) => sum + Number(s.unique_today || 0), 0);
    const total_duplicate_today = source_performance.reduce((sum, s) => sum + Number(s.duplicate_today || 0), 0);
    const active_count = source_performance.filter((s) => s.active).length;
    const failing_count = source_performance.filter((s) => Number(s.failures || 0) > 0 && Number(s.failure_ratio || 0) > 0.4).length;
    const circuit_open_count = source_performance.filter((s) => s.circuit_open_until && new Date(s.circuit_open_until) > new Date()).length;
    const overall_success_rate = total_pulls > 0 ? Number(((total_successes / total_pulls) * 100).toFixed(1)) : 0;

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
    return res.status(200).json({
      generated_at: snapshot.generated_at,
      summary: {
        total_sources: source_performance.length,
        active_count,
        failing_count,
        circuit_open_count,
        total_pulls,
        total_successes,
        total_failures,
        overall_success_rate,
        total_raw_today,
        total_unique_today,
        total_duplicate_today,
        raw_ingested_today: counters.imported_today_raw || total_raw_today,
        unique_ingested_today: counters.imported_today_unique || total_unique_today,
        duplicates_today: counters.duplicates_today || total_duplicate_today,
        published_today: counters.published_today || 0,
        failed_fetches_today: counters.failed_fetches_today || 0,
        last_hour: counters.last_hour_count || 0,
        last_24h: counters.last_24h_count || 0,
        daily_goal_pct: daily_goal.completion_percent || 0,
        daily_goal_min: daily_goal.minimum_target || 10000,
        daily_goal_reached: Boolean(daily_goal.reached_minimum),
        avg_quality: quality.quality_score_avg || 0,
        avg_trust: quality.trust_score_avg || 0,
        avg_ingest_latency_minutes: quality.avg_ingest_latency_minutes || 0,
        dup_rate_pct: Number(((rates.duplicates_rate || 0) * 100).toFixed(1)),
        failure_rate_pct: Number(((rates.failure_rate || 0) * 100).toFixed(1)),
      },
      sources: source_performance,
      hourly_chart: (snapshot.charts?.news_per_hour || []).slice(-24),
    });
  } catch (error) {
    return res.status(500).json({
      error: "failed_to_load_ingest_metrics",
      details: error?.message || "unknown_error",
    });
  }
}
