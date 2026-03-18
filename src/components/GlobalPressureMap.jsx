import React, { useEffect, useState, useRef } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { REGION_COORDS, REGION_EN } from "../lib/world/eventPulseEngine";
import { useI18n } from "../i18n/I18nProvider";
import { formatCount, valueToStateLabel, computeWorldRiskLevel } from "../lib/radar/stateIndicators";

const P = {
  bg: "#060a10",
  surface: "#0a0f1c",
  border: "rgba(56,189,248,0.06)",
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

const REGION_DISPLAY = {
  "الشرق الأوسط": { icon: "🕌", en: "Middle East" },
  "أوروبا": { icon: "🏰", en: "Europe" },
  "آسيا": { icon: "🏯", en: "Asia-Pacific" },
  "أفريقيا": { icon: "🌍", en: "Africa" },
  "أمريكا الشمالية": { icon: "🗽", en: "N. America" },
  "أمريكا الجنوبية": { icon: "🌎", en: "S. America" },
  "الأسواق العالمية": { icon: "💹", en: "Global Markets" },
};

function PressureNode({ region, x, y, intensity, color, count, isAr, pulsing, pressure }) {
  const name = isAr ? region : (REGION_DISPLAY[region]?.en || region);
  const icon = REGION_DISPLAY[region]?.icon || "🌐";
  const r = 14 + intensity * 22;

  // Pressure ring radii — layered rings around each zone
  const pressureLevel = pressure || 0;
  const ring1 = r + 12;
  const ring2 = r + 20;
  const ring3 = r + 28;

  // State label instead of raw count
  const displayValue = count > 0
    ? String(count)
    : (isAr ? "مستقر" : "Stable");

  return (
    <g style={{ cursor: "pointer" }}>
      {/* Layer 2: Regional pressure rings */}
      {pressureLevel >= 15 && (
        <circle cx={x} cy={y} r={ring1} fill="none" stroke={`${color}15`}
          strokeWidth={0.8} strokeDasharray="2 3">
          <animate attributeName="r" from={ring1 - 1} to={ring1 + 3} dur="5s" repeatCount="indefinite" />
        </circle>
      )}
      {pressureLevel >= 35 && (
        <circle cx={x} cy={y} r={ring2} fill="none" stroke={`${color}10`}
          strokeWidth={0.6} strokeDasharray="3 5">
          <animate attributeName="r" from={ring2 - 1} to={ring2 + 4} dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.15" to="0.05" dur="6s" repeatCount="indefinite" />
        </circle>
      )}
      {pressureLevel >= 55 && (
        <circle cx={x} cy={y} r={ring3} fill="none" stroke={`${color}08`}
          strokeWidth={0.5} strokeDasharray="4 6">
          <animate attributeName="r" from={ring3} to={ring3 + 6} dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.1" to="0" dur="7s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Outer pulse ring */}
      {pulsing && (
        <circle cx={x} cy={y} r={r + 8} fill="none" stroke={color}
          strokeWidth={1} opacity={0.3}>
          <animate attributeName="r" from={r + 4} to={r + 18} dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Glow */}
      <circle cx={x} cy={y} r={r} fill={`${color}12`} stroke={`${color}30`} strokeWidth={1.5}>
        <animate attributeName="r" from={r - 1} to={r + 2} dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Hot core */}
      <circle cx={x} cy={y} r={Math.max(4, r * 0.4)} fill={`${color}60`} />
      {/* Label */}
      <text x={x} y={y - r - 6} textAnchor="middle" fill={P.text}
        fontSize={8} fontWeight={700} fontFamily="Inter, system-ui">{icon} {name}</text>
      {/* Count or state label */}
      <text x={x} y={y + 3} textAnchor="middle" fill={color}
        fontSize={count > 0 ? 10 : 7} fontWeight={900} fontFamily="Inter, system-ui">{displayValue}</text>
    </g>
  );
}

function LinkArc({ fromX, fromY, toX, toY, color, strength }) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - 8 * strength;
  const opacity = 0.15 + strength * 0.25;
  return (
    <g>
      <path
        d={`M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`}
        fill="none" stroke={color} strokeWidth={1 + strength}
        opacity={opacity} strokeDasharray="4,4"
      >
        <animate attributeName="stroke-dashoffset" from="8" to="0" dur="2s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

export default function GlobalPressureMap() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs] = useState(null);

  useEffect(() => {
    setWs(getWorldState());
    const unsub = subscribeWorldState(s => setWs(s));
    return unsub;
  }, []);

  if (!ws) {
    return (
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
        <div style={{
          background: `linear-gradient(160deg, ${P.bg}, ${P.surface})`,
          border: `1px solid ${P.border}`,
          borderRadius: 20,
          padding: "40px 20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "28px", marginBottom: 10, animation: "pressurePulse 2s infinite" }}>🌍</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: P.blue, marginBottom: 6 }}>
            {isAr ? "جاري تشغيل محرك الضغط العالمي" : "Initializing World Pressure Engine"}
          </div>
          <div style={{ fontSize: 11, color: P.textDim }}>
            {isAr ? "تحليل المصادر وبناء خريطة الضغط..." : "Analyzing sources and building pressure map..."}
          </div>
        </div>
        <style>{`@keyframes pressurePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.1)} }`}</style>
      </section>
    );
  }

  const { pulseData, regionalPressures } = ws;
  const { pulses, links, regionIntensity } = pulseData || { pulses: [], links: [], regionIntensity: {} };

  // Map regional pressures to coordinates
  const regionNodes = (regionalPressures || []).map(rp => {
    const coords = REGION_COORDS[rp.region];
    if (!coords) return null;
    const riData = regionIntensity[rp.region] || {};
    return {
      ...rp,
      x: coords.x,
      y: coords.y,
      intensity: riData.intensity || Math.min(1, rp.pressure / 70),
      pulsing: rp.pressure >= 40,
    };
  }).filter(Boolean);

  // Add Global Markets if not in regional pressures
  if (!regionNodes.find(n => n.region === "الأسواق العالمية")) {
    const coords = REGION_COORDS["الأسواق العالمية"];
    const riData = regionIntensity["الأسواق العالمية"] || {};
    if (coords) {
      regionNodes.push({
        region: "الأسواق العالمية",
        regionEn: "Global Markets",
        x: coords.x, y: coords.y,
        pressure: riData.avgSeverity || 0,
        eventCount: riData.count || 0,
        color: riData.color || P.muted,
        intensity: riData.intensity || 0,
        pulsing: false,
      });
    }
  }

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, padding: "0 4px"
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 900, letterSpacing: 4,
            color: P.gold, textTransform: "uppercase", marginBottom: 2,
          }}>
            {isAr ? "خريطة ضغط العالم" : "WORLD PRESSURE MAP"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "أين يتصاعد الضغط العالمي؟" : "Where is global pressure rising?"}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {/* Legend mini */}
          {[
            { color: P.red, l: isAr ? "حرج" : "Critical" },
            { color: P.amber, l: isAr ? "مرتفع" : "High" },
            { color: P.blue, l: isAr ? "متوسط" : "Moderate" },
            { color: P.green, l: isAr ? "مستقر" : "Stable" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              <span style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>{item.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div style={{
        background: `linear-gradient(160deg, ${P.bg}, ${P.surface})`,
        border: `1px solid ${P.border}`,
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
        padding: 0,
      }}>
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }} />

        <svg viewBox="0 0 100 80" style={{
          width: "100%", height: "auto", minHeight: 260, maxHeight: 420,
          display: "block",
        }}>
          {/* ── Layer 1: World map base (grid + background) ── */}
          <rect x="0" y="0" width="100" height="80" fill="transparent" />
          {/* Latitude/longitude gridlines feel */}
          {[20, 35, 50, 65].map(y => (
            <line key={`lat-${y}`} x1="5" y1={y} x2="95" y2={y}
              stroke="rgba(56,189,248,0.02)" strokeWidth="0.3" strokeDasharray="2 4" />
          ))}
          {[20, 40, 60, 80].map(x => (
            <line key={`lon-${x}`} x1={x} y1="5" x2={x} y2="75"
              stroke="rgba(56,189,248,0.02)" strokeWidth="0.3" strokeDasharray="2 4" />
          ))}

          {/* ── Layer 4: Relational links between regions ── */}
          {links.map((link, i) => (
            <LinkArc key={i}
              fromX={link.fromX} fromY={link.fromY}
              toX={link.toX} toY={link.toY}
              color={link.color} strength={link.strength} />
          ))}

          {/* ── Layer 3: Event signal pulses ── */}
          {pulses.slice(0, 8).map((p, i) => (
            <circle key={`pulse-${i}`} cx={p.x} cy={p.y}
              r={p.radius * 0.15} fill={`${p.color}40`}>
              <animate attributeName="r" from={p.radius * 0.1} to={p.radius * 0.3}
                dur={`${2 + Math.random()}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0.1"
                dur={`${2 + Math.random()}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ── Layer 2: Region pressure zones (nodes with rings) ── */}
          {regionNodes.map((node, i) => (
            <PressureNode key={node.region || i}
              region={node.region}
              x={node.x} y={node.y}
              intensity={node.intensity}
              color={node.color}
              count={node.eventCount}
              pressure={node.pressure}
              isAr={isAr}
              pulsing={node.pulsing} />
          ))}
        </svg>

        {/* Bottom info bar */}
        <div style={{
          padding: "8px 16px",
          borderTop: `1px solid ${P.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>
            {(() => {
              const pCount = formatCount(pulses.length, "events", isAr ? "ar" : "en");
              const lCount = formatCount(links.length, "links", isAr ? "ar" : "en");
              if (pCount.isZero && lCount.isZero) {
                return isAr ? "النظام نشط — جاري تحليل مصادر الضغط العالمي" : "System active — analyzing global pressure sources";
              }
              return isAr
                ? `${pCount.display} نقطة ضغط نشطة · ${lCount.isZero ? lCount.display : lCount.display + " ارتباط"}`
                : `${pCount.display} active pressure points · ${lCount.isZero ? lCount.display : lCount.display + " links"}`;
            })()}
          </span>
          <span style={{ fontSize: 10, color: P.muted, fontWeight: 600 }}>
            {isAr ? "البيانات مستمدة من الأحداث والإشارات المرصودة" : "Data derived from tracked events and signals"}
          </span>
        </div>
      </div>
    </section>
  );
}
