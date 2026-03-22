import { applyApiHeaders, getInternalApiBase, handlePreflight, rejectUnsupportedMethod, withTimeout } from "./_api-utils.js";

const DEFAULT_REFRESH_PLAN = {
  fastSourcesSeconds: 30,
  standardSourcesSeconds: 60,
  fullResyncSeconds: 300,
};

const SOURCE_TRUST = {
  Reuters: 92,
  BBC: 90,
  "AP News": 91,
  "AP Breaking": 92,
  NPR: 86,
  "Al Jazeera": 82,
  "Sky News": 79,
  "Intel News": 73,
  "Fast News": 66,
  "Main News": 70,
  "X Intel": 58,
  "Live Feed": 68,
  "Fallback Feed": 40,
};

const SENSITIVE_RE = /حرب|هجوم|اغتيال|كارثة|زلزال|تفجير|قصف|غارة|اشتباكات|قتلى|ضحايا|وباء|حظر|طوارئ|حكومة|قرار حكومي|assassination|war|attack|explosion|casualties|deaths|pandemic|outbreak|emergency|government order/i;
const EXTREME_RE = /عاجل جدا|عاجل|breaking|urgent|صاروخ|صواريخ|missile|rocket|drone|strike|raid|attack|explosion|intercept/i;
const HIGH_RE = /تحرك|deployment|warning|alert|استنفار|تحذير|توتر|اشتباكات|قصف|غارة|هجوم/i;

function getStore() {
  if (!globalThis.__KAR_LIVE_NEWS_AI__) {
    globalThis.__KAR_LIVE_NEWS_AI__ = {
      cachedSnapshot: null,
      cachedAt: 0,
      overrides: new Map(),
      readHistory: [],
      auditLogs: [],
      broadcast: {
        currentItemId: "",
        interrupted: false,
        interruptionReason: "",
        manualQueue: [],
        tickerPinned: [],
        lastInterruptedAt: "",
        lastResumedAt: "",
      },
      settings: {
        mode: "semi-auto",
        autoPlay: true,
        muted: false,
        presenter: {
          name: "Noura AI",
          gender: "female",
          dialect: "msa",
          attire: "formal-navy",
          background: "digital-studio",
          deliveryStyle: "measured",
          speechRate: 0.96,
        },
      },
    };
  }
  return globalThis.__KAR_LIVE_NEWS_AI__;
}

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canonicalKey(item = {}) {
  return cleanText(item.url && item.url !== "#" ? item.url : item.title)
    .toLowerCase()
    .replace(/https?:\/\/[^/]+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function detectLanguage(text = "") {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "ar" : "en";
}

function sourceBaseTrust(source = "") {
  const exact = SOURCE_TRUST[source];
  if (Number.isFinite(exact)) return exact;
  if (/reuters|ap|bbc/i.test(source)) return 90;
  if (/jazeera|npr|sky/i.test(source)) return 80;
  if (/intel|x/i.test(source)) return 62;
  return 55;
}

function computeUrgencyScore(text = "", fallbackUrgency = "") {
  if (EXTREME_RE.test(text) || fallbackUrgency === "high") return 95;
  if (HIGH_RE.test(text) || fallbackUrgency === "medium") return 74;
  return 48;
}

function computeImpactScore(text = "", category = "") {
  let score = 44;
  if (/government|minister|president|سياسة|حكومة|رئيس|وزير/i.test(text)) score += 16;
  if (/oil|energy|نفط|طاقة|market|economy|اقتصاد/i.test(text)) score += 12;
  if (/military|قصف|غارة|هجوم|missile|attack/i.test(text) || category === "military") score += 18;
  return clamp(score, 0, 100);
}

function computeDuplicateScore(groupSize = 1) {
  return clamp(groupSize <= 1 ? 10 : 30 + groupSize * 16, 0, 100);
}

function safeVerificationStatus({ trustScore, sensitive, multiSource, sourceCount }) {
  if (sensitive && !multiSource) return "Needs Review";
  if (multiSource && trustScore >= 75) return "Multi-source Confirmed";
  if (trustScore >= 70 && sourceCount >= 1) return "Verified";
  return "Source Pending";
}

function chooseBroadcastAction({ urgencyScore, trustScore, sensitive, verificationStatus, duplicateScore }) {
  if (sensitive && verificationStatus !== "Multi-source Confirmed") return "hold_for_review";
  if (urgencyScore > 90 && trustScore > 75 && verificationStatus === "Multi-source Confirmed") return "breaking_interrupt";
  if (urgencyScore > 70 && trustScore > 65 && verificationStatus !== "Source Pending") return "anchor_read";
  if (urgencyScore >= 40 && trustScore > 50 && duplicateScore < 95) return "ticker_only";
  return "hold_for_review";
}

function summarizeTrustReason({ sourceCount, sensitive, baseTrust }) {
  if (sensitive && sourceCount < 2) return "Sensitive story awaiting stronger confirmation.";
  if (sourceCount >= 2) return "Multiple signals were matched across sources.";
  if (baseTrust >= 85) return "High-trust source with direct attribution on screen.";
  return "Single-source item shown with attribution and cautious language.";
}

function buildTickerText(item) {
  const sourceTag = item.source_name ? ` | ${item.source_name}` : "";
  return cleanText(`${item.normalized_title}${sourceTag}`).slice(0, 160);
}

function buildAnchorTexts(item) {
  const cautiousLead = item.requires_human_review || item.verification_status === "Source Pending"
    ? "بحسب المصدر المذكور،"
    : item.verification_status === "Multi-source Confirmed"
      ? "أكدت عدة مصادر،"
      : "أفادت المصادر المعروضة،";

  const shortAnchorText = cleanText(`${cautiousLead} ${item.normalized_title}. المصدر: ${item.source_name}.`);
  const fullAnchorText = cleanText(
    `${cautiousLead} ${item.normalized_title}. ${item.normalized_body || "يتم تحديث التفاصيل حال ورودها."} ` +
    `المصدر الأصلي: ${item.source_name}. وقت النشر: ${new Date(item.published_at).toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}. ` +
    `حالة التحقق: ${item.verification_status}.`
  );

  return {
    ticker_text: buildTickerText(item),
    short_anchor_text: shortAnchorText,
    full_anchor_text: fullAnchorText,
  };
}

async function fetchInternalJson(url) {
  const timeout = withTimeout(10000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: timeout.signal,
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return await response.json();
  } finally {
    timeout.clear();
  }
}

function mergeOverride(item, store) {
  const override = store.overrides.get(item.id);
  if (!override) return item;
  return {
    ...item,
    approval_status: override.approval_status || item.approval_status,
    manual_action: override.manual_action || item.manual_action || "",
    editorial_note: override.editorial_note || item.editorial_note || "",
  };
}

function pushAudit(store, action, itemId, details = {}) {
  store.auditLogs.unshift({
    id: `${action}-${itemId || "system"}-${Date.now()}`,
    actor: "editor-panel",
    action,
    target_id: itemId || "system",
    details,
    created_at: nowIso(),
  });
  store.auditLogs = store.auditLogs.slice(0, 120);
}

function markAsRead(store, itemId) {
  if (!itemId) return;
  store.readHistory = [itemId, ...store.readHistory.filter((entry) => entry !== itemId)].slice(0, 80);
}

function selectCurrentBroadcast(snapshot, store) {
  if (store.broadcast.interrupted) return null;

  const manualFirst = store.broadcast.manualQueue
    .map((entryId) => snapshot.queue.find((item) => item.id === entryId))
    .filter(Boolean);

  const candidate = manualFirst[0] || snapshot.queue[0] || null;
  if (!candidate) {
    store.broadcast.currentItemId = "";
    return null;
  }

  if (store.broadcast.currentItemId && store.broadcast.currentItemId !== candidate.id) {
    markAsRead(store, store.broadcast.currentItemId);
  }

  store.broadcast.currentItemId = candidate.id;
  store.broadcast.manualQueue = store.broadcast.manualQueue.filter((entryId) => entryId !== candidate.id);
  return candidate;
}

function buildAssetRecords(item, store) {
  const presenter = store.settings.presenter;
  return {
    audio_asset: {
      id: `audio-${item.id}`,
      script_id: `script-${item.id}`,
      voice_name: `${presenter.gender}-${presenter.dialect}-news`,
      audio_url: "browser-tts://speech-synthesis",
      duration: clamp(Math.ceil((item.full_anchor_text.length || 120) / 13), 8, 45),
      generated_at: nowIso(),
      delivery: "browser_tts_fallback",
    },
    video_asset: {
      id: `video-${item.id}`,
      script_id: `script-${item.id}`,
      avatar_profile: presenter,
      video_url: "virtual-presenter://live-studio",
      duration: clamp(Math.ceil((item.full_anchor_text.length || 120) / 13), 8, 45),
      resolution: "1920x1080",
      generated_at: nowIso(),
      renderer: "react-live-avatar",
    },
  };
}

function normalizeIncomingItem(item, fallbackSource = "Live Feed") {
  const publishedAt = item?.published_at || item?.time || nowIso();
  return {
    raw_id: String(item?.id || item?.url || `${fallbackSource}-${publishedAt}`),
    title: cleanText(item?.title || item?.normalized_title || "Untitled"),
    body: cleanText(item?.summary || item?.body || item?.normalized_body || ""),
    source_name: cleanText(item?.source || item?.source_name || fallbackSource),
    source_url: cleanText(item?.url || item?.source_url || "#"),
    published_at: publishedAt,
    ingested_at: nowIso(),
    language: detectLanguage(`${item?.title || ""} ${item?.summary || ""}`),
    category: cleanText(item?.category || "general").toLowerCase(),
    urgency_hint: cleanText(item?.urgency || ""),
    image: cleanText(item?.image || ""),
  };
}

async function collectSourcePayloads(req) {
  const baseUrl = getInternalApiBase(req);
  const [liveIntake, liveEvents] = await Promise.allSettled([
    fetchInternalJson(`${baseUrl}/api/live-intake?category=all`),
    fetchInternalJson(`${baseUrl}/api/liveevents`),
  ]);

  const items = [];
  const health = [];

  if (liveIntake.status === "fulfilled") {
    const intakeNews = Array.isArray(liveIntake.value?.news) ? liveIntake.value.news : [];
    items.push(...intakeNews.map((item) => normalizeIncomingItem(item, item?.source || "Live Intake")));
    health.push(...(Array.isArray(liveIntake.value?.health) ? liveIntake.value.health : []));
  }

  if (liveEvents.status === "fulfilled") {
    const eventItems = Array.isArray(liveEvents.value?.events) ? liveEvents.value.events : [];
    items.push(...eventItems.map((item) => normalizeIncomingItem(item, item?.source || "Live Events")));
  }

  return {
    items,
    health,
    sourceFailures: [liveIntake, liveEvents].filter((entry) => entry.status !== "fulfilled").length,
  };
}

function buildNormalizedDataset(items, store) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = canonicalKey(item);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  const normalizedItems = Array.from(grouped.entries()).map(([key, group], index) => {
    const representative = [...group].sort((a, b) => sourceBaseTrust(b.source_name) - sourceBaseTrust(a.source_name))[0];
    const titleAndBody = `${representative.title} ${representative.body}`;
    const sensitive = SENSITIVE_RE.test(titleAndBody);
    const sourceCount = new Set(group.map((entry) => entry.source_name)).size;
    const baseTrust = sourceBaseTrust(representative.source_name);
    const urgencyScore = computeUrgencyScore(titleAndBody, representative.urgency_hint);
    const impactScore = computeImpactScore(titleAndBody, representative.category);
    const duplicateScore = computeDuplicateScore(group.length);
    const trustScore = clamp(baseTrust + (sourceCount - 1) * 8 + Math.round(duplicateScore / 8) - (sensitive && sourceCount < 2 ? 18 : 0), 20, 99);
    const multiSource = sourceCount >= 2;
    const verificationStatus = safeVerificationStatus({ trustScore, sensitive, multiSource, sourceCount });
    const requiresHumanReview = sensitive && verificationStatus !== "Multi-source Confirmed";
    const broadcastAction = chooseBroadcastAction({ urgencyScore, trustScore, sensitive, verificationStatus, duplicateScore });
    const id = `lnai-${index}-${encodeURIComponent(key).slice(0, 72)}`;
    const normalizedBase = {
      id,
      raw_article_ids: group.map((entry) => entry.raw_id),
      canonical_hash: key,
      original_title: representative.title,
      normalized_title: representative.title,
      normalized_body: representative.body,
      source_name: representative.source_name,
      source_url: representative.source_url || "#",
      published_at: representative.published_at,
      ingested_at: representative.ingested_at,
      language: representative.language,
      category: representative.category,
      urgency_score: urgencyScore,
      trust_score: trustScore,
      impact_score: impactScore,
      duplicate_score: duplicateScore,
      confidence_level: trustScore >= 80 ? "high" : trustScore >= 60 ? "medium" : "low",
      verification_status: verificationStatus,
      requires_human_review: requiresHumanReview,
      sensitive,
      source_count: sourceCount,
      sources: [...new Set(group.map((entry) => entry.source_name))],
      read_already: store.readHistory.includes(id),
      priority_action: broadcastAction,
      approval_status: requiresHumanReview ? "hold" : "approved",
      trust_reason: summarizeTrustReason({ sourceCount, sensitive, baseTrust }),
      last_editor_action: "",
      image: representative.image,
    };

    const scripts = buildAnchorTexts(normalizedBase);
    return {
      ...normalizedBase,
      ...scripts,
      status_label: broadcastAction === "breaking_interrupt"
        ? "Live"
        : verificationStatus === "Verified" || verificationStatus === "Multi-source Confirmed"
          ? "Verified"
          : verificationStatus === "Needs Review"
            ? "Updating"
            : "Source Pending",
    };
  });

  return normalizedItems
    .map((item) => mergeOverride(item, store))
    .sort((a, b) => {
      const aScore = a.urgency_score + a.trust_score + a.impact_score + a.duplicate_score;
      const bScore = b.urgency_score + b.trust_score + b.impact_score + b.duplicate_score;
      return bScore - aScore;
    });
}

function deriveQueue(items) {
  return items.filter((item) => {
    if (item.approval_status === "reject") return false;
    if (item.read_already) return false;
    return item.priority_action === "breaking_interrupt" || item.priority_action === "anchor_read";
  });
}

function deriveTicker(items, store) {
  const pinned = store.broadcast.tickerPinned
    .map((entryId) => items.find((item) => item.id === entryId))
    .filter(Boolean);
  const flowing = items.filter((item) => item.priority_action !== "hold_for_review");
  const unique = new Map();
  [...pinned, ...flowing].forEach((item) => {
    if (!unique.has(item.id)) unique.set(item.id, item);
  });
  return Array.from(unique.values()).slice(0, 18);
}

export async function getLiveNewsSnapshot(req, { force = false } = {}) {
  const store = getStore();
  if (!force && store.cachedSnapshot && Date.now() - store.cachedAt < 15000) {
    return store.cachedSnapshot;
  }

  const collected = await collectSourcePayloads(req);
  const items = buildNormalizedDataset(collected.items, store);
  const queue = deriveQueue(items);
  const ticker = deriveTicker(items, store);

  const snapshot = {
    generated_at: nowIso(),
    refresh_plan: DEFAULT_REFRESH_PLAN,
    settings: store.settings,
    transparency_notice: "This broadcast uses AI-generated presenter and AI-assisted summarization.",
    ai_label: "AI Generated Presenter",
    items,
    ticker,
    queue,
    recent_items: items.slice(0, 20),
    metrics: {
      total_items: items.length,
      queued_for_anchor: queue.length,
      needs_review: items.filter((item) => item.requires_human_review || item.approval_status === "hold").length,
      verified_items: items.filter((item) => item.verification_status === "Verified" || item.verification_status === "Multi-source Confirmed").length,
      source_pending: items.filter((item) => item.verification_status === "Source Pending").length,
      active_sources: new Set(items.map((item) => item.source_name)).size,
      source_failures: collected.sourceFailures,
    },
    systems: {
      ingestion: { status: collected.items.length > 0 ? "Live" : "Updating", description: "RSS + API normalization pipeline" },
      verification: { status: "Verified", description: "Trust scoring, duplicate detection, sensitive-story review" },
      summarization: { status: "Updating", description: "Ticker and anchor script generation with source attribution" },
      tts: { status: "Live", description: "Browser speech synthesis fallback for Arabic presenter voice" },
      avatar: { status: "Live", description: "Virtual anchor rendered in-page with AI disclosure" },
      composer: { status: store.broadcast.interrupted ? "Updating" : "Live", description: "Live overlay, ticker, status, and disclosure composer" },
    },
    source_health: collected.health,
    admin: {
      audit_logs: store.auditLogs.slice(0, 40),
      mode: store.settings.mode,
      broadcast_interrupted: store.broadcast.interrupted,
    },
  };

  snapshot.current_broadcast = selectCurrentBroadcast(snapshot, store);
  snapshot.current_broadcast_with_assets = snapshot.current_broadcast
    ? { ...snapshot.current_broadcast, ...buildAssetRecords(snapshot.current_broadcast, store) }
    : null;
  snapshot.broadcast_status = {
    state: store.broadcast.interrupted ? "Updating" : (snapshot.current_broadcast ? "Live" : "Source Pending"),
    current_item_id: snapshot.current_broadcast?.id || "",
    verified_state: snapshot.current_broadcast?.verification_status || "Source Pending",
    auto_play: store.settings.autoPlay,
    muted: store.settings.muted,
    mode: store.settings.mode,
    last_interrupted_at: store.broadcast.lastInterruptedAt,
    last_resumed_at: store.broadcast.lastResumedAt,
  };

  store.cachedSnapshot = snapshot;
  store.cachedAt = Date.now();
  return snapshot;
}

export function apiOk(res, payload) {
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");
  return res.status(200).json(payload);
}

export function handleApiPrelude(req, res, methods = "GET, OPTIONS", method = "GET") {
  applyApiHeaders(req, res, methods);
  if (handlePreflight(req, res)) return true;
  if (rejectUnsupportedMethod(req, res, method)) return true;
  return false;
}

export async function getPublicLivePayload(req) {
  const snapshot = await getLiveNewsSnapshot(req);
  return {
    project_name: "Live News by AI",
    page_title: "Live News by AI",
    description_ar: "بث إخباري يستخدم مذيعًا افتراضيًا مولدًا بالذكاء الاصطناعي مع إظهار واضح للمصادر وحالة التحقق.",
    ...snapshot,
  };
}

export async function getLatestNewsPayload(req) {
  const snapshot = await getLiveNewsSnapshot(req);
  return {
    updated_at: snapshot.generated_at,
    latest: snapshot.recent_items,
    ticker: snapshot.ticker,
  };
}

export async function getNewsItemPayload(req, itemId) {
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId);
  if (!item) return null;
  return {
    item: {
      ...item,
      ...buildAssetRecords(item, getStore()),
    },
  };
}

export async function getBroadcastStatusPayload(req) {
  const snapshot = await getLiveNewsSnapshot(req);
  return {
    project_name: "Live News by AI",
    status: snapshot.broadcast_status,
    current: snapshot.current_broadcast_with_assets,
    ticker: snapshot.ticker,
    queue: snapshot.queue,
    systems: snapshot.systems,
    metrics: snapshot.metrics,
    transparency_notice: snapshot.transparency_notice,
  };
}

export async function getAdminQueuePayload(req) {
  const snapshot = await getLiveNewsSnapshot(req, { force: true });
  return {
    queue: snapshot.items,
    audit_logs: snapshot.admin.audit_logs,
    systems: snapshot.systems,
    metrics: snapshot.metrics,
    settings: snapshot.settings,
  };
}

function resolveRouteId(req) {
  const raw = req?.query?.id;
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

function parseBody(req) {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return req.body;
}

function setOverride(store, itemId, patch) {
  const current = store.overrides.get(itemId) || {};
  store.overrides.set(itemId, { ...current, ...patch });
}

export async function mutateItemApproval(req, itemId, approvalStatus, extra = {}) {
  const store = getStore();
  setOverride(store, itemId, {
    approval_status: approvalStatus,
    manual_action: extra.manual_action || approvalStatus,
    editorial_note: cleanText(extra.editorial_note || ""),
  });
  if (approvalStatus === "approved" && extra.read_now) {
    store.broadcast.manualQueue = [itemId, ...store.broadcast.manualQueue.filter((entry) => entry !== itemId)].slice(0, 12);
  }
  pushAudit(store, approvalStatus, itemId, extra);
  return getNewsItemPayload(req, itemId);
}

export async function generateScriptPayload(req) {
  const body = parseBody(req);
  const itemId = cleanText(body?.item_id || body?.article_id || "");
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId) || snapshot.current_broadcast;
  if (!item) return null;
  return {
    script: {
      id: `script-${item.id}`,
      article_id: item.id,
      ticker_text: item.ticker_text,
      short_anchor_text: item.short_anchor_text,
      full_anchor_text: item.full_anchor_text,
      generated_at: nowIso(),
      approved_by: item.approval_status === "approved" ? "system-or-editor" : null,
      approval_status: item.approval_status,
      verification_status: item.verification_status,
    },
  };
}

export async function generateTtsPayload(req) {
  const body = parseBody(req);
  const itemId = cleanText(body?.item_id || body?.script_id || "").replace(/^script-/, "");
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId) || snapshot.current_broadcast;
  if (!item) return null;
  return {
    audio: buildAssetRecords(item, getStore()).audio_asset,
    item_id: item.id,
  };
}

export async function renderAvatarPayload(req) {
  const body = parseBody(req);
  const itemId = cleanText(body?.item_id || body?.script_id || "").replace(/^script-/, "");
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId) || snapshot.current_broadcast;
  if (!item) return null;
  return {
    video: buildAssetRecords(item, getStore()).video_asset,
    item_id: item.id,
  };
}

export async function getAudioPayload(req, itemId) {
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId.replace(/^audio-/, ""));
  if (!item) return null;
  return { audio: buildAssetRecords(item, getStore()).audio_asset };
}

export async function getVideoPayload(req, itemId) {
  const snapshot = await getLiveNewsSnapshot(req);
  const item = snapshot.items.find((entry) => entry.id === itemId.replace(/^video-/, ""));
  if (!item) return null;
  return { video: buildAssetRecords(item, getStore()).video_asset };
}

export async function pushBroadcastPayload(req) {
  const body = parseBody(req);
  const itemId = cleanText(body?.item_id || body?.id || "");
  const mode = cleanText(body?.mode || "push_to_ticker");
  const store = getStore();

  if (itemId) {
    if (mode === "interrupt" || mode === "read_now") {
      store.broadcast.manualQueue = [itemId, ...store.broadcast.manualQueue.filter((entry) => entry !== itemId)].slice(0, 12);
      setOverride(store, itemId, { approval_status: "approved", manual_action: mode });
    }
    if (mode === "push_to_ticker") {
      store.broadcast.tickerPinned = [itemId, ...store.broadcast.tickerPinned.filter((entry) => entry !== itemId)].slice(0, 12);
    }
    pushAudit(store, mode, itemId, body);
  }

  return getBroadcastStatusPayload(req);
}

export async function interruptBroadcastPayload(req) {
  const body = parseBody(req);
  const store = getStore();
  const itemId = cleanText(body?.item_id || body?.id || "");
  store.broadcast.interrupted = true;
  store.broadcast.interruptionReason = cleanText(body?.reason || "manual_interrupt");
  store.broadcast.lastInterruptedAt = nowIso();
  if (itemId) {
    store.broadcast.manualQueue = [itemId, ...store.broadcast.manualQueue.filter((entry) => entry !== itemId)].slice(0, 12);
    setOverride(store, itemId, { approval_status: "approved", manual_action: "interrupt_broadcast" });
  }
  pushAudit(store, "interrupt_broadcast", itemId || "system", body);
  const snapshot = await getBroadcastStatusPayload(req);
  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      state: "Updating",
    },
  };
}

export async function resumeBroadcastPayload(req) {
  const store = getStore();
  store.broadcast.interrupted = false;
  store.broadcast.interruptionReason = "";
  store.broadcast.lastResumedAt = nowIso();
  pushAudit(store, "resume_broadcast", "system", {});
  return getBroadcastStatusPayload(req);
}

export function getRequestItemId(req) {
  return resolveRouteId(req);
}
