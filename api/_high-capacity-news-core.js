import { HIGH_CAPACITY_NEWS_SOURCES, SOURCE_TIERS } from "./_high-capacity-news-sources.js";

const STORE_KEY = "__KAR_HIGH_CAPACITY_NEWS_V1__";
const MAX_RAW_ARTICLES = 180000;
const MAX_NORMALIZED_ARTICLES = 100000;
const MAX_LOGS = 25000;
const MAX_PIPELINE_EVENTS = 50000;
const MAX_FETCH_CONCURRENCY = 8;
const MAX_ITEMS_PER_SOURCE_FETCH = 28;
const MIN_QUALITY_FOR_PUBLISH = 52;
const SENSITIVE_RE = /حرب|هجوم|اغتيال|كارثة|زلزال|تفجير|قصف|غارة|اشتباكات|قتلى|ضحايا|وباء|حظر|طوارئ|قرار حكومي|military|assassination|war|attack|explosion|casualties|deaths|pandemic|outbreak|emergency|government order/i;
const BREAKING_RE = /عاجل|breaking|urgent|missile|rocket|drone|strike|raid|explosion|صاروخ|مسيرة|غارة|انفجار|هجوم/i;
const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "for", "to", "in", "on", "of", "with", "by", "from", "is", "are", "at", "عن", "من", "في", "على", "إلى", "مع", "هذا", "هذه", "ذلك", "تلك", "تم", "بعد", "قبل", "خلال", "عبر", "ضمن"]);

const CATEGORY_RULES = [
  { key: "politics", re: /سياسة|حكومة|وزير|رئيس|برلمان|انتخابات|diplomacy|government|minister|president|election/i },
  { key: "economy", re: /اقتصاد|نفط|طاقة|أسواق|سوق|تضخم|بنوك|استثمار|economy|market|oil|gas|bank|inflation|trade/i },
  { key: "sports", re: /رياضة|دوري|كرة|مباراة|هدف|football|soccer|match|league|fifa|nba/i },
  { key: "technology", re: /تقنية|ذكاء اصطناعي|برمجيات|هاتف|سايبر|technology|ai|software|device|cyber/i },
  { key: "health", re: /صحة|مستشفى|دواء|لقاح|وباء|health|medical|hospital|vaccine|disease/i },
  { key: "culture", re: /ثقافة|فن|سينما|كتاب|مهرجان|culture|art|cinema|festival|book/i },
  { key: "local", re: /الإمارات|دبي|أبوظبي|السعودية|مصر|uae|dubai|abu dhabi|saudi|egypt/i },
  { key: "regional", re: /الشرق الأوسط|إقليمي|iran|israel|gaza|syria|iraq|lebanon|yemen/i },
  { key: "international", re: /الأمم المتحدة|eu|nato|world|international|global|روسيا|أوكرانيا|الصين|أمريكا/i },
];

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return cleanText(String(value || "").replace(/<[^>]*>/g, " "));
}

function normalizeUrl(rawUrl = "") {
  const value = cleanText(rawUrl);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const query = parsed.searchParams;
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => query.delete(key));
    const sortedQuery = Array.from(query.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const queryString = sortedQuery.map(([key, val]) => `${key}=${val}`).join("&");
    return `${parsed.origin.toLowerCase()}${path}${queryString ? `?${queryString}` : ""}`;
  } catch {
    return value;
  }
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(block || "").match(re);
  return match ? match[1].trim() : "";
}

function extractImageFromBlock(block = "") {
  const media = block.match(/<media:content[^>]+url="([^"]+)"/i) || block.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (media?.[1]) return cleanText(media[1]);
  const img = block.match(/<img[^>]+src="([^"]+)"/i) || block.match(/<img[^>]+src='([^']+)'/i);
  if (img?.[1]) return cleanText(img[1]);
  return "";
}

function hashString(value = "") {
  let h = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return String(h >>> 0);
}

function tokenize(text = "") {
  return cleanText(String(text || "").toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && token.length > 2 && !STOP_WORDS.has(token));
}

function jaccardSimilarity(aText = "", bText = "") {
  const a = new Set(tokenize(aText));
  const b = new Set(tokenize(bText));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function detectLanguage(text = "") {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  return "en";
}

function computeUrgencyScore(text = "") {
  const lower = String(text || "").toLowerCase();
  if (BREAKING_RE.test(lower)) return 90;
  if (/تحذير|استنفار|توتر|warning|alert|tension|deployment|اشتباك/i.test(lower)) return 72;
  return 44;
}

function computeTrustScore(sourceTrust = 70, sourceCount = 1, sensitive = false, hasAuthor = false) {
  const multiSourceBoost = (sourceCount - 1) * 8;
  const sensitivityPenalty = sensitive && sourceCount < 2 ? 18 : 0;
  const authorBoost = hasAuthor ? 4 : 0;
  return clamp(Math.round(sourceTrust + multiSourceBoost + authorBoost - sensitivityPenalty), 20, 99);
}

function qualityScoreForArticle(article) {
  const titleLen = cleanText(article.title).length;
  const summaryLen = cleanText(article.summary).length;
  const bodyLen = cleanText(article.content_raw).length;
  const hasSource = Boolean(article.source_id);
  const hasTime = Boolean(article.published_at);
  const hasUrl = Boolean(article.url && article.url !== "#");
  const base = 20
    + (titleLen >= 32 ? 16 : titleLen >= 18 ? 10 : 0)
    + (summaryLen >= 80 ? 16 : summaryLen >= 40 ? 10 : 0)
    + (bodyLen >= 280 ? 16 : bodyLen >= 130 ? 10 : 0)
    + (hasSource ? 8 : 0)
    + (hasTime ? 7 : 0)
    + (hasUrl ? 7 : 0)
    + (article.image_url ? 4 : 0)
    + Math.round((Number(article.trust_score || 0) - 50) * 0.22);
  return clamp(base, 0, 100);
}

function pickCategory(title = "", summary = "", body = "", sourceCategory = "international") {
  const haystack = `${title} ${summary} ${body}`;
  const hit = CATEGORY_RULES.find((rule) => rule.re.test(haystack));
  return hit?.key || sourceCategory || "misc";
}

function buildSnippet(summary = "", body = "") {
  const source = cleanText(summary || body);
  return source.slice(0, 180);
}

function buildTickerText(title = "", sourceName = "") {
  return cleanText(`${title} | ${sourceName}`).slice(0, 170);
}

function summarizeNeutral(article) {
  const source = article.primary_source_name || "مصدر معتمد";
  const lead = article.sensitive && article.source_count < 2 ? "وفق المصدر المتاح حاليا" : "بحسب المصادر المتاحة";
  const snippet = buildSnippet(article.summary, article.content_raw);
  return {
    normalized_title: cleanText(article.title),
    summary: cleanText(article.summary || snippet),
    snippet,
    ticker_text: buildTickerText(article.title, source),
    neutral_anchor_text: cleanText(`${lead}: ${article.title}. المصدر: ${source}.`),
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDailyMetrics(store, day = todayKey()) {
  if (!store.daily.has(day)) {
    store.daily.set(day, {
      day,
      raw_ingested: 0,
      normalized_unique: 0,
      duplicates: 0,
      review_required: 0,
      published: 0,
      failed_fetches: 0,
      by_category: {},
      by_source: {},
    });
  }
  return store.daily.get(day);
}

function makeSourceState(entry) {
  const tier = SOURCE_TIERS[entry.tier] || SOURCE_TIERS.medium;
  return {
    ...entry,
    intervalSeconds: Number(entry.intervalSeconds || tier.intervalSeconds),
    active: entry.active !== false,
    status: "idle",
    lastSuccessAt: "",
    lastFailureAt: "",
    lastFailure: "",
    consecutiveFailures: 0,
    weakStreak: 0,
    circuitOpenUntil: 0,
    lastLatencyMs: 0,
    nextFetchAt: Date.now() + Math.round(Math.random() * 1200),
    pulls: 0,
    successes: 0,
    failures: 0,
    acceptedToday: 0,
    duplicatesToday: 0,
    lastItemCount: 0,
  };
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    const sourceMap = new Map();
    HIGH_CAPACITY_NEWS_SOURCES.forEach((source) => {
      sourceMap.set(source.id, makeSourceState(source));
    });

    globalThis[STORE_KEY] = {
      initializedAt: nowIso(),
      sources: sourceMap,
      rawArticles: [],
      normalizedById: new Map(),
      canonicalToId: new Map(),
      urlToId: new Map(),
      titleHashToId: new Map(),
      clusterByCanonical: new Map(),
      publishedIds: [],
      reviewIds: [],
      rejectedIds: [],
      ingestionLogs: [],
      pipelineLogs: [],
      auditLogs: [],
      jobs: [],
      queues: {
        ingestion: [],
        normalization: [],
        dedup: [],
        classification: [],
        summarization: [],
        publishing: [],
      },
      daily: new Map(),
      statsSnapshot: null,
      schedulerRunning: false,
      schedulerTicking: false,
      lastRunAt: 0,
      warmupCompleted: false,
    };
  }
  return globalThis[STORE_KEY];
}

function pushLimited(list, value, max) {
  list.unshift(value);
  if (list.length > max) list.length = max;
}

function logPipeline(store, stage, status, details = {}) {
  pushLimited(store.pipelineLogs, {
    id: `${stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stage,
    status,
    details,
    at: nowIso(),
  }, MAX_PIPELINE_EVENTS);
}

function logIngestion(store, entry) {
  pushLimited(store.ingestionLogs, {
    ...entry,
    at: nowIso(),
  }, MAX_LOGS);
}

function logAudit(store, action, details = {}) {
  pushLimited(store.auditLogs, {
    id: `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    details,
    at: nowIso(),
  }, MAX_LOGS);
}

async function fetchWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "KAR-HighCapacityNewsBot/1.0",
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function parseRssSource(xml = "", source) {
  const items = String(xml || "").match(/<item>([\s\S]*?)<\/item>/gi) || [];
  return items.slice(0, MAX_ITEMS_PER_SOURCE_FETCH).map((item, index) => {
    const title = stripHtml(extractTag(item, "title")) || "بدون عنوان";
    const summary = stripHtml(extractTag(item, "description"));
    const contentRaw = stripHtml(extractTag(item, "content:encoded") || summary);
    const url = normalizeUrl(extractTag(item, "link") || "#");
    const author = cleanText(extractTag(item, "dc:creator") || extractTag(item, "author"));
    const imageUrl = normalizeUrl(extractImageFromBlock(item));
    const publishedAt = extractTag(item, "pubDate") || nowIso();
    const body = cleanText(contentRaw || summary);
    return {
      raw_id: `${source.id}-${index}-${hashString(url || title)}`,
      source_id: source.id,
      source_name: source.name,
      source_type: source.type,
      source_url: source.url,
      title,
      summary,
      body_raw: body,
      content_raw: body,
      url,
      image_url: imageUrl,
      author: author || null,
      category_hint: source.category,
      language: detectLanguage(`${title} ${summary} ${body}`) || source.language,
      country_or_region: source.region || "global",
      published_at: new Date(publishedAt).toISOString(),
      ingested_at: nowIso(),
      trust_base_score: source.trustBaseScore,
      urgency_score: computeUrgencyScore(`${title} ${summary}`),
      status: "raw",
      source_index: index,
    };
  });
}

function sourceIsDue(source, now) {
  if (!source.active) return false;
  if (source.circuitOpenUntil && source.circuitOpenUntil > now) return false;
  return source.nextFetchAt <= now;
}

function scheduleNextFetch(source, now, success) {
  const intervalMs = Number(source.intervalSeconds || SOURCE_TIERS.medium.intervalSeconds) * 1000;
  if (success) {
    source.nextFetchAt = now + intervalMs;
    return;
  }
  const penalty = Math.min(20 * 60 * 1000, intervalMs * Math.max(1, source.consecutiveFailures));
  source.nextFetchAt = now + penalty;
}

async function fetchSourceWithRetry(source, maxRetries = 2) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= maxRetries) {
    try {
      const started = Date.now();
      const response = await fetchWithTimeout(source.url, 10000 + attempt * 2000);
      if (!response.ok) throw new Error(`http_${response.status}`);
      const xml = await response.text();
      const parsed = parseRssSource(xml, source);
      return {
        ok: true,
        latencyMs: Date.now() - started,
        items: parsed,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 400));
      attempt += 1;
    }
  }
  return {
    ok: false,
    items: [],
    latencyMs: 0,
    attempts: maxRetries + 1,
    error: lastError?.message || "fetch_failed",
  };
}

function queueRawItems(store, source, items) {
  const day = ensureDailyMetrics(store);
  items.forEach((item) => {
    store.queues.ingestion.push({ source_id: source.id, item });
    day.raw_ingested += 1;
  });
  day.by_source[source.id] = Number(day.by_source[source.id] || 0) + items.length;
}

function canonicalFromArticle(article) {
  const cleaned = cleanText(`${article.title} ${article.summary}`)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return hashString(cleaned.slice(0, 300));
}

function normalizeRawArticle(raw) {
  const canonicalUrl = normalizeUrl(raw.url || "");
  const title = cleanText(raw.title || "");
  const summary = cleanText(raw.summary || "");
  const body = cleanText(raw.content_raw || raw.body_raw || "");
  const canonicalHash = canonicalFromArticle({ title, summary });
  const titleHash = hashString(title.toLowerCase());
  const sensitive = SENSITIVE_RE.test(`${title} ${summary} ${body}`);
  const trustScore = computeTrustScore(raw.trust_base_score, 1, sensitive, Boolean(raw.author));
  const category = pickCategory(title, summary, body, raw.category_hint || "international");

  const normalized = {
    id: `article-${hashString(`${canonicalUrl}|${canonicalHash}|${raw.source_id}`)}`,
    source_id: raw.source_id,
    title,
    summary,
    body_raw: body,
    content_raw: body,
    url: canonicalUrl || "#",
    image_url: normalizeUrl(raw.image_url || ""),
    author: raw.author || null,
    category,
    language: raw.language || detectLanguage(`${title} ${summary} ${body}`),
    country_or_region: raw.country_or_region || "global",
    published_at: raw.published_at || nowIso(),
    ingested_at: raw.ingested_at || nowIso(),
    canonical_hash: canonicalHash,
    canonical_url: canonicalUrl,
    title_hash: titleHash,
    trust_score: trustScore,
    urgency_score: Number(raw.urgency_score || computeUrgencyScore(`${title} ${summary}`)),
    status: "normalized",
    sensitive,
    source_count: 1,
    source_ids: [raw.source_id],
    source_urls: [raw.source_url || ""],
    cluster_id: `cluster-${canonicalHash}`,
  };

  normalized.quality_score = qualityScoreForArticle(normalized);
  normalized.requires_review = Boolean(sensitive && trustScore < 82);
  return normalized;
}

function dedupArticle(store, candidate) {
  const byUrl = candidate.canonical_url ? store.urlToId.get(candidate.canonical_url) : "";
  if (byUrl) return { duplicate: true, existingId: byUrl, reason: "url" };

  const byCanonical = store.canonicalToId.get(candidate.canonical_hash);
  if (byCanonical) return { duplicate: true, existingId: byCanonical, reason: "canonical_hash" };

  const byTitle = store.titleHashToId.get(candidate.title_hash);
  if (byTitle) {
    const existing = store.normalizedById.get(byTitle);
    const similarity = jaccardSimilarity(existing?.title || "", candidate.title || "");
    if (similarity >= 0.8) return { duplicate: true, existingId: byTitle, reason: "title_similarity" };
  }

  const recent = store.publishedIds.slice(0, 2500).map((id) => store.normalizedById.get(id)).filter(Boolean);
  for (const existing of recent) {
    const titleSim = jaccardSimilarity(existing.title || "", candidate.title || "");
    if (titleSim >= 0.86) return { duplicate: true, existingId: existing.id, reason: "title_cluster" };
    const contentSim = jaccardSimilarity(existing.summary || existing.content_raw || "", candidate.summary || candidate.content_raw || "");
    if (contentSim >= 0.9 && titleSim >= 0.52) return { duplicate: true, existingId: existing.id, reason: "content_similarity" };
  }

  return { duplicate: false, existingId: "", reason: "new" };
}

function mergeDuplicate(store, existingId, incoming) {
  const existing = store.normalizedById.get(existingId);
  if (!existing) return;
  if (!existing.source_ids.includes(incoming.source_id)) {
    existing.source_ids.push(incoming.source_id);
    existing.source_count = existing.source_ids.length;
  }
  existing.trust_score = computeTrustScore(existing.trust_score, existing.source_count, existing.sensitive, Boolean(existing.author));
  if (incoming.urgency_score > existing.urgency_score) existing.urgency_score = incoming.urgency_score;
  if (new Date(incoming.published_at).getTime() > new Date(existing.published_at).getTime()) {
    existing.published_at = incoming.published_at;
  }
  existing.updated_at = nowIso();
}

function categorizeStatus(article) {
  if (article.quality_score < 34) return "rejected_low_quality";
  if (article.requires_review) return "review_required";
  if (article.quality_score < MIN_QUALITY_FOR_PUBLISH) return "queued_secondary";
  return "published";
}

function updateCluster(store, article) {
  const clusterId = article.cluster_id;
  const existing = store.clusterByCanonical.get(clusterId) || {
    id: clusterId,
    canonical_hash: article.canonical_hash,
    primary_article_id: article.id,
    sources: [],
    article_ids: [],
    updated_at: nowIso(),
  };

  if (!existing.article_ids.includes(article.id)) existing.article_ids.push(article.id);
  article.source_ids.forEach((sourceId) => {
    if (!existing.sources.includes(sourceId)) existing.sources.push(sourceId);
  });
  existing.updated_at = nowIso();
  store.clusterByCanonical.set(clusterId, existing);
}

function publishArticle(store, article) {
  const status = categorizeStatus(article);
  article.status = status;
  article.updated_at = nowIso();
  const day = ensureDailyMetrics(store);

  if (status === "published") {
    if (!store.publishedIds.includes(article.id)) {
      store.publishedIds.unshift(article.id);
      if (store.publishedIds.length > MAX_NORMALIZED_ARTICLES) store.publishedIds.length = MAX_NORMALIZED_ARTICLES;
      day.published += 1;
    }
    day.by_category[article.category] = Number(day.by_category[article.category] || 0) + 1;
  } else if (status === "review_required") {
    if (!store.reviewIds.includes(article.id)) {
      store.reviewIds.unshift(article.id);
      day.review_required += 1;
    }
  } else if (status === "rejected_low_quality") {
    if (!store.rejectedIds.includes(article.id)) {
      store.rejectedIds.unshift(article.id);
    }
  }
}

function processQueues(store) {
  while (store.queues.ingestion.length > 0) {
    const entry = store.queues.ingestion.shift();
    store.rawArticles.unshift(entry.item);
    if (store.rawArticles.length > MAX_RAW_ARTICLES) store.rawArticles.length = MAX_RAW_ARTICLES;
    store.queues.normalization.push(entry.item);
  }

  while (store.queues.normalization.length > 0) {
    const raw = store.queues.normalization.shift();
    if (!raw?.title || !raw?.source_id) continue;
    const normalized = normalizeRawArticle(raw);
    if (!normalized.title || normalized.title.length < 12) continue;
    store.queues.dedup.push(normalized);
  }

  while (store.queues.dedup.length > 0) {
    const candidate = store.queues.dedup.shift();
    const dedup = dedupArticle(store, candidate);
    const day = ensureDailyMetrics(store);

    if (dedup.duplicate) {
      day.duplicates += 1;
      mergeDuplicate(store, dedup.existingId, candidate);
      continue;
    }

    const enriched = {
      ...candidate,
      ...summarizeNeutral({
        ...candidate,
        primary_source_name: store.sources.get(candidate.source_id)?.name || candidate.source_id,
        source_count: candidate.source_count,
      }),
    };

    store.normalizedById.set(enriched.id, enriched);
    if (enriched.canonical_url && enriched.canonical_url !== "#") store.urlToId.set(enriched.canonical_url, enriched.id);
    store.canonicalToId.set(enriched.canonical_hash, enriched.id);
    store.titleHashToId.set(enriched.title_hash, enriched.id);

    ensureDailyMetrics(store).normalized_unique += 1;
    updateCluster(store, enriched);
    publishArticle(store, enriched);
  }

  if (store.normalizedById.size > MAX_NORMALIZED_ARTICLES) {
    const publishedSet = new Set(store.publishedIds);
    for (const [id] of store.normalizedById) {
      if (publishedSet.has(id)) continue;
      store.normalizedById.delete(id);
      if (store.normalizedById.size <= MAX_NORMALIZED_ARTICLES) break;
    }
  }
}

async function runSchedulerTick(store, { force = false } = {}) {
  const now = Date.now();
  if (store.schedulerTicking) return;
  if (!force && now - store.lastRunAt < 1200) return;

  store.schedulerTicking = true;
  store.lastRunAt = now;

  try {
    const dueSources = Array.from(store.sources.values())
      .filter((source) => sourceIsDue(source, now))
      .sort((a, b) => {
        const tierA = SOURCE_TIERS[a.tier]?.intervalSeconds || 600;
        const tierB = SOURCE_TIERS[b.tier]?.intervalSeconds || 600;
        return tierA - tierB;
      })
      .slice(0, MAX_FETCH_CONCURRENCY);

    if (dueSources.length === 0) {
      processQueues(store);
      return;
    }

    logPipeline(store, "scheduler", "running", { dueSources: dueSources.length });

    const results = await Promise.all(dueSources.map(async (source) => {
      source.status = "fetching";
      source.pulls += 1;
      const fetched = await fetchSourceWithRetry(source, 2);
      return { source, fetched };
    }));

    const day = ensureDailyMetrics(store);

    results.forEach(({ source, fetched }) => {
      if (fetched.ok) {
        source.lastSuccessAt = nowIso();
        source.lastFailure = "";
        source.status = "healthy";
        source.consecutiveFailures = 0;
        source.successes += 1;
        source.lastLatencyMs = fetched.latencyMs;
        source.lastItemCount = fetched.items.length;
        queueRawItems(store, source, fetched.items);
        logIngestion(store, {
          source_id: source.id,
          source_name: source.name,
          ok: true,
          count: fetched.items.length,
          latency_ms: fetched.latencyMs,
          attempts: fetched.attempts,
        });
      } else {
        source.lastFailureAt = nowIso();
        source.lastFailure = fetched.error || "fetch_failed";
        source.status = "degraded";
        source.failures += 1;
        source.consecutiveFailures += 1;
        day.failed_fetches += 1;

        if (source.consecutiveFailures >= 4) {
          source.circuitOpenUntil = Date.now() + 20 * 60 * 1000;
          source.status = "circuit_open";
        }

        logIngestion(store, {
          source_id: source.id,
          source_name: source.name,
          ok: false,
          count: 0,
          latency_ms: 0,
          attempts: fetched.attempts,
          error: fetched.error,
        });
      }

      scheduleNextFetch(source, now, fetched.ok);
    });

    processQueues(store);

    logPipeline(store, "scheduler", "completed", {
      pulled: dueSources.length,
      published: store.publishedIds.length,
      unique: store.normalizedById.size,
    });
  } finally {
    store.schedulerTicking = false;
  }
}

async function warmupPipeline(store) {
  if (store.warmupCompleted) return;
  await runSchedulerTick(store, { force: true });
  await runSchedulerTick(store, { force: true });
  await runSchedulerTick(store, { force: true });
  store.warmupCompleted = true;
}

export async function ensureNewsEngineStarted() {
  const store = getStore();
  if (!store.schedulerRunning) {
    store.schedulerRunning = true;
    logAudit(store, "engine_started", { sources: store.sources.size });
  }

  await warmupPipeline(store);
  await runSchedulerTick(store);
  return store;
}

function projectDailyCapacity(store) {
  const active = Array.from(store.sources.values()).filter((source) => source.active).length;
  const avgItemsPerPull = 8;
  const pullsPerDay = Array.from(store.sources.values())
    .filter((source) => source.active)
    .reduce((acc, source) => acc + Math.max(1, Math.floor((24 * 3600) / Math.max(120, source.intervalSeconds))), 0);
  const rawProjected = pullsPerDay * avgItemsPerPull;
  const uniqueProjected = Math.round(rawProjected * 0.66);
  return {
    active_sources: active,
    projected_raw_per_day: rawProjected,
    projected_unique_per_day: uniqueProjected,
    meets_minimum_1000: uniqueProjected >= 1000,
    target_band_1200_2000: uniqueProjected >= 1200 && uniqueProjected <= 2000,
    scale_ready_3000: uniqueProjected >= 3000,
  };
}

function buildMetricsSnapshot(store) {
  const day = ensureDailyMetrics(store);
  const allSources = Array.from(store.sources.values());
  const activeSources = allSources.filter((source) => source.active);
  const healthySources = activeSources.filter((source) => source.status === "healthy").length;
  const circuitOpen = activeSources.filter((source) => source.status === "circuit_open").length;
  const totalPublished = store.publishedIds.length;
  const last50Published = store.publishedIds.slice(0, 50).map((id) => store.normalizedById.get(id)).filter(Boolean);

  const byCategory = {};
  last50Published.forEach((article) => {
    byCategory[article.category] = Number(byCategory[article.category] || 0) + 1;
  });

  const bySource = {};
  last50Published.forEach((article) => {
    const sourceName = store.sources.get(article.source_id)?.name || article.source_id;
    bySource[sourceName] = Number(bySource[sourceName] || 0) + 1;
  });

  const duplicatesRate = day.raw_ingested > 0 ? day.duplicates / day.raw_ingested : 0;
  const failureRate = activeSources.length > 0 ? (activeSources.filter((source) => source.status === "degraded" || source.status === "circuit_open").length / activeSources.length) : 0;

  const sourcePerformance = activeSources
    .map((source) => ({
      source_id: source.id,
      name: source.name,
      category: source.category,
      language: source.language,
      trust_base_score: source.trustBaseScore,
      pull_interval_seconds: source.intervalSeconds,
      active: source.active,
      status: source.status,
      last_success_at: source.lastSuccessAt,
      last_failure_at: source.lastFailureAt,
      last_failure: source.lastFailure,
      last_latency_ms: source.lastLatencyMs,
      pulls: source.pulls,
      successes: source.successes,
      failures: source.failures,
      last_item_count: source.lastItemCount,
      circuit_open_until: source.circuitOpenUntil,
    }))
    .sort((a, b) => (b.successes - b.failures) - (a.successes - a.failures));

  const weakestSources = sourcePerformance.slice().sort((a, b) => b.failures - a.failures).slice(0, 10);
  const fastestSources = sourcePerformance.slice().filter((entry) => entry.last_latency_ms > 0).sort((a, b) => a.last_latency_ms - b.last_latency_ms).slice(0, 10);

  return {
    generated_at: nowIso(),
    day: day.day,
    counters: {
      imported_today_raw: day.raw_ingested,
      imported_today_unique: day.normalized_unique,
      duplicates_today: day.duplicates,
      review_required_today: day.review_required,
      published_today: day.published,
      failed_fetches_today: day.failed_fetches,
      active_sources: activeSources.length,
      healthy_sources: healthySources,
      total_sources: allSources.length,
      circuit_open_sources: circuitOpen,
      currently_published_pool: totalPublished,
    },
    rates: {
      duplicates_rate: Number(duplicatesRate.toFixed(4)),
      failure_rate: Number(failureRate.toFixed(4)),
    },
    distributions: {
      by_category_today: day.by_category,
      by_source_today: day.by_source,
      by_category_live_last50: byCategory,
      by_source_live_last50: bySource,
    },
    fastest_sources: fastestSources,
    weakest_sources: weakestSources,
    capacity_projection: projectDailyCapacity(store),
    alerts: {
      below_minimum_1000: day.normalized_unique < 1000,
      source_failure_above_20_percent: failureRate > 0.2,
      active_sources_below_50: activeSources.length < 50,
    },
  };
}

function selectArticles(store, { category = "all", limit = 120, sourceFilters = [] } = {}) {
  const pool = store.publishedIds
    .map((id) => store.normalizedById.get(id))
    .filter(Boolean)
    .filter((article) => {
      if (category && category !== "all" && article.category !== category) return false;
      if (Array.isArray(sourceFilters) && sourceFilters.length > 0) {
        const sourceName = String(store.sources.get(article.source_id)?.name || article.source_id).toLowerCase();
        return sourceFilters.some((filter) => sourceName.includes(String(filter).toLowerCase()));
      }
      return true;
    });

  return pool
    .sort((a, b) => {
      const breakDiff = (b.urgency_score || 0) - (a.urgency_score || 0);
      if (breakDiff !== 0) return breakDiff;
      const tB = new Date(b.published_at).getTime() || 0;
      const tA = new Date(a.published_at).getTime() || 0;
      return tB - tA;
    })
    .slice(0, limit)
    .map((article) => ({
      ...article,
      source: store.sources.get(article.source_id)?.name || article.source_id,
      source_name: store.sources.get(article.source_id)?.name || article.source_id,
      isBreaking: Number(article.urgency_score || 0) >= 84,
      reliability: Number(article.trust_score || 0) >= 84 ? "high" : Number(article.trust_score || 0) >= 68 ? "medium" : "low",
      freshnessMinutes: Math.max(0, Math.round((Date.now() - new Date(article.published_at).getTime()) / 60000)),
      qualityScore: article.quality_score,
      urgency: Number(article.urgency_score || 0) >= 84 ? "high" : Number(article.urgency_score || 0) >= 62 ? "medium" : "low",
      sourceMode: "high-capacity-open-source-ingestion",
      sourceTypes: ["rss", "manual-curated", "optional-news-api"],
      hasVideo: false,
    }));
}

function buildSections(articles) {
  const hero = articles.slice(0, 6);
  const breaking = articles.filter((article) => article.isBreaking).slice(0, 20);
  const latest = articles.slice(0, 80);
  const trending = articles.slice().sort((a, b) => (b.trust_score + b.urgency_score) - (a.trust_score + a.urgency_score)).slice(0, 20);

  const byCategory = {
    politics: articles.filter((article) => article.category === "politics").slice(0, 20),
    economy: articles.filter((article) => article.category === "economy").slice(0, 20),
    international: articles.filter((article) => article.category === "international").slice(0, 20),
    regional: articles.filter((article) => article.category === "regional").slice(0, 20),
    local: articles.filter((article) => article.category === "local").slice(0, 20),
    sports: articles.filter((article) => article.category === "sports").slice(0, 20),
    technology: articles.filter((article) => article.category === "technology").slice(0, 20),
    health: articles.filter((article) => article.category === "health").slice(0, 20),
    culture: articles.filter((article) => article.category === "culture").slice(0, 20),
    misc: articles.filter((article) => article.category === "misc").slice(0, 20),
  };

  return { hero, breaking, latest, trending, categories: byCategory };
}

function normalizeSourceFilters(raw = "") {
  return String(raw || "")
    .split(",")
    .map((item) => decodeURIComponent(String(item || "").trim()))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function getHighCapacityNewsPayload(req, { category = "all", limit = 120 } = {}) {
  const store = await ensureNewsEngineStarted();
  const sourceFilters = normalizeSourceFilters(req?.query?.source || "");
  const selected = selectArticles(store, { category, limit, sourceFilters });
  const sections = buildSections(selected);
  const snapshot = buildMetricsSnapshot(store);

  const featuredAlert = sections.breaking[0] || sections.hero[0] || null;

  const response = {
    sourceMode: "high-capacity-open-source-ingestion",
    sourceTypes: ["rss", "manual-curated", "optional-news-api"],
    news: selected,
    sections,
    breaking: sections.breaking,
    featuredAlert,
    stats: {
      totalSources: snapshot.counters.total_sources,
      healthySources: snapshot.counters.healthy_sources,
      activeSources: snapshot.counters.active_sources,
      breakingCount: sections.breaking.length,
      averageQuality: Math.round(selected.reduce((acc, article) => acc + Number(article.qualityScore || 0), 0) / Math.max(1, selected.length)),
      importedTodayRaw: snapshot.counters.imported_today_raw,
      importedTodayUnique: snapshot.counters.imported_today_unique,
      duplicatesToday: snapshot.counters.duplicates_today,
      publishedToday: snapshot.counters.published_today,
      reviewRequiredToday: snapshot.counters.review_required_today,
      quarantinedSources: snapshot.counters.circuit_open_sources,
      ingestTargetMinimum: 1000,
      ingestTargetDefaultMin: 1200,
      ingestTargetDefaultMax: 2000,
      ingestScaleTarget: 3000,
      dashboardVisibleMinItems: 50,
    },
    pipeline: {
      ingestion: { status: "running", queue: store.queues.ingestion.length },
      normalization: { status: "running", queue: store.queues.normalization.length },
      dedup: { status: "running", queue: store.queues.dedup.length },
      classification: { status: "running", queue: store.queues.classification.length },
      summarization: { status: "running", queue: store.queues.summarization.length },
      publishing: { status: "running", queue: store.queues.publishing.length },
    },
    health: Array.from(store.sources.values()).slice(0, 100).map((source) => ({
      id: source.id,
      source: source.name,
      ok: source.status === "healthy" || source.status === "idle",
      status: source.status,
      category: source.category,
      language: source.language,
      trustBaseScore: source.trustBaseScore,
      active: source.active,
      intervalSeconds: source.intervalSeconds,
      updated: source.lastSuccessAt || source.lastFailureAt || "",
      error: source.lastFailure || "",
      latencyMs: source.lastLatencyMs,
      count: source.lastItemCount,
      circuitOpenUntil: source.circuitOpenUntil,
    })),
    updated: nowIso(),
    dashboard: snapshot,
  };

  store.statsSnapshot = snapshot;
  return response;
}

export async function getHighCapacityDashboardPayload() {
  const store = await ensureNewsEngineStarted();
  const snapshot = buildMetricsSnapshot(store);
  const latestPipeline = store.pipelineLogs.slice(0, 150);
  const latestIngestion = store.ingestionLogs.slice(0, 300);

  return {
    ...snapshot,
    pipeline_logs: latestPipeline,
    ingestion_logs: latestIngestion,
    publishing_queue_depth: store.queues.publishing.length,
    review_queue_depth: store.reviewIds.length,
    duplicate_clusters: store.clusterByCanonical.size,
  };
}

export async function getHighCapacitySourcesPayload() {
  const store = await ensureNewsEngineStarted();
  const list = Array.from(store.sources.values())
    .map((source) => ({
      id: source.id,
      name: source.name,
      link: source.url,
      type: source.type,
      language: source.language,
      category: source.category,
      trust_base_score: source.trustBaseScore,
      active: source.active,
      update_interval_seconds: source.intervalSeconds,
      last_success_at: source.lastSuccessAt,
      last_failure_at: source.lastFailureAt,
      last_failure: source.lastFailure,
      status: source.status,
      next_fetch_at: new Date(source.nextFetchAt).toISOString(),
      pulls: source.pulls,
      successes: source.successes,
      failures: source.failures,
      last_item_count: source.lastItemCount,
      circuit_open_until: source.circuitOpenUntil ? new Date(source.circuitOpenUntil).toISOString() : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: list.length,
    active: list.filter((entry) => entry.active).length,
    sources: list,
  };
}

export async function updateHighCapacitySource(payload = {}) {
  const store = await ensureNewsEngineStarted();
  const sourceId = cleanText(payload.source_id || payload.id || "");
  if (!sourceId || !store.sources.has(sourceId)) {
    return { ok: false, error: "source_not_found" };
  }

  const source = store.sources.get(sourceId);
  if (typeof payload.active === "boolean") source.active = payload.active;
  if (Number.isFinite(Number(payload.update_interval_seconds))) {
    source.intervalSeconds = clamp(Number(payload.update_interval_seconds), 120, 3600);
  }
  if (Number.isFinite(Number(payload.trust_base_score))) {
    source.trustBaseScore = clamp(Number(payload.trust_base_score), 20, 99);
  }

  source.nextFetchAt = Date.now() + 500;
  source.circuitOpenUntil = 0;
  source.consecutiveFailures = 0;
  source.status = "idle";

  logAudit(store, "source_updated", {
    source_id: source.id,
    active: source.active,
    intervalSeconds: source.intervalSeconds,
    trustBaseScore: source.trustBaseScore,
  });

  return {
    ok: true,
    source_id: source.id,
    active: source.active,
    update_interval_seconds: source.intervalSeconds,
    trust_base_score: source.trustBaseScore,
  };
}

export async function reprocessRecentBatch(payload = {}) {
  const store = await ensureNewsEngineStarted();
  const count = clamp(Number(payload.count || 300), 10, 2000);
  const recentRaw = store.rawArticles.slice(0, count);

  recentRaw.forEach((item) => {
    store.queues.normalization.push(item);
  });

  processQueues(store);
  logAudit(store, "reprocess_batch", { count: recentRaw.length });

  return {
    ok: true,
    reprocessed: recentRaw.length,
    published_pool: store.publishedIds.length,
    unique_pool: store.normalizedById.size,
  };
}
