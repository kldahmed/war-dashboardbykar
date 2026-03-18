/**
 * stateIndicators.js — Ensures the radar system NEVER displays raw zeros or empty values.
 * Every value communicates a meaningful state.
 */

/**
 * Convert a numeric value (0-100) to a meaningful state label.
 * Never returns "0%" — always a human-readable status.
 */
export function valueToStateLabel(value, domain = "general", language = "ar") {
  const v = typeof value === "number" ? value : 0;

  const STATES = {
    general: {
      ranges: [
        { max: 5,   ar: "مستقر", en: "Stable" },
        { max: 15,  ar: "ضغط منخفض", en: "Low Pressure" },
        { max: 35,  ar: "نشاط معتدل", en: "Moderate Activity" },
        { max: 55,  ar: "إشارات صاعدة", en: "Rising Signals" },
        { max: 75,  ar: "ضغط مرتفع", en: "High Pressure" },
        { max: 100, ar: "مستوى حرج", en: "Critical Level" },
      ]
    },
    tension: {
      ranges: [
        { max: 5,   ar: "هدوء تام", en: "Full Calm" },
        { max: 18,  ar: "مستقر", en: "Stable" },
        { max: 35,  ar: "توتر طفيف", en: "Mild Tension" },
        { max: 55,  ar: "توتر متصاعد", en: "Rising Tension" },
        { max: 75,  ar: "توتر مرتفع", en: "High Tension" },
        { max: 100, ar: "توتر حرج", en: "Critical Tension" },
      ]
    },
    economic: {
      ranges: [
        { max: 5,   ar: "أسواق مستقرة", en: "Markets Stable" },
        { max: 20,  ar: "ضغط خفيف", en: "Light Pressure" },
        { max: 40,  ar: "حساسية معتدلة", en: "Moderate Sensitivity" },
        { max: 60,  ar: "ضغط اقتصادي", en: "Economic Pressure" },
        { max: 80,  ar: "ضغط شديد", en: "Severe Pressure" },
        { max: 100, ar: "أزمة اقتصادية", en: "Economic Crisis" },
      ]
    },
    events: {
      ranges: [
        { max: 3,   ar: "هدوء نسبي", en: "Relative Calm" },
        { max: 10,  ar: "أحداث محدودة", en: "Limited Events" },
        { max: 25,  ar: "نشاط ملحوظ", en: "Notable Activity" },
        { max: 50,  ar: "أحداث متعددة", en: "Multiple Events" },
        { max: 100, ar: "نشاط مكثف", en: "Intense Activity" },
      ]
    },
    signals: {
      ranges: [
        { max: 3,   ar: "رصد أولي", en: "Initial Scan" },
        { max: 10,  ar: "إشارات مبكرة", en: "Early Signals" },
        { max: 25,  ar: "إشارات نشطة", en: "Active Signals" },
        { max: 50,  ar: "إشارات متعددة", en: "Multiple Signals" },
        { max: 100, ar: "إشارات مكثفة", en: "Intense Signals" },
      ]
    },
    region: {
      ranges: [
        { max: 5,   ar: "مستقر", en: "Stable" },
        { max: 20,  ar: "ضغط منخفض", en: "Low Pressure" },
        { max: 40,  ar: "نشاط معتدل", en: "Moderate Activity" },
        { max: 60,  ar: "ضغط متصاعد", en: "Rising Pressure" },
        { max: 80,  ar: "ضغط مرتفع", en: "High Pressure" },
        { max: 100, ar: "منطقة حرجة", en: "Critical Zone" },
      ]
    },
  };

  const domainStates = STATES[domain] || STATES.general;
  for (const range of domainStates.ranges) {
    if (v <= range.max) return language === "ar" ? range.ar : range.en;
  }
  return language === "ar" ? "مستقر" : "Stable";
}

/**
 * Format a count value — never show raw "0".
 * Returns { display, label } where display is the visual string
 * and label is a contextual description.
 */
export function formatCount(count, type = "events", language = "ar") {
  const n = typeof count === "number" ? count : 0;

  if (n === 0) {
    const ZERO_LABELS = {
      events:  { ar: "هدوء نسبي", en: "Relative Calm" },
      signals: { ar: "جاري الرصد", en: "Scanning" },
      alerts:  { ar: "لا تنبيهات", en: "All Clear" },
      links:   { ar: "مستقل", en: "Independent" },
      pressure:{ ar: "مستقر", en: "Stable" },
    };
    const lbl = ZERO_LABELS[type] || ZERO_LABELS.events;
    return {
      display: language === "ar" ? lbl.ar : lbl.en,
      isZero: true,
      raw: 0,
    };
  }

  return {
    display: String(n),
    isZero: false,
    raw: n,
  };
}

/**
 * Format a percentage — never show "0%".
 */
export function formatPercent(value, domain = "general", language = "ar") {
  const v = typeof value === "number" ? value : 0;

  if (v === 0 || v < 2) {
    return {
      display: valueToStateLabel(v, domain, language),
      isZero: true,
      raw: v,
    };
  }

  return {
    display: `${v}%`,
    isZero: false,
    raw: v,
  };
}

/**
 * Compute WORLD RISK LEVEL — a comprehensive geopolitical + economic pressure summary.
 * Aggregates tension, economic pressure, event intensity, and signal density.
 * Returns { value, label, labelEn, color, level, description, descriptionEn }
 */
export function computeWorldRiskLevel(worldState) {
  if (!worldState) {
    return {
      value: 8,
      label: "مستقر",
      labelEn: "Stable",
      color: "#22c55e",
      level: 1,
      description: "النظام مستقر — لم تُرصد مخاطر عالمية كبيرة",
      descriptionEn: "System stable — no major global risks detected",
    };
  }

  const tension = worldState.tension?.value || 0;
  const economic = worldState.economic?.value || 0;
  const eventIntensity = worldState.eventIntensity?.value || 0;
  const totalEvents = worldState.totalEvents || 0;
  const totalIntel = worldState.totalIntelItems || 0;

  // Regional pressure aggregation
  const regPressures = worldState.regionalPressures || [];
  const avgRegPressure = regPressures.length
    ? regPressures.reduce((s, r) => s + (r.pressure || 0), 0) / regPressures.length
    : 0;

  // Weighted composite
  const raw = (
    tension * 0.30 +
    economic * 0.20 +
    eventIntensity * 0.20 +
    avgRegPressure * 0.15 +
    Math.min(totalEvents * 0.8, 15) * 0.15
  );

  // Dampened value — never hits 100, minimum is 5 (never appears dead)
  const value = Math.max(5, Math.min(95, Math.round(raw)));

  if (value >= 72) {
    return {
      value, label: "خطر حرج", labelEn: "Critical Risk", color: "#ef4444", level: 5,
      description: "تتقاطع عدة أزمات — الوضع العالمي يتطلب مراقبة مستمرة",
      descriptionEn: "Multiple crises converging — global situation requires continuous monitoring",
    };
  }
  if (value >= 55) {
    return {
      value, label: "خطر مرتفع", labelEn: "High Risk", color: "#f97316", level: 4,
      description: "إشارات قوية من مناطق متعددة — ضغط جيوسياسي واقتصادي متزامن",
      descriptionEn: "Strong signals from multiple regions — concurrent geopolitical and economic pressure",
    };
  }
  if (value >= 38) {
    return {
      value, label: "خطر معتدل", labelEn: "Moderate Risk", color: "#f59e0b", level: 3,
      description: "نشاط عالمي ملحوظ مع بؤر توتر محددة",
      descriptionEn: "Notable global activity with specific tension hotspots",
    };
  }
  if (value >= 20) {
    return {
      value, label: "خطر منخفض", labelEn: "Low Risk", color: "#38bdf8", level: 2,
      description: "ضغط عالمي خفيف — إشارات نشطة لكن محدودة",
      descriptionEn: "Light global pressure — active but limited signals",
    };
  }
  return {
    value, label: "مستقر", labelEn: "Stable", color: "#22c55e", level: 1,
    description: "النظام مستقر — لم تُرصد مخاطر عالمية كبيرة",
    descriptionEn: "System stable — no major global risks detected",
  };
}

/**
 * Generate a signal evolution timeline — shows how signals changed over time.
 * Returns array of time-bucketed snapshots.
 */
export function generateSignalEvolution(signals, bucketHours = 3) {
  if (!signals || !signals.length) {
    // Even with no signals, show meaningful "scanning" state
    const now = Date.now();
    return Array.from({ length: 8 }, (_, i) => ({
      time: new Date(now - (7 - i) * bucketHours * 3600000).toISOString(),
      label: formatTimeLabel(new Date(now - (7 - i) * bucketHours * 3600000)),
      count: 0,
      avgScore: 0,
      stateLabel: "جاري الرصد",
      stateLabelEn: "Scanning",
      topCategory: null,
      color: "#1e293b",
    }));
  }

  const now = Date.now();
  const bucketMs = bucketHours * 3600000;
  const bucketCount = 8;
  const buckets = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = now - (bucketCount - i) * bucketMs;
    const end = start + bucketMs;
    const inBucket = signals.filter(s => {
      try {
        const ts = new Date(s.timestamp).getTime();
        return ts >= start && ts < end;
      } catch { return false; }
    });

    const avgScore = inBucket.length
      ? Math.round(inBucket.reduce((s, sig) => s + (sig.radarScore || 0), 0) / inBucket.length)
      : 0;

    // Category distribution
    const catCounts = {};
    inBucket.forEach(s => {
      const cat = s.category || "أحداث عالمية";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const stateLabel = inBucket.length === 0 ? "هدوء" :
      avgScore >= 65 ? "تصعيد" :
      avgScore >= 40 ? "نشاط متوسط" :
      "إشارات خفيفة";

    const stateLabelEn = inBucket.length === 0 ? "Calm" :
      avgScore >= 65 ? "Escalation" :
      avgScore >= 40 ? "Moderate" :
      "Low Activity";

    const color = inBucket.length === 0 ? "#1e293b" :
      avgScore >= 65 ? "#ef4444" :
      avgScore >= 40 ? "#f59e0b" :
      "#38bdf8";

    buckets.push({
      time: new Date(start).toISOString(),
      label: formatTimeLabel(new Date(start)),
      count: inBucket.length,
      avgScore,
      stateLabel,
      stateLabelEn,
      topCategory: topCat,
      color,
    });
  }

  return buckets;
}

function formatTimeLabel(date) {
  try {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch { return "--:--"; }
}

/**
 * Generate situational awareness statement from signals and world state.
 * AI-style short analytical sentences explaining cause and implication.
 */
export function generateSituationalStatement(worldState, signals, language = "ar") {
  const statements = [];

  // Core tension driver
  const tension = worldState?.tension;
  if (tension && tension.value >= 5) {
    if (tension.value >= 60) {
      statements.push({
        ar: `⚠️ التوتر العالمي عند مستوى ${tension.label} (${tension.value}%) — مدفوع بأحداث متعددة تتطلب مراقبة مستمرة.`,
        en: `⚠️ Global tension at ${tension.labelEn} level (${tension.value}%) — driven by multiple events requiring continuous monitoring.`,
        type: "critical",
      });
    } else if (tension.value >= 30) {
      statements.push({
        ar: `🟡 التوتر العالمي عند ${tension.value}% — مؤشرات نشطة لكن لا تصعيد حاد.`,
        en: `🟡 Global tension at ${tension.value}% — active indicators but no sharp escalation.`,
        type: "warning",
      });
    } else {
      statements.push({
        ar: `🟢 الوضع العالمي هادئ نسبيًا — التوتر عند ${tension.value}%.`,
        en: `🟢 Global situation relatively calm — tension at ${tension.value}%.`,
        type: "stable",
      });
    }
  } else {
    statements.push({
      ar: "🟢 النظام في حالة رصد — لا تُسجل إشارات تصعيد.",
      en: "🟢 System in monitoring state — no escalation signals recorded.",
      type: "stable",
    });
  }

  // Economic implication
  const economic = worldState?.economic;
  if (economic && economic.value >= 20) {
    statements.push({
      ar: `📊 الأثر الاقتصادي: ${economic.label} — قد يؤثر على سلاسل الإمداد والأسواق الإقليمية.`,
      en: `📊 Economic impact: ${economic.labelEn} — may affect supply chains and regional markets.`,
      type: "economic",
    });
  }

  // Regional hotspot
  const activeRegion = worldState?.activeRegion;
  if (activeRegion && activeRegion.region !== "—") {
    statements.push({
      ar: `📍 البؤرة الأنشط: ${activeRegion.region} — تتركز فيها الإشارات الأقوى حاليًا.`,
      en: `📍 Most active hotspot: ${activeRegion.region} — strongest signals concentrated here.`,
      type: "regional",
    });
  }

  // Signal evolution 
  if (signals && signals.length > 0) {
    const recentHigh = signals.filter(s => s.radarScore >= 65).length;
    if (recentHigh >= 3) {
      statements.push({
        ar: `🔴 ${recentHigh} إشارات عالية الشدة مرصودة — تشير إلى تقاطع أزمات محتملة.`,
        en: `🔴 ${recentHigh} high-severity signals detected — indicating potential crisis convergence.`,
        type: "critical",
      });
    } else if (signals.length >= 10) {
      statements.push({
        ar: `📶 ${signals.length} إشارة نشطة — تغطية واسعة لمصادر متعددة.`,
        en: `📶 ${signals.length} active signals — broad coverage from multiple sources.`,
        type: "info",
      });
    }
  }

  return statements;
}
