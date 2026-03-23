import React, { useMemo, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

function SourceRow({ source, language, opsBusy, onApply }) {
  const [active, setActive] = useState(Boolean(source?.active));
  const [intervalSeconds, setIntervalSeconds] = useState(Number(source?.update_interval_seconds || 600));
  const [trustBaseScore, setTrustBaseScore] = useState(Number(source?.trust_base_score || 70));

  return (
    <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 14, padding: 12, background: "rgba(2,6,23,0.34)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>{source.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>{source.category} | {source.language} | {source.status}</div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#e2e8f0", fontSize: 12 }}>
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={opsBusy} />
          {language === "ar" ? "نشط" : "Active"}
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "التردد بالثواني" : "Interval seconds"}</span>
          <input
            type="number"
            min="120"
            max="3600"
            step="30"
            value={intervalSeconds}
            disabled={opsBusy}
            onChange={(event) => setIntervalSeconds(Number(event.target.value || 600))}
            style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.78)", color: "#f8fafc", padding: "8px 10px" }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "الثقة الأساسية" : "Trust base"}</span>
          <input
            type="number"
            min="20"
            max="99"
            step="1"
            value={trustBaseScore}
            disabled={opsBusy}
            onChange={(event) => setTrustBaseScore(Number(event.target.value || 70))}
            style={{ borderRadius: 10, border: "1px solid rgba(71,85,105,0.7)", background: "rgba(15,23,42,0.78)", color: "#f8fafc", padding: "8px 10px" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          {language === "ar"
            ? `نجاحات ${source.successes || 0} | إخفاقات ${source.failures || 0} | آخر دفعة ${source.last_item_count || 0}`
            : `Success ${source.successes || 0} | Fail ${source.failures || 0} | Last batch ${source.last_item_count || 0}`}
        </div>
        <button
          type="button"
          disabled={opsBusy}
          onClick={() => onApply({
            source_id: source.id,
            active,
            update_interval_seconds: intervalSeconds,
            trust_base_score: trustBaseScore,
          })}
          style={{ border: "1px solid rgba(56,189,248,0.48)", background: "rgba(56,189,248,0.14)", color: "#bae6fd", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: opsBusy ? "wait" : "pointer" }}
        >
          {language === "ar" ? "تطبيق" : "Apply"}
        </button>
      </div>
    </div>
  );
}

export default function NewsOpsPage({
  language,
  feedStatus,
  opsBusy,
  opsMessage,
  updateNewsSource,
  reprocessNewsBatch,
  refreshOperations,
  onLogout,
}) {
  const dashboard = feedStatus?.dashboard || null;
  const sources = Array.isArray(feedStatus?.sources) ? feedStatus.sources : [];
  const persistence = dashboard?.persistence || null;
  const pipeline = feedStatus?.pipeline || null;
  const newsroom = feedStatus?.newsroom || null;

  const systemStatus = [
    { key: "ingestion", labelAr: "Ingestion", labelEn: "Ingestion", state: pipeline?.ingestion?.status || "unknown", queue: Number(pipeline?.ingestion?.queue || 0) },
    { key: "verification", labelAr: "Verification", labelEn: "Verification", state: pipeline?.classification?.status || "unknown", queue: Number(pipeline?.classification?.queue || 0) },
    { key: "summarization", labelAr: "Summarization", labelEn: "Summarization", state: pipeline?.summarization?.status || "unknown", queue: Number(pipeline?.summarization?.queue || 0) },
    { key: "tts", labelAr: "TTS", labelEn: "TTS", state: "standby", queue: 0 },
    { key: "avatar", labelAr: "Avatar", labelEn: "Avatar", state: "standby", queue: 0 },
    { key: "composer", labelAr: "Composer", labelEn: "Composer", state: pipeline?.publishing?.status || "unknown", queue: Number(pipeline?.publishing?.queue || 0) },
  ];

  const sourceGroups = useMemo(() => {
    const grouped = new Map();
    sources.forEach((source) => {
      const key = source.category || "other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(source);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sources]);

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "عمليات" : "Operations"}
        title={language === "ar" ? "مركز تشغيل الأخبار" : "News Operations Center"}
        description={language === "ar"
          ? "تحكم مباشر في المصادر، الترددات، درجات الثقة، وإعادة المعالجة دون مغادرة التطبيق."
          : "Direct control over sources, intervals, trust levels, and reprocessing without leaving the app."}
        right={
          <div style={{ ...panelStyle, padding: "14px 16px", minWidth: 250 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>{language === "ar" ? "السعة المتوقعة" : "Projected capacity"}</div>
            <div style={{ color: "#f8fafc", fontSize: 24, fontWeight: 900 }}>{dashboard?.capacity_projection?.projected_unique_per_day || 0}</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{language === "ar" ? "خبر فريد يوميا" : "unique items/day"}</div>
          </div>
        }
      />

      <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ color: "#e2e8f0", fontSize: 13 }}>
            {language === "ar"
              ? `المصادر ${sources.length} | قيد المراجعة ${feedStatus?.stats?.reviewQueueDepth || 0} | معزول ${feedStatus?.stats?.quarantinedSources || 0}`
              : `Sources ${sources.length} | Review ${feedStatus?.stats?.reviewQueueDepth || 0} | Quarantined ${feedStatus?.stats?.quarantinedSources || 0}`}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {typeof onLogout === "function" ? (
              <button
                type="button"
                onClick={onLogout}
                style={{ border: "1px solid rgba(248,113,113,0.32)", background: "rgba(248,113,113,0.08)", color: "#fecaca", borderRadius: 10, padding: "8px 12px", fontWeight: 800, cursor: "pointer" }}
              >
                {language === "ar" ? "تسجيل خروج الإدارة" : "Admin logout"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={opsBusy}
              onClick={() => refreshOperations()}
              style={{ border: "1px solid rgba(148,163,184,0.36)", background: "rgba(148,163,184,0.08)", color: "#e2e8f0", borderRadius: 10, padding: "8px 12px", fontWeight: 800, cursor: opsBusy ? "wait" : "pointer" }}
            >
              {language === "ar" ? "تحديث اللوحة" : "Refresh panel"}
            </button>
            <button
              type="button"
              disabled={opsBusy}
              onClick={() => reprocessNewsBatch(300)}
              style={{ border: "1px solid rgba(243,211,138,0.36)", background: "rgba(243,211,138,0.08)", color: "#f8e3aa", borderRadius: 10, padding: "8px 12px", fontWeight: 800, cursor: opsBusy ? "wait" : "pointer" }}
            >
              {language === "ar" ? "إعادة معالجة 300" : "Reprocess 300"}
            </button>
            <button
              type="button"
              disabled={opsBusy}
              onClick={() => reprocessNewsBatch(1000)}
              style={{ border: "1px solid rgba(248,113,113,0.36)", background: "rgba(248,113,113,0.08)", color: "#fecaca", borderRadius: 10, padding: "8px 12px", fontWeight: 800, cursor: opsBusy ? "wait" : "pointer" }}
            >
              {language === "ar" ? "إعادة معالجة 1000" : "Reprocess 1000"}
            </button>
          </div>
        </div>
        {opsMessage ? (
          <div style={{ color: "#67e8f9", fontSize: 12, marginTop: 10 }}>{opsMessage}</div>
        ) : null}
        {persistence ? (
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>
            {language === "ar"
              ? `التخزين المطلوب ${persistence.requested_mode || "-"} | الفعلي ${persistence.mode || "-"} ${persistence.fallback_reason ? `| fallback ${persistence.fallback_reason}` : ""}`
              : `Requested ${persistence.requested_mode || "-"} | Active ${persistence.mode || "-"}${persistence.fallback_reason ? ` | fallback ${persistence.fallback_reason}` : ""}`}
          </div>
        ) : null}
      </section>

      <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900, marginBottom: 12 }}>
          {language === "ar" ? "حالة الأنظمة" : "System status"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {systemStatus.map((item) => (
            <div key={item.key} style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{language === "ar" ? item.labelAr : item.labelEn}</div>
              <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{item.state}</div>
              <div style={{ color: "#cbd5e1", fontSize: 11 }}>{language === "ar" ? `Queue: ${item.queue}` : `Queue: ${item.queue}`}</div>
            </div>
          ))}
        </div>
      </section>

      {newsroom ? (
        <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900, marginBottom: 12 }}>
            {language === "ar" ? "ذكاء غرفة الأخبار" : "Newsroom intelligence"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "قبول الجودة" : "Quality accepted"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{newsroom?.qualityGate?.accepted || 0}</div>
            </div>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "مرفوض جودة" : "Quality rejected"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{newsroom?.qualityGate?.rejected || 0}</div>
            </div>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "تكرار مكتشف" : "Duplicates detected"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{newsroom?.dedupe?.duplicateCount || 0}</div>
            </div>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "نسبة تقليل التكرار" : "Dedup reduction"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{Math.round(Number(newsroom?.dedupe?.reductionRate || 0) * 100)}%</div>
            </div>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "CTR (Proxy)" : "CTR proxy"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{Math.round(Number(newsroom?.analytics?.ctrProxy || 0) * 100)}%</div>
            </div>
            <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 12, padding: 10, background: "rgba(2,6,23,0.36)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{language === "ar" ? "متوسط التفاعل" : "Avg dwell"}</div>
              <div style={{ color: "#f8fafc", fontSize: 17, fontWeight: 800 }}>{newsroom?.analytics?.avgDwellMs || 0}ms</div>
            </div>
          </div>

          <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            {language === "ar" ? "سجل قرارات المحرك" : "Orchestration decisions log"}
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
            {(Array.isArray(newsroom?.decisionLog) ? newsroom.decisionLog.slice(0, 8) : []).map((entry) => (
              <div key={`${entry.id}-${entry.rank}`} style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 10, padding: 10, background: "rgba(2,6,23,0.32)" }}>
                <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  #{entry.rank} • {entry.title}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>
                  {language === "ar" ? `الدرجة ${Math.round(entry.score || 0)}` : `Score ${Math.round(entry.score || 0)}`}
                  {Array.isArray(entry.reasons) && entry.reasons.length ? ` • ${entry.reasons.join(" • ")}` : ""}
                  {entry.verificationState ? ` • ${entry.verificationState}` : ""}
                  {entry.action ? ` → ${entry.action}` : ""}
                </div>
              </div>
            ))}
          </div>

          {newsroom?.learningReport ? (
            <>
              <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                {language === "ar" ? "تقرير التعلم التلقائي" : "Auto-learning report"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
                {newsroom.learningReport.topTopics?.length ? (
                  <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 10, padding: 10, background: "rgba(2,6,23,0.32)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{language === "ar" ? "أعلى الموضوعات" : "Top topics"}</div>
                    {newsroom.learningReport.topTopics.map((t) => (
                      <div key={t.topic} style={{ color: "#e2e8f0", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>{t.topic}</span><span style={{ color: "#94a3b8" }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {newsroom.learningReport.topSources?.length ? (
                  <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 10, padding: 10, background: "rgba(2,6,23,0.32)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{language === "ar" ? "أعلى المصادر" : "Top sources"}</div>
                    {newsroom.learningReport.topSources.map((s) => (
                      <div key={s.source} style={{ color: "#e2e8f0", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>{s.source}</span><span style={{ color: "#94a3b8" }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div style={{ border: "1px solid rgba(71,85,105,0.46)", borderRadius: 10, padding: 10, background: "rgba(2,6,23,0.32)" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{language === "ar" ? "إشارات السلوك" : "Behavior signals"}</div>
                  <div style={{ color: newsroom.learningReport.highBounce ? "#f87171" : "#4ade80", fontSize: 12 }}>
                    {language === "ar" ? "ارتداد" : "Bounce"}: {newsroom.learningReport.highBounce ? (language === "ar" ? "مرتفع ⚠" : "High ⚠") : (language === "ar" ? "طبيعي ✓" : "Normal ✓")}
                  </div>
                  <div style={{ color: newsroom.learningReport.lowDwell ? "#f87171" : "#4ade80", fontSize: 12, marginTop: 4 }}>
                    {language === "ar" ? "تعمق" : "Dwell"}: {newsroom.learningReport.lowDwell ? (language === "ar" ? "منخفض ⚠" : "Low ⚠") : (language === "ar" ? "كافٍ ✓" : "OK ✓")}
                  </div>
                  {newsroom.learningReport.userPrefersConfirmed ? (
                    <div style={{ color: "#a3e635", fontSize: 12, marginTop: 4 }}>
                      {language === "ar" ? "يفضل: الأخبار المؤكدة" : "Pref: confirmed news"}
                    </div>
                  ) : null}
                </div>
              </div>
              {Array.isArray(newsroom.learningReport.recommendations) && newsroom.learningReport.recommendations.length ? (
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{language === "ar" ? "توصيات النظام" : "System recommendations"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {newsroom.learningReport.recommendations.map((rec) => (
                      <div key={rec.signal} style={{
                        border: "1px solid rgba(163,230,53,0.28)", borderRadius: 8, padding: "5px 10px",
                        background: "rgba(163,230,53,0.07)", fontSize: 11,
                      }}>
                        <span style={{ color: "#a3e635", fontWeight: 800 }}>{rec.signal}</span>
                        <span style={{ color: "#94a3b8", marginRight: 6 }}> — {rec.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {sourceGroups.map(([category, entries]) => (
          <section key={category} style={{ ...panelStyle, padding: "16px 18px" }}>
            <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900, marginBottom: 12 }}>
              {language === "ar" ? `فئة ${category}` : `Category ${category}`}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
              {entries.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  language={language}
                  opsBusy={opsBusy}
                  onApply={updateNewsSource}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
