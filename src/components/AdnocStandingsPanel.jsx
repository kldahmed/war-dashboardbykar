import React from "react";

// Static ADNOC Pro League standings table — representative 2024-25 season data.
// Real-time standings require a premium football-data API; this table is updated
// when live API standings news articles are available via the `standings` prop.
const STATIC_STANDINGS = [
  { pos: 1,  team: "الشارقة",         played: 20, won: 14, drawn: 4, lost: 2,  pts: 46, isSharjah: true },
  { pos: 2,  team: "العين",           played: 20, won: 13, drawn: 3, lost: 4,  pts: 42, isSharjah: false },
  { pos: 3,  team: "شباب الأهلي",     played: 20, won: 12, drawn: 4, lost: 4,  pts: 40, isSharjah: false },
  { pos: 4,  team: "الوصل",           played: 20, won: 11, drawn: 3, lost: 6,  pts: 36, isSharjah: false },
  { pos: 5,  team: "الجزيرة",         played: 20, won: 10, drawn: 4, lost: 6,  pts: 34, isSharjah: false },
  { pos: 6,  team: "الوحدة",          played: 20, won: 9,  drawn: 5, lost: 6,  pts: 32, isSharjah: false },
  { pos: 7,  team: "النصر",           played: 20, won: 8,  drawn: 4, lost: 8,  pts: 28, isSharjah: false },
  { pos: 8,  team: "بني ياس",         played: 20, won: 6,  drawn: 6, lost: 8,  pts: 24, isSharjah: false },
  { pos: 9,  team: "خورفكان",         played: 20, won: 6,  drawn: 5, lost: 9,  pts: 23, isSharjah: false },
  { pos: 10, team: "كلباء",           played: 20, won: 5,  drawn: 4, lost: 11, pts: 19, isSharjah: false },
  { pos: 11, team: "عجمان",           played: 20, won: 4,  drawn: 4, lost: 12, pts: 16, isSharjah: false },
  { pos: 12, team: "الفجيرة",         played: 20, won: 3,  drawn: 4, lost: 13, pts: 13, isSharjah: false },
  { pos: 13, team: "الضفرة",          played: 20, won: 3,  drawn: 3, lost: 14, pts: 12, isSharjah: false },
  { pos: 14, team: "البطائح",         played: 20, won: 2,  drawn: 3, lost: 15, pts: 9,  isSharjah: false }
];

const COLS = [
  { key: "pos",    label: "المركز" },
  { key: "team",   label: "الفريق" },
  { key: "played", label: "لعب" },
  { key: "won",    label: "فاز" },
  { key: "drawn",  label: "تعادل" },
  { key: "lost",   label: "خسر" },
  { key: "pts",    label: "النقاط" }
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
  },
  standingsNote: {
    fontSize: "11px",
    color: "#475569",
    textAlign: "center",
    marginTop: "8px"
  }
};

export default function AdnocStandingsPanel({ standings = [], fixtures = [] }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.sectionTitle}>🇦🇪 دوري أدنوك للمحترفين</div>
      <div style={styles.subtitle}>أخبار الأندية، الترتيب، والمباريات القادمة</div>

      {/* ── Standings Table ── */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} style={styles.th}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATIC_STANDINGS.map((row) => (
              <tr key={row.pos} style={row.isSharjah ? styles.sharjahRow : undefined}>
                {COLS.map((c) => {
                  const val = row[c.key];
                  if (c.key === "pts") {
                    return (
                      <td key={c.key} style={{ ...styles.tdBase, ...(row.isSharjah ? styles.sharjahPts : {}) }}>
                        {val}
                      </td>
                    );
                  }
                  if (c.key === "team") {
                    return (
                      <td key={c.key} style={{ ...styles.tdBase, ...styles.tdTeam }}>
                        {row.isSharjah && (
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
            ))}
          </tbody>
        </table>
        <div style={styles.standingsNote}>* الأرقام تمثيلية — يُرجى مراجعة الموقع الرسمي للترتيب الفعلي</div>
      </div>

      {/* ── Fixtures / Standings News ── */}
      {(fixtures.length > 0 || standings.length > 0) && (
        <div>
          <div style={styles.fixturesTitle}>📅 المباريات القادمة والأخبار</div>
          <div style={styles.fixturesList}>
            {[...fixtures, ...standings].slice(0, 6).map((item, idx) => (
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
