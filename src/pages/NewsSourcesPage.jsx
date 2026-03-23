import React, { useMemo } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

export default function NewsSourcesPage({
  language = "ar",
  feedStatus,
  updateNewsSource,
  opsBusy,
  refreshOperations,
  onLogout,
}) {
  const sources = Array.isArray(feedStatus?.sources) ? feedStatus.sources : [];

  const summary = useMemo(() => {
    const active = sources.filter((item) => item.active).length;
    const failing = sources.filter((item) => String(item.health_status || item.status).includes("circuit") || String(item.health_status || item.status).includes("degraded")).length;
    const rawToday = sources.reduce((acc, item) => acc + Number(item.raw_today || 0), 0);
    return { active, failing, rawToday };
  }, [sources]);

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "المصادر" : "Sources"}
        title={language === "ar" ? "لوحة مصادر الأخبار" : "News Sources Dashboard"}
        description={language === "ar"
          ? "تحكم مباشر في التشغيل، التردد، والثقة لكل مصدر مع عرض الحالة الصحية والأداء."
          : "Direct control of activation, polling, and trust per source with health and performance visibility."}
      />

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ color: "#cbd5e1", fontSize: 12 }}>
            {language === "ar"
              ? `الإجمالي ${sources.length} | النشط ${summary.active} | المتعثر ${summary.failing}`
              : `Total ${sources.length} | Active ${summary.active} | Failing ${summary.failing}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={refreshOperations} disabled={opsBusy} style={{ borderRadius: 10, border: "1px solid rgba(56,189,248,0.4)", background: "rgba(56,189,248,0.12)", color: "#bae6fd", padding: "8px 10px", fontWeight: 700 }}>
              {language === "ar" ? "تحديث" : "Refresh"}
            </button>
            {typeof onLogout === "function" ? (
              <button type="button" onClick={onLogout} style={{ borderRadius: 10, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "8px 10px", fontWeight: 700 }}>
                {language === "ar" ? "تسجيل خروج" : "Logout"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "14px 16px", borderRadius: 18 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "المصدر" : "Source"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "النوع" : "Type"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "اللغة" : "Lang"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "المنطقة" : "Region"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الحالة" : "Health"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "الثقة" : "Trust"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "السحب" : "Polling"}</th>
                <th style={{ padding: "8px 6px" }}>{language === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {sources.slice(0, 220).map((source) => (
                <tr key={source.id} style={{ borderTop: "1px solid rgba(71,85,105,0.4)", color: "#e2e8f0" }}>
                  <td style={{ padding: "8px 6px", minWidth: 220 }}>{source.name}</td>
                  <td style={{ padding: "8px 6px" }}>{source.type}</td>
                  <td style={{ padding: "8px 6px" }}>{source.language}</td>
                  <td style={{ padding: "8px 6px" }}>{source.region}</td>
                  <td style={{ padding: "8px 6px" }}>{source.health_status || source.status}</td>
                  <td style={{ padding: "8px 6px" }}>{source.trust_base_score}</td>
                  <td style={{ padding: "8px 6px" }}>{source.polling_interval || source.update_interval_seconds}s</td>
                  <td style={{ padding: "8px 6px", display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled={opsBusy}
                      onClick={() => updateNewsSource({ source_id: source.id, active: !source.active })}
                      style={{ borderRadius: 8, border: "1px solid rgba(71,85,105,0.8)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", padding: "5px 8px" }}
                    >
                      {source.active ? (language === "ar" ? "إيقاف" : "Pause") : (language === "ar" ? "تفعيل" : "Activate")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
