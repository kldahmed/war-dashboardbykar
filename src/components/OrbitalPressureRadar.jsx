/**
 * OrbitalPressureRadar — Structured World-Pressure Visualization
 *
 * Two display modes:
 *   Mode A  رادار مداري   — hexagonal radial layout with dedicated region nodes
 *   Mode B  لوحة المناطق  — grid card layout (auto-fallback on small screens)
 *
 * Key design rules:
 *   ✓ Every region has a fixed, non-overlapping position
 *   ✓ No giant zero-percent labels — low-pressure shows "مستقر" / "Stable"
 *   ✓ Compact structured nodes: name → status → value → count
 *   ✓ 5-layer visual hierarchy (grid → arcs → rings → labels → scan)
 *   ✓ SVG-native scan animation (no React re-render per frame)
 *   ✓ Mobile-safe with auto board fallback
 */
import React, { useEffect, useState, useRef, useMemo } from "react";
import { getWorldState, subscribeWorldState } from "../lib/worldStateEngine";
import { REGION_COORDS, REGION_EN } from "../lib/world/eventPulseEngine";
import { useI18n } from "../i18n/I18nProvider";

/* ─── palette ─── */
const P = {
  bg: "#060a10",
  surface: "#0a0f1c",
  gold: "#f3d38a",
  blue: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a78bfa",
  text: "#e2e8f0",
  textDim: "#64748b",
  muted: "#475569",
};

/* ─── fixed hexagonal positions  —  viewBox 0 0 200 160 ───
 *
 *          أوروبا (73,32)          آسيا (127,32)
 *
 *  أمريكا ش. (45,80)    الأسواق (100,80)    الشرق الأوسط (155,80)
 *
 *        أمريكا ج. (73,128)     أفريقيا (127,128)
 *
 *  Min distance between any two nodes ≈ 55 SVG-units.
 */
const RADAR_POSITIONS = {
  "أمريكا الشمالية": { x: 45,  y: 80,  isCenter: false },
  "أوروبا":          { x: 73,  y: 32,  isCenter: false },
  "آسيا":            { x: 127, y: 32,  isCenter: false },
  "الشرق الأوسط":    { x: 155, y: 80,  isCenter: false },
  "أفريقيا":         { x: 127, y: 128, isCenter: false },
  "أمريكا الجنوبية":  { x: 73,  y: 128, isCenter: false },
  "الأسواق العالمية":  { x: 100, y: 80,  isCenter: true  },
};

const REGION_META = {
  "الشرق الأوسط":    { icon: "🕌", en: "Middle East",  short: "الشرق الأوسط" },
  "أوروبا":          { icon: "🏰", en: "Europe",       short: "أوروبا" },
  "آسيا":            { icon: "🏯", en: "Asia-Pacific",  short: "آسيا" },
  "أفريقيا":         { icon: "🌍", en: "Africa",       short: "أفريقيا" },
  "أمريكا الشمالية":  { icon: "🗽", en: "N. America",   short: "أمريكا ش." },
  "أمريكا الجنوبية":  { icon: "🌎", en: "S. America",   short: "أمريكا ج." },
  "الأسواق العالمية":  { icon: "💹", en: "Markets",      short: "الأسواق" },
};

/* ─── helpers ─── */
function pressureColor(p) {
  if (p >= 60) return P.red;
  if (p >= 40) return P.amber;
  if (p >= 20) return "#eab308";
  return P.green;
}
function pressureLabel(p, isAr) {
  if (p >= 60) return isAr ? "حرج"         : "Critical";
  if (p >= 40) return isAr ? "ضغط مرتفع"   : "High";
  if (p >= 20) return isAr ? "متوسط"       : "Moderate";
  if (p > 5)   return isAr ? "ضغط منخفض"   : "Low";
  return              isAr ? "مستقر"       : "Stable";
}
function trendArrow(p) {
  if (p >= 50) return "↑";
  if (p >= 30) return "↗";
  if (p >= 15) return "→";
  return "—";
}

/* ═══════════════════════════════════════════════════════════
   RadarNode — compact, layered SVG node for each region
   ═══════════════════════════════════════════════════════════ */
function RadarNode({ region, x, y, pressure, eventCount, isAr, isCenter }) {
  const color = pressureColor(pressure);
  const meta  = REGION_META[region] || {};
  const name  = isAr ? (meta.short || region) : (meta.en || region);
  const label = pressureLabel(pressure, isAr);
  const trend = trendArrow(pressure);
  const ringR = isCenter ? 9 : (8 + Math.min(pressure, 80) * 0.06);
  const isHot = pressure >= 40;
  const showPct = pressure > 5;

  return (
    <g style={{ cursor: "pointer" }}>
      {/* L2  ambient glow */}
      <circle cx={x} cy={y} r={ringR + 5} fill={`${color}05`} />

      {/* L3  pressure ring */}
      <circle cx={x} cy={y} r={ringR}
        fill={`${color}0c`}
        stroke={`${color}${isHot ? "50" : "25"}`}
        strokeWidth={isCenter ? 0.7 : 1.1}
        strokeDasharray={isHot ? "none" : "2,3"} />

      {/* L3  pulse wave (hot zones only) */}
      {isHot && (
        <circle cx={x} cy={y} r={ringR} fill="none"
          stroke={color} strokeWidth={0.5} opacity={0.22}>
          <animate attributeName="r"
            from={ringR} to={ringR + 8} dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            from="0.22" to="0" dur="3.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* L3  core dot */}
      <circle cx={x} cy={y} r={isCenter ? 1.6 : 2}
        fill={color} opacity={0.85}>
        {isHot && (
          <animate attributeName="r"
            values={isCenter ? "1.6;2.4;1.6" : "2;3;2"}
            dur="2s" repeatCount="indefinite" />
        )}
      </circle>

      {/* L4  region name */}
      <text x={x} y={y - ringR - 5} textAnchor="middle"
        fill={P.text} fontSize={isCenter ? 4.2 : 4.8}
        fontWeight={700} fontFamily="Inter, system-ui">
        {meta.icon || "🌐"} {name}
      </text>

      {/* L4  status label + trend */}
      <text x={x} y={y - ringR - 1} textAnchor="middle"
        fill={color} fontSize={3.3} fontWeight={600}
        fontFamily="Inter, system-ui" opacity={0.85}>
        {label} {trend}
      </text>

      {/* L4  pressure value inside ring (only when meaningful) */}
      {showPct ? (
        <text x={x} y={y + 1.8} textAnchor="middle"
          fill={color} fontSize={5} fontWeight={800}
          fontFamily="Inter, system-ui">
          {pressure}%
        </text>
      ) : (
        <text x={x} y={y + 1.5} textAnchor="middle"
          fill={P.muted} fontSize={3.3} fontWeight={600}
          fontFamily="Inter, system-ui">
          {isAr ? "مستقر" : "Stable"}
        </text>
      )}

      {/* L4  event count below ring (hidden when 0) */}
      {eventCount > 0 && (
        <text x={x} y={y + ringR + 4.5} textAnchor="middle"
          fill={P.textDim} fontSize={3.3} fontWeight={600}
          fontFamily="Inter, system-ui">
          {eventCount} {isAr ? "حدث" : "events"}
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   InfluenceArc — subtle dashed connection between regions
   ═══════════════════════════════════════════════════════════ */
function InfluenceArc({ fromX, fromY, toX, toY, color, strength }) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - 8 * strength;
  const opacity = 0.06 + strength * 0.16;
  return (
    <g>
      <path
        d={`M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`}
        fill="none" stroke={color}
        strokeWidth={0.4 + strength * 0.5}
        opacity={opacity} strokeDasharray="3,5">
        <animate attributeName="stroke-dashoffset"
          from="8" to="0" dur="3s" repeatCount="indefinite" />
      </path>
      <circle r={0.8} fill={color} opacity={opacity + 0.06}>
        <animateMotion dur="4s" repeatCount="indefinite"
          path={`M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`} />
      </circle>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   RegionCard — board-mode card for each region
   ═══════════════════════════════════════════════════════════ */
function RegionCard({ region, pressure, eventCount, isAr }) {
  const color = pressureColor(pressure);
  const meta  = REGION_META[region] || {};
  const name  = isAr ? (meta.short || region) : (meta.en || region);
  const label = pressureLabel(pressure, isAr);
  const trend = trendArrow(pressure);
  const showPct = pressure > 5;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${P.surface}, ${P.bg})`,
      border: `1px solid ${color}20`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      {/* top colour accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
      }} />

      {/* icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{name}</span>
      </div>

      {/* pressure bar */}
      <div style={{
        height: 4, borderRadius: 2, background: `${P.muted}30`, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${Math.max(pressure, 3)}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          transition: "width 0.8s ease",
        }} />
      </div>

      {/* pressure label + trend */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {showPct ? `${pressure}% · ` : ""}{label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: P.textDim }}>
          {trend}
        </span>
      </div>

      {/* event count */}
      {eventCount > 0 && (
        <div style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>
          {eventCount} {isAr ? "حدث نشط" : "active events"}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OrbitalPressureRadar — main export
   ═══════════════════════════════════════════════════════════ */
export default function OrbitalPressureRadar() {
  const { language } = useI18n();
  const isAr = language === "ar";
  const [ws, setWs]       = useState(null);
  const [mode, setMode]   = useState("radar");   // "radar" | "board"
  const containerRef      = useRef(null);
  const [isNarrow, setIsNarrow] = useState(false);

  /* data subscription */
  useEffect(() => {
    setWs(getWorldState());
    return subscribeWorldState(setWs);
  }, []);

  /* responsive width check */
  useEffect(() => {
    const check = () => {
      if (containerRef.current) setIsNarrow(containerRef.current.offsetWidth < 520);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* auto-switch to board on very small screens */
  useEffect(() => {
    if (isNarrow) setMode("board");
  }, [isNarrow]);

  if (!ws) return null;
  const { pulseData, regionalPressures, linkedDynamics } = ws;
  const { links = [], regionIntensity = {} } = pulseData || {};

  /* ─── build region node list (all 7 guaranteed) ─── */
  const regionNodes = useMemo(() => {
    const nodes = (regionalPressures || []).map(rp => {
      const pos = RADAR_POSITIONS[rp.region];
      if (!pos) return null;
      return { ...rp, x: pos.x, y: pos.y, isCenter: pos.isCenter };
    }).filter(Boolean);

    // fill any missing regions (ensures all 7 always render)
    Object.entries(RADAR_POSITIONS).forEach(([region, pos]) => {
      if (!nodes.find(n => n.region === region)) {
        const ri = regionIntensity[region] || {};
        nodes.push({
          region,
          regionEn: REGION_EN[region] || region,
          x: pos.x, y: pos.y,
          pressure: ri.avgSeverity || 0,
          eventCount: ri.count || 0,
          color: P.muted,
          isCenter: pos.isCenter,
        });
      }
    });
    return nodes;
  }, [regionalPressures, regionIntensity]);

  /* ─── remap link coords from eventPulseEngine → radar positions ─── */
  const radarLinks = useMemo(() => {
    if (!links.length) return [];
    const coordEntries = Object.entries(REGION_COORDS);
    const closest = (x, y) => {
      let best = null, d = Infinity;
      for (const [name, c] of coordEntries) {
        const dd = Math.hypot(c.x - x, c.y - y);
        if (dd < d) { d = dd; best = name; }
      }
      return best;
    };
    return links.map(lk => {
      const fr = RADAR_POSITIONS[closest(lk.fromX, lk.fromY)];
      const to = RADAR_POSITIONS[closest(lk.toX, lk.toY)];
      if (!fr || !to) return null;
      return { ...lk, fromX: fr.x, fromY: fr.y, toX: to.x, toY: to.y };
    }).filter(Boolean);
  }, [links]);

  const activeCount = regionNodes.filter(n => n.pressure > 0).length;

  return (
    <section ref={containerRef} style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
      {/* ─── HEADER ─── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, padding: "0 4px", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 900, letterSpacing: 4,
            color: P.gold, textTransform: "uppercase", marginBottom: 2,
          }}>
            {isAr ? "رادار الضغط العالمي" : "GLOBAL PRESSURE RADAR"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
            {isAr ? "أين يتصاعد الضغط العالمي؟" : "Where is global pressure rising?"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* mode toggle */}
          <div style={{
            display: "flex", borderRadius: 8, overflow: "hidden",
            border: `1px solid ${P.blue}15`,
          }}>
            {[
              { key: "radar", label: isAr ? "رادار مداري" : "Orbital" },
              { key: "board", label: isAr ? "لوحة المناطق" : "Board" },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)} style={{
                background: mode === m.key ? `${P.blue}15` : "transparent",
                color: mode === m.key ? P.blue : P.textDim,
                border: "none", cursor: "pointer",
                padding: "4px 12px", fontSize: 10, fontWeight: 700,
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { c: P.red,    l: isAr ? "حرج"   : "Critical" },
              { c: P.amber,  l: isAr ? "مرتفع" : "Rising"   },
              { c: "#eab308", l: isAr ? "متوسط" : "Moderate" },
              { c: P.green,  l: isAr ? "مستقر"  : "Stable"   },
            ].map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: it.c, opacity: 0.8 }} />
                <span style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>{it.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODE A — ORBITAL RADAR ═══ */}
      {mode === "radar" && (
        <div style={{
          background: `linear-gradient(160deg, ${P.bg}, ${P.surface})`,
          border: "1px solid rgba(56,189,248,0.06)",
          borderRadius: 20, overflow: "hidden", position: "relative",
        }}>
          {/* dot-grid backdrop */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.012) 1px, transparent 1px)",
            backgroundSize: "14px 14px", pointerEvents: "none",
          }} />

          <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", display: "block", minHeight: 300, maxHeight: 520 }}>
            <defs>
              <radialGradient id="orb-scan-glow">
                <stop offset="0%" stopColor="rgba(56,189,248,0.03)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* L1  orbital guide rings */}
            {[55, 38, 20].map((r, i) => (
              <circle key={i} cx="100" cy="80" r={r} fill="none"
                stroke={`rgba(56,189,248,${0.035 - i * 0.008})`}
                strokeWidth="0.3" strokeDasharray="3,6" />
            ))}

            {/* L1  cross-hairs */}
            <line x1="100" y1="15" x2="100" y2="145"
              stroke="rgba(56,189,248,0.018)" strokeWidth="0.3" />
            <line x1="30" y1="80" x2="170" y2="80"
              stroke="rgba(56,189,248,0.018)" strokeWidth="0.3" />

            {/* L1  scan line — SVG-native rotation, zero React re-renders */}
            <g>
              <line x1="100" y1="80" x2="162" y2="80"
                stroke="rgba(56,189,248,0.07)" strokeWidth="0.4" />
              <animateTransform attributeName="transform" type="rotate"
                from="0 100 80" to="360 100 80" dur="120s" repeatCount="indefinite" />
            </g>
            <circle cx="100" cy="80" r="62"
              fill="url(#orb-scan-glow)" opacity="0.3" />

            {/* L1  center marker */}
            <circle cx="100" cy="80" r="1.5" fill={P.blue} opacity="0.12" />
            <circle cx="100" cy="80" r="0.6" fill={P.blue} opacity="0.25" />

            {/* L5  influence arcs (rendered below nodes) */}
            {radarLinks.map((lk, i) => (
              <InfluenceArc key={i}
                fromX={lk.fromX} fromY={lk.fromY}
                toX={lk.toX}   toY={lk.toY}
                color={lk.color} strength={lk.strength} />
            ))}

            {/* L2–L4  region nodes (center drawn last = on top) */}
            {regionNodes
              .sort((a, b) => (a.isCenter ? 1 : 0) - (b.isCenter ? 1 : 0))
              .map((n, i) => (
                <RadarNode key={n.region || i}
                  region={n.region} x={n.x} y={n.y}
                  pressure={n.pressure} eventCount={n.eventCount}
                  isAr={isAr} isCenter={n.isCenter} />
              ))}
          </svg>

          {/* bottom status */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid rgba(56,189,248,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 10, color: P.textDim, fontWeight: 600 }}>
              {isAr
                ? `${regionNodes.length} مناطق · ${activeCount} نشطة · ${radarLinks.length} ترابط`
                : `${regionNodes.length} regions · ${activeCount} active · ${radarLinks.length} links`}
            </span>
            <span style={{ fontSize: 10, color: P.muted, fontWeight: 600 }}>
              📡 {isAr ? "رادار مداري مباشر" : "Live orbital radar"}
            </span>
          </div>
        </div>
      )}

      {/* ═══ MODE B — BOARD LAYOUT ═══ */}
      {mode === "board" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isNarrow
            ? "1fr 1fr"
            : "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}>
          {regionNodes
            .sort((a, b) => b.pressure - a.pressure)
            .map(n => (
              <RegionCard key={n.region}
                region={n.region} pressure={n.pressure}
                eventCount={n.eventCount} isAr={isAr} />
            ))}
        </div>
      )}

      {/* dynamic chains */}
      {linkedDynamics && linkedDynamics.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {linkedDynamics.slice(0, 4).map((ch, i) => (
            <div key={ch.id || i} style={{
              background: `${ch.color}08`,
              border: `1px solid ${ch.color}18`,
              borderRadius: 10, padding: "6px 12px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{ch.icon}</span>
              <span style={{ fontSize: 11, color: P.text, fontWeight: 600 }}>
                {isAr ? ch.nameAr : ch.nameEn}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800, color: ch.color,
                background: `${ch.color}12`, borderRadius: 4, padding: "1px 6px",
              }}>
                {ch.strength}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
