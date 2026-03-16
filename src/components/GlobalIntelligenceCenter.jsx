import React, { useMemo } from "react";

function getUrgencyColor(level) {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#22c55e";
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildRegionScores(news = []) {
  const regions = [
    { key: "Middle East", label: "Middle East", test: /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|دبي|أبوظبي|قطر|هرمز|iran|israel|gaza|lebanon|syria|iraq|yemen|gulf|dubai|qatar|hormuz/i },
    { key: "Europe", label: "Europe", test: /أوكرانيا|روسيا|فرنسا|بريطانيا|ألمانيا|الاتحاد الأوروبي|ukraine|russia|france|britain|germany|europe|eu/i },
    { key: "Asia Pacific", label: "Asia Pacific", test: /الصين|تايوان|كوريا|اليابان|بحر الصين|china|taiwan|korea|japan|south china sea/i },
    { key: "Red Sea", label: "Red Sea", test: /البحر الأحمر|red sea|باب المندب|mandeb/i },
    { key: "North America", label: "North America", test: /أمريكا|الولايات المتحدة|واشنطن|ترامب|us |u\.s\.|america|washington|trump/i }
  ];

  return regions.map((region) => {
    let score = 0;

    news.forEach((item) => {
      const hay = `${normalizeText(item.title)} ${normalizeText(item.summary)}`;

      if (region.test.test(hay)) {
        if (item.urgency === "high") score += 24;
        else if (item.urgency === "medium") score += 14;
        else score += 7;
      }
    });

    return {
      ...region,
      score: Math.min(100, score),
      color: score >= 60 ? "#ef4444" : score >= 30 ? "#f59e0b" : "#facc15"
    };
  });
}

function buildConflictMarkers(news = []) {
  const definitions = [
    { label: "Middle East", x: "71%", y: "49%", test: /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|هرمز|iran|israel|gaza|lebanon|syria|iraq|yemen|hormuz/i },
    { label: "Ukraine", x: "58%", y: "30%", test: /أوكرانيا|روسيا|ukraine|russia/i },
    { label: "Red Sea", x: "63%", y: "58%", test: /البحر الأحمر|red sea|باب المندب|mandeb/i },
    { label: "Taiwan Strait", x: "85%", y: "44%", test: /تايوان|الصين|taiwan|china/i }
  ];

  return definitions.map((item) => {
    let level = "low";

    news.forEach((n) => {
      const hay = `${normalizeText(n.title)} ${normalizeText(n.summary)}`;
      if (item.test.test(hay)) {
        if (n.urgency === "high") level = "high";
        else if (n.urgency === "medium" && level !== "high") level = "medium";
      }
    });

    return {
      ...item,
      level,
      color: level === "high" ? "#ef4444" : level === "medium" ? "#f59e0b" : "#facc15"
    };
  });
}

function buildBrief(news = []) {
  const source = Array.isArray(news) ? news : [];
  const high = source.filter((n) => n.urgency === "high").length;
  const medium = source.filter((n) => n.urgency === "medium").length;

  const allText = source.map((n) => `${n.title} ${n.summary}`).join(" ");

  const flags = {
    middleEast: /إيران|اسرائيل|إسرائيل|غزة|لبنان|سوريا|العراق|اليمن|الخليج|iran|israel|gaza|lebanon|syria|iraq|yemen|gulf/i.test(allText),
    ukraine: /أوكرانيا|روسيا|ukraine|russia/i.test(allText),
    redSea: /البحر الأحمر|red sea|باب المندب|mandeb/i.test(allText),
    taiwan: /تايوان|الصين|taiwan|china/i.test(allText),
    diplomacy: /محادثات|اتفاق|وساطة|تحذير|بيان|diplom|talks|agreement|warning|statement/i.test(allText)
  };

  let overview = "Global conditions remain monitored with moderate volatility across multiple regions.";
  if (high >= 8) {
    overview = "Global conditions are highly stressed, with multiple urgent developments driving elevated geopolitical risk.";
  } else if (high >= 4 || medium >= 6) {
    overview = "Global conditions are tense, with a visible acceleration in conflict-related and strategic headlines.";
  }

  const bullets = [
    flags.middleEast ? "Middle East pressure remains the dominant driver of current geopolitical volatility." : null,
    flags.ukraine ? "The Russia–Ukraine theater continues to influence the broader strategic risk picture in Europe." : null,
    flags.redSea ? "Red Sea and maritime security developments remain relevant to trade and energy stability." : null,
    flags.taiwan ? "Asia-Pacific monitoring remains important due to recurring Taiwan–China sensitivity." : null,
    flags.diplomacy ? "Diplomatic signaling is active, indicating attempts to contain escalation in parallel with hard-power developments." : null
  ].filter(Boolean);

  return { overview, bullets };
}

function SmallStat({ label, value, color = "#f8fafc" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>{label}</div>
      <div style={{ color, fontSize: "28px", fontWeight: 900 }}>{value}</div>
    </div>
  );
}

export default function GlobalIntelligenceCenter({ news = [] }) {
  const regionScores = useMemo(() => buildRegionScores(news), [news]);
  const conflictMarkers = useMemo(() => buildConflictMarkers(news), [news]);
  const brief = useMemo(() => buildBrief(news), [news]);

  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;
  const low = news.filter((n) => n.urgency === "low").length;

  const latest = [...news]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  return (
    <>
      <style>{`
        @media (max-width: 1100px) {
          .gic-top-grid,
          .gic-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={{
          maxWidth: "1400px",
          margin: "36px auto 0",
          display: "grid",
          gap: "20px"
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
                fontSize: "34px",
                fontWeight: 900,
                letterSpacing: ".4px"
              }}
            >
              Global Intelligence Center
            </div>
            <div style={{ color: "#94a3b8", marginTop: "6px", fontSize: "14px" }}>
              Integrated geopolitical monitoring, escalation tracking, and regional pressure analysis
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              gap: "8px",
              flexWrap: "wrap"
            }}
          >
            <span style={{ color: "#ef4444", fontWeight: 800 }}>● Active Conflict</span>
            <span style={{ color: "#f59e0b", fontWeight: 800 }}>● Escalation</span>
            <span style={{ color: "#facc15", fontWeight: 800 }}>● Tension</span>
          </div>
        </div>

        <div
          className="gic-top-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr .9fr",
            gap: "20px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#16181d,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,.28)"
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
                World Conflict Map
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                Strategic flashpoints overview
              </div>
            </div>

            <div
              style={{
                position: "relative",
                minHeight: "520px",
                background:
                  "radial-gradient(circle at 30% 30%, rgba(56,189,248,.10), transparent 22%), radial-gradient(circle at 70% 35%, rgba(239,68,68,.10), transparent 20%), radial-gradient(circle at 55% 65%, rgba(245,158,11,.08), transparent 18%), linear-gradient(180deg,#0a0f16,#06090d)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "28px",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,.05)",
                  background:
                    "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
                  backgroundSize: "80px 80px, 80px 80px"
                }}
              />

              {[
                { label: "North America", x: "18%", y: "30%" },
                { label: "Europe", x: "48%", y: "28%" },
                { label: "Middle East", x: "69%", y: "48%" },
                { label: "Red Sea", x: "65%", y: "58%" },
                { label: "Asia-Pacific", x: "84%", y: "42%" }
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    position: "absolute",
                    left: r.x,
                    top: r.y,
                    transform: "translate(-50%,-50%)",
                    color: "#6b7280",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: ".6px"
                  }}
                >
                  {r.label}
                </div>
              ))}

              {conflictMarkers.map((marker) => (
                <div
                  key={marker.label}
                  style={{
                    position: "absolute",
                    left: marker.x,
                    top: marker.y,
                    transform: "translate(-50%,-50%)"
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: marker.color,
                      boxShadow: `0 0 0 8px ${marker.color}22, 0 0 18px ${marker.color}`
                    }}
                  />
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      fontWeight: 800,
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

          <div style={{ display: "grid", gap: "16px" }}>
            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "22px",
                padding: "18px",
                boxShadow: "0 16px 40px rgba(0,0,0,.24)"
              }}
            >
              <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900, marginBottom: "14px" }}>
                Situation Brief
              </div>

              <div style={{ color: "#dbe3ee", lineHeight: 1.9, fontSize: "14px", marginBottom: "14px" }}>
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
                      fontSize: "13px"
                    }}
                  >
                    {bullet}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg,#171a20,#101317)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: "22px",
                padding: "18px",
                boxShadow: "0 16px 40px rgba(0,0,0,.24)"
              }}
            >
              <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900, marginBottom: "14px" }}>
                Regional Pressure
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {regionScores.map((region) => (
                  <div key={region.key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                        color: "#cbd5e1",
                        fontSize: "13px"
                      }}
                    >
                      <span>{region.label}</span>
                      <span style={{ color: region.color, fontWeight: 800 }}>{region.score}%</span>
                    </div>

                    <div
                      style={{
                        height: "10px",
                        borderRadius: "999px",
                        background: "#222831",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${region.score}%`,
                          height: "100%",
                          background: region.color,
                          borderRadius: "999px"
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
          className="gic-bottom-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "20px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "22px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900, marginBottom: "14px" }}>
              Risk Metrics
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <SmallStat label="Total Items" value={news.length} />
              <SmallStat label="High Urgency" value={high} color="#ef4444" />
              <SmallStat label="Medium Urgency" value={medium} color="#f59e0b" />
              <SmallStat label="Low Urgency" value={low} color="#22c55e" />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "22px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900, marginBottom: "14px" }}>
              Escalation Feed
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {latest.map((item, i) => (
                <div
                  key={`${item.id || i}`}
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
                        ? "HIGH"
                        : item.urgency === "medium"
                        ? "MEDIUM"
                        : "LOW"}
                    </span>

                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {item.source}
                    </span>
                  </div>

                  <div style={{ color: "#f8fafc", lineHeight: 1.7, fontWeight: 700, fontSize: "13px" }}>
                    {normalizeText(item.title)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg,#171a20,#101317)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "22px",
              padding: "18px"
            }}
          >
            <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: 900, marginBottom: "14px" }}>
              Strategic Outlook
            </div>

            <div
              style={{
                color: "#dbe3ee",
                lineHeight: 1.9,
                fontSize: "14px"
              }}
            >
              The dashboard now concentrates conflict visibility, regional pressure, escalation flow, and risk metrics into one integrated intelligence layer. This structure is designed to feel coherent, premium, and operational rather than fragmented.
            </div>

            <div
              style={{
                marginTop: "16px",
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
              Recommended next upgrade: replace the placeholder geo-surface with a real controlled dark SVG world map instead of broken tile maps.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
