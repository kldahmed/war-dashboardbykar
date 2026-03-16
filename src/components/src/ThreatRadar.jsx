import React, { useEffect, useMemo, useState } from "react";

function cleanText(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urgencyColor(level) {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#22c55e";
}

function urgencyLabel(level) {
  if (level === "high") return "تهديد مرتفع";
  if (level === "medium") return "تهديد متوسط";
  return "تهديد منخفض";
}

function getRadarNodes(news = []) {
  const zones = [
    {
      id: "middle-east",
      label: "الشرق الأوسط",
      x: 68,
      y: 52,
      regex:
        /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|دبي|أبوظبي|قطر|هرمز|تل أبيب|طهران/i
    },
    {
      id: "ukraine",
      label: "أوكرانيا",
      x: 54,
      y: 27,
      regex: /أوكرانيا|روسيا|كييف|موسكو|القرم/i
    },
    {
      id: "red-sea",
      label: "البحر الأحمر",
      x: 63,
      y: 63,
      regex: /البحر الأحمر|باب المندب|الحديدة|ملاحة|سفن|ناقلات|شحن/i
    },
    {
      id: "taiwan",
      label: "مضيق تايوان",
      x: 84,
      y: 42,
      regex: /تايوان|الصين|بكين|تايبيه|بحر الصين|المحيط الهادئ/i
    },
    {
      id: "america",
      label: "أمريكا",
      x: 26,
      y: 36,
      regex: /الولايات المتحدة|أمريكا|واشنطن|البيت الأبيض|البنتاغون|ترامب|بايدن/i
    }
  ];

  return zones.map((zone) => {
    const related = news.filter((item) => {
      const hay = `${cleanText(item.title)} ${cleanText(item.summary)}`;
      return zone.regex.test(hay);
    });

    let score = 0;
    related.forEach((item) => {
      if (item.urgency === "high") score += 30;
      else if (item.urgency === "medium") score += 18;
      else score += 8;
    });

    const finalScore = Math.min(100, score || 8);
    const level =
      finalScore >= 60 ? "high" : finalScore >= 30 ? "medium" : "low";

    return {
      ...zone,
      score: finalScore,
      level,
      color: urgencyColor(level),
      count: related.length,
      items: related
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 4)
    };
  });
}

export default function ThreatRadar({ news = [] }) {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState("middle-east");

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev + 1) % 1000);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const nodes = useMemo(() => getRadarNodes(news), [news]);
  const selected =
    nodes.find((node) => node.id === selectedId) || nodes[0] || null;

  const activeNodes = nodes
    .filter((node) => node.score > 0)
    .sort((a, b) => b.score - a.score);

  const pulseScale = tick % 2 === 0 ? 1 : 1.12;

  return (
    <>
      <style>{`
        @keyframes radarSweep {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: .18; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: .05; }
        }

        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: .75; }
          100% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 1050px) {
          .threat-radar-grid {
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
              رادار التهديدات
            </div>
            <div
              style={{
                color: "#94a3b8",
                marginTop: "6px",
                fontSize: "14px"
              }}
            >
              مراقبة بصرية متقدمة لمناطق التوتر الأكثر نشاطًا
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}
          >
            <span style={{ color: "#ef4444", fontWeight: 800 }}>● مرتفع</span>
            <span style={{ color: "#f59e0b", fontWeight: 800 }}>● متوسط</span>
            <span style={{ color: "#22c55e", fontWeight: 800 }}>● منخفض</span>
          </div>
        </div>

        <div
          className="threat-radar-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr .9fr",
            gap: "20px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#0f1319)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,.24)"
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
              <div style={{ color: "#f8fafc", fontSize: "24px", fontWeight: 900 }}>
                واجهة الرادار
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                اضغط على أي نقطة لعرض التفاصيل
              </div>
            </div>

            <div
              style={{
                position: "relative",
                minHeight: "520px",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at center, rgba(56,189,248,.12), transparent 24%), linear-gradient(180deg,#07111c,#05080d)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "520px",
                  height: "520px",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: "1px solid rgba(56,189,248,.08)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "390px",
                  height: "390px",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: "1px solid rgba(56,189,248,.08)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "260px",
                  height: "260px",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: "1px solid rgba(56,189,248,.08)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "640px",
                  height: "640px",
                  borderRadius: "50%",
                  animation: "radarSweep 7s linear infinite",
                  background:
                    "conic-gradient(from 0deg, rgba(56,189,248,.18), transparent 18%, transparent 100%)"
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: "rgba(56,189,248,.08)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "rgba(56,189,248,.08)"
                }}
              />

              {nodes.map((node) => {
                const active = selected?.id === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    style={{
                      position: "absolute",
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: `translate(-50%, -50%) scale(${
                        active ? pulseScale : 1
                      })`,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "transform .35s ease"
                    }}
                    title={node.label}
                  >
                    <div
                      style={{
                        width: active ? "22px" : "16px",
                        height: active ? "22px" : "16px",
                        borderRadius: "50%",
                        background: node.color,
                        boxShadow: `0 0 0 8px ${node.color}22, 0 0 20px ${node.color}`,
                        animation: "radarPulse 1.8s infinite"
                      }}
                    />
                    <div
                      style={{
                        marginTop: "10px",
                        color: active ? "#fff" : "#dbe3ee",
                        fontWeight: 900,
                        fontSize: "14px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {node.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "24px",
                padding: "18px"
              }}
            >
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: "24px",
                  fontWeight: 900,
                  marginBottom: "14px"
                }}
              >
                المنطقة المختارة
              </div>

              {selected ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      alignItems: "center",
                      marginBottom: "12px"
                    }}
                  >
                    <div
                      style={{
                        color: "#f8fafc",
                        fontSize: "22px",
                        fontWeight: 900
                      }}
                    >
                      {selected.label}
                    </div>
                    <div
                      style={{
                        color: selected.color,
                        fontWeight: 900,
                        fontSize: "14px"
                      }}
                    >
                      {selected.score}%
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: "12px",
                      color: selected.color,
                      fontWeight: 800,
                      fontSize: "14px"
                    }}
                  >
                    {urgencyLabel(selected.level)}
                  </div>

                  <div
                    style={{
                      background: "#222831",
                      borderRadius: "999px",
                      overflow: "hidden",
                      height: "12px",
                      marginBottom: "16px"
                    }}
                  >
                    <div
                      style={{
                        width: `${selected.score}%`,
                        height: "100%",
                        background: selected.color,
                        borderRadius: "999px",
                        transition: "width .4s ease"
                      }}
                    />
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px" }}>
                    عدد الأخبار المرتبطة: {selected.count}
                  </div>

                  <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                    {selected.items.length ? (
                      selected.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          style={{
                            background: "rgba(255,255,255,.03)",
                            border: "1px solid rgba(255,255,255,.05)",
                            borderRadius: "14px",
                            padding: "12px"
                          }}
                        >
                          <div
                            style={{
                              color: "#f8fafc",
                              fontWeight: 800,
                              lineHeight: 1.7,
                              fontSize: "13px",
                              marginBottom: "8px"
                            }}
                          >
                            {cleanText(item.title)}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                              color: "#94a3b8",
                              fontSize: "12px"
                            }}
                          >
                            <span>{item.source}</span>
                            <span>{item.time ? new Date(item.time).toLocaleString("ar") : ""}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                        لا توجد أخبار كافية لهذه المنطقة
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "24px",
                padding: "18px"
              }}
            >
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: "24px",
                  fontWeight: 900,
                  marginBottom: "14px"
                }}
              >
                ترتيب التهديدات
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {activeNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "6px",
                        color: "#dbe3ee",
                        fontSize: "14px"
                      }}
                    >
                      <span>{node.label}</span>
                      <span style={{ color: node.color, fontWeight: 900 }}>
                        {node.score}%
                      </span>
                    </div>

                    <div
                      style={{
                        height: "10px",
                        background: "#222831",
                        borderRadius: "999px",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${node.score}%`,
                          height: "100%",
                          background: node.color,
                          borderRadius: "999px"
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
