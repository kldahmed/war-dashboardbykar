import React from "react";

/**
 * RiskMeter — premium visual meter for a single strategic risk.
 * Displays risk score as arc + bar + metadata.
 */
export function RiskMeter({ risk, compact = false }) {
  const { label, icon, riskScore, probability, confidence, linkedSignals, evidenceCount, sourceCount } = risk;

  const color = riskScore >= 70 ? "#ef4444"
              : riskScore >= 50 ? "#f59e0b"
              : riskScore >= 30 ? "#38bdf8"
              : "#22c55e";

  const riskLabel = riskScore >= 70 ? "مرتفع"
                  : riskScore >= 50 ? "متوسط-عالي"
                  : riskScore >= 30 ? "متوسط"
                  : "منخفض";

  // SVG arc parameters
  const r = 28, circ = 2 * Math.PI * r;
  const arcFill = circ - (riskScore / 100) * circ;
  const confColor = confidence >= 60 ? "#22c55e" : confidence >= 40 ? "#f59e0b" : "#ef4444";

  if (compact) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        background: `${color}08`,
        border: `1px solid ${color}20`,
        borderRadius: "10px",
      }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "12px", color: "#e2e8f0", lineHeight: 1.3 }}>{label}</div>
          <div style={{
            height: "4px", background: "rgba(255,255,255,0.06)",
            borderRadius: "99px", overflow: "hidden", marginTop: "5px",
          }}>
            <div style={{
              width: `${riskScore}%`, height: "100%",
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius: "99px",
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 900, color }}>{riskScore}</div>
          <div style={{ fontSize: "9px", color: "#475569" }}>/ 100</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(145deg, #0c1018, #111827)",
      border: `1px solid ${color}22`,
      borderRadius: "14px",
      padding: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "13px", color: "#e2e8f0" }}>{label}</div>
          <div style={{ fontSize: "10px", color, fontWeight: 700, marginTop: "1px" }}>{riskLabel}</div>
        </div>
        {/* SVG arc */}
        <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
          <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={`${circ}`} strokeDashoffset={`${arcFill}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 900, color, lineHeight: 1 }}>{riskScore}</span>
            <span style={{ fontSize: "8px", color: "#475569" }}>/100</span>
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#475569", marginBottom: "3px" }}>
          <span>احتمالية التحقق</span>
          <span style={{ color, fontWeight: 700 }}>{probability}%</span>
        </div>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{
            width: `${probability}%`, height: "100%",
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            borderRadius: "99px", transition: "width 1s ease",
          }} />
        </div>
      </div>

      {/* Metadata badges */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        <span style={{
          fontSize: "9px", padding: "2px 7px", borderRadius: "5px",
          background: `${confColor}15`, border: `1px solid ${confColor}30`, color: confColor,
          fontWeight: 700,
        }}>
          ثقة {confidence}%
        </span>
        <span style={{
          fontSize: "9px", padding: "2px 7px", borderRadius: "5px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#64748b",
        }}>
          {evidenceCount} إشارة
        </span>
        <span style={{
          fontSize: "9px", padding: "2px 7px", borderRadius: "5px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#64748b",
        }}>
          {sourceCount} مصدر
        </span>
      </div>

      {/* Linked signals */}
      {linkedSignals?.length > 0 && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {linkedSignals.map(s => (
            <span key={s} style={{
              fontSize: "9px", padding: "1px 6px", borderRadius: "4px",
              background: `${color}0a`, border: `1px solid ${color}18`, color: "#475569",
            }}>
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * RiskDashboard — grid of all active risks, sorted by riskScore.
 */
export function RiskDashboard({ risks = [], compact = false }) {
  if (!risks.length) return null;

  const sorted = [...risks].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: compact
        ? "1fr"
        : "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "12px",
    }}>
      {sorted.map(r => (
        <RiskMeter key={r.riskType} risk={r} compact={compact} />
      ))}
    </div>
  );
}
