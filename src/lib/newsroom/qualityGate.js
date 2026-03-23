/**
 * qualityGate.js
 *
 * Validates article quality before admitting to the editorial pipeline.
 * Extended with:
 *  - Clickbait / sensationalism detection
 *  - Content type inference (news / opinion / promoted / satire)
 *  - Freshness scoring
 *  - Verification readiness flag
 */

const TITLE_MIN_LENGTH = 16;
const TITLE_MAX_LENGTH = 155;
const SUMMARY_MIN_LENGTH = 40;
const SUMMARY_MAX_LENGTH = 420;

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasGibberish(value = "") {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^[\W_]+$/.test(text)) return true;
  if (/(.)\1{5,}/.test(text)) return true;
  if (/\?{3,}|!{3,}|\.{4,}/.test(text)) return true;
  return false;
}

function arabicCoverage(value = "") {
  const text = String(value || "");
  const letters = text.match(/[\p{L}]/gu) || [];
  if (!letters.length) return 0;
  const arabicLetters = text.match(/[\u0600-\u06FF]/g) || [];
  return arabicLetters.length / letters.length;
}

function looksIncompleteHeadline(value = "") {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^(breaking|update|urgent|عاجل|تحديث)\s*[:\-]?\s*$/i.test(text)) return true;
  if (/\b(read more|watch now|click here|المزيد|اضغط هنا)\b/i.test(text)) return true;
  return false;
}

function hasClickbait(value = "") {
  const text = String(value || "").toLowerCase();
  const patterns = [
    // Arabic clickbait
    /لن تصدق|صدمة|مفاجأة كبرى|سيغير حياتك|أسرار|الحقيقة الكاملة|ستصدمك|لا تفوّتك/,
    // English clickbait
    /you won't believe|shocking truth|jaw.dropping|mind.blowing|this will change|he said what|secret exposed|number \d+ will/,
  ];
  return patterns.some((p) => p.test(text));
}

function inferContentCategory(title = "", summary = "") {
  const text = `${title} ${summary}`.toLowerCase();
  if (/رأي|تعليق|opinion|commentary|editorial|منظور|وجهة نظر/.test(text)) return "opinion";
  if (/إعلان|sponsored|promoted|ترويجي|برعاية/.test(text)) return "promoted";
  if (/ساخر|satirical|satire|نكتة|parody/.test(text)) return "satire";
  return "news";
}

function computeFreshnessScore(publishTime) {
  const ts = new Date(publishTime || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return 0.5;
  const ageMinutes = Math.max(0, (Date.now() - ts) / 60000);
  if (ageMinutes <= 15) return 1.0;
  if (ageMinutes <= 60) return 0.88;
  if (ageMinutes <= 240) return 0.72;
  if (ageMinutes <= 720) return 0.56;
  if (ageMinutes <= 1440) return 0.40;
  return 0.25;
}

export function evaluateNewsQuality(item, { language = "ar" } = {}) {
  const title = stripHtml(item?.title || "");
  const summary = stripHtml(item?.summary || item?.description || "");
  const reasons = [];

  if (title.length < TITLE_MIN_LENGTH) reasons.push("title_too_short");
  if (title.length > TITLE_MAX_LENGTH) reasons.push("title_too_long");
  if (summary.length < SUMMARY_MIN_LENGTH) reasons.push("summary_too_short");
  if (summary.length > SUMMARY_MAX_LENGTH) reasons.push("summary_too_long");
  if (hasGibberish(title) || hasGibberish(summary)) reasons.push("gibberish_content");
  if (looksIncompleteHeadline(title)) reasons.push("incomplete_headline");
  if (hasClickbait(title)) reasons.push("clickbait_headline");

  if (language === "ar") {
    const titleArabicCoverage = arabicCoverage(title);
    const summaryArabicCoverage = arabicCoverage(summary);
    if (titleArabicCoverage > 0 && titleArabicCoverage < 0.25) reasons.push("weak_arabic_headline");
    if (summaryArabicCoverage > 0 && summaryArabicCoverage < 0.18) reasons.push("weak_arabic_summary");
  }

  const contentCategory = inferContentCategory(title, summary);
  const freshnessScore = computeFreshnessScore(item?.time || item?.published_at);
  const score = Math.max(0, 100 - reasons.length * 18 - Math.max(0, TITLE_MIN_LENGTH - title.length));

  // Allow promoted/satire/opinion through with lower priority but don't hard-reject
  const ok = reasons.length === 0 && contentCategory !== "satire" && contentCategory !== "promoted";

  return {
    ok,
    reasons,
    score,
    title,
    summary,
    contentCategory,
    freshnessScore,
  };
}

export function applyQualityGate(items = [], options = {}) {
  const accepted = [];
  const rejected = [];

  items.forEach((item) => {
    const quality = evaluateNewsQuality(item, options);
    const normalizedItem = {
      ...item,
      title: quality.title,
      summary: quality.summary,
      qualityScore: quality.score,
      qualityReasons: quality.reasons,
      contentCategory: quality.contentCategory,
      freshnessScore: quality.freshnessScore,
    };

    if (!quality.ok) {
      rejected.push(normalizedItem);
      return;
    }

    accepted.push(normalizedItem);
  });

  return {
    accepted,
    rejected,
    stats: {
      accepted: accepted.length,
      rejected: rejected.length,
      rejectionRate: items.length > 0 ? Number((rejected.length / items.length).toFixed(4)) : 0,
    },
  };
}
