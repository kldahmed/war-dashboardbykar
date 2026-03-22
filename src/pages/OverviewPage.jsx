import React, { useMemo } from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";
import {
  FeaturedShortcutCard,
  OverviewMetric,
  PageTakeaways,
  pageShell,
  panelStyle,
  ShortcutCard,
} from "./shared/pagePrimitives";

export default function OverviewPage({
  language,
  mode,
  navigate,
  tickerHeadlines,
  lastUpdated,
  intelMetrics,
  refreshKey,
  displayedNews,
  loading,
}) {
  const inferRegion = (item) => {
    const haystack = `${item?.title || ""} ${item?.summary || ""}`.toLowerCase();
    if (/middle east|gaza|israel|iran|saudi|uae|الشرق الأوسط|غزة|إيران|الإمارات/.test(haystack)) return language === "ar" ? "الشرق الأوسط" : "Middle East";
    if (/ukraine|russia|europe|أوكرانيا|روسيا|أوروبا/.test(haystack)) return language === "ar" ? "أوروبا" : "Europe";
    if (/china|taiwan|asia|الصين|تايوان|آسيا/.test(haystack)) return language === "ar" ? "آسيا" : "Asia-Pacific";
    if (/united states|america|north america|أمريكا/.test(haystack)) return language === "ar" ? "أمريكا الشمالية" : "North America";
    return language === "ar" ? "عالمي" : "Global";
  };

  const cards = SECTION_ROUTES.filter((route) => route.path !== "/" && (mode === "advanced" ? true : route.tier === "public" || route.id === "console"));
  const featuredCards = cards.slice(0, 4);
  const criticalAlerts = useMemo(
    () => (displayedNews || []).filter((item) => item?.urgency === "high").slice(0, 3),
    [displayedNews]
  );
  const topSignals = useMemo(
    () => (displayedNews || []).slice(0, 5),
    [displayedNews]
  );
  const topDevelopments = useMemo(
    () => (displayedNews || []).slice(0, 3),
    [displayedNews]
  );
  const moduleShortcuts = cards.slice(0, 6);
  const hotspotRegions = useMemo(() => {
    const regionCount = new Map();
    (displayedNews || []).slice(0, 24).forEach((item) => {
      const region = inferRegion(item);
      regionCount.set(region, (regionCount.get(region) || 0) + 1);
    });
    return [...regionCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([region, count]) => ({ region, count }));
  }, [displayedNews, language]);
  const takeaways = useMemo(() => {
    const first = topDevelopments[0]?.title;
    const second = topDevelopments[1]?.title;
    const third = topDevelopments[2]?.title;
    if (language === "ar") {
      return [
        first ? `أبرز تطور الآن: ${first}` : "لا توجد تطورات عاجلة كبيرة حالياً.",
        second ? `تطور ثانٍ مؤثر: ${second}` : "المشهد العام مستقر نسبياً خلال آخر دورة تحديث.",
        third ? `تطور ثالث يتطلب المتابعة: ${third}` : "الأثر المتوقع على المدى القصير محدود في الوقت الحالي.",
      ];
    }
    return [
      first ? `Top development right now: ${first}` : "No major urgent development at the moment.",
      second ? `Second key development: ${second}` : "The overall environment is relatively stable in the latest cycle.",
      third ? `Third development to watch: ${third}` : "Near-term impact is currently limited.",
    ];
  }, [language, topDevelopments]);

  return (
    <div style={pageShell}>
      <section style={{ ...panelStyle, padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ color: "#f8fafc", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          {language === "ar" ? "نظرة تنفيذية سريعة" : "Executive Snapshot"}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>
          {language === "ar"
            ? "هذه الصفحة تعرض ما يحدث الآن، أين يحدث، ولماذا يهم بشكل مبسط قبل أي تفاصيل تقنية."
            : "This homepage shows what is happening, where, and why it matters before technical detail."}
        </div>
      </section>

      <PageTakeaways language={language} items={takeaways} />

      <section className="overview-top-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.95fr)", gap: 18, marginBottom: 28 }}>
        <div style={{ ...panelStyle, padding: "22px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#f3d38a", textTransform: "uppercase", marginBottom: 10 }}>
            {language === "ar" ? "ما يحدث الآن" : "HAPPENING NOW"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#f8fafc", lineHeight: 1.15, marginBottom: 10 }}>
            {language === "ar" ? "ملخص يومي واضح وسريع" : "Clear Daily Global Brief"}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, marginBottom: 16 }}>
            {language === "ar"
              ? "الترتيب هنا يبدأ بالمهم: أبرز التطورات، مستوى التوتر العالمي، وأهم الصفحات للمتابعة."
              : "This layout starts with what matters most: top developments, global tension level, and priority shortcuts."}
          </div>

          <div style={{ ...panelStyle, padding: "14px 16px", marginBottom: 16, background: "linear-gradient(160deg, rgba(56,189,248,0.05) 0%, rgba(255,255,255,0.02) 100%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{language === "ar" ? "آخر تحديث تشغيلي" : "Latest operational update"}</div>
              <div style={{ fontSize: 11, color: loading ? "#f59e0b" : "#22c55e", fontWeight: 800 }}>{loading ? (language === "ar" ? "جارٍ التحديث" : "Refreshing") : (language === "ar" ? "مستقر" : "Stable")}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f3d38a", marginBottom: 6 }}>{lastUpdated || "—"}</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7 }}>
              {tickerHeadlines[0] || (language === "ar" ? "في انتظار التحديثات التنفيذية" : "Awaiting executive updates")}
            </div>
          </div>

          <div className="overview-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 14 }}>
            <OverviewMetric
              label={language === "ar" ? "عدد التحديثات" : "Update Volume"}
              value={intelMetrics?.totalItems || 0}
              hint={language === "ar" ? "إجمالي العناصر المتاحة الآن" : "Total items currently available"}
              color="#38bdf8"
            />
            <OverviewMetric
              label={language === "ar" ? "التطورات المهمة" : "Important Developments"}
              value={intelMetrics?.activeSignals || 0}
              hint={language === "ar" ? "عدد الملفات ذات الأولوية" : "How many stories are high priority"}
              color="#22c55e"
            />
            <OverviewMetric
              label={language === "ar" ? "الجهات الرئيسية" : "Key Actors"}
              value={intelMetrics?.entityCount || 0}
              hint={language === "ar" ? "الأسماء الأكثر ظهوراً" : "Most frequently referenced actors"}
              color="#a78bfa"
            />
            <OverviewMetric
              label={language === "ar" ? "نبض النظام" : "System Pulse"}
              value={refreshKey}
              hint={language === "ar" ? "دورة تحديث البيانات" : "Current data refresh cycle"}
              color="#f3d38a"
            />
          </div>
        </div>

        <div style={{ ...panelStyle, padding: "20px 20px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>
            {language === "ar" ? "الانتقال السريع" : "Quick Access"}
          </div>
          <div className="overview-featured-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {featuredCards.map((route) => (
              <FeaturedShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 18, marginBottom: 28 }} className="overview-exec-grid">
        <div style={{ ...panelStyle, padding: "18px 18px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>
            {language === "ar" ? "أهم 3 تطورات" : "Top 3 Developments"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {criticalAlerts.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>{language === "ar" ? "لا توجد تنبيهات حرجة حالياً" : "No critical alerts right now"}</div>
            ) : criticalAlerts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate("/news")}
                className="nr-card-hover"
                style={{ ...panelStyle, padding: "14px 14px 12px", cursor: "pointer", textAlign: "inherit", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc" }}>{item.title}</div>
                  <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 900 }}>{item.urgency}</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{item.summary}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...panelStyle, padding: "18px 18px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>
            {language === "ar" ? "لماذا يهم اليوم" : "Why It Matters Today"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {topSignals.map((item, index) => (
              <div key={item.id || `headline-${index}`} style={{ borderBottom: index === topSignals.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)", paddingBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{item.title}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#64748b" }}>
                  <span>{item.source}</span>
                  <span>{item.category}</span>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "16px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>
          {language === "ar" ? "خريطة النقاط الساخنة المبسطة" : "Simplified Hotspot Map"}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
          {language === "ar" ? "قراءة سريعة للمناطق الأكثر نشاطاً حالياً" : "Quick view of the most active regions right now"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {hotspotRegions.map((region) => (
            <div key={region.region} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>{region.region}</div>
              <div style={{ color: "#38bdf8", fontSize: 12 }}>{region.count} {language === "ar" ? "تطورات" : "developments"}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>
          {language === "ar" ? "الصفحات الرئيسية" : "Main Sections"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {moduleShortcuts.map((route) => (
            <ShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
          ))}
        </div>
      </section>
    </div>
  );
}
