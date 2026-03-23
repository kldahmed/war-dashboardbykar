import React, { useEffect, useMemo, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

function MetricCard({ label, value, hint }) {
  return (
    <div style={{ ...panelStyle, padding: "14px 14px 12px", borderRadius: 16 }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>{label}</div>
      <div style={{ color: "#f8fafc", fontSize: 24, fontWeight: 900 }}>{value}</div>
      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{hint}</div>
    </div>
  );
}

function TinyBars({ items = [], accent = "#38bdf8" }) {
  const max = Math.max(1, ...items.map((item) => Number(item?.value || 0)));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.slice(0, 8).map((item) => (
        <div key={item.key || item.period} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
          <div style={{ color: "#cbd5e1", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.key || item.period}</div>
          <div style={{ background: "rgba(71,85,105,0.4)", borderRadius: 999, overflow: "hidden", height: 8 }}>
            <div style={{ width: `${Math.max(4, Math.round((Number(item.value || 0) / max) * 100))}%`, height: "100%", background: accent }} />
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 11, textAlign: "right" }}>{Number(item.value || 0)}</div>
        </div>
      ))}
    </div>
  );
}

function downloadBlob(content, fileName, mimeType = "application/octet-stream") {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export default function NewsAnalyticsPage({ language = "ar", adminKey = "", onLogout }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    source: "",
    category: "all",
    language: "all",
    status: "all",
    duplicateState: "all",
    publishedState: "all",
    trustMin: "",
    qualityMin: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "50");
        Object.entries(filters).forEach(([key, value]) => {
          if (String(value || "").trim()) params.set(key, String(value));
        });

        const response = await fetch(`/api/news/analytics?${params.toString()}`, {
          headers: { "X-Admin-Key": String(adminKey || "").trim() },
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        const data = await response.json();
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError(language === "ar" ? "تعذر تحميل التحليلات" : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [language, adminKey, page, filters]);

  const metrics = payload?.metrics || {};
  const counters = metrics.counters || {};
  const goal = metrics.daily_goal || {};
  const rates = metrics.rates || {};
  const quality = metrics.quality || {};
  const distributions = metrics.distributions || {};
  const alerts = metrics.alerts_list || [];

  const categoryBars = useMemo(
    () => Object.entries(distributions.by_category_today || {}).map(([key, value]) => ({ key, value })),
    [distributions.by_category_today]
  );

  const sourceBars = useMemo(
    () => (metrics.source_performance || []).slice(0, 8).map((entry) => ({ key: entry.name, value: entry.raw_today })),
    [metrics.source_performance]
  );

  const hourlyBars = useMemo(
    () => (metrics.charts?.news_per_hour || []).slice(-12).map((entry) => ({ key: entry.period.slice(11, 16), value: entry.value })),
    [metrics.charts?.news_per_hour]
  );

  const exportReport = async (format, scope) => {
    try {
      const params = new URLSearchParams({ format, scope });
      const response = await fetch(`/api/news/export?${params.toString()}`, {
        headers: { "X-Admin-Key": String(adminKey || "").trim() },
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      const ext = format === "csv" ? "csv" : "json";
      downloadBlob(text, `news-${scope}.${ext}`, contentType.includes("csv") ? "text/csv" : "application/json");
    } catch {
      setError(language === "ar" ? "تعذر تصدير التقرير" : "Failed to export report");
    }
  };

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "الإحصاءات" : "Analytics"}
        title={language === "ar" ? "غرفة بيانات الأخبار عالية السعة" : "High-Capacity News Data Room"}
        description={language === "ar"
          ? "قياس حي لهدف 10,000 خبر يوميا مع عدادات الجودة، التكرار، أداء المصادر، والتنبيهات المبكرة."
          : "Live tracking for the 10,000/day goal with quality, duplication, source performance, and early alerts."}
        right={
          <div style={{ ...panelStyle, padding: "14px 16px", borderRadius: 16, minWidth: 240 }}>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "الهدف اليومي الأدنى" : "Daily minimum target"}</div>
            <div style={{ color: "#f8fafc", fontSize: 32, fontWeight: 900 }}>{goal.minimum_target || 10000}</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{language === "ar" ? `الإنجاز ${goal.completion_percent || 0}%` : `Completion ${goal.completion_percent || 0}%`}</div>
          </div>
        }
      />

      <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: 16 }}>
        <MetricCard label={language === "ar" ? "Raw اليوم" : "Raw today"} value={counters.raw_count || 0} hint={language === "ar" ? "إجمالي الخام" : "Total raw"} />
        <MetricCard label={language === "ar" ? "Unique اليوم" : "Unique today"} value={counters.unique_count || 0} hint={language === "ar" ? "أخبار فريدة" : "Unique articles"} />
        <MetricCard label={language === "ar" ? "Duplicates اليوم" : "Duplicates today"} value={counters.duplicate_count || 0} hint={language === "ar" ? "أخبار مكررة" : "Duplicate items"} />
        <MetricCard label={language === "ar" ? "Published اليوم" : "Published today"} value={counters.published_count || 0} hint={language === "ar" ? "تم النشر" : "Published to site"} />
        <MetricCard label={language === "ar" ? "آخر ساعة" : "Last hour"} value={counters.last_hour_count || 0} hint={language === "ar" ? "معدل لحظي" : "Near-real-time"} />
        <MetricCard label={language === "ar" ? "آخر 24 ساعة" : "Last 24h"} value={counters.last_24h_count || 0} hint={language === "ar" ? "تدفق يومي" : "Daily flow"} />
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 14 }}>{language === "ar" ? "حالة الهدف اليومي" : "Daily goal status"}</div>
          <div style={{ color: goal.reached_minimum ? "#4ade80" : "#f97316", fontWeight: 800, fontSize: 12 }}>
            {goal.reached_minimum
              ? (language === "ar" ? "تم بلوغ الحد الأدنى" : "Minimum reached")
              : (language === "ar" ? "لم يبلغ الحد الأدنى بعد" : "Below minimum")}
          </div>
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8 }}>
          {language === "ar"
            ? `التوقع لنهاية اليوم: ${goal.projected_end_of_day_unique || 0} | الهدف: ${goal.minimum_target || 10000}`
            : `Projected EOD: ${goal.projected_end_of_day_unique || 0} | Target: ${goal.minimum_target || 10000}`}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 14 }}>
        <div style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{language === "ar" ? "أخبار لكل ساعة" : "News per hour"}</div>
          <TinyBars items={hourlyBars} accent="#38bdf8" />
        </div>
        <div style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{language === "ar" ? "حسب التصنيف" : "By category"}</div>
          <TinyBars items={categoryBars} accent="#f59e0b" />
        </div>
        <div style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
          <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{language === "ar" ? "أفضل المصادر اليوم" : "Top sources today"}</div>
          <TinyBars items={sourceBars} accent="#22c55e" />
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{language === "ar" ? "مؤشرات الجودة" : "Quality indicators"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `معدل التكرار: ${(Number(rates.duplicates_rate || 0) * 100).toFixed(1)}%` : `Duplicate rate: ${(Number(rates.duplicates_rate || 0) * 100).toFixed(1)}%`}</div>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `معدل الفشل: ${(Number(rates.failure_rate || 0) * 100).toFixed(1)}%` : `Failure rate: ${(Number(rates.failure_rate || 0) * 100).toFixed(1)}%`}</div>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `متوسط الثقة: ${quality.trust_score_avg || 0}` : `Avg trust: ${quality.trust_score_avg || 0}`}</div>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `متوسط الجودة: ${quality.quality_score_avg || 0}` : `Avg quality: ${quality.quality_score_avg || 0}`}</div>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `زمن الوصول: ${quality.avg_ingest_latency_minutes || 0} دقيقة` : `Ingest latency: ${quality.avg_ingest_latency_minutes || 0} min`}</div>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `زمن النشر: ${quality.avg_publish_latency_minutes || 0} دقيقة` : `Publish latency: ${quality.avg_publish_latency_minutes || 0} min`}</div>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{language === "ar" ? "التنبيهات" : "Alerts"}</div>
        <div style={{ display: "grid", gap: 8 }}>
          {alerts.map((alert) => (
            <div key={alert.id} style={{ border: "1px solid rgba(71,85,105,0.5)", borderRadius: 12, padding: "8px 10px", color: alert.triggered ? "#fecaca" : "#bbf7d0", background: "rgba(2,6,23,0.4)", fontSize: 12 }}>
              {alert.message} ({alert.severity})
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 10 }}>
          <input value={filters.source} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, source: e.target.value })); }} placeholder={language === "ar" ? "فلتر المصدر" : "Filter source"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.category} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, category: e.target.value })); }} placeholder={language === "ar" ? "التصنيف" : "Category"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.language} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, language: e.target.value })); }} placeholder={language === "ar" ? "اللغة" : "Language"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.status} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, status: e.target.value })); }} placeholder={language === "ar" ? "الحالة" : "Status"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.duplicateState} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, duplicateState: e.target.value })); }} placeholder={language === "ar" ? "duplicate|unique" : "duplicate|unique"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.publishedState} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, publishedState: e.target.value })); }} placeholder={language === "ar" ? "published|not_published" : "published|not_published"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.qualityMin} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, qualityMin: e.target.value })); }} placeholder={language === "ar" ? "أدنى جودة" : "Min quality"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input value={filters.trustMin} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, trustMin: e.target.value })); }} placeholder={language === "ar" ? "أدنى ثقة" : "Min trust"} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input type="date" value={filters.startDate} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, startDate: e.target.value })); }} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
          <input type="date" value={filters.endDate} onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, endDate: e.target.value })); }} style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", padding: "8px 10px" }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => exportReport("csv", "daily")} style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 10px", fontWeight: 700 }}>{language === "ar" ? "CSV يومي" : "Daily CSV"}</button>
          <button type="button" onClick={() => exportReport("json", "source")} style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 10px", fontWeight: 700 }}>{language === "ar" ? "JSON المصادر" : "Source JSON"}</button>
          <button type="button" onClick={() => exportReport("csv", "category")} style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 10px", fontWeight: 700 }}>{language === "ar" ? "CSV التصنيفات" : "Category CSV"}</button>
          <button type="button" onClick={() => exportReport("csv", "articles")} style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 10px", fontWeight: 700 }}>{language === "ar" ? "CSV الأخبار" : "Articles CSV"}</button>
          {typeof onLogout === "function" ? (
            <button type="button" onClick={onLogout} style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "8px 10px", fontWeight: 700 }}>{language === "ar" ? "تسجيل خروج الإدارة" : "Admin logout"}</button>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "العنوان" : "Title"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "المصدر" : "Source"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "التصنيف" : "Category"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "اللغة" : "Lang"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الثقة" : "Trust"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الجودة" : "Quality"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "Cluster" : "Cluster"}</th>
              </tr>
            </thead>
            <tbody>
              {(payload?.articles || []).map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(71,85,105,0.4)", color: "#e2e8f0" }}>
                  <td style={{ padding: "8px 6px", minWidth: 320 }}>{row.title}</td>
                  <td style={{ padding: "8px 6px" }}>{row.source}</td>
                  <td style={{ padding: "8px 6px" }}>{row.category}</td>
                  <td style={{ padding: "8px 6px" }}>{row.language}</td>
                  <td style={{ padding: "8px 6px" }}>{row.trust_score}</td>
                  <td style={{ padding: "8px 6px" }}>{row.quality_score}</td>
                  <td style={{ padding: "8px 6px" }}>{row.status}</td>
                  <td style={{ padding: "8px 6px" }}>{row.cluster_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
          <div>{language === "ar" ? `إجمالي ${payload?.pagination?.total || 0}` : `Total ${payload?.pagination?.total || 0}`}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "6px 10px" }}>{language === "ar" ? "السابق" : "Prev"}</button>
            <span>{page}/{payload?.pagination?.pages || 1}</span>
            <button type="button" disabled={page >= Number(payload?.pagination?.pages || 1)} onClick={() => setPage((p) => p + 1)} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "6px 10px" }}>{language === "ar" ? "التالي" : "Next"}</button>
          </div>
        </div>
      </section>

      {loading ? <div style={{ color: "#94a3b8", fontSize: 12 }}>{language === "ar" ? "جارٍ تحديث التحليلات..." : "Refreshing analytics..."}</div> : null}
      {error ? <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
