import React, { useMemo } from "react";

function cleanText(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMatch(item, regex) {
  const hay = `${cleanText(item?.title)} ${cleanText(item?.summary)}`;
  return regex.test(hay);
}

function calcEnergyMetrics(news = []) {
  const oilRegex =
    /نفط|النفط|خام|برميل|أوبك|opec|oil|crude|barrel|energy/i;
  const shippingRegex =
    /مضيق|هرمز|البحر الأحمر|باب المندب|ناقلات|شحن|ملاحة|shipping|tankers|strait|red sea|hormuz|mandeb/i;
  const gasRegex =
    /غاز|الغاز|lng|غاز طبيعي|natural gas/i;
  const sanctionsRegex =
    /عقوبات|sanctions|حظر|embargo/i;

  let oilScore = 0;
  let shippingScore = 0;
  let gasScore = 0;
  let sanctionsScore = 0;

  const energyNews = news.filter(
    (item) =>
      hasMatch(item, oilRegex) ||
      hasMatch(item, shippingRegex) ||
      hasMatch(item, gasRegex) ||
      hasMatch(item, sanctionsRegex)
  );

  energyNews.forEach((item) => {
    const weight =
      item.urgency === "high" ? 28 : item.urgency === "medium" ? 16 : 8;

    if (hasMatch(item, oilRegex)) oilScore += weight;
    if (hasMatch(item, shippingRegex)) shippingScore += weight;
    if (hasMatch(item, gasRegex)) gasScore += weight;
    if (hasMatch(item, sanctionsRegex)) sanctionsScore += weight;
  });

  oilScore = Math.min(100, oilScore);
  shippingScore = Math.min(100, shippingScore);
  gasScore = Math.min(100, gasScore);
  sanctionsScore = Math.min(100, sanctionsScore);

  const globalShock = Math.min(
    100,
    Math.round(
      oilScore * 0.35 +
        shippingScore * 0.35 +
        gasScore * 0.15 +
        sanctionsScore * 0.15
    )
  );

  return {
    energyNews: energyNews
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5),
    oilScore,
    shippingScore,
    gasScore,
    sanctionsScore,
    globalShock
  };
}

function levelColor(score) {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#22c55e";
}

function levelLabel(score) {
  if (score >= 70) return "مرتفع";
  if (score >= 40) return "متوسط";
  return "منخفض";
}

function MetricBar({ label, score }) {
  const color = levelColor(score);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          marginBottom: "8px",
          fontSize: "14px",
          color: "#dbe3ee"
        }}
      >
        <span>{label}</span>
        <span style={{ color, fontWeight: 900 }}>{score}%</span>
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
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width .4s ease"
          }}
        />
      </div>
    </div>
  );
}

export default function EnergyShockIndex({ news = [] }) {
  const {
    energyNews,
    oilScore,
    shippingScore,
    gasScore,
    sanctionsScore,
    globalShock
  } = useMemo(() => calcEnergyMetrics(news), [news]);

  const shockColor = levelColor(globalShock);
  const shockLabel = levelLabel(globalShock);

  return (
    <>
      <style>{`
        @media (max-width: 1050px) {
          .energy-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={{
          maxWidth: "1400px",
          margin: "32px auto 0",
          display: "grid",
          gap: "18px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div>
            <div
              style={{
                color: "#f8fafc",
                fontSize: "32px",
                fontWeight: 900
              }}
            >
              مؤشر صدمة الطاقة
            </div>
            <div
              style={{
                color: "#94a3b8",
                marginTop: "6px",
                fontSize: "14px"
              }}
            >
              قياس تأثير النزاعات على النفط والغاز والملاحة والعقوبات
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              color: shockColor,
              fontWeight: 900
            }}
          >
            مستوى الصدمة: {shockLabel}
          </div>
        </div>

        <div
          className="energy-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr .9fr",
            gap: "20px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              padding: "20px"
            }}
          >
            <div
              style={{
                color: "#f8fafc",
                fontSize: "26px",
                fontWeight: 900,
                marginBottom: "14px"
              }}
            >
              المؤشر العام
            </div>

            <div
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.05)",
                borderRadius: "18px",
                padding: "18px",
                marginBottom: "18px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "10px",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900 }}>
                  صدمة أسواق الطاقة العالمية
                </div>
                <div style={{ color: shockColor, fontSize: "22px", fontWeight: 900 }}>
                  {globalShock}%
                </div>
              </div>

              <div
                style={{
                  color: "#cbd5e1",
                  lineHeight: 1.9,
                  fontSize: "14px",
                  marginBottom: "14px"
                }}
              >
                هذا المؤشر يجمع بين ضغوط النفط والملاحة والغاز والعقوبات لتقدير حجم
                الاضطراب المحتمل في أسواق الطاقة العالمية.
              </div>

              <div
                style={{
                  height: "16px",
                  background: "#222831",
                  borderRadius: "999px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${globalShock}%`,
                    height: "100%",
                    background: shockColor,
                    borderRadius: "999px",
                    transition: "width .4s ease"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              <MetricBar label="ضغط النفط" score={oilScore} />
              <MetricBar label="اضطراب الملاحة والمضائق" score={shippingScore} />
              <MetricBar label="ضغط الغاز" score={gasScore} />
              <MetricBar label="أثر العقوبات" score={sanctionsScore} />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              padding: "20px"
            }}
          >
            <div
              style={{
                color: "#f8fafc",
                fontSize: "26px",
                fontWeight: 900,
                marginBottom: "14px"
              }}
            >
              آخر التطورات المؤثرة
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {energyNews.length === 0 && (
                <div
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.05)",
                    borderRadius: "14px",
                    padding: "14px",
                    color: "#94a3b8"
                  }}
                >
                  لا توجد أخبار طاقة كافية حاليًا.
                </div>
              )}

              {energyNews.map((item, idx) => (
                <div
                  key={item.id || idx}
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
                      alignItems: "center",
                      marginBottom: "8px",
                      flexWrap: "wrap"
                    }}
                  >
                    <span
                      style={{
                        color: levelColor(
                          item.urgency === "high"
                            ? 80
                            : item.urgency === "medium"
                            ? 50
                            : 20
                        ),
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
                      lineHeight: 1.8,
                      fontWeight: 800,
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  >
                    {cleanText(item.title)}
                  </div>

                  <div
                    style={{
                      color: "#cbd5e1",
                      lineHeight: 1.8,
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  >
                    {cleanText(item.summary).slice(0, 140)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                      color: "#94a3b8",
                      fontSize: "12px"
                    }}
                  >
                    <span>
                      {item.time ? new Date(item.time).toLocaleString("ar") : ""}
                    </span>
                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#38bdf8",
                        textDecoration: "none",
                        fontWeight: 700
                      }}
                    >
                      فتح المصدر
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
