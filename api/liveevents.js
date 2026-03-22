function safeText(value = "", fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function decodeHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(str = "") {
  return decodeHtml(str)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urgencyWeight(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function scoreUrgency(text = "") {
  const t = String(text || "").toLowerCase();

  if (
    /عاجل|breaking|urgent|هجوم|قصف|غارة|صاروخ|صواريخ|انفجار|اشتباكات|استهداف|ضربة|ضربات|اعتراض|طائرة مسيرة|مسيرة|drone|missile|strike|raid|attack|intercept|explosion|rocket|artillery/i.test(
      t
    )
  ) {
    return "high";
  }

  if (
    /تحذير|توتر|تحرك|انتشار|تعزيزات|استنفار|deployment|warning|alert|military movement|defense/i.test(
      t
    )
  ) {
    return "medium";
  }

  return "low";
}

function detectCategory(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();

  if (/economy|oil|gas|energy|shipping|market|اقتصاد|نفط|طاقة|شحن|أسواق|موانئ/i.test(hay)) {
    return "economy";
  }

  if (/politics|government|minister|president|diplomatic|سياسة|حكومة|وزير|رئيس|دبلوماسية|مفاوضات/i.test(hay)) {
    return "politics";
  }

  if (/attack|strike|raid|drone|missile|rocket|military|army|war|قصف|غارة|هجوم|صاروخ|مسيرة|عسكري|اشتباكات|استهداف|اعتراض/i.test(hay)) {
    return "military";
  }

  return "regional";
}

function detectEventType(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();

  if (/اعتراض|intercept|air defense|دفاع جوي/.test(hay)) return "اعتراض";
  if (/مسيرة|طائرة مسيرة|drone|uav/.test(hay)) return "مسيرة";
  if (/صاروخ|صواريخ|missile|rocket/.test(hay)) return "صاروخي";
  if (/قصف|غارة|raid|airstrike|strike/.test(hay)) return "غارة";
  if (/اشتباكات|clashes|firefight/.test(hay)) return "اشتباكات";
  if (/انفجار|explosion|blast/.test(hay)) return "انفجار";
  if (/تحرك|deployment|mobilization|تعزيزات/.test(hay)) return "تحرك عسكري";

  return "حدث ميداني";
}

function regionRules() {
  return [
    { name: "إيران", lat: 32.4279, lng: 53.688, re: /إيران|ايران|iran/i },
    { name: "إسرائيل", lat: 31.0461, lng: 34.8516, re: /إسرائيل|اسرائيل|israel/i },
    { name: "غزة", lat: 31.3547, lng: 34.3088, re: /غزة|gaza/i },
    { name: "لبنان", lat: 33.8547, lng: 35.8623, re: /لبنان|lebanon/i },
    { name: "سوريا", lat: 34.8021, lng: 38.9968, re: /سوريا|syria/i },
    { name: "العراق", lat: 33.2232, lng: 43.6793, re: /العراق|iraq/i },
    { name: "اليمن", lat: 15.5527, lng: 48.5164, re: /اليمن|yemen/i },
    { name: "السعودية", lat: 23.8859, lng: 45.0792, re: /السعودية|saudi/i },
    { name: "قطر", lat: 25.3548, lng: 51.1839, re: /قطر|qatar/i },
    { name: "الأردن", lat: 30.5852, lng: 36.2384, re: /الأردن|jordan/i },
    { name: "البحر الأحمر", lat: 20.0, lng: 38.0, re: /البحر الأحمر|red sea/i },
    { name: "مضيق هرمز", lat: 26.5667, lng: 56.25, re: /مضيق هرمز|هرمز|strait of hormuz/i },
    { name: "دمشق", lat: 33.5138, lng: 36.2765, re: /دمشق|damascus/i },
    { name: "بيروت", lat: 33.8938, lng: 35.5018, re: /بيروت|beirut/i },
    { name: "بغداد", lat: 33.3152, lng: 44.3661, re: /بغداد|baghdad/i },
    { name: "طهران", lat: 35.6892, lng: 51.389, re: /طهران|tehran/i },
    { name: "تل أبيب", lat: 32.0853, lng: 34.7818, re: /تل أبيب|تل ابيب|tel aviv/i },
    { name: "صنعاء", lat: 15.3694, lng: 44.191, re: /صنعاء|sanaa/i }
  ];
}

function extractLocation(title = "", summary = "") {
  const hay = `${title} ${summary}`;

  for (const rule of regionRules()) {
    if (rule.re.test(hay)) {
      return {
        location: rule.name,
        lat: rule.lat,
        lng: rule.lng
      };
    }
  }

  return {
    location: "غير محدد",
    lat: null,
    lng: null
  };
}

function isLiveRelevant(title = "", summary = "", category = "") {
  const text = `${title} ${summary}`.trim();

  if (!text || text.length < 12) return false;

  const blocked =
    /podcast|newsletter|opinion|sponsored|advertisement|watch live|listen live|subscribe/i;

  if (blocked.test(text)) return false;

  if (category === "military") return true;

  return /هجوم|قصف|غارة|صاروخ|صواريخ|اشتباكات|استهداف|اعتراض|توتر|مسيرة|انفجار|attack|strike|raid|missile|drone|intercept|explosion|rocket|clashes/i.test(
    text
  );
}

function normalizeItem(item, index = 0, fallbackSource = "Live Feed") {
  const title = stripHtml(item?.title || "بدون عنوان");
  const summary = stripHtml(item?.summary || item?.description || "لا يوجد ملخص متاح.");
  const source = safeText(item?.source, fallbackSource);
  const urgency =
    ["high", "medium", "low"].includes(item?.urgency)
      ? item.urgency
      : scoreUrgency(`${title} ${summary}`);
  const category = detectCategory(title, summary);
  const eventType = detectEventType(title, summary);
  const loc = extractLocation(title, summary);

  return {
    id: item?.id || `live-${Date.now()}-${index}`,
    title,
    summary,
    source,
    time: item?.time || new Date().toISOString(),
    url: item?.url || item?.link || "#",
    category,
    urgency,
    image: item?.image || item?.imageUrl || item?.thumbnail || "",
    location: loc.location,
    lat: loc.lat,
    lng: loc.lng,
    eventType
  };
}

function eventScore(item) {
  const urgencyScore = urgencyWeight(item.urgency) * 100;
  const coordScore = Number.isFinite(item.lat) && Number.isFinite(item.lng) ? 25 : 0;
  const militaryScore = item.category === "military" ? 30 : 0;
  const typeScore =
    item.eventType === "صاروخي"
      ? 20
      : item.eventType === "غارة"
      ? 18
      : item.eventType === "اعتراض"
      ? 16
      : item.eventType === "مسيرة"
      ? 14
      : 8;
  const timeScore = Math.floor((new Date(item.time).getTime() || 0) / 1e11);

  return urgencyScore + coordScore + militaryScore + typeScore + timeScore;
}

function dedupeItems(items) {
  const seen = new Map();

  for (const item of items) {
    const key = `${stripHtml(item.title).toLowerCase().replace(/\s+/g, " ").slice(0, 160)}-${item.location}`;

    if (!key) continue;

    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, item);
      continue;
    }

    if (eventScore(item) > eventScore(prev)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

function sortItems(items) {
  return [...items].sort((a, b) => eventScore(b) - eventScore(a));
}

async function fetchJson(url, field = "news") {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) return [];

    const data = await res.json();
    const arr = Array.isArray(data?.[field]) ? data[field] : [];

    return arr;
  } catch {
    return [];
  }
}

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function internalApiBase(req) {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const host = req?.headers?.host || "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const base = internalApiBase(req);
    const [mainNews, fastNews, intelNews, xIntel] = await Promise.all([
      fetchJson(`${base}/api/news`, "news"),
      fetchJson(`${base}/api/fastnews`, "news"),
      fetchJson(`${base}/api/intelnews`, "news"),
      fetchJson(`${base}/api/xintel`, "news")
    ]);

    let events = [
      ...mainNews.map((item, i) => normalizeItem(item, i, "Main News")),
      ...fastNews.map((item, i) => normalizeItem(item, i, "Fast News")),
      ...intelNews.map((item, i) => normalizeItem(item, i, "Intel News")),
      ...xIntel.map((item, i) => normalizeItem(item, i, "X Intel"))
    ];

    events = events.filter((item) =>
      isLiveRelevant(item.title, item.summary, item.category)
    );

    events = dedupeItems(events);
    events = sortItems(events).slice(0, 35);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=240");

    return res.status(200).json({
      events,
      updated: new Date().toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
      live: true,
      source: "live-events-engine-v2"
    });
  } catch (e) {
    return res.status(500).json({
      events: [],
      error: "Failed to build live events"
    });
  }
}
