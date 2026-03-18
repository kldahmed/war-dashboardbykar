import React, { useEffect, useState } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { useI18n } from "../i18n/I18nProvider";

const P = {
  bg: "#070b11",
  surface: "#0c1220",
  border: "rgba(56,189,248,0.08)",
  gold: "#f3d38a",
  blue: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a78bfa",
  muted: "#475569",
  text: "#e2e8f0",
  textDim: "#64748b"
};

const REGION_ICONS = {
  "الشرق الأوسط": "🕌",
  "أوروبا": "🏰",
  "آسيا": "🏯",
  "أفريقيا": "🌍",
  "أمريكا الشمالية": "🗽",
  "أمريكا الجنوبية": "🌎",
  "Middle East": "🕌",
  "Europe": "🏰",
  "Asia": "🏯",
  "Africa": "🌍",
  "N. America": "🗽",
  "S. America": "🌎"
};

function PressureBar({ value, color }) {
  return (
    <div style={{
      width: "100%", height: 6, borderRadius: 3,
      background: "rgba(255,255,255,0.06)",
      overflow: "hidden"
    }}>
      <div style={{
        width: `${Math.min(100, value)}%`,
        height: "100%",
        borderRadius: 3,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        boxShadow: `0 0 8px ${color}40`,
        transition: "width 0.8s ease"
      }} />
    </div>
  );
}

function RegionCard({ region, isAr }) {
  const name = isAr ? region.region : region.regionEn;
  const icon = REGION_ICONS[region.region] || REGION_ICONS[region.regionEn] || "🌐";
  const pLabel = region.pressure >= 60
    ? (isAr ? "مرتفع" : "High")
    : region.pressure >= 35
    ? (isAr ? "متوسط" : "Medium")
    : (isAr ? "منخفض" : "Low");

  return (
    <div style={{
      flex: "1 1 180px",
      minWidth: 170,
      background: `linear-gradient(135deg, ${P.surface}, ${P.bg})`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "14px 14px 12px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Top glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: region.color, opacity: 0.5
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: P.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>{name}</div>
          <div style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>
            {region.eventCount} {isAr ? "حدث" : "events"}
          </div>
        </div>
      </div>

      <PressureBar value={region.pressure} color={region.color} />

      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 6
      }}>
        <span style={{ fontSize: 10, color: P.muted, fontWeight: 700 }}>
          {isAr ? "الضغط" : "PRESSURE"}
        </span>
        <span style={{ fontSize: 12, fontWeight: 900, color: region.color }}>
          {region.pressure}% · {pLabel}
        </span>
      </div>
    </div>
  );
}

export default function RegionalPressureStrip() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  if (!ws) return null;

  const regions = ws.regionalPressures || [];
  if (!regions.length) return null;

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, padding: "0 4px"
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 3,
            color: P.amber, textTransform: "uppercase", marginBottom: 2
          }}>
            {isAr ? "ضغط المناطق" : "REGIONAL PRESSURE"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "أين يتصاعد الضغط؟" : "Where is pressure rising?"}
          </div>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 4,
        flexWrap: "wrap"
      }}>
        {regions.map((r, i) => (
          <RegionCard key={r.region || i} region={r} isAr={isAr} />
        ))}
      </div>
    </section>
  );
}
