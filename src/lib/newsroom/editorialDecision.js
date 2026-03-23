/**
 * editorialDecision.js
 *
 * Implements the A–K editorial analysis framework for every incoming story.
 * Produces:
 *  - A structured editorial report (A through K)
 *  - A recommended editorial action (ignore / monitor / save / short / merge
 *    / publish / breakingUpgrade / liveCoverage / featured / alert / analysis / fullCoverage)
 *  - A "priority score" derivative aligned with the orchestration engine
 *  - Content type classification: breaking / confirmed / unverified / analysis /
 *    follow-up / summary / background
 *
 * Verification states:
 *  confirmed        — multi-source OR official body, high trust
 *  likely           — single high-trust source, no contradiction
 *  under_review     — single lower-trust source OR contradicting signals
 *  insufficient     — not enough to publish prominently
 *  rejected         — fails quality / credibility thresholds
 */

import { getSourceProfile, isSpecializedInCategory } from "./sourceRegistry";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPE_MAP = {
  breaking:    { ar: "عاجل",          en: "Breaking" },
  confirmed:   { ar: "مؤكد",          en: "Confirmed" },
  under_review:{ ar: "قيد التحقق",    en: "Under Review" },
  analysis:    { ar: "تحليل",          en: "Analysis" },
  follow_up:   { ar: "متابعة",         en: "Follow-up" },
  summary:     { ar: "ملخص",           en: "Summary" },
  background:  { ar: "خلفية",          en: "Background" },
};

const ACTION_MAP = {
  ignore:         { ar: "تجاهل",                  en: "Ignore" },
  monitor:        { ar: "مراقبة",                 en: "Monitor" },
  save:           { ar: "حفظ كإشارة",              en: "Save as signal" },
  short:          { ar: "مادة قصيرة",              en: "Short post" },
  merge:          { ar: "دمج مع حدث قائم",         en: "Merge with existing event" },
  publish:        { ar: "نشر مستقل",               en: "Publish standalone" },
  breakingUpgrade:{ ar: "ترقية إلى عاجل",          en: "Upgrade to breaking" },
  liveCoverage:   { ar: "فتح متابعة حية",          en: "Open live coverage" },
  featured:       { ar: "إبراز على الرئيسية",       en: "Feature on homepage" },
  alert:          { ar: "إرسال تنبيه",              en: "Send alert" },
  analysis:       { ar: "اقتراح تحليل أو خلفية",   en: "Suggest analysis / background" },
  fullCoverage:   { ar: "إنشاء حزمة تغطية شاملة",  en: "Full coverage package" },
};

const PLACEMENT_MAP = {
  top_hero:       { ar: "الخبر الرئيسي الأول",     en: "Top hero" },
  breaking_strip: { ar: "شريط العاجل",              en: "Breaking strip" },
  featured:       { ar: "أبرز القصص",              en: "Featured stories" },
  latest:         { ar: "آخر الأخبار",             en: "Latest news" },
  category:       { ar: "قسم التصنيف",             en: "Category section" },
  sidebar:        { ar: "الشريط الجانبي",           en: "Sidebar" },
  hide:           { ar: "مخفي",                    en: "Hidden" },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function detect(text = "", keywords = []) {
  const lowered = String(text || "").toLowerCase();
  return keywords.filter((k) => lowered.includes(k)).length;
}

function conflictingSignals(story = {}) {
  const text = `${story?.title || ""} ${story?.summary || ""}`;
  return /reportedly|unconfirmed|allegedly|شائعات|غير مؤكد|يُقال|وفق مصادر لم يُكشف/i.test(text);
}

function isOfficialSource(source = "") {
  const lowered = String(source || "").toLowerCase();
  return /wam|spa|official|ministry|وزارة|government|سفارة|embassy|central bank/.test(lowered);
}

// ── A through K analysis ──────────────────────────────────────────────────────

function analyzeA_Event(story = {}) {
  return {
    title: String(story?.title || ""),
    category: String(story?.category || "general"),
    source: String(story?.source || "unknown"),
  };
}

function analyzeB_Importance(story = {}) {
  const text = `${story?.title || ""} ${story?.summary || ""}`;
  const urgentHits = detect(text, ["عاجل", "حرب", "هجوم", "انفجار", "زلزال", "كارثة", "urgent", "war", "attack", "explosion", "disaster", "strike"]);
  const highHits = detect(text, ["انتخابات", "اتفاق", "عقوبات", "ميزانية", "election", "deal", "sanctions", "budget", "summit", "اجتماع طارئ"]);
  const economicHits = detect(text, ["نفط", "غاز", "بورصة", "فائدة", "oil", "gas", "market", "inflation", "تضخم", "dollar", "دولار"]);

  let level = "low";
  if (urgentHits >= 1) level = "critical";
  else if (highHits >= 2 || economicHits >= 2) level = "high";
  else if (highHits >= 1 || economicHits >= 1) level = "medium";

  return { level, urgentHits, highHits, economicHits };
}

function analyzeC_SourceTrust(story = {}) {
  const profile = getSourceProfile(story?.source || "");
  const official = isOfficialSource(story?.source || "");
  const specialMatch = isSpecializedInCategory(story?.source || "", story?.category || "");

  return {
    score: profile.trust,
    isKnown: profile.isKnown,
    isOfficial: official,
    isSpecialized: specialMatch,
    duplicateTendency: profile.duplicateTendency,
    label: profile.trust >= 0.90 ? "elite" : profile.trust >= 0.80 ? "reliable" : profile.trust >= 0.65 ? "acceptable" : "low",
  };
}

function analyzeD_Novelty(story = {}) {
  const duplicateRiskScore = Number(story?.duplicateRiskScore || 0);
  const clusterSize = Number(story?.clusterSize || 1);
  const isNew = clusterSize <= 1 && duplicateRiskScore < 40;
  const isUpdate = clusterSize > 1 || (story?.whatChanged && story.whatChanged !== "single-source update");
  const isRepublish = duplicateRiskScore >= 70;

  return {
    isNew,
    isUpdate,
    isRepublish,
    clusterSize,
    duplicateRiskScore,
    category: isRepublish ? "republish" : isUpdate ? "update" : "new",
  };
}

function analyzeE_CoverageAngle(story = {}) {
  const text = `${story?.title || ""} ${story?.summary || ""}`.toLowerCase();
  const isAnalysis = /تحليل|analysis|رأي|opinion|منظور|perspective|وراء الكواليس|behind the scenes/.test(text);
  const isBackground = /خلفية|background|تاريخ|history|context|سياق/.test(text);
  const isSummary = /ملخص|summary|roundup|نظرة عامة|overview/.test(text);

  if (isAnalysis) return "analysis";
  if (isBackground) return "background";
  if (isSummary) return "summary";
  return "news";
}

function analyzeF_Placement(importance = {}, trust = {}, novelty = {}) {
  if (novelty.isRepublish) return "hide";
  if (importance.level === "critical" && trust.score >= 0.85) return "top_hero";
  if (importance.level === "critical") return "breaking_strip";
  if (importance.level === "high" && trust.score >= 0.80) return "featured";
  if (importance.level === "medium" && trust.score >= 0.75) return "featured";
  if (importance.level === "medium") return "latest";
  return "category";
}

function analyzeG_VisualFormat(story = {}, importance = {}) {
  const hasImage = Boolean(story?.image || story?.image_url);
  const hasVideo = Boolean(story?.video_url || story?.youtubeId);
  const hasBroadcast = Boolean(story?.channelId);
  if (hasBroadcast) return "broadcast_card";
  if (hasVideo) return "video_card";
  if (importance.level === "critical") return "full_hero";
  if (hasImage) return "image_card";
  return "text_card";
}

function analyzeH_AlertNeeded(importance = {}, trust = {}, novelty = {}) {
  return (
    importance.level === "critical"
    && trust.score >= 0.80
    && !novelty.isRepublish
  );
}

function analyzeI_LiveCoverage(importance = {}, story = {}) {
  const text = `${story?.title || ""} ${story?.summary || ""}`.toLowerCase();
  const liveKeywords = detect(text, ["حرب", "زلزال", "إعصار", "كارثة", "war", "earthquake", "storm", "disaster", "emergency", "طوارئ"]);
  return importance.level === "critical" && liveKeywords >= 1;
}

function analyzeJ_AudienceImpact(story = {}, importance = {}) {
  const ctrPotential = importance.level === "critical" ? "very_high" : importance.level === "high" ? "high" : "medium";
  const retentionPotential = importance.level === "critical" || importance.level === "high" ? "strong" : "moderate";
  const shareabilityPotential = importance.urgentHits >= 1 ? "viral" : importance.highHits >= 2 ? "high" : "moderate";

  return { ctrPotential, retentionPotential, shareabilityPotential };
}

function analyzeK_NextAction(importance = {}, trust = {}, novelty = {}, liveNeeded = false) {
  if (novelty.isRepublish || trust.score < 0.45) return "ignore";
  if (trust.score < 0.60) return "monitor";
  if (importance.level === "low") return "save";
  if (novelty.isUpdate) return "merge";
  if (liveNeeded) return "fullCoverage";
  if (importance.level === "critical" && trust.score >= 0.85) return "breakingUpgrade";
  if (importance.level === "critical") return "alert";
  if (importance.level === "high" && trust.score >= 0.80) return "featured";
  if (importance.level === "high") return "publish";
  return "short";
}

// ── Verification state ────────────────────────────────────────────────────────

function computeVerificationState(trust = {}, novelty = {}, story = {}) {
  const conflicting = conflictingSignals(story);
  const multiSource = Number(story?.clusterSize || 1) >= 2;

  if (trust.isOfficial && !conflicting) return "confirmed";
  if (multiSource && trust.score >= 0.80 && !conflicting) return "confirmed";
  if (trust.score >= 0.88 && !conflicting) return "confirmed";
  if (trust.score >= 0.72 && !conflicting) return "likely";
  if (conflicting || trust.score < 0.60) return "under_review";
  if (trust.score < 0.50) return "insufficient";
  return "under_review";
}

// ── Claim confidence score ────────────────────────────────────────────────────

function computeClaimConfidence(trust = {}, novelty = {}, verificationState = "") {
  let base = trust.score * 100;
  if (novelty.isRepublish) base *= 0.65;
  if (trust.isSpecialized) base = Math.min(100, base + 5);
  if (trust.isOfficial) base = Math.min(100, base + 8);
  if (verificationState === "confirmed") base = Math.min(100, base + 6);
  if (verificationState === "under_review") base *= 0.82;
  if (verificationState === "insufficient") base *= 0.55;
  return Math.round(Math.max(0, Math.min(100, base)));
}

// ── SEO Metadata ─────────────────────────────────────────────────────────────

function generateSEOMetadata(story = {}, importance = {}, language = "ar") {
  const rawTitle = String(story?.title || "");
  const rawSummary = String(story?.summary || "");
  const source = String(story?.source || "");
  const category = String(story?.category || "general");

  const seoTitle = rawTitle.length > 0
    ? (rawTitle.length <= 65 ? rawTitle : `${rawTitle.slice(0, 62).trim()}…`)
    : (language === "ar" ? "خبر عاجل" : "Breaking News");

  const alertTitle = rawTitle.length > 0
    ? (rawTitle.length <= 40 ? rawTitle : `${rawTitle.slice(0, 37).trim()}…`)
    : seoTitle;

  const metaDescription = rawSummary.length > 0
    ? (rawSummary.length <= 155 ? rawSummary : `${rawSummary.slice(0, 152).trim()}…`)
    : seoTitle;

  const keywordsAuto = Array.from(
    new Set([
      category,
      source,
      ...rawTitle.split(" ").filter((w) => w.length >= 4).slice(0, 5),
    ])
  ).filter(Boolean).slice(0, 8);

  const schemaType = importance.level === "critical" ? "NewsArticle" : "Article";

  return { seoTitle, alertTitle, metaDescription, keywordsAuto, schemaType };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runEditorialAnalysis(story = {}, options = {}) {
  const language = String(options?.language || "ar");

  const A = analyzeA_Event(story);
  const B = analyzeB_Importance(story);
  const C = analyzeC_SourceTrust(story);
  const D = analyzeD_Novelty(story);
  const E = analyzeE_CoverageAngle(story);
  const F = analyzeF_Placement(B, C, D);
  const G = analyzeG_VisualFormat(story, B);
  const H = analyzeH_AlertNeeded(B, C, D);
  const I = analyzeI_LiveCoverage(B, story);
  const J = analyzeJ_AudienceImpact(story, B);
  const K = analyzeK_NextAction(B, C, D, I);

  const verificationState = computeVerificationState(C, D, story);
  const claimConfidence = computeClaimConfidence(C, D, verificationState);
  const seo = generateSEOMetadata(story, B, language);

  const contentType = E === "analysis"
    ? "analysis"
    : E === "background"
      ? "background"
      : E === "summary"
        ? "summary"
        : B.level === "critical"
          ? (verificationState === "confirmed" ? "breaking" : "under_review")
          : D.isUpdate
            ? "follow_up"
            : verificationState === "confirmed"
              ? "confirmed"
              : "under_review";

  const actionMeta = ACTION_MAP[K] || ACTION_MAP.monitor;
  const placementMeta = PLACEMENT_MAP[F] || PLACEMENT_MAP.latest;
  const contentTypeMeta = CONTENT_TYPE_MAP[contentType] || CONTENT_TYPE_MAP.under_review;

  return {
    // A–K framework results
    eventSummary: A,
    importanceAnalysis: B,
    trustAnalysis: C,
    noveltyAnalysis: D,
    coverageAngle: E,
    recommendedPlacement: F,
    recommendedVisualFormat: G,
    alertNeeded: H,
    liveCoverageNeeded: I,
    audienceImpact: J,
    recommendedAction: K,

    // Derived
    verificationState,
    claimConfidence,
    contentType,
    seo,

    // Labels (language-aware)
    labels: {
      action:       language === "ar" ? actionMeta.ar      : actionMeta.en,
      placement:    language === "ar" ? placementMeta.ar   : placementMeta.en,
      contentType:  language === "ar" ? contentTypeMeta.ar : contentTypeMeta.en,
    },
  };
}

/**
 * Batch-process an array of stories with editorial analysis.
 * Attaches results back onto each story object.
 */
export function applyEditorialAnalysisBatch(stories = [], options = {}) {
  return stories.map((story) => {
    const analysis = runEditorialAnalysis(story, options);
    return {
      ...story,
      editorialAction:        analysis.recommendedAction,
      editorialPlacement:     analysis.recommendedPlacement,
      editorialVisualFormat:  analysis.recommendedVisualFormat,
      editorialContentType:   analysis.contentType,
      verificationState:      analysis.verificationState,
      claimConfidence:        analysis.claimConfidence,
      alertNeeded:            analysis.alertNeeded,
      liveCoverageNeeded:     analysis.liveCoverageNeeded,
      seoTitle:               analysis.seo.seoTitle,
      alertTitle:             analysis.seo.alertTitle,
      metaDescription:        analysis.seo.metaDescription,
      keywordsAuto:           analysis.seo.keywordsAuto,
      editorialLabels:        analysis.labels,
    };
  }).filter((story) => story.editorialAction !== "ignore");
}
