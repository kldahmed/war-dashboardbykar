import { applyApiHeaders, getInternalApiBase, handlePreflight, rejectUnsupportedMethod, withTimeout } from "./_api-utils.js";

const DEFAULT_REFRESH_PLAN = {
  fastSourcesSeconds: 20,
  standardSourcesSeconds: 45,
  fullResyncSeconds: 180,
};

const SOURCE_TRUST = {
  Reuters: 94,
  BBC: 92,
  "AP News": 93,
  "AP Breaking": 94,
  NPR: 88,
  "Al Jazeera": 84,
  "Sky News": 82,
  "The Guardian": 86,
  NYTimes: 88,
  "France 24 Arabic": 82,
  "DW Arabic": 80,
  "Arab News": 78,
  "The National": 80,
  "Khaleej Times": 76,
  "Gulf News": 75,
  "UN News": 89,
  ReliefWeb: 87,
  "Fallback Feed": 42,
};

const SENSITIVE_RE = /حرب|هجوم|اغتيال|كارثة|زلزال|تفجير|قصف|غارة|اشتباكات|قتلى|ضحايا|وباء|حظر|طوارئ|قرار حكومي|حكومة|عسكري|assassination|war|attack|explosion|casualties|deaths|pandemic|outbreak|emergency|government order|military/i;
const EXTREME_RE = /عاجل جدا|عاجل|breaking|urgent|صاروخ|صواريخ|missile|rocket|drone|strike|raid|attack|explosion|intercept|انفجار|غارة|قصف/i;
const HIGH_RE = /تحرك|deployment|warning|alert|استنفار|تحذير|توتر|اشتباكات|قصف|غارة|هجوم|market shock|اضطراب/i;

function getStore() {
  if (!globalThis.__KAR_LIVE_NEWS_AI_V2__) {
    globalThis.__KAR_LIVE_NEWS_AI_V2__ = {
      cachedSnapshot: null,
      cachedAt: 0,
      overrides: new Map(),
      readHistory: [],
      auditLogs: [],
      pipelineLogs: [],
      broadcast: {
        currentItemId: "",
        currentStartedAt: "",
        currentEndsAt: "",
        currentDurationSeconds: 0,
        interrupted: false,
        interruptionReason: "",
        manualQueue: [],
        tickerPinned: [],
        lastInterruptedAt: "",
        lastResumedAt: "",
      },
      settings: {
        mode: "auto",
        autoPlay: true,
        muted: false,
        presenter: {
          key: "female-desk",
          gender: "female",
          name: "Noura AI",
          dialect: "msa",
          studio: "midnight-desk",
          deliveryStyle: "measured",
          speechRate: 0.95,
        },
      },
    };
  }

  return globalThis.__KAR_LIVE_NEWS_AI_V2__;
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

function detectLanguage(text = "") {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "ar" : "en";
}

function safeDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function canonicalKey(item = {}) {
  return cleanText(item.url && item.url !== "#" ? item.url : `${item.title || ""} ${item.body || ""}`)
    .toLowerCase()
    .replace(/https?:\/\/[^/]+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function sourceBaseTrust(source = "") {
  const exact = SOURCE_TRUST[source];
  if (Number.isFinite(exact)) return exact;
  if (/reuters|ap|bbc/i.test(source)) return 91;
  if (/guardian|npr|jazeera|sky|france 24|dw/i.test(source)) return 82;
  if (/arab news|national|khaleej|gulf/i.test(source)) return 76;
  if (/fallback/i.test(source)) return 42;
  return 68;
}

function computeUrgencyScore(text = "", fallbackUrgency = "") {
  if (EXTREME_RE.test(text) || fallbackUrgency === "high") return 96;
  if (HIGH_RE.test(text) || fallbackUrgency === "medium") return 76;
  return 52;
}

function computeImpactScore(text = "", category = "") {
  let score = 42;
  if (/government|minister|president|سياسة|حكومة|رئيس|وزير/i.test(text)) score += 18;
  if (/oil|energy|نفط|طاقة|market|economy|اقتصاد|shipping|شحن/i.test(text)) score += 14;
  if (/military|قصف|غارة|هجوم|missile|attack|drone|صاروخ|مسيرة/i.test(text) || category === "military") score += 20;
  return clamp(score, 0, 100);
}

function computeDuplicateScore(groupSize = 1) {
  return clamp(groupSize <= 1 ? 8 : 26 + groupSize * 14, 0, 100);
}

function estimateSpeechSeconds(text = "", speechRate = 0.95) {
  const words = cleanText(text).split(" ").filter(Boolean).length;
  const baseSeconds = Math.max(8, Math.ceil(words / 2.2));
  const adjusted = Math.round(baseSeconds / clamp(Number(speechRate || 0.95), 0.8, 1.15));
  return clamp(adjusted, 8, 44);
}

function resolveAvatarMedia(presenterGender = "female") {
  const gender = presenterGender === "male" ? "male" : "female";
  const envPrefix = gender.toUpperCase();
  const mp4 = process.env[`LIVE_AVATAR_${envPrefix}_MP4`] || "";
  const webm = process.env[`LIVE_AVATAR_${envPrefix}_WEBM`] || "";
  const poster = process.env[`LIVE_AVATAR_${envPrefix}_POSTER`] || "";
  return {
    mp4: cleanText(mp4),
    webm: cleanText(webm),
    poster: cleanText(poster),
  };
}

function resolveTtsProvider() {
  const provider = cleanText(process.env.LIVE_TTS_PROVIDER || "").toLowerCase();
  if (!provider) {
    return {
      name: "browser-speech-synthesis",
      mode: "fallback",
      available: true,
    };
  }
  return {
    name: provider,
    mode: "primary",
    available: true,
  };
}

function buildSourceDisplay(sources = []) {
  const names = Array.from(new Set((sources || []).map((entry) => cleanText(entry?.name)).filter(Boolean)));
  if (names.length === 0) return "غرفة الأخبار";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names[0]} + ${names[1]} +${names.length - 2}`;
}

function safeVerificationStatus({ trustScore, sensitive, multiSource, sourceCount }) {
  if (sensitive && !multiSource) return "Needs Review";
  if (multiSource && trustScore >= 78) return "Multi-source Confirmed";
  if (trustScore >= 74 && sourceCount >= 1) return "Verified";
  if (sourceCount >= 1) return "Attributed";
  return "Feed Recovery";
}

function chooseBroadcastAction({ urgencyScore, trustScore, sensitive, verificationStatus, duplicateScore }) {
  if (sensitive && verificationStatus !== "Multi-source Confirmed") return "hold_for_review";
  if (urgencyScore > 92 && trustScore > 76 && verificationStatus === "Multi-source Confirmed") return "breaking_interrupt";
  if (urgencyScore > 74 && trustScore > 66 && verificationStatus !== "Feed Recovery") return "anchor_read";
  if (urgencyScore >= 46 && trustScore > 54 && duplicateScore < 95) return "ticker_only";
  return "hold_for_review";
}

function summarizeTrustReason({ sourceCount, sensitive, baseTrust, verificationStatus }) {
  if (sensitive && sourceCount < 2) return "قصة حساسة مرتبطة بمصدر معروف لكنها تحتاج تحققًا إضافيًا قبل القراءة التلقائية.";
  if (verificationStatus === "Multi-source Confirmed") return "تمت مطابقة الخبر عبر أكثر من مصدر معروض داخل البث.";
  if (baseTrust >= 85) return "المصدر الأساسي عالي الثقة ويظهر اسمه ورابطه ووقت النشر على الشاشة.";
  return "الخبر منسوب إلى مصدر ظاهر داخل النظام ويُقرأ بصياغة حذرة.";
}

function buildTickerText(item) {
  const sourceTag = item.source_display ? ` | ${item.source_display}` : "";
  return cleanText(`${item.normalized_title}${sourceTag}`).slice(0, 180);
}

function buildAnchorTexts(item) {
  const lead = item.priority_action === "breaking_interrupt"
    ? "عاجل الآن،"
    : item.verification_status === "Multi-source Confirmed"
      ? "أكدت عدة مصادر معروضة على الشاشة،"
      : item.verification_status === "Verified"
        ? "بحسب المصادر المعتمدة،"
        : "بحسب المصدر المعروض،";

  const shortAnchorText = cleanText(`${lead} ${item.normalized_title}. المصدر: ${item.source_display}.`);
  const fullAnchorText = cleanText(
    `${lead} ${item.normalized_title}. ${item.normalized_body || "تستمر غرفة الأخبار في جمع التفاصيل من المصادر المعتمدة."} ` +
    `المصدر المعروض: ${item.source_display}. وقت النشر: ${safeDate(item.published_at).toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}. ` +
    `حالة التحقق الحالية: ${item.verification_status}.`
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

function resolveRouteId(req) {
  const raw = req?.query?.id;
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

function invalidateSnapshot(store) {
  store.cachedSnapshot = null;
  store.cachedAt = 0;
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

function pushPipelineLog(store, action, details = {}) {
  store.pipelineLogs.unshift({
    id: `${action}-${Date.now()}`,
    action,
    details,
    created_at: nowIso(),
  });
  store.pipelineLogs = store.pipelineLogs.slice(0, 200);
}

function markAsRead(store, itemId) {
  if (!itemId) return;
  store.readHistory = [itemId, ...store.readHistory.filter((entry) => entry !== itemId)].slice(0, 120);
}

function normalizeIncomingItem(item, fallbackSource = "Live Feed") {
  const publishedAt = item?.published_at || item?.time || nowIso();
  const title = cleanText(item?.title || item?.normalized_title || item?.headline || "Untitled");
  const body = cleanText(item?.summary || item?.body || item?.normalized_body || item?.description || "");
  const sourceName = cleanText(item?.source || item?.source_name || fallbackSource);
  const sourceUrl = cleanText(item?.url || item?.source_url || "#");
  return {
    raw_id: String(item?.id || sourceUrl || `${sourceName}-${publishedAt}`),
    title,
    body,
    source_name: sourceName,
    source_url: sourceUrl || "#",
    published_at: publishedAt,
    ingested_at: nowIso(),
    language: detectLanguage(`${title} ${body}`),
    category: cleanText(item?.category || "general").toLowerCase(),
    urgency_hint: cleanText(item?.urgency || ""),
    image: cleanText(item?.image || ""),
  };
}

function buildFallbackItems() {
  return [
    {
      raw_id: "lnai-fallback-watchdesk",
      title: "متابعة مستمرة للمصادر المعتمدة مع تحديث البث لحظة ورود أي تطور جديد",
      body: "لا توجد الآن أولوية عاجلة للقراءة، وتبقى غرفة الأخبار متصلة بالمصادر المعتمدة وتجهز النشرة التالية.",
      source_name: "Fallback Feed",
      source_url: "#",
      published_at: nowIso(),
      ingested_at: nowIso(),
      language: "ar",
      category: "standby",
      urgency_hint: "low",
      image: "",
    },
  ];
}

async function collectSourcePayloads(req, stageEntries) {
  const baseUrl = getInternalApiBase(req);
  const requests = [
    { id: "news", label: "RSS ingest", url: `${baseUrl}/api/news?category=all`, field: "news", fallback: "Open RSS" },
    { id: "liveevents", label: "Live events", url: `${baseUrl}/api/liveevents`, field: "events", fallback: "Live Events" },
    { id: "live-intake", label: "Intake prioritizer", url: `${baseUrl}/api/live-intake?category=all`, field: "news", fallback: "Live Intake" },
  ];

  const results = await Promise.allSettled(requests.map((entry) => fetchInternalJson(entry.url)));
  const items = [];
  const health = [];

  results.forEach((result, index) => {
    const request = requests[index];
    if (result.status === "fulfilled") {
      const payload = result.value || {};
      const arr = Array.isArray(payload?.[request.field]) ? payload[request.field] : [];
      items.push(...arr.map((entry) => normalizeIncomingItem(entry, entry?.source || request.fallback)));
      health.push({
        id: request.id,
        label: request.label,
        ok: true,
        count: arr.length,
        updated_at: payload?.updated || nowIso(),
      });
      stageEntries.push({ id: request.id, label: request.label, status: arr.length > 0 ? "Live" : "Updating", summary: `${arr.length} items ingested` });
      return;
    }

    health.push({
      id: request.id,
      label: request.label,
      ok: false,
      count: 0,
      updated_at: nowIso(),
      error: result.reason?.message || "fetch_failed",
    });
    stageEntries.push({ id: request.id, label: request.label, status: "Updating", summary: result.reason?.message || "fetch_failed" });
  });

  if (items.length === 0) {
    items.push(...buildFallbackItems());
  }

  return {
    items,
    health,
    sourceFailures: health.filter((entry) => !entry.ok).length,
  };
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

function buildNormalizedDataset(items, store) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = canonicalKey(item);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  const normalizedItems = Array.from(grouped.entries()).map(([key, group], index) => {
    const representative = [...group].sort((a, b) => {
      const trustDiff = sourceBaseTrust(b.source_name) - sourceBaseTrust(a.source_name);
      if (trustDiff !== 0) return trustDiff;
      return safeDate(b.published_at).getTime() - safeDate(a.published_at).getTime();
    })[0];

    const sourcesDetail = Array.from(new Map(group.map((entry) => [`${entry.source_name}|${entry.source_url}`, {
      name: entry.source_name,
      url: entry.source_url,
      published_at: entry.published_at,
    }])).values());
    const titleAndBody = `${representative.title} ${representative.body}`;
    const sensitive = SENSITIVE_RE.test(titleAndBody);
    const sourceCount = new Set(group.map((entry) => entry.source_name)).size;
    const baseTrust = sourceBaseTrust(representative.source_name);
    const urgencyScore = computeUrgencyScore(titleAndBody, representative.urgency_hint);
    const impactScore = computeImpactScore(titleAndBody, representative.category);
    const duplicateScore = computeDuplicateScore(group.length);
    const trustScore = clamp(baseTrust + (sourceCount - 1) * 9 + Math.round(duplicateScore / 10) - (sensitive && sourceCount < 2 ? 16 : 0), 28, 99);
    const multiSource = sourceCount >= 2;
    const verificationStatus = safeVerificationStatus({ trustScore, sensitive, multiSource, sourceCount });
    const requiresHumanReview = sensitive && verificationStatus !== "Multi-source Confirmed";
    const priorityAction = chooseBroadcastAction({ urgencyScore, trustScore, sensitive, verificationStatus, duplicateScore });
    const id = `lnai-${index}-${encodeURIComponent(key).slice(0, 90)}`;

    const normalizedBase = {
      id,
      raw_article_ids: group.map((entry) => entry.raw_id),
      canonical_hash: key,
      original_title: representative.title,
      normalized_title: representative.title,
      normalized_body: representative.body,
      source_name: representative.source_name,
      source_url: representative.source_url || "#",
      source_display: buildSourceDisplay(sourcesDetail),
      sources_detail: sourcesDetail,
      published_at: representative.published_at,
      updated_at: nowIso(),
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
      sources: sourcesDetail.map((entry) => entry.name),
      read_already: store.readHistory.includes(id),
      priority_action: priorityAction,
      approval_status: requiresHumanReview ? "hold" : "approved",
      trust_reason: summarizeTrustReason({ sourceCount, sensitive, baseTrust, verificationStatus }),
      last_editor_action: "",
      image: representative.image,
    };

    const scripts = buildAnchorTexts(normalizedBase);
    const estimatedSpeechSeconds = estimateSpeechSeconds(scripts.full_anchor_text, store.settings.presenter.speechRate);

    return {
      ...normalizedBase,
      ...scripts,
      estimated_speech_seconds: estimatedSpeechSeconds,
      status_label: priorityAction === "breaking_interrupt"
        ? "Breaking"
        : verificationStatus === "Multi-source Confirmed" || verificationStatus === "Verified"
          ? "On Air Ready"
          : verificationStatus === "Needs Review"
            ? "Review Gate"
            : "Attributed",
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

function shouldQueueForAnchor(item, mode) {
  if (item.approval_status === "reject") return false;
  if (item.approval_status === "hold" && item.priority_action !== "breaking_interrupt") return false;
  if (mode === "semi-auto") {
    return item.priority_action === "breaking_interrupt" || item.verification_status === "Verified" || item.verification_status === "Multi-source Confirmed";
  }
  return item.priority_action === "breaking_interrupt" || item.priority_action === "anchor_read" || item.verification_status === "Verified";
}

function deriveQueue(items, store) {
  const mode = store.settings.mode;
  return items.filter((item) => {
    if (item.read_already && item.priority_action !== "breaking_interrupt") return false;
    return shouldQueueForAnchor(item, mode);
  }).slice(0, 18);
}

function deriveTicker(items, store) {
  const pinned = store.broadcast.tickerPinned
    .map((entryId) => items.find((item) => item.id === entryId))
    .filter(Boolean);
  const flowing = items.filter((item) => item.approval_status !== "reject" && item.priority_action !== "hold_for_review");
  const unique = new Map();
  [...pinned, ...flowing].forEach((item) => {
    if (!unique.has(item.id)) unique.set(item.id, {
      id: item.id,
      source_name: item.source_display || item.source_name,
      ticker_text: item.ticker_text || item.normalized_title,
      updated_at: item.updated_at || item.published_at,
      priority_action: item.priority_action,
    });
  });
  const ticker = Array.from(unique.values()).slice(0, 14);
  if (ticker.length > 0) return ticker;
  return [{
    id: "lnai-fallback-ticker",
    source_name: "News Desk",
    ticker_text: "متابعة مستمرة للمصادر المعتمدة وتجهيز النشرة التالية داخل البث الحي.",
    updated_at: nowIso(),
    priority_action: "ticker_only",
  }];
}

function buildStandbyItem(store, reason = "watchdesk") {
  const currentTime = nowIso();
  const label = reason === "interrupted" ? "تم إيقاف القراءة مؤقتًا بقرار تحريري مع استمرار مراقبة المصادر." : "غرفة الأخبار تواصل المراقبة وتجهيز التحديث التالي من المصادر المعتمدة.";
  const item = {
    id: `standby-${reason}`,
    normalized_title: "استمرار البث المباشر ومتابعة غرفة الأخبار",
    normalized_body: label,
    source_name: "News Desk",
    source_display: "News Desk",
    source_url: "#",
    sources_detail: [{ name: "News Desk", url: "#", published_at: currentTime }],
    published_at: currentTime,
    updated_at: currentTime,
    verification_status: "Attributed",
    priority_action: "ticker_only",
    trust_score: 100,
    status_label: "Standby",
    short_anchor_text: label,
    full_anchor_text: `${label} سننتقل تلقائيًا إلى أي خبر عاجل موثق فور وصوله.`,
    ticker_text: "متابعة مستمرة للمصادر المعتمدة داخل البث الحي.",
    estimated_speech_seconds: 10,
    approval_status: "approved",
    read_already: false,
    sensitive: false,
    source_count: 1,
    confidence_level: "high",
  };
  return {
    ...item,
    ...buildAssetRecords(item, store),
  };
}

function buildAssetRecords(item, store) {
  const presenter = store.settings.presenter;
  const estimated = Number(item.estimated_speech_seconds || estimateSpeechSeconds(item.full_anchor_text, presenter.speechRate));
  const avatarMedia = resolveAvatarMedia(presenter.gender);
  const hasAvatarMedia = Boolean(avatarMedia.mp4 || avatarMedia.webm);
  const ttsProvider = resolveTtsProvider();
  return {
    audio_asset: {
      id: `audio-${item.id}`,
      script_id: `script-${item.id}`,
      engine: ttsProvider.name,
      voice_profile: `${presenter.gender}-${presenter.dialect}-news`,
      audio_url: cleanText(process.env.LIVE_TTS_STREAM_URL || "") || null,
      duration_seconds: estimated,
      generated_at: nowIso(),
      state: "ready",
      fallback_engine: "browser-speech-synthesis",
      provider_mode: ttsProvider.mode,
      delivery: ttsProvider.mode === "primary" ? "provider_stream_or_asset" : "client_generated_audio",
    },
    video_asset: {
      id: `video-${item.id}`,
      script_id: `script-${item.id}`,
      renderer: hasAvatarMedia ? "media-avatar-playback" : "live-studio-presenter-shell",
      profile_key: presenter.key,
      duration_seconds: estimated,
      stream_url: hasAvatarMedia ? (avatarMedia.webm || avatarMedia.mp4) : "in-page://live-news-ai-presenter",
      generated_at: nowIso(),
      optional_media: {
        mp4: avatarMedia.mp4,
        webm: avatarMedia.webm,
        poster: avatarMedia.poster,
      },
      state: hasAvatarMedia ? "ready" : "fallback",
    },
  };
}

function selectCurrentBroadcast(snapshot, store, stageEntries) {
  if (store.broadcast.interrupted) {
    stageEntries.push({ id: "composer", label: "Composer", status: "Updating", summary: "Broadcast interrupted by editorial control" });
    return buildStandbyItem(store, "interrupted");
  }

  const now = Date.now();
  const existingId = store.broadcast.currentItemId;
  const existingItem = snapshot.items.find((item) => item.id === existingId);
  const activeUntil = safeDate(store.broadcast.currentEndsAt).getTime();
  const manualFirst = store.broadcast.manualQueue
    .map((entryId) => snapshot.items.find((item) => item.id === entryId))
    .filter(Boolean);

  if (existingItem && activeUntil > now && manualFirst.length === 0) {
    return {
      ...existingItem,
      ...buildAssetRecords(existingItem, store),
      playback_started_at: store.broadcast.currentStartedAt,
      playback_ends_at: store.broadcast.currentEndsAt,
      playback_state: "playing",
    };
  }

  const candidate = manualFirst[0] || snapshot.queue[0] || null;
  if (!candidate) {
    store.broadcast.currentItemId = "";
    store.broadcast.currentStartedAt = nowIso();
    store.broadcast.currentEndsAt = nowIso();
    stageEntries.push({ id: "composer", label: "Composer", status: "Live", summary: "Standby sequence is on air" });
    return buildStandbyItem(store, "watchdesk");
  }

  if (existingId && existingId !== candidate.id) {
    markAsRead(store, existingId);
  }

  const durationSeconds = Number(candidate.estimated_speech_seconds || 12);
  store.broadcast.currentItemId = candidate.id;
  store.broadcast.currentStartedAt = nowIso();
  store.broadcast.currentEndsAt = new Date(Date.now() + durationSeconds * 1000 + 1500).toISOString();
  store.broadcast.currentDurationSeconds = durationSeconds;
  store.broadcast.manualQueue = store.broadcast.manualQueue.filter((entryId) => entryId !== candidate.id);

  stageEntries.push({ id: "composer", label: "Composer", status: "Live", summary: `On-air item: ${candidate.id}` });
  return {
    ...candidate,
    ...buildAssetRecords(candidate, store),
    playback_started_at: store.broadcast.currentStartedAt,
    playback_ends_at: store.broadcast.currentEndsAt,
    playback_state: "playing",
  };
}

function buildSystems(collected, snapshot, store) {
  const hasRealItems = snapshot.items.some((item) => item.source_name !== "Fallback Feed");
  const avatarMedia = resolveAvatarMedia(store.settings.presenter.gender);
  const avatarReady = Boolean(avatarMedia.mp4 || avatarMedia.webm);
  return {
    ingestion: {
      status: collected.items.length > 0 ? "Live" : "Updating",
      description: hasRealItems ? "RSS and internal live sources are normalized into a single editorial feed." : "Fallback watchdesk is active while external sources recover.",
    },
    verification: {
      status: snapshot.metrics.verified_items > 0 ? "Live" : "Updating",
      description: "Trust scoring, duplicate grouping, and sensitive-story review gate are applied before on-air selection.",
    },
    summarization: {
      status: snapshot.recent_items.length > 0 ? "Live" : "Updating",
      description: "Anchor and ticker scripts are generated from the normalized source ledger for each story.",
    },
    tts: {
      status: store.settings.muted ? "Muted" : "Live",
      description: "Primary Arabic TTS provider is used when configured, with browser speech synthesis as live fallback.",
    },
    avatar: {
      status: avatarReady ? "Live" : "Updating",
      description: "Avatar engine can play photorealistic media profiles and falls back to studio shell when media is unavailable.",
    },
    composer: {
      status: store.broadcast.interrupted ? "Updating" : "Live",
      description: "Lower-third, live badge, ticker, and disclosure overlays are composed into the viewing scene.",
    },
  };
}

export async function getLiveNewsSnapshot(req, { force = false } = {}) {
  const store = getStore();
  if (!force && store.cachedSnapshot && Date.now() - store.cachedAt < 7000) {
    return store.cachedSnapshot;
  }

  const stageEntries = [];
  const collected = await collectSourcePayloads(req, stageEntries);
  const items = buildNormalizedDataset(collected.items, store);
  const queue = deriveQueue(items, store);
  const ticker = deriveTicker(items, store);

  stageEntries.push({ id: "normalize", label: "Normalization", status: items.length > 0 ? "Live" : "Updating", summary: `${items.length} normalized stories` });
  stageEntries.push({ id: "queue", label: "Queue", status: queue.length > 0 ? "Live" : "Updating", summary: `${queue.length} stories ready for anchor rotation` });
  stageEntries.push({ id: "ticker", label: "Ticker", status: ticker.length > 0 ? "Live" : "Updating", summary: `${ticker.length} ticker items available` });

  const draftSnapshot = {
    generated_at: nowIso(),
    refresh_plan: DEFAULT_REFRESH_PLAN,
    settings: store.settings,
    transparency_notice: "هذا البث يستخدم مذيعًا افتراضيًا مولدًا بالذكاء الاصطناعي وتلخيصًا آليًا مع إظهار المصادر على الشاشة.",
    ai_label: "Virtual AI News Anchor",
    items,
    ticker,
    queue,
    recent_items: items.slice(0, 18),
    metrics: {
      total_items: items.length,
      queued_for_anchor: queue.length,
      needs_review: items.filter((item) => item.requires_human_review || item.approval_status === "hold").length,
      verified_items: items.filter((item) => item.verification_status === "Verified" || item.verification_status === "Multi-source Confirmed").length,
      attributed_items: items.filter((item) => item.verification_status === "Attributed").length,
      active_sources: new Set(items.flatMap((item) => item.sources || [])).size,
      source_failures: collected.sourceFailures,
    },
    source_health: collected.health,
  };

  const current = selectCurrentBroadcast(draftSnapshot, store, stageEntries);
  const broadcastState = store.broadcast.interrupted
    ? "Interrupted"
    : current?.id?.startsWith("standby-")
      ? "Standby"
      : "Live";

  const snapshot = {
    ...draftSnapshot,
    current_broadcast: current,
    current_broadcast_with_assets: current,
    broadcast_status: {
      state: broadcastState,
      current_item_id: current?.id || "",
      verified_state: current?.verification_status || "Attributed",
      auto_play: store.settings.autoPlay,
      muted: store.settings.muted,
      mode: store.settings.mode,
      started_at: store.broadcast.currentStartedAt,
      ends_at: store.broadcast.currentEndsAt,
      last_interrupted_at: store.broadcast.lastInterruptedAt,
      last_resumed_at: store.broadcast.lastResumedAt,
      interruption_reason: store.broadcast.interruptionReason,
    },
    systems: buildSystems(collected, draftSnapshot, store),
    pipeline: stageEntries.map((entry) => ({
      ...entry,
      updated_at: nowIso(),
    })),
    admin: {
      audit_logs: store.auditLogs.slice(0, 40),
      pipeline_logs: store.pipelineLogs.slice(0, 80),
      mode: store.settings.mode,
      broadcast_interrupted: store.broadcast.interrupted,
    },
  };

  pushPipelineLog(store, "snapshot_built", {
    items: snapshot.metrics.total_items,
    queue: snapshot.metrics.queued_for_anchor,
    current: snapshot.broadcast_status.current_item_id,
    state: snapshot.broadcast_status.state,
  });

  store.cachedSnapshot = snapshot;
  store.cachedAt = Date.now();
  return snapshot;
}

export function apiOk(res, payload) {
  res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
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
    description_ar: "بث إخباري حي بمذيع افتراضي وصوت عربي مولد بالذكاء الاصطناعي مع إظهار دائم للمصادر وحالة التحقق.",
    ...snapshot,
  };
}

export async function getLatestNewsPayload(req) {
  const snapshot = await getLiveNewsSnapshot(req);
  return {
    updated_at: snapshot.generated_at,
    latest: snapshot.recent_items,
    ticker: snapshot.ticker,
    current: snapshot.current_broadcast_with_assets,
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
  const snapshot = await getLiveNewsSnapshot(req, { force: true });
  return {
    project_name: "Live News by AI",
    status: snapshot.broadcast_status,
    current: snapshot.current_broadcast_with_assets,
    ticker: snapshot.ticker,
    queue: snapshot.queue,
    systems: snapshot.systems,
    metrics: snapshot.metrics,
    transparency_notice: snapshot.transparency_notice,
    pipeline: snapshot.pipeline,
    settings: snapshot.settings,
  };
}

export async function getAdminQueuePayload(req) {
  const snapshot = await getLiveNewsSnapshot(req, { force: true });
  return {
    queue: snapshot.items,
    audit_logs: snapshot.admin.audit_logs,
    pipeline_logs: snapshot.admin.pipeline_logs,
    systems: snapshot.systems,
    metrics: snapshot.metrics,
    settings: snapshot.settings,
  };
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
  pushPipelineLog(store, "approval_changed", { itemId, approvalStatus, extra });
  invalidateSnapshot(store);
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
    pushPipelineLog(store, "broadcast_push", { itemId, mode });
    invalidateSnapshot(store);
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
  pushPipelineLog(store, "broadcast_interrupted", { itemId, reason: store.broadcast.interruptionReason });
  invalidateSnapshot(store);
  return getBroadcastStatusPayload(req);
}

export async function resumeBroadcastPayload(req) {
  const store = getStore();
  store.broadcast.interrupted = false;
  store.broadcast.interruptionReason = "";
  store.broadcast.lastResumedAt = nowIso();
  pushAudit(store, "resume_broadcast", "system", {});
  pushPipelineLog(store, "broadcast_resumed", {});
  invalidateSnapshot(store);
  return getBroadcastStatusPayload(req);
}

export async function updateBroadcastSettings(req) {
  const body = parseBody(req);
  const store = getStore();
  const nextMode = cleanText(body?.mode || store.settings.mode);
  if (["auto", "semi-auto"].includes(nextMode)) {
    store.settings.mode = nextMode;
  }
  if (typeof body?.auto_play === "boolean") {
    store.settings.autoPlay = body.auto_play;
  }
  if (typeof body?.muted === "boolean") {
    store.settings.muted = body.muted;
  }
  if (body?.presenter && typeof body.presenter === "object") {
    store.settings.presenter = {
      ...store.settings.presenter,
      ...body.presenter,
      speechRate: clamp(Number(body.presenter?.speechRate ?? store.settings.presenter.speechRate), 0.8, 1.15),
    };
  }
  pushAudit(store, "configure_broadcast", "system", body);
  pushPipelineLog(store, "settings_updated", body);
  invalidateSnapshot(store);
  return getBroadcastStatusPayload(req);
}

export function getRequestItemId(req) {
  return resolveRouteId(req);
}
