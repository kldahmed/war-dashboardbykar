import React, { useMemo } from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";
import {
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
  const executiveSummary = useMemo(() => {
    const primaryRegion = hotspotRegions[0]?.region;
    const secondaryRegion = hotspotRegions[1]?.region;

    if (language === "ar") {
      if (primaryRegion && secondaryRegion) {
        return `تُظهر المتابعة الحالية تطورات متزامنة في ${primaryRegion} و${secondaryRegion} مع استمرار الضغوط على الأمن والطاقة والأسواق.`;
      }
      if (primaryRegion) {
        return `تُظهر المتابعة الحالية نشاطاً متزايداً في ${primaryRegion} مع استمرار الضغوط على الأمن والطاقة والأسواق.`;
      }
      return "تعكس المتابعة الحالية ضغوطاً متزامنة على الأمن الإقليمي والطاقة والأسواق مع استمرار الحاجة إلى المراقبة الدقيقة.";
    }

    if (primaryRegion && secondaryRegion) {
      return `Current monitoring shows concurrent developments in ${primaryRegion} and ${secondaryRegion}, with continued pressure on security, energy, and markets.`;
    }
    if (primaryRegion) {
      return `Current monitoring shows elevated activity in ${primaryRegion}, with continued pressure on security, energy, and markets.`;
    }
    return "Current monitoring shows concurrent pressure across security, energy, and markets, requiring continued close observation.";
  }, [hotspotRegions, language]);

  const whyItMatters = useMemo(() => {
    if (language === "ar") {
      return [
        "التطورات الجارية قد تؤثر في مستوى الأمن والاستقرار الإقليمي خلال الساعات المقبلة.",
        "استمرار الضغوط في ملفات الطاقة والممرات الحيوية قد ينعكس على الإمدادات والأسعار.",
        "تحركات الحكومات والأسواق ستحدد اتجاه المخاطر قصيرة المدى وما يجب متابعته تالياً.",
      ];
    }

    return [
      "Ongoing developments may affect regional security and stability over the coming hours.",
      "Continued pressure on energy and critical transit routes may affect supply and pricing.",
      "Government and market reactions will shape near-term risk and what should be watched next.",
    ];
  }, [language]);

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

  return (
    <div style={pageShell}>
      <section style={{ ...panelStyle, padding: "24px 24px 22px", marginBottom: 24 }}>
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ margin: 0, color: "#f8fafc", fontSize: 34, fontWeight: 900, lineHeight: 1.15 }}>
              {language === "ar" ? "الملخص التنفيذي" : "Executive Brief"}
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: 15, lineHeight: 1.8, maxWidth: 920 }}>
              {executiveSummary}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.9fr)", gap: 18 }} className="overview-exec-grid">
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 800 }}>
                {language === "ar" ? "أهم 3 تطورات" : "Top 3 Developments"}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {topDevelopments.length === 0 ? (
                  <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.02)", color: "#94a3b8", fontSize: 13 }}>
                    {language === "ar" ? "لا توجد تطورات رئيسية متاحة حالياً." : "No major developments are available right now."}
                  </div>
                ) : topDevelopments.map((item, index) => (
                  <button
                    key={item.id || `overview-top-${index}`}
                    type="button"
                    onClick={() => navigate("/news")}
                    className="nr-card-hover"
                    style={{ ...panelStyle, padding: "14px 16px", textAlign: "inherit", color: "inherit", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ color: "#f8fafc", fontSize: 15, fontWeight: 800, lineHeight: 1.5 }}>
                        {index + 1}. {item.title}
                      </div>
                      <div style={{ color: item.urgency === "high" ? "#f87171" : "#67e8f9", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                        {inferRegion(item)}
                      </div>
                    </div>
                    <div style={{ color: "#b8c5d4", fontSize: 12, lineHeight: 1.8, marginBottom: 8 }}>
                      {item.summary || (language === "ar" ? "لا تتوفر خلاصة إضافية لهذا التطور حالياً." : "No additional summary is currently available for this development.")}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "#8fa0b5" }}>
                      <span>{item.source || (language === "ar" ? "مصدر مفتوح" : "Open source")}</span>
                      <span>{item.category || (language === "ar" ? "عام" : "General")}</span>
                      <span>{item.time || lastUpdated || "—"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ ...panelStyle, padding: "16px 16px 14px", background: "linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))" }}>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                  {language === "ar" ? "لماذا يهم" : "Why It Matters"}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {whyItMatters.map((item, index) => (
                    <div key={`why-${index}`} style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.8, paddingBottom: index === whyItMatters.length - 1 ? 0 : 10, borderBottom: index === whyItMatters.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...panelStyle, padding: "16px 16px 14px" }}>
                <div style={{ color: "#8fa0b5", fontSize: 11, marginBottom: 6 }}>
                  {language === "ar" ? "آخر تحديث" : "Last Update"}
                </div>
                <div style={{ color: "#f3d38a", fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                  {lastUpdated || "—"}
                </div>
                <div style={{ color: loading ? "#f59e0b" : "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>
                  {loading
                    ? (language === "ar" ? "يتم تحديث الملخص حالياً." : "The brief is being updated.")
                    : (tickerHeadlines[0] || (language === "ar" ? "لا توجد إشارة جديدة أعلى أولوية في هذه اللحظة." : "No higher-priority update is available at this moment."))}
                </div>
              </div>
            </div>
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
