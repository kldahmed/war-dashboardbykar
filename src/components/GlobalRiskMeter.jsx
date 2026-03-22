import React, { useEffect, useState } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { computeWorldRiskLevel } from "../lib/radar/stateIndicators";

function strategicRiskToDisplay(strategicRisk) {
  if (!strategicRisk) return null;
  const color = strategicRisk.level === "CRITICAL"
    ? "#ef4444"
    : strategicRisk.level === "HIGH"
      ? "#f59e0b"
      : strategicRisk.level === "MODERATE"
        ? "#38bdf8"
        : "#22c55e";
  return {
    value: strategicRisk.score,
    color,
    labelEn: strategicRisk.level,
    descriptionEn: strategicRisk.drivers?.join(" • ") || "Strategic risk is being recalculated",
    level: strategicRisk.level === "CRITICAL" ? 4 : strategicRisk.level === "HIGH" ? 3 : strategicRisk.level === "MODERATE" ? 2 : 1,
  };
}

export default function GlobalRiskMeter({ news }) {
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  const risk = strategicRiskToDisplay(ws?.strategicGlobalRisk) || computeWorldRiskLevel(ws);
  const tension = ws?.tension || { value: 0, label: "مستقر", labelEn: "Stable", color: "#22c55e" };
  const economic = ws?.economic || { value: 0, label: "مستقر", labelEn: "Stable", color: "#22c55e" };
  const eventIntensity = ws?.eventIntensity || { value: 0, label: "هادئ", labelEn: "Quiet", color: "#64748b" };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(15,19,25,0.95), rgba(19,24,32,0.95))",
      borderRadius: "20px",
      padding: "24px",
      boxShadow: `0 4px 24px ${risk.color}15`,
      border: `1px solid ${risk.color}25`,
      margin: "18px 0",
      maxWidth: "700px",
      width: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated pressure glow at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: `linear-gradient(90deg, transparent, ${risk.color}, transparent)`,
        opacity: risk.level >= 3 ? 0.8 : 0.3,
      }} />

      {/* Title */}
      <div style={{
        fontSize: "0.7rem", fontWeight: 900, letterSpacing: "3px",
        color: "#6b7280", textTransform: "uppercase", marginBottom: 14,
      }}>
        WORLD RISK LEVEL
      </div>

      {/* Main risk display */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `radial-gradient(circle, ${risk.color}33, ${risk.color}11)`,
          border: `3px solid ${risk.color}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", fontWeight: 900, color: risk.color,
        }}>
          {risk.value}
        </div>
        <div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: risk.color, marginBottom: 4 }}>
            {risk.labelEn}
          </div>
          <div style={{ fontSize: "0.82rem", color: "#9ca3af", lineHeight: 1.4 }}>
            {risk.descriptionEn}
          </div>
          {ws?.strategicSummary?.likelyNext72Hours ? (
            <div style={{ fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.5, marginTop: 6 }}>
              {ws.strategicSummary.likelyNext72Hours}
            </div>
          ) : null}
        </div>
      </div>

      {/* Risk bar */}
      <div style={{
        height: 10, background: "#1e293b", borderRadius: 5,
        marginBottom: 16, overflow: "hidden", position: "relative",
      }}>
        <div style={{
          width: `${risk.value}%`, height: "100%",
          background: `linear-gradient(90deg, #22c55e, #38bdf8, #f59e0b, #ef4444)`,
          backgroundSize: "300% 100%",
          backgroundPosition: `${risk.value}% 0`,
          borderRadius: 5,
          transition: "width 1s ease",
        }} />
        {/* Marker */}
        <div style={{
          position: "absolute", top: -3, left: `${risk.value}%`,
          transform: "translateX(-50%)",
          width: 4, height: 16, borderRadius: 2,
          background: risk.color, boxShadow: `0 0 6px ${risk.color}88`,
        }} />
      </div>

      {/* Sub-indices */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <SubIndex label="Tension" value={tension.value} stateLabel={tension.labelEn} color={tension.color} />
        <SubIndex label="Economic" value={economic.value} stateLabel={economic.labelEn} color={economic.color} />
        <SubIndex label="Events" value={eventIntensity.value} stateLabel={eventIntensity.labelEn} color={eventIntensity.color} />
      </div>
    </div>
  );
}

function SubIndex({ label, value, stateLabel, color }) {
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: 10,
      padding: "10px 12px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "0.62rem", color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 900, color, marginBottom: 2 }}>
        {value > 0 ? `${value}%` : stateLabel}
      </div>
      <div style={{ fontSize: "0.65rem", color: "#4b5563" }}>{stateLabel}</div>
    </div>
  );
}
