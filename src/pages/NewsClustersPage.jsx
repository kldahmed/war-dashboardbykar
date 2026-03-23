import React, { useEffect, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

export default function NewsClustersPage({ language = "ar", adminKey = "", onLogout }) {
  const [clusters, setClusters] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/news/clusters?page=${page}&pageSize=60`, {
          headers: { "X-Admin-Key": String(adminKey || "").trim() },
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        setClusters(Array.isArray(data.clusters) ? data.clusters : []);
        setPages(Number(data?.pagination?.pages || 1));
      } catch {
        if (!cancelled) setError(language === "ar" ? "تعذر تحميل المجموعات" : "Failed to load clusters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [adminKey, language, page]);

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "Clusters" : "Clusters"}
        title={language === "ar" ? "مجموعات الأخبار المتشابهة" : "News Similarity Clusters"}
        description={language === "ar"
          ? "عرض تجميع التكرار: cluster id، المصدر الأساسي، عدد المصادر المرتبطة، وعدد النسخ المدمجة."
          : "Duplicate clustering view: cluster id, primary source, linked source count, and merged duplicates."}
      />

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{language === "ar" ? `الصفحة ${page}/${pages}` : `Page ${page}/${pages}`}</div>
          {typeof onLogout === "function" ? (
            <button type="button" onClick={onLogout} style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "8px 10px", fontWeight: 700 }}>
              {language === "ar" ? "تسجيل خروج" : "Logout"}
            </button>
          ) : null}
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>Cluster ID</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "العنوان المعياري" : "Canonical title"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "المصدر الأساسي" : "Primary source"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "المصادر المرتبطة" : "Linked sources"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "عدد التكرارات" : "Duplicate count"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الثقة" : "Confidence"}</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster) => (
                <tr key={cluster.cluster_id} style={{ borderTop: "1px solid rgba(71,85,105,0.4)", color: "#e2e8f0" }}>
                  <td style={{ padding: "8px 6px" }}>{cluster.cluster_id}</td>
                  <td style={{ padding: "8px 6px", minWidth: 320 }}>{cluster.canonical_title}</td>
                  <td style={{ padding: "8px 6px" }}>{cluster.primary_source}</td>
                  <td style={{ padding: "8px 6px" }}>{cluster.number_of_linked_sources}</td>
                  <td style={{ padding: "8px 6px" }}>{cluster.duplicate_count}</td>
                  <td style={{ padding: "8px 6px" }}>{cluster.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.8)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "6px 10px" }}>{language === "ar" ? "السابق" : "Prev"}</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.8)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "6px 10px" }}>{language === "ar" ? "التالي" : "Next"}</button>
        </div>
      </section>

      {loading ? <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>{language === "ar" ? "جارٍ التحميل..." : "Loading..."}</div> : null}
      {error ? <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 10 }}>{error}</div> : null}
    </div>
  );
}
