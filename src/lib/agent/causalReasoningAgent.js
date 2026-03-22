/**
 * Causal Reasoning Agent — identifies cause-effect relationships between events
 * and explains WHY escalation or change is happening.
 *
 * Causal rules: war→oil rise, sanctions→currency pressure, elections→policy shift,
 * military mobilization→regional tension, and many more.
 */

import { agentMemory } from "./memoryAgent";

// ── Causal rule definitions ──────────────────────────────────────────────────
// Each rule: trigger keywords (cause), effect keywords, human-readable explanation
const CAUSAL_RULES = [
  {
    id: "war_oil",
    causeKeywords:  ["war","invasion","airstrike","missile","attack","حرب","غزو","غارة","صاروخ","هجوم"],
    effectKeywords: ["oil","energy","barrel","نفط","طاقة","برميل"],
    causeLabel:     "نزاع مسلح",
    effectLabel:    "ارتفاع أسعار النفط",
    explanation:    "النزاعات المسلحة في مناطق الإنتاج تعطل سلاسل التوريد وترفع أسعار الطاقة.",
    explanationEn:  "Armed conflict in production regions disrupts supply chains and drives energy prices higher.",
    confidence:     0.85,
    impactDelay:    "24–72 hours",
  },
  {
    id: "sanctions_currency",
    causeKeywords:  ["sanctions","embargo","عقوبات","حصار"],
    effectKeywords: ["currency","inflation","dollar","exchange","عملة","تضخم","دولار","صرف"],
    causeLabel:     "فرض العقوبات",
    effectLabel:    "ضغط على العملة الوطنية",
    explanation:    "العقوبات الاقتصادية تقطع وصول الدولة إلى الأسواق الدولية مسببةً انهياراً في قيمة العملة.",
    explanationEn:  "Economic sanctions cut market access and capital flows, causing currency devaluation.",
    confidence:     0.80,
    impactDelay:    "days to weeks",
  },
  {
    id: "elections_policy",
    causeKeywords:  ["election","vote","انتخاب","تصويت","اقتراع"],
    effectKeywords: ["policy","reform","government","minister","سياسة","إصلاح","حكومة","وزير"],
    causeLabel:     "انتخابات",
    effectLabel:    "تحول في السياسات",
    explanation:    "نتائج الانتخابات تعيد رسم التوجهات الحكومية وتؤدي إلى مراجعة السياسات الداخلية والخارجية.",
    explanationEn:  "Election outcomes reshape government priorities and trigger policy reviews.",
    confidence:     0.75,
    impactDelay:    "weeks to months",
  },
  {
    id: "military_tension",
    causeKeywords:  ["troops","military","mobilization","deployment","قوات","عسكري","حشد","نشر"],
    effectKeywords: ["tension","crisis","escalation","regional","توتر","أزمة","تصعيد","إقليمي"],
    causeLabel:     "تحريك عسكري",
    effectLabel:    "توتر إقليمي",
    explanation:    "تحريك القوات العسكرية ونشرها يُصعّد حالة الاستنفار الإقليمي ويرفع أسهم المواجهة.",
    explanationEn:  "Military troop movements raise regional alert levels and increase confrontation risk.",
    confidence:     0.88,
    impactDelay:    "immediate to 48 hours",
  },
  {
    id: "ceasefire_calm",
    causeKeywords:  ["ceasefire","truce","peace","negotiation","هدنة","وقف إطلاق النار","مفاوضات","سلام"],
    effectKeywords: ["calm","stability","market","recovery","هدوء","استقرار","سوق","تعافٍ"],
    causeLabel:     "وقف إطلاق النار",
    effectLabel:    "هدوء نسبي وانتعاش الأسواق",
    explanation:    "الهدن وصفقات السلام تُخفض حدة المخاطر الجيوسياسية وتُعيد الثقة إلى الأسواق.",
    explanationEn:  "Ceasefires reduce geopolitical risk premiums and restore market confidence.",
    confidence:     0.78,
    impactDelay:    "immediate to 24 hours",
  },
  {
    id: "energy_inflation",
    causeKeywords:  ["oil","opec","barrel","energy","نفط","أوبك","برميل","طاقة"],
    effectKeywords: ["inflation","price","cost","تضخم","أسعار","تكلفة"],
    causeLabel:     "ارتفاع أسعار الطاقة",
    effectLabel:    "ضغوط تضخمية",
    explanation:    "ارتفاع أسعار النفط يرفع تكاليف الإنتاج والشحن مما يُغذي الضغوط التضخمية عالمياً.",
    explanationEn:  "Rising energy prices inflate production and shipping costs, feeding global inflationary pressure.",
    confidence:     0.82,
    impactDelay:    "weeks",
  },
  {
    id: "political_crisis_flight",
    causeKeywords:  ["coup","collapse","protest","crisis","انقلاب","انهيار","احتجاج","أزمة"],
    effectKeywords: ["market","dollar","investment","investor","stock","سوق","دولار","استثمار","مستثمر","أسهم"],
    causeLabel:     "أزمة سياسية",
    effectLabel:    "هروب رأس المال",
    explanation:    "عدم الاستقرار السياسي يُحفزّ المستثمرين على تحويل رأس المال إلى ملاذات آمنة.",
    explanationEn:  "Political instability drives capital flight to safe-haven assets.",
    confidence:     0.76,
    impactDelay:    "hours to days",
  },
  {
    id: "drought_food",
    causeKeywords:  ["drought","famine","flood","climate","جفاف","مجاعة","فيضان","مناخ"],
    effectKeywords: ["food","wheat","grain","prices","غذاء","قمح","حبوب","أسعار"],
    causeLabel:     "أزمة مناخية",
    effectLabel:    "اضطراب سلسلة الغذاء",
    explanation:    "الأزمات المناخية تعطل المحاصيل الزراعية وتدفع أسعار الغذاء نحو الارتفاع.",
    explanationEn:  "Climate crises disrupt agricultural production and push food prices higher.",
    confidence:     0.70,
    impactDelay:    "weeks to months",
  },
];

// ── Match helper ─────────────────────────────────────────────────────────────
function matchesRule(item, rule) {
  const text = `${item.title || ""} ${item.text || ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
  const causeMatch  = rule.causeKeywords.some(k  => text.includes(k.toLowerCase()));
  const effectMatch = rule.effectKeywords.some(k => text.includes(k.toLowerCase()));
  return { causeMatch, effectMatch, bothMatch: causeMatch && effectMatch };
}

// ── Cross-item causal link detector ─────────────────────────────────────────
function detectCrossItemCause(causeItem, effectItem, rule) {
  const cText = `${causeItem.title || ""} ${causeItem.text || ""}`.toLowerCase();
  const eText = `${effectItem.title || ""} ${effectItem.text || ""}`.toLowerCase();
  const causeMatch  = rule.causeKeywords.some(k  => cText.includes(k.toLowerCase()));
  const effectMatch = rule.effectKeywords.some(k => eText.includes(k.toLowerCase()));
  return causeMatch && effectMatch;
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Analyze causal relationships in recent events.
 * Returns detected causal links, explanations, and dominant causal chains.
 */
export function analyzeCausalRelationships() {
  const all = agentMemory.getItems();
  const recent = all
    .filter(i => {
      try { return (Date.now() - new Date(i.timestamp).getTime()) < 48 * 3600 * 1000; }
      catch { return false; }
    })
    .slice(-150);

  const detectedLinks = [];

  // ── (A) Self-contained causal events (both cause + effect in one item) ────
  for (const item of recent) {
    for (const rule of CAUSAL_RULES) {
      const { bothMatch } = matchesRule(item, rule);
      if (bothMatch) {
        detectedLinks.push({
          ruleId:       rule.id,
          type:         "self_contained",
          causeLabel:   rule.causeLabel,
          effectLabel:  rule.effectLabel,
          explanation:  rule.explanation,
          explanationEn: rule.explanationEn,
          confidence:   rule.confidence,
          impactDelay:  rule.impactDelay,
          sourceItemId: item.id,
          sourceTitle:  item.title || item.text?.slice(0, 80) || "",
          region:       item.region?.[0] || "Global",
          severity:     item.urgency === "high" ? 9 : item.urgency === "medium" ? 6 : 3,
          timestamp:    item.timestamp,
        });
      }
    }
  }

  // ── (B) Cross-item causal pairs ──────────────────────────────────────────
  for (let i = 0; i < Math.min(recent.length, 50); i++) {
    for (let j = i + 1; j < Math.min(recent.length, 50); j++) {
      for (const rule of CAUSAL_RULES) {
        if (detectCrossItemCause(recent[i], recent[j], rule)) {
          // Ensure causal order (earlier event is cause)
          const earlier = new Date(recent[i].timestamp) < new Date(recent[j].timestamp) ? recent[i] : recent[j];
          const later   = earlier === recent[i] ? recent[j] : recent[i];
          detectedLinks.push({
            ruleId:       rule.id,
            type:         "cross_item",
            causeLabel:   rule.causeLabel,
            effectLabel:  rule.effectLabel,
            explanation:  rule.explanation,
            explanationEn: rule.explanationEn,
            confidence:   rule.confidence * 0.9, // slightly lower for cross-item
            impactDelay:  rule.impactDelay,
            causeItemId:  earlier.id,
            effectItemId: later.id,
            causeTitle:   earlier.title || earlier.text?.slice(0, 60) || "",
            effectTitle:  later.title   || later.text?.slice(0, 60)   || "",
            region:       earlier.region?.[0] || "Global",
            severity:     Math.max(
              earlier.urgency === "high" ? 9 : 5,
              later.urgency   === "high" ? 9 : 5
            ),
            timestamp:    later.timestamp,
          });
        }
      }
    }
  }

  // ── Deduplicate by ruleId keeping highest-confidence for each region ──────
  const seen = new Map();
  const deduplicated = [];
  for (const link of detectedLinks) {
    const key = `${link.ruleId}::${link.region}`;
    if (!seen.has(key) || seen.get(key).confidence < link.confidence) {
      seen.set(key, link);
    }
  }
  seen.forEach(link => deduplicated.push(link));

  // Sort by severity desc
  deduplicated.sort((a, b) => b.severity - a.severity || b.confidence - a.confidence);

  // ── Dominant causal chain ────────────────────────────────────────────────
  // Find the most repeated rule across all links
  const ruleCounts = {};
  deduplicated.forEach(l => { ruleCounts[l.ruleId] = (ruleCounts[l.ruleId] || 0) + 1; });
  const dominantRuleId = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantRule = CAUSAL_RULES.find(r => r.id === dominantRuleId);

  return {
    links:         deduplicated.slice(0, 20),
    totalFound:    deduplicated.length,
    dominantCause: dominantRule ? {
      causeLabel:  dominantRule.causeLabel,
      effectLabel: dominantRule.effectLabel,
      explanation: dominantRule.explanation,
      count:       ruleCounts[dominantRuleId] || 0,
    } : null,
    analysisTimestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dubai" }),
  };
}
