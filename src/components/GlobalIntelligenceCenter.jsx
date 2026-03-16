import React, { useEffect, useMemo, useState } from "react";

function normalizeText(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUrgencyColor(level) {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#facc15";
}

function buildRegionScores(news = []) {
  const regions = [
    {
      key: "middle-east",
      label: "الشرق الأوسط",
      test: /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|دبي|قطر|هرمز|تل أبيب|طهران/i
    },
    {
      key: "europe",
      label: "أوروبا",
      test: /أوكرانيا|روسيا|ألمانيا|فرنسا|بريطانيا|الاتحاد الأوروبي|بولندا|كييف|موسكو/i
    },
    {
      key: "asia-pacific",
      label: "آسيا والمحيط الهادئ",
      test: /الصين|تايوان|اليابان|كوريا|بحر الصين|بكين|تايبيه/i
    },
    {
      key: "red-sea",
      label: "البحر الأحمر",
      test: /البحر الأحمر|باب المندب|الحديدة|سفن|ملاحة|ناقلات/i
    },
    {
      key: "north-america",
      label: "أمريكا الشمالية",
      test: /الولايات المتحدة|أمريكا|واشنطن|البنتاغون|ترامب|البيت الأبيض/i
    }
  ];

  return regions.map((region) => {
    let score = 0;

    news.forEach((item) => {
      const hay = `${normalizeText(item.title)} ${normalizeText(item.summary)}`;

      if (region.test.test(hay)) {
        if (item.urgency === "high") score += 28;
        else if (item.urgency === "medium") score += 16;
        else score += 7;
      }
    });

    const finalScore = Math.min(100, score);

    return {
      ...region,
      score: finalScore,
      color:
        finalScore >= 60
          ? "#ef4444"
          : finalScore >= 30
          ? "#f59e0b"
          : "#facc15"
    };
  });
}

function buildConflictMarkers(news = []) {
  const markers = [
    {
      id: "ukraine",
      label: "أوكرانيا",
      x: "61%",
      y: "31%",
      test: /أوكرانيا|روسيا|كييف|موسكو/i
    },
    {
      id: "middle-east",
      label: "الشرق الأوسط",
      x: "76%",
      y: "50%",
      test: /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|تل أبيب|طهران/i
    },
    {
      id: "red-sea",
      label: "البحر الأحمر",
      x: "71%",
      y: "58%",
      test: /البحر الأحمر|باب المندب|الحديدة|ملاحة|سفن|ناقلات/i
    },
    {
      id: "taiwan",
      label: "مضيق تايوان",
      x: "89%",
      y: "44%",
      test: /تايوان|الصين|بكين|تايبيه|بحر الصين/i
    },
    {
      id: "north-america",
      label: "أمريكا",
      x: "23%",
      y: "34%",
      test: /الولايات المتحدة|أمريكا|واشنطن|البيت الأبيض|البنتاغون/i
    }
  ];

  return markers.map((marker) => {
    let level = "low";

    news.forEach((item) => {
      const hay = `${normalizeText(item.title)} ${normalizeText(item.summary)}`;
      if (marker.test.test(hay)) {
        if (item.urgency === "high") level = "high";
        else if (item.urgency === "medium" && level !== "high") level = "medium";
      }
    });

    return {
      ...marker,
      level,
      color:
        level === "high"
          ? "#ef4444"
          : level === "medium"
          ? "#f59e0b"
          : "#facc15"
    };
  });
}

function buildArabicBrief(news = []) {
  const allText = news.map((n) => `${n.title} ${n.summary}`).join(" ");

  const hasMiddleEast = /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج/i.test(allText);
  const hasUkraine = /أوكرانيا|روسيا|كييف|موسكو/i.test(allText);
  const hasTaiwan = /تايوان|الصين|بكين|تايبيه/i.test(allText);
  const hasDiplomacy = /محادثات|وساطة|اتفاق|بيان|تحذير|لقاء|مفاوضات/i.test(allText);

  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;

  let overview = "المشهد العالمي تحت المراقبة مع ضغوط متوسطة وتوزع واضح لمصادر التوتر.";
  if (high >= 8) {
    overview = "المشهد العالمي شديد الحساسية مع تعدد التطورات العاجلة وارتفاع واضح في مخاطر التصعيد الجيوسياسي.";
  } else if (high >= 4 || medium >= 6) {
    overview = "المشهد العالمي متوتر مع تسارع ملحوظ في الأخبار المرتبطة بالنزاعات والضغوط الاستراتيجية.";
  }

  const bullets = [
    hasMiddleEast ? "يبقى الشرق الأوسط المحرك الأبرز للتوتر الحالي في دورة الأخبار." : null,
    hasUkraine ? "ما تزال جبهة أوكرانيا مؤثرة في مستوى المخاطر داخل أوروبا والمشهد الأمني الأوسع." : null,
    hasTaiwan ? "آسيا والمحيط الهادئ تحت المتابعة بسبب حساسية ملف الصين وتايوان." : null,
    hasDiplomacy ? "هناك نشاط دبلوماسي متزامن مع التصعيد، ما يشير إلى محاولات احتواء موازية للمخاطر." : null
  ].filter(Boolean);

  return { overview, bullets };
}

function formatArabicTime(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "وقت غير متوفر";
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(d);
  } catch {
    return "وقت غير متوفر";
  }
}

function MiniStat({ label, value, color = "#f8fafc" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ color, fontSize: "30px", fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

export default function GlobalIntelligenceCenter({ news = [] }) {
  const [radarTick, setRadarTick] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setRadarTick((prev) => (prev + 1) % 4);
      setNow(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const regionScores = useMemo(() => buildRegionScores(news), [news]);
  const markers = useMemo(() => buildConflictMarkers(news), [news]);
  const brief = useMemo(() => buildArabicBrief(news), [news]);

  const latest = useMemo(() => {
    return [...news]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [news]);

  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;
  const low = news.filter((n) => n.urgency === "low").length;

  const pulseScale = radarTick % 2 === 0 ? 1 : 1.15;

  return (
    <>
      <style>{`
        @keyframes intelPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: .72; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes radarSweep {
          0% { transform: rotate(0deg); opacity: .16; }
          100% { transform: rotate(360deg); opacity: .04; }
        }

        @keyframes markerGlow {
          0% { box-shadow: 0 0 0 6px rgba(255,255,255,.04), 0 0 16px currentColor; }
          50% { box-shadow: 0 0 0 12px rgba(255,255,255,.02), 0 0 28px currentColor; }
          100% { box-shadow: 0 0 0 6px rgba(255,255,255,.04), 0 0 16px currentColor; }
        }

        @media (max-width: 1100px) {
          .gic-grid-top,
          .gic-grid-bottom {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gap: "22px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div>
            <div
              style={{
                color: "#f8fafc",
                fontSize: "36px",
                fontWeight: 900
              }}
            >
              مركز الاستخبارات العالمي
            </div>

            <div
              style={{
                color: "#94a3b8",
                marginTop: "8px",
                fontSize: "14px",
                lineHeight: 1.8
              }}
            >
              مراقبة جيوسياسية متقدمة، تحليل التصعيد، وضغط الأقاليم الحيوية بشكل دوري
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <span style={{ color: "#ef4444", fontWeight: 800 }}>● نزاع نشط</span>
            <span style={{ color: "#f59e0b", fontWeight: 800 }}>● تصعيد</span>
            <span style={{ color: "#facc15", fontWeight: 800 }}>● توتر</span>
            <span
              style={{
                color: "#7dd3fc",
                fontWeight: 800,
                background: "rgba(56,189,248,.08)",
                border: "1px solid rgba(56,189,248,.16)",
                borderRadius: "999px",
                padding: "6px 10px"
              }}
            >
              آخر تحديث: {formatArabicTime(now)}
            </span>
          </div>
        </div>

        <div
          className="gic-grid-top"
          style={{
            display: "grid",
            gridTemplateColumns: "1.55fr .95fr",
            gap: "22px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#0f1319)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,.25)"
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid rgba(255,255,255,.06)",
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap"
              }}
            >
              <div style={{ color: "#f8fafc", fontSize: "28px", fontWeight: 900 }}>
                خريطة النزاعات الحية
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                مشهد عالمي متجدد كل بضع ثوانٍ
              </div>
            </div>

            <div
              style={{
                position: "relative",
                minHeight: "560px",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at 30% 28%, rgba(56,189,248,.14), transparent 18%), radial-gradient(circle at 76% 46%, rgba(239,68,68,.12), transparent 18%), radial-gradient(circle at 70% 62%, rgba(245,158,11,.10), transparent 18%), linear-gradient(180deg,#07111c,#05080d)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "24px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,.05)",
                  background:
                    "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
                  backgroundSize: "82px 82px, 82px 82px"
                }}
              />

              <div
                style={{
                  position: "absolute",
                  width: "620px",
                  height: "620px",
                  borderRadius: "50%",
                  border: "1px solid rgba(56,189,248,.12)",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  animation: "radarSweep 8s linear infinite",
                  background:
                    "conic-gradient(from 0deg, rgba(56,189,248,.16), transparent 20%, transparent 100%)"
                }}
              />

              {[
                { label: "أمريكا الشمالية", x: "22%", y: "33%" },
                { label: "أوروبا", x: "49%", y: "30%" },
                { label: "الشرق الأوسط", x: "74%", y: "50%" },
                { label: "البحر الأحمر", x: "69%", y: "60%" },
                { label: "آسيا والمحيط الهادئ", x: "88%", y: "45%" }
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    position: "absolute",
                    left: r.x,
                    top: r.y,
                    transform: "translate(-50%,-50%)",
                    color: "#6b7280",
                    fontWeight: 800,
                    fontSize: "13px",
                    letterSpacing: ".4px"
                  }}
                >
                  {r.label}
                </div>
              ))}

              {markers.map((marker) => (
                <div
                  key={marker.id}
                  style={{
                    position: "absolute",
                    left: marker.x,
                    top: marker.y,
                    transform: `translate(-50%,-50%) scale(${pulseScale})`,
                    transition: "transform .6s ease"
                  }}
                >
                  <div
                    style={{
                      width: marker.level === "high" ? "20px" : "16px",
                      height: marker.level === "high" ? "20px" : "16px",
                      borderRadius: "50%",
                      background: marker.color,
                      color: marker.color,
                      animation: "markerGlow 1.8s infinite"
                    }}
                  />
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#f8fafc",
                      fontWeight: 900,
                      fontSize: "14px",
                      textAlign: "center",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {marker.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "24px",
                padding: "18px",
                boxShadow: "0 18px 40px rgba(0,0,0,.22)"
              }}
            >
              <div style={{ color: "#f8fafc", fontSize: "26px", fontWeight: 900, marginBottom: "14px" }}>
                موجز الوضع
              </div>

              <div style={{ color: "#dbe3ee", lineHeight: 1.9, fontSize: "15px", marginBottom: "16px" }}>
                {brief.overview}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {brief.bullets.map((bullet, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border: "1px solid rgba(255,255,255,.05)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      color: "#cbd5e1",
                      lineHeight: 1.8,
                      fontSize: "14px"
                    }}
                  >
                    • {bullet}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "24px",
                padding: "18px",
                boxShadow: "0 18px 40px rgba(0,0,0,.22)"
              }}
            >
              <div style={{ color: "#f8fafc", fontSize: "26px", fontWeight: 900, marginBottom: "14px" }}>
                ضغط الأقاليم
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                {regionScores.map((region) => (
                  <div key={region.key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "7px",
                        color: "#cbd5e1",
                        fontSize: "14px"
                      }}
                    >
                      <span>{region.label}</span>
                      <span style={{ color: region.color, fontWeight: 900 }}>
                        {region.score}%
                      </span>
                    </div>

                    <div
                      style={{
                        height: "12px",
                        background: "#222831",
                        borderRadius: "999px",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${region.score}%`,
                          height: "100%",
                          background: region.color,
                          borderRadius: "999px",
                          transition: "width .5s ease"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="gic-grid-bottom"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "22px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "26px", fontWeight: 900, marginBottom: "14px" }}>
              مؤشرات الخطر
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <MiniStat label="إجمالي الأخبار" value={news.length} />
              <MiniStat label="العاجل" value={high} color="#ef4444" />
              <MiniStat label="المتوسط" value={medium} color="#f59e0b" />
              <MiniStat label="المنخفض" value={low} color="#22c55e" />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "26px", fontWeight: 900, marginBottom: "14px" }}>
              تغذية التصعيد
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {latest.map((item, i) => (
                <div
                  key={item.id || i}
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.05)",
                    borderRadius: "14px",
                    padding: "12px 14px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "8px",
                      alignItems: "center"
                    }}
                  >
                    <span
                      style={{
                        color: getUrgencyColor(item.urgency),
                        fontWeight: 900,
                        fontSize: "12px"
                      }}
                    >
                      {item.urgency === "high"
                        ? "عاجل"
                        : item.urgency === "medium"
                        ? "متوسط"
                        : "منخفض"}
                    </span>

                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {item.source}
                    </span>
                  </div>

                  <div
                    style={{
                      color: "#f8fafc",
                      lineHeight: 1.7,
                      fontWeight: 800,
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  >
                    {normalizeText(item.title)}
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {formatArabicTime(item.time)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "26px", fontWeight: 900, marginBottom: "14px" }}>
              التقدير الاستراتيجي
            </div>

            <div style={{ color: "#dbe3ee", lineHeight: 1.95, fontSize: "14px" }}>
              هذا المركز يجمع بين المتابعة الجيوسياسية، مؤشرات الخطر، خريطة النزاعات،
              وتغذية التصعيد في واجهة واحدة مترابطة. التحديث الحالي يتم بصريًا كل عدة
              ثوانٍ، بينما تتجدد البيانات الإخبارية دوريًا من المصدر الرئيسي للموقع.
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "16px",
                background: "rgba(56,189,248,.08)",
                border: "1px solid rgba(56,189,248,.16)",
                color: "#7dd3fc",
                fontWeight: 800,
                lineHeight: 1.8,
                fontSize: "13px"
              }}
            >
              الترقية القادمة الموصى بها: ربط هذا القسم ببيانات جغرافية حية حقيقية بدل
              التحليل النصي فقط، مع طبقة أحداث آنية على مستوى العالم.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
