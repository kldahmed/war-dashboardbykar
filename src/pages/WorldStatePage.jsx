import React, { lazy } from "react";
import { LazySection, PageHero, PageTakeaways, pageShell, panelStyle } from "./shared/pagePrimitives";
import { safeArray } from "../lib/worldState/aggregation";
import { useWorldStateData } from "../lib/worldState/useWorldStateData";
import { localizeCategoryLabel, localizeSourceLabel, localizeSummaryText } from "../lib/i18n/summaryLocalizer";

const GlobalPressureMap = lazy(() => import("../components/GlobalPressureMap"));
const GlobalLiveMap = lazy(() => import("../components/GlobalLiveMap"));

function MetricCard({ label, value, accent = "#38bdf8" }) {
  return (
    <div style={{ ...panelStyle, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: accent }}>{value}</div>
    </div>
  );
}

function ListPanel({ title, subtitle, items, renderItem, emptyText }) {
  return (
    <section style={{ ...panelStyle, padding: "18px 18px 14px" }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, color: "#f3d38a", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14 }}>{subtitle}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {safeArray(items).length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>{emptyText}</div>
        ) : safeArray(items).map(renderItem)}
      </div>
    </section>
  );
}

export default function WorldStatePage({ language, mode = "simplified", featuredAlert = null }) {
  const isAdvanced = mode === "advanced";
  const {
    signals,
    countries,
    links,
    events,
    aircraft,
    summary,
    loading,
    error,
    retry,
    sourceHealth,
    operationalStatus,
  } = useWorldStateData(language);

  const title = language === "ar" ? "حالة العالم الآن" : "World State Now";
  const description = language === "ar"
    ? "ملخص عالمي مبسط يوضح مستوى التوتر، المناطق الأبرز، وأهم التطورات القريبة."
    : "A clear global summary of tension level, most affected regions, and near-term impact.";

  const takeaways = [
    language === "ar"
      ? `مستوى التوتر العالمي: ${safeArray(signals).length > 18 ? "مرتفع" : safeArray(signals).length > 8 ? "متوسط" : "منخفض"}`
      : `Global tension level: ${safeArray(signals).length > 18 ? "High" : safeArray(signals).length > 8 ? "Medium" : "Low"}`,
    language === "ar"
      ? `أكثر منطقة تأثراً: ${summary.topRegions?.[0]?.region || "غير متاح"}`
      : `Most affected region: ${summary.topRegions?.[0]?.region || "Unavailable"}`,
    language === "ar"
      ? `أثر قريب المدى: ${safeArray(events).length > 10 ? "مؤثر ويتطلب متابعة" : "متوسط مع مراقبة مستمرة"}`
      : `Near-term impact: ${safeArray(events).length > 10 ? "Material and requires monitoring" : "Moderate with ongoing monitoring"}`,
  ];

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "حالة العالم" : "WORLD STATE"}
        title={title}
        description={description}
        right={
          <div style={{ ...panelStyle, padding: "14px 16px", minWidth: 250 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#38bdf8", marginBottom: 6 }}>
              {language === "ar" ? "حالة التشغيل" : "Operational Status"}
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
              <div>{language === "ar" ? "المصادر السليمة" : "Healthy sources"}: <strong style={{ color: "#22c55e" }}>{operationalStatus.healthySources}/{operationalStatus.totalSources}</strong></div>
              <div>{language === "ar" ? "الإشارات المدمجة" : "Merged signals"}: <strong style={{ color: "#f3d38a" }}>{safeArray(signals).length}</strong></div>
              <div>{language === "ar" ? "آخر مزامنة" : "Last sync"}: <strong style={{ color: "#94a3b8" }}>{operationalStatus.lastUpdated || "—"}</strong></div>
            </div>
          </div>
        }
      />

      <PageTakeaways language={language} items={takeaways} />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <MetricCard label={language === "ar" ? "التطورات المهمة" : "Important developments"} value={safeArray(signals).length} accent="#38bdf8" />
        <MetricCard label={language === "ar" ? "الدول" : "Countries"} value={safeArray(countries).length} accent="#22c55e" />
        <MetricCard label={language === "ar" ? "علاقات الأحداث" : "Event relationships"} value={safeArray(links).length} accent="#a78bfa" />
        <MetricCard label={language === "ar" ? "الأحداث" : "Events"} value={safeArray(events).length} accent="#f59e0b" />
        <MetricCard label={language === "ar" ? "المسارات الجوية" : "Aircraft"} value={safeArray(aircraft).length} accent="#f87171" />
      </section>

      <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#f3d38a", letterSpacing: 2 }}>{language === "ar" ? "ملخص الضغط العالمي" : "Global Pressure Summary"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{language === "ar" ? "التركيز الأعلى، الفئات المهيمنة، والمحرّكات الأكثر اتصالاً" : "Top regions, dominant categories, and most connected drivers"}</div>
          </div>
          <button
            type="button"
            onClick={retry}
            style={{ border: "1px solid rgba(56,189,248,0.28)", background: "rgba(56,189,248,0.12)", color: "#7dd3fc", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
          >
            {language === "ar" ? "إعادة المزامنة" : "Retry"}
          </button>
        </div>

        {loading ? <div style={{ color: "#94a3b8", fontSize: 13 }}>{language === "ar" ? "جارٍ دمج المصادر العالمية..." : "Merging global sources..."}</div> : null}
        {!loading && error ? <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div> : null}

        {!loading && !error ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{language === "ar" ? "المناطق الأكثر تأثراً" : "Top regions affected"}</div>
              {safeArray(summary.topRegions).map((item) => <div key={item.region} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>{language === "ar" ? localizeSummaryText(item.region || "", "ar", { kind: "label" }) || "عالمي" : item.region} <strong style={{ color: "#38bdf8" }}>{item.count}</strong></div>)}
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{language === "ar" ? "الفئات المهيمنة" : "Top categories"}</div>
              {safeArray(summary.topCategories).map((item) => <div key={item.category} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>{language === "ar" ? localizeCategoryLabel(item.category, "ar") : item.category} <strong style={{ color: "#22c55e" }}>{item.count}</strong></div>)}
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{language === "ar" ? "محركات المخاطر" : "Top risk drivers"}</div>
              {safeArray(summary.dominantDrivers).map((item) => <div key={item.entity} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>{item.entity} <strong style={{ color: "#f59e0b" }}>{item.count}</strong></div>)}
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{language === "ar" ? "الكيانات الأكثر اتصالاً" : "Connected entities"}</div>
              {safeArray(summary.connectedEntities).map((item) => <div key={item.entity} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>{item.entity} <strong style={{ color: "#a78bfa" }}>{item.count}</strong></div>)}
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ ...panelStyle, padding: "16px 16px 10px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#f3d38a", letterSpacing: 2, marginBottom: 4 }}>
              {language === "ar" ? "الخريطة العالمية" : "Global map layer"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {isAdvanced
                ? (language === "ar" ? "خريطة تفاعلية متعددة الطبقات مع فلاتر وروابط وإشارات مباشرة." : "Interactive multilayer map with filters, relationship lines, and live signals.")
                : (language === "ar" ? "قراءة بصرية سريعة للمناطق الأكثر ضغطاً قبل الدخول للتفاصيل." : "Fast visual read of the highest-pressure regions before deeper detail.")}
            </div>
          </div>
          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "#94a3b8" }}>
            <span>{language === "ar" ? "المصادر السليمة" : "Healthy sources"}: <strong style={{ color: "#f8fafc" }}>{operationalStatus.healthySources}/{operationalStatus.totalSources}</strong></span>
            <span>{language === "ar" ? "إشارات حية" : "Live signals"}: <strong style={{ color: "#38bdf8" }}>{safeArray(signals).length}</strong></span>
          </div>
        </div>

        {featuredAlert?.id ? (
          <div style={{
            marginBottom: 12,
            border: "1px solid rgba(248,113,113,0.35)",
            background: "linear-gradient(135deg, rgba(127,29,29,0.26), rgba(30,41,59,0.26))",
            borderRadius: 12,
            padding: "8px 10px",
            color: "#fecaca",
            fontSize: 12,
            display: "grid",
            gap: 4,
          }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
              {language === "ar" ? "تنبيه فوري على الخريطة" : "Map live priority alert"}
            </div>
            <div style={{ color: "#ffe4e6" }}>{featuredAlert.title}</div>
          </div>
        ) : null}

        <LazySection minHeight={isAdvanced ? 520 : 300}>
          {isAdvanced ? <GlobalLiveMap featuredAlert={featuredAlert} /> : <GlobalPressureMap featuredAlert={featuredAlert} />}
        </LazySection>

        {!isAdvanced ? (
          <div style={{ padding: "8px 8px 6px", color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>
            {language === "ar"
              ? "للوصول إلى طبقات الفلترة، العلاقات بين الإشارات، ووضع الكرة الأرضية، انتقل إلى العرض المتقدم."
              : "Switch to Advanced View for layered filtering, signal relationships, and globe mode."}
          </div>
        ) : null}
      </section>

      {mode !== "advanced" ? null : (
        <section style={{ ...panelStyle, padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ color: "#f3d38a", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
            {language === "ar" ? "الطبقة المتقدمة" : "Advanced intelligence layer"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            {language === "ar"
              ? "هذا القسم يعرض العلاقات العميقة ومقاييس المصدر والقراءات التفصيلية للمحللين."
              : "This section exposes deep relationships, source depth, and analyst-grade detail."}
          </div>
        </section>
      )}

      <section style={{ ...panelStyle, padding: "14px 16px", marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#f3d38a", marginBottom: 10 }}>{language === "ar" ? "صحة المصادر" : "Source Health"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {safeArray(sourceHealth).map((source) => (
            <div key={source.endpoint} style={{ border: `1px solid ${source.ok ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.24)"}`, borderRadius: 12, padding: 12, background: source.ok ? "rgba(34,197,94,0.06)" : "rgba(127,29,29,0.14)" }}>
              <div style={{ color: source.ok ? "#22c55e" : "#f87171", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>{language === "ar" ? localizeSourceLabel(source.endpoint, "ar") : source.endpoint}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                {language === "ar"
                  ? `مؤشرات مهمة: ${source.signals} · أحداث: ${source.events} · مسارات جوية: ${source.aircraft}`
                  : `signals: ${source.signals} · events: ${source.events} · aircraft: ${source.aircraft}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 18, marginBottom: 22 }} className="world-state-core-grid">
        <ListPanel
          title={language === "ar" ? "أهم التطورات" : "Top developments"}
          subtitle={language === "ar" ? "مرتبة حسب الأهمية والحداثة" : "Ranked by importance and recency"}
          items={safeArray(signals).slice(0, isAdvanced ? 12 : 6)}
          emptyText={language === "ar" ? "لا توجد إشارات حالياً" : "No signals available"}
          renderItem={(item) => (
            <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 14 }}>{item.title}</div>
                <div style={{ color: "#38bdf8", fontWeight: 900, fontSize: 12 }}>{item.importanceScore}</div>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>{item.summary || (language === "ar" ? "لا توجد خلاصة إضافية" : "No additional summary")}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#64748b" }}>
                <span>{language === "ar" ? localizeSourceLabel(item.source, "ar") : item.source}</span>
                <span>{item.region}</span>
                <span>{language === "ar" ? localizeCategoryLabel(item.category, "ar") : item.category}</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          )}
        />

        <div style={{ display: "grid", gap: 18 }}>
          <ListPanel
            title={language === "ar" ? "الدول النشطة" : "Active countries"}
            subtitle={language === "ar" ? "توزيع الضغط حسب الدول" : "Pressure distribution by country"}
            items={safeArray(countries).slice(0, isAdvanced ? 8 : 5)}
            emptyText={language === "ar" ? "لا توجد دول مصنفة" : "No countries classified"}
            renderItem={(item) => (
              <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                  <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13 }}>{item.name}</div>
                  <div style={{ color: item.pressureLevel === "high" ? "#f87171" : item.pressureLevel === "medium" ? "#f59e0b" : "#22c55e", fontSize: 11, fontWeight: 800 }}>{language === "ar" ? (item.pressureLevel === "high" ? "مرتفع" : item.pressureLevel === "medium" ? "متوسط" : "منخفض") : item.pressureLevel}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{language === "ar" ? `${item.signalCount} مؤشرات مهمة · ${localizeCategoryLabel(item.dominantCategory, "ar")}` : `${item.signalCount} signals · ${item.dominantCategory}`}</div>
              </div>
            )}
          />

          <ListPanel
            title={language === "ar" ? "علاقات الأحداث" : "Event relationships"}
            subtitle={language === "ar" ? "ترابط الدول والكيانات والإشارات" : "Relationships across countries, entities, and signals"}
            items={safeArray(links).slice(0, isAdvanced ? 8 : 4)}
            emptyText={language === "ar" ? "لا توجد روابط كافية" : "No sufficient links yet"}
            renderItem={(item) => (
              <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{language === "ar" ? localizeSourceLabel(item.source, "ar") : item.source} ↔ {language === "ar" ? localizeSourceLabel(item.target, "ar") : item.target}</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{language === "ar" ? `${item.linkedEventCount} مؤشرات مرتبطة · قوة الربط ${Math.round((item.strength || 0) * 100)}%` : `${item.linkedEventCount} correlated signals · strength ${Math.round((item.strength || 0) * 100)}%`}</div>
              </div>
            )}
          />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <ListPanel
          title={language === "ar" ? "الأحداث الملتقطة" : "Captured events"}
          subtitle={language === "ar" ? "من مسار الأحداث العالمية مع مسار احتياطي آمن" : "From /api/global-events with graceful fallback"}
          items={safeArray(events).slice(0, isAdvanced ? 8 : 4)}
          emptyText={language === "ar" ? "لا توجد أحداث متاحة" : "No events available"}
          renderItem={(item, index) => (
            <div key={item.id || `event-${index}`} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{language === "ar" ? localizeSummaryText(item.title || item.label || "", "ar", { kind: "title", category: item.category, source: item.source }) || "حدث غير مسمى" : item.title || item.label || "Untitled event"}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>{language === "ar" ? localizeSummaryText(item.summary || item.explanation || item.description || "", "ar", { kind: "summary", category: item.category, source: item.source }) || "—" : item.summary || item.explanation || item.description || "—"}</div>
            </div>
          )}
        />

        <ListPanel
          title={language === "ar" ? "المسارات الجوية" : "Aircraft tracks"}
          subtitle={language === "ar" ? "من مسار الرادار عند توفر البيانات" : "From /api/radar when available"}
          items={safeArray(aircraft).slice(0, isAdvanced ? 8 : 4)}
          emptyText={language === "ar" ? "لا توجد مسارات جوية متاحة" : "No aircraft tracks available"}
          renderItem={(item, index) => (
            <div key={item.id || `aircraft-${index}`} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{item.callsign || (language === "ar" ? `مسار ${index + 1}` : `Track ${index + 1}`)}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{language === "ar" ? `خط العرض ${item.lat} · خط الطول ${item.lng} · الارتفاع ${item.altitude || 0}` : `lat ${item.lat} · lng ${item.lng} · alt ${item.altitude || 0}`}</div>
            </div>
          )}
        />
      </section>
    </div>
  );
}
