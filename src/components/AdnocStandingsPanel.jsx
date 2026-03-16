import React from "react";

const COLS = [
  { key: "rank",    label: "المركز" },
  { key: "team",    label: "الفريق" },
  { key: "played",  label: "لعب" },
  { key: "won",     label: "فاز" },
  { key: "drawn",   label: "تعادل" },
  { key: "lost",    label: "خسر" },
  { key: "points",  label: "النقاط" }
];

const styles = {
  wrapper: {
    background: "#0b0f15",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "28px 24px",
    marginBottom: "32px"
  },
  sectionTitle: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: "6px",
    letterSpacing: "0.5px"
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: "28px",
    letterSpacing: "1px"
  },
  tableWrap: {
    overflowX: "auto",
    marginBottom: "32px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },
  th: {
    background: "#161d2a",
    color: "#60a5fa",
    padding: "10px 12px",
    textAlign: "center",
    fontWeight: 700,
    borderBottom: "2px solid rgba(56,189,248,0.2)"
  },
  tdBase: {
    padding: "9px 12px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    color: "#e2e8f0"
  },
  tdTeam: {
    textAlign: "right",
    fontWeight: 700,
    paddingRight: "16px"
  },
  sharjahRow: {
    background: "rgba(248,200,50,0.08)"
  },
  sharjahPts: {
    color: "#f3d38a",
    fontWeight: 900
  },
  sharjahBadge: {
    display: "inline-block",
    background: "linear-gradient(90deg,#c89b3c,#f3d38a)",
    color: "#111",
    borderRadius: "999px",
    padding: "1px 8px",
    fontSize: "11px",
    fontWeight: 800,
    marginRight: "6px",
    verticalAlign: "middle"
  },
  fixturesTitle: {
    fontSize: "17px",
    fontWeight: 800,
    color: "#38bdf8",
    marginBottom: "14px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(56,189,248,0.2)"
  },
  fixturesList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  fixtureCard: {
    background: "#161d2a",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    textDecoration: "none",
    color: "#e2e8f0",
    transition: "background .15s"
  },
  fixtureSource: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px"
  }
};

export default function AdnocStandingsPanel({ standings = [], fixtures = [], isLoading = false }) {
  const hasStandings = standings.length > 0;

  return (
    <div style={styles.wrapper}>
      <div style={styles.sectionTitle}>🇦🇪 دوري أدنوك للمحترفين</div>
      <div style={styles.subtitle}>أخبار الأندية، الترتيب، والمباريات القادمة</div>

      {/* ── Standings Table ── */}
      <div style={styles.tableWrap}>
        {hasStandings ? (
          <table style={styles.table}>
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} style={styles.th}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isSharjah = /sharjah|الشارقة/i.test(row.team);
                return (
                  <tr key={row.rank} style={isSharjah ? styles.sharjahRow : undefined}>
                    {COLS.map((c) => {
                      const val = row[c.key];
                      if (c.key === "points") {
                        return (
                          <td key={c.key} style={{ ...styles.tdBase, ...(isSharjah ? styles.sharjahPts : {}) }}>
                            {val}
                          </td>
                        );
                      }
                      if (c.key === "team") {
                        return (
                          <td key={c.key} style={{ ...styles.tdBase, ...styles.tdTeam }}>
                            {isSharjah && (
                              <span style={styles.sharjahBadge}>نادي الشارقة</span>
                            )}
                            {val}
                          </td>
                        );
                      }
                      return (
                        <td key={c.key} style={styles.tdBase}>{val}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : isLoading ? (
          <div style={{ textAlign: "center", color: "#38bdf8", padding: "24px 0", fontSize: "14px" }}>
            جاري تحميل الترتيب...
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#475569", padding: "24px 0", fontSize: "14px" }}>
            تعذر تحميل الترتيب حاليًا
          </div>
        )}
      </div>

      {/* ── Fixtures / News ── */}
      {fixtures.length > 0 && (
        <div>
          <div style={styles.fixturesTitle}>📅 المباريات القادمة والأخبار</div>
          <div style={styles.fixturesList}>
            {fixtures.slice(0, 6).map((item, idx) => (
              <a
                key={item.id || idx}
                href={item.url && item.url !== "#" ? item.url : undefined}
                target={item.url && item.url !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={styles.fixtureCard}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1e2a3a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#161d2a")}
              >
                <span style={{ fontSize: "20px" }}>⚽</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title}
                  </div>
                  <div style={styles.fixtureSource}>{item.source}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
