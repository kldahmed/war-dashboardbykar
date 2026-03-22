import React, { useMemo, useState } from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";
import SourceLogoStrip from "../components/SourceLogoStrip";
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
  const [showVideoLayer, setShowVideoLayer] = useState(true);

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

  const leadStory = topDevelopments[0] || null;
  const secondaryStories = topDevelopments.slice(1, 3);
  const executivePulse = useMemo(() => {
    if (criticalAlerts.length >= 3) return language === "ar" ? "تصاعد متعدد البؤر" : "Multi-theater escalation";
    if (criticalAlerts.length >= 1) return language === "ar" ? "ضغط مرتفع تحت المراقبة" : "Elevated pressure under watch";
    return language === "ar" ? "استقرار هش مع مؤشرات كامنة" : "Fragile stability with latent signals";
  }, [criticalAlerts.length, language]);

  const rhythmLabel = loading
    ? (language === "ar" ? "المشهد يعاد تحديثه الآن" : "The picture is refreshing now")
    : (language === "ar" ? "آخر دورة مزامنة مستقرة" : "Latest sync cycle is stable");

  const mapRegions = useMemo(() => {
    const REGION_COORDS = {
      "الشرق الأوسط": { x: 57, y: 34, color: "#f87171" },
      "Middle East": { x: 57, y: 34, color: "#f87171" },
      "أوروبا": { x: 49, y: 22, color: "#38bdf8" },
      "Europe": { x: 49, y: 22, color: "#38bdf8" },
      "آسيا": { x: 72, y: 28, color: "#f59e0b" },
      "Asia-Pacific": { x: 72, y: 28, color: "#f59e0b" },
      "أمريكا الشمالية": { x: 20, y: 24, color: "#22c55e" },
      "North America": { x: 20, y: 24, color: "#22c55e" },
      "عالمي": { x: 50, y: 40, color: "#a78bfa" },
      "Global": { x: 50, y: 40, color: "#a78bfa" },
    };

    return hotspotRegions.map((item, index) => {
      const visual = REGION_COORDS[item.region] || { x: 50, y: 40 + (index * 4), color: "#a78bfa" };
      return {
        ...item,
        ...visual,
        radius: 5 + Math.min(16, item.count * 1.8),
      };
    });
  }, [hotspotRegions]);

  const handleSourceClick = (source) => {
    const normalized = String(source || "").trim();
    if (!normalized) {
      navigate("/news");
      return;
    }
    navigate(`/news?source=${encodeURIComponent(normalized)}`);
  };

  return (
    <div style={pageShell}>
      <section className="overview-visual-stage" style={{ ...panelStyle, padding: 0, marginBottom: 18, overflow: "hidden" }}>
        <div className="overview-visual-stage__poster" style={{ backgroundImage: "url('/media/ops-motion-poster.svg')" }}>
          <div className="overview-visual-stage__overlay" />
          <div className="overview-visual-stage__content">
            <div className="overview-visual-stage__badge">
              {language === "ar" ? "تصميم بصري حي" : "Live visual surface"}
            </div>
            <h2 className="overview-visual-stage__title">
              {language === "ar" ? "واجهة تشغيل أكثر جرأة ووضوحًا" : "A bolder operational interface"}
            </h2>
            <p className="overview-visual-stage__text">
              {language === "ar"
                ? "أضفنا طبقات صور وشعارات وحركة ديناميكية لتجربة أكثر إثارة، مع الحفاظ على التركيز على القرار السريع."
                : "Added layered visuals, branding, and dynamic motion for a more exciting experience while keeping fast decision focus."}
            </p>
          </div>
        </div>

        <div className="overview-visual-stage__grid">
          <div className="overview-visual-stage__card">
            <img src="/media/world-grid.svg" alt={language === "ar" ? "شبكة عالمية" : "Global grid"} loading="lazy" />
          </div>
          <div className="overview-visual-stage__card overview-visual-stage__card--wave">
            <img src="/media/signal-wave.svg" alt={language === "ar" ? "موجة إشارات" : "Signal wave"} loading="lazy" />
          </div>
        </div>
      </section>

      <section className="overview-motion-deck" style={{ ...panelStyle, padding: "14px", marginBottom: 18 }}>
        <div className="overview-motion-deck__grid">
          <div className="overview-motion-deck__media overview-motion-deck__media--primary">
            {showVideoLayer ? (
              <video
                className="overview-motion-deck__video"
                autoPlay
                muted
                loop
                playsInline
                poster="/media/ops-motion-poster.svg"
                onError={() => setShowVideoLayer(false)}
              >
                <source src="/media/command-surface.webm" type="video/webm" />
                <source src="/media/command-surface.mp4" type="video/mp4" />
              </video>
            ) : null}
            <img
              src="/media/ops-motion-poster.svg"
              alt={language === "ar" ? "لوحة تشغيل ديناميكية" : "Dynamic operation poster"}
              loading="lazy"
              className={showVideoLayer ? "overview-motion-deck__fallback-poster" : ""}
            />
            <div className="overview-motion-deck__media-glow" />
          </div>
          <div className="overview-motion-deck__media overview-motion-deck__media--secondary">
            <img src="/media/signal-wave.svg" alt={language === "ar" ? "شريط إشارات" : "Signal strip"} loading="lazy" />
            <div className="overview-motion-deck__caption">
              {language === "ar" ? "طبقة حركة مستمرة" : "Continuous motion layer"}
            </div>
          </div>
          <div className="overview-motion-deck__media overview-motion-deck__media--secondary">
            <img src="/media/world-grid.svg" alt={language === "ar" ? "شبكة عالمية" : "Global mesh"} loading="lazy" />
            <div className="overview-motion-deck__caption">
              {language === "ar" ? "مسارات عالمية متعددة" : "Multi-route world mesh"}
            </div>
          </div>
        </div>
      </section>

      <SourceLogoStrip
        language={language}
        news={displayedNews}
        onSourceClick={handleSourceClick}
      />

      <section className="overview-cinematic-hero" style={{ ...panelStyle, padding: "28px 28px 26px", marginBottom: 18, overflow: "hidden", position: "relative", background: "radial-gradient(circle at top left, rgba(103,232,249,0.14), transparent 30%), radial-gradient(circle at 88% 18%, rgba(244,201,123,0.13), transparent 22%), linear-gradient(135deg, rgba(10,18,30,0.96), rgba(7,13,21,0.9))" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.03) 42%, transparent 58%)", pointerEvents: "none" }} />
        <div className="overview-cinematic-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.9fr)", gap: 18, alignItems: "stretch", position: "relative" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(244,201,123,0.18)", background: "rgba(244,201,123,0.08)", color: "#f4c97b", fontSize: 10, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: loading ? "#f59e0b" : "#22c55e", boxShadow: loading ? "0 0 14px rgba(245,158,11,0.8)" : "0 0 14px rgba(34,197,94,0.8)" }} />
              {language === "ar" ? "غرفة الموجز التنفيذي" : "Executive command brief"}
            </div>
            <div style={{ color: "#f8fbff", fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.05em", marginBottom: 14 }}>
              {language === "ar" ? "افهم العالم خلال دقيقة واحدة" : "Understand the world in one minute"}
            </div>
            <div style={{ color: "#b8c5d4", fontSize: 15, lineHeight: 1.9, maxWidth: 740, marginBottom: 22 }}>
              {language === "ar"
                ? "ابدأ من الصورة الكبرى ثم انزل مباشرة إلى أهم التطورات، المناطق الساخنة، والصفحات التي تستحق وقتك الآن."
                : "Start from the big picture, then move directly into the most important developments, hotspots, and sections worth your time right now."}
            </div>

            <div className="overview-hero-story-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)", gap: 14 }}>
              <div style={{ ...panelStyle, padding: "18px 18px 16px", background: "linear-gradient(155deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015) 58%, rgba(249,115,22,0.05))" }}>
                <div style={{ fontSize: 11, color: "#8fa0b5", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
                  {language === "ar" ? "القصة القائدة" : "Lead story"}
                </div>
                <div style={{ color: "#f8fafc", fontSize: 24, fontWeight: 900, lineHeight: 1.15, marginBottom: 10 }}>
                  {leadStory?.title || (language === "ar" ? "لا توجد قصة قائدة حالياً" : "No lead story right now")}
                </div>
                <div style={{ color: "#b8c5d4", fontSize: 13, lineHeight: 1.8, marginBottom: 12 }}>
                  {leadStory?.summary || (language === "ar" ? "المشهد الحالي هادئ نسبياً مع استمرار المراقبة متعددة المصادر." : "The current picture is relatively calm with continued multi-source monitoring.")}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "#8fa0b5", fontSize: 11 }}>
                  <span>{leadStory?.source || (language === "ar" ? "غرفة الأخبار" : "Newsroom")}</span>
                  <span>{leadStory?.category || (language === "ar" ? "عام" : "General")}</span>
                  <span>{leadStory?.time || lastUpdated || "—"}</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...panelStyle, padding: "16px 16px 14px", background: "linear-gradient(155deg, rgba(103,232,249,0.12), rgba(255,255,255,0.015))" }}>
                  <div style={{ fontSize: 11, color: "#8fa0b5", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                    {language === "ar" ? "نبض المشهد" : "Scene pulse"}
                  </div>
                  <div style={{ fontSize: 24, color: "#f8fafc", fontWeight: 900, marginBottom: 6 }}>{executivePulse}</div>
                  <div style={{ fontSize: 12, color: "#b8c5d4", lineHeight: 1.7 }}>{rhythmLabel}</div>
                </div>

                <div style={{ ...panelStyle, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#8fa0b5", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                    {language === "ar" ? "قصة تالية" : "Next on deck"}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {secondaryStories.length === 0 ? (
                      <div style={{ color: "#b8c5d4", fontSize: 12 }}>{language === "ar" ? "لا توجد قصص إضافية في هذه الدورة" : "No additional stories in this cycle"}</div>
                    ) : secondaryStories.map((item, index) => (
                      <div key={item.id || `secondary-${index}`} style={{ display: "grid", gap: 4, paddingBottom: index === secondaryStories.length - 1 ? 0 : 8, borderBottom: index === secondaryStories.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>{item.title}</div>
                        <div style={{ color: "#8fa0b5", fontSize: 11 }}>{item.source || item.category || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...panelStyle, padding: "18px 18px 16px", display: "grid", alignContent: "space-between", gap: 14, background: "linear-gradient(160deg, rgba(8,15,26,0.86), rgba(15,24,40,0.92))" }}>
            <div>
              <div style={{ fontSize: 11, color: "#8fa0b5", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
                {language === "ar" ? "لوحة الإيقاع التنفيذي" : "Executive rhythm board"}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: language === "ar" ? "آخر تحديث" : "Last update", value: lastUpdated || "—", accent: "#f4c97b" },
                  { label: language === "ar" ? "إجمالي الإشارات" : "Total signals", value: intelMetrics?.totalItems || 0, accent: "#67e8f9" },
                  { label: language === "ar" ? "ملفات عاجلة" : "Urgent files", value: criticalAlerts.length, accent: "#f87171" },
                ].map((item) => (
                  <div key={item.label} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "12px 13px", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ color: "#8fa0b5", fontSize: 11, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ color: item.accent, fontSize: 22, fontWeight: 900 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
              <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                {language === "ar" ? "اتجه مباشرة إلى" : "Go directly to"}
              </div>
              <div className="overview-featured-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {featuredCards.map((route) => (
                  <FeaturedShortcutCard key={route.path} route={route} language={language} navigate={navigate} />
                ))}
              </div>
            </div>
          </div>
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
            {language === "ar" ? "نشرة السرد السريع" : "Fast narrative brief"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {topSignals.slice(0, 4).map((item, index) => (
              <div key={item.id || `signal-${index}`} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 12px 11px", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>{item.title}</div>
                  <div style={{ color: item.urgency === "high" ? "#f87171" : "#67e8f9", fontSize: 11, fontWeight: 900 }}>{item.urgency || (language === "ar" ? "متابعة" : "Watch")}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>{item.summary || (language === "ar" ? "لا توجد خلاصة إضافية" : "No further summary")}</div>
              </div>
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
        <div className="overview-hotspot-map-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(260px, 0.85fr)", gap: 14, alignItems: "start" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, background: "radial-gradient(circle at center, rgba(56,189,248,0.06), rgba(15,23,42,0.55) 40%, rgba(2,6,23,0.92) 100%)", overflow: "hidden" }}>
            <svg viewBox="0 0 100 56" style={{ width: "100%", display: "block", minHeight: 220 }}>
              <rect x="0" y="0" width="100" height="56" fill="transparent" />
              {[14, 28, 42].map((y) => (
                <line key={`lat-${y}`} x1="4" x2="96" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="0.4" strokeDasharray="2 3" />
              ))}
              {[18, 36, 54, 72].map((x) => (
                <line key={`lon-${x}`} x1={x} x2={x} y1="6" y2="50" stroke="rgba(148,163,184,0.08)" strokeWidth="0.4" strokeDasharray="2 3" />
              ))}

              {mapRegions.map((region) => (
                <g key={region.region}>
                  <circle cx={region.x} cy={region.y} r={region.radius * 1.45} fill={region.color} opacity="0.12">
                    <animate attributeName="r" values={`${region.radius * 1.2};${region.radius * 1.55};${region.radius * 1.2}`} dur="3.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={region.x} cy={region.y} r={region.radius} fill={region.color} opacity="0.24" />
                  <circle cx={region.x} cy={region.y} r={Math.max(2.8, region.radius * 0.35)} fill={region.color} />
                  <text x={region.x} y={region.y - region.radius - 2.8} textAnchor="middle" fill="#e2e8f0" fontSize="2.8" fontWeight="700">
                    {region.region}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {hotspotRegions.length === 0 ? (
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.02)", color: "#94a3b8", fontSize: 13 }}>
                {language === "ar" ? "لا توجد بؤر ساخنة واضحة في هذه الدورة" : "No clear hotspots in this cycle"}
              </div>
            ) : hotspotRegions.map((region, index) => (
              <div key={region.region} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800 }}>{index + 1}. {region.region}</div>
                  <div style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800 }}>{region.count} {language === "ar" ? "تطورات" : "signals"}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>
                  {language === "ar" ? "منطقة تستدعي المتابعة في صفحة حالة العالم للتفصيل الجغرافي والتحليلي." : "A region worth opening in World State for deeper geographic and analytical detail."}
                </div>
              </div>
            ))}
          </div>
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
