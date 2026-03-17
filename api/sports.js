const MIN_SPORTS = 20;
const MIN_UAE_NEWS = 8;
const MAX_SPORTS = 60;
const FETCH_TIMEOUT = 5000;
const CACHE_TTL = 60 * 1000;

const SPORTS_SOURCES = [
  {
    name: "BBC Sport Football",
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    competition: "world"
  },
  {
    name: "Sky Sports Football",
    url: "https://www.skysports.com/rss/12040",
    competition: "world"
  },
  {
    name: "ESPN Soccer",
    url: "https://www.espn.com/espn/rss/soccer/news",
    competition: "world"
  },
  {
    name: "Goal",
    url: "https://www.goal.com/feeds/en/news",
    competition: "world"
  },
  // Dedicated UAE primary sources fetched for every request
  {
    name: "Google News ADNOC League",
    url: "https://news.google.com/rss/search?q=ADNOC+Pro+League+UAE+football&hl=en&gl=AE&ceid=AE:en",
    competition: "uae"
  },
  {
    name: "Google News Sharjah FC",
    url: "https://news.google.com/rss/search?q=Sharjah+FC+%D9%86%D8%A7%D8%AF%D9%8A+%D8%A7%D9%84%D8%B4%D8%A7%D8%B1%D9%82%D8%A9+football&hl=en&gl=AE&ceid=AE:en",
    competition: "uae"
  }
];

const FALLBACK_SPORTS_SOURCES = [
  {
    name: "The Guardian Football",
    url: "https://www.theguardian.com/football/rss",
    competition: "world"
  },
  {
    name: "Google News Premier League",
    url: "https://news.google.com/rss/search?q=premier+league+football&hl=en-US&gl=US&ceid=US:en",
    competition: "premier-league"
  },
  {
    name: "Google News UAE Clubs",
    url: "https://news.google.com/rss/search?q=UAE+Pro+League+Al+Ain+Al+Wasl+Al+Wahda+football&hl=en&gl=AE&ceid=AE:en",
    competition: "uae"
  },
  {
    name: "Google News Champions League",
    url: "https://news.google.com/rss/search?q=UEFA+Champions+League+football&hl=en-US&gl=US&ceid=US:en",
    competition: "champions-league"
  },
  {
    name: "Google News LaLiga",
    url: "https://news.google.com/rss/search?q=LaLiga+Real+Madrid+Barcelona&hl=en-US&gl=US&ceid=US:en",
    competition: "laliga"
  },
  {
    name: "Google News Football Transfers",
    url: "https://news.google.com/rss/search?q=football+transfer+signing+news&hl=en-US&gl=US&ceid=US:en",
    competition: "transfers"
  }
];

const CATEGORY_CACHE = new Map();
const TRANSLATION_CACHE = new Map();
const STANDINGS_CACHE = new Map();
const STANDINGS_CACHE_TTL = 10 * 60 * 1000;  // 10 minutes
const FIXTURES_CACHE = new Map();
const FIXTURES_CACHE_TTL = 120 * 1000;        // 120 s
const UAE_NEWS_CACHE = new Map();
const UAE_NEWS_CACHE_TTL = 300 * 1000;        // 300 s — news refreshes slower

function decodeHtml(str = "") {
  return String(str || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(str = "") {
  return decodeHtml(String(str || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(str = "") {
  return decodeHtml(String(str || ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isArabicText(str = "") {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
}

const TAG_RE_CACHE = new Map();
function extractTag(block, tag) {
  let re = TAG_RE_CACHE.get(tag);
  if (!re) {
    re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    TAG_RE_CACHE.set(tag, re);
  }
  const m = String(block || "").match(re);
  return m ? m[1].trim() : "";
}

function extractImageFromDescription(str = "") {
  if (!str) return "";

  let match =
    str.match(/<img[^>]+src="([^"]+)"/i) ||
    str.match(/<img[^>]+src='([^']+)'/i);

  if (match?.[1]) return match[1];

  return "";
}

function makeId(source, url, title) {
  return encodeURIComponent(
    `${source}|${url || ""}|${title || ""}`.toLowerCase().trim()
  ).slice(0, 180);
}

function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

function normalizeCompetition(title = "", summary = "", source = "") {
  const hay = `${title} ${summary} ${source}`.toLowerCase();

  if (
    /uae|emirates|adnoc|pro league|دوري أدنوك|الدوري الإماراتي|الإماراتي|uae pro league|adnoc pro league|sharjah fc|الشارقة|al ain|العين|al wasl|الوصل|al jazira|الجزيرة|shabab al ahli|شباب الأهلي|al wahda|الوحدة|al nasr|النصر|bani yas|بني ياس|baniyas|khor fakkan|خورفكان|kalba|كلباء|ajman|عجمان|البطائح|al batayeh|دبا|fujairah|الفجيرة|al dhafra|الضفرة|emirates football|football uae|uae football/.test(
      hay
    )
  ) {
    return "uae";
  }

  if (
    /premier league|english premier league|الدوري الإنجليزي|ليفربول|مانشستر|أرسنال|تشيلسي|توتنهام|نيوكاسل|برشلونة vs|real madrid vs/.test(
      hay
    )
  ) {
    return "premier-league";
  }

  if (
    /laliga|la liga|الدوري الإسباني|ريال مدريد|برشلونة|أتلتيكو|جيرونا|فالنسيا|إشبيلية/.test(
      hay
    )
  ) {
    return "laliga";
  }

  if (
    /champions league|uefa champions|دوري أبطال أوروبا|الأبطال|ucl|uefa/.test(hay)
  ) {
    return "champions-league";
  }

  if (
    /transfer|transfers|deadline|signed|signing|loan|انتقال|انتقالات|تعاقد|إعارة/.test(
      hay
    )
  ) {
    return "transfers";
  }

  return "world";
}

function competitionLabel(competition = "world") {
  switch (competition) {
    case "uae":
      return "الدوري الإماراتي";
    case "premier-league":
      return "الدوري الإنجليزي";
    case "laliga":
      return "الدوري الإسباني";
    case "champions-league":
      return "دوري أبطال أوروبا";
    case "transfers":
      return "الانتقالات";
    default:
      return "كرة القدم العالمية";
  }
}

function competitionMatches(itemCompetition = "world", requested = "all") {
  if (requested === "all") return true;
  return itemCompetition === requested;
}

function sportsUrgency(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();

  if (/breaking|official|confirmed|عاجل|رسمي|مؤكد|نهائي/.test(hay)) return "high";

  // Goals and match results are high-priority live events
  if (/\bgoal(s)?\b|hat.?trick|full.?time|final score|match result|هدف|أهداف|نتيجة المباراة|انتهت المباراة/.test(hay)) return "high";

  // Confirmed transfers are high priority
  if (/transfer confirmed|deal done|officially signed|انتقل رسميًا|تم التعاقد|وقّع رسميًا/.test(hay)) return "high";

  if (/injury|injuries|injured|suspension|win|defeat|goal|draw|transfer|signing|loan|إصابة|إيقاف|فوز|خسارة|تعادل|هدف|انتقال|تعاقد|إعارة/.test(hay)) {
    return "medium";
  }
  return "low";
}

function isUaeItem(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();
  return /uae|emirates|adnoc|pro league|دوري أدنوك|الدوري الإماراتي|sharjah|الشارقة|al ain|العين|al wasl|الوصل|al jazira|الجزيرة|shabab al ahli|شباب الأهلي|al wahda|الوحدة|al nasr|النصر|bani yas|بني ياس|baniyas|khor fakkan|خورفكان|kalba|كلباء|ajman|عجمان|البطائح|fujairah|الفجيرة|al dhafra|الضفرة/.test(hay);
}

function isSharjahItem(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();
  return /sharjah|الشارقة|sharjah fc/.test(hay);
}

function sportsScore(item, nowTime) {
  let score = 0;
  const joined = `${item.title} ${item.summary}`.toLowerCase();

  if (item.urgency === "high") score += 40;
  else if (item.urgency === "medium") score += 20;

  // Bonus for specific high-value content types
  if (/\bgoal(s)?\b|hat.?trick|scored/.test(joined)) score += 15;
  if (/match result|full.?time|final score/.test(joined)) score += 12;
  if (/transfer|signing|signed/.test(joined)) score += 10;
  if (/injur(y|ies|ed)/.test(joined)) score += 8;

  if (["BBC Sport Football", "Sky Sports Football", "ESPN Soccer", "Goal", "The Guardian Football"].includes(item.source)) {
    score += 20;
  }

  if (item.competition === "champions-league") score += 20;
  if (item.competition === "uae") score += 25;
  if (item.competition === "premier-league") score += 16;
  if (item.competition === "laliga") score += 16;
  if (item.competition === "transfers") score += 12;

  // UAE club-specific bonuses — ADNOC Pro League news ranks above generic world football
  if (/adnoc|pro league|دوري أدنوك|الدوري الإماراتي/.test(joined)) score += 20;
  // Sharjah FC receives the highest UAE ranking boost
  if (isSharjahItem(item.title, item.summary)) score += 30;
  // Other UAE club bonuses
  if (/al ain|العين|al wasl|الوصل|al jazira|الجزيرة|shabab al ahli|شباب الأهلي|al wahda|الوحدة/.test(joined)) score += 12;

  if (/liverpool|arsenal|manchester|chelsea|tottenham|real madrid|barcelona|atletico/.test(joined)) {
    score += 8;
  }

  const t = new Date(item.time).getTime();
  if (!Number.isNaN(t)) {
    const diff = nowTime - t;
    if (diff < 3 * 60 * 60 * 1000) score += 25;
    else if (diff < 12 * 60 * 60 * 1000) score += 10;
  }

  if (item.image) score += 5;

  return score;
}

async function translateToArabic(text) {
  const t = cleanText(text);
  if (!t) return "";
  if (isArabicText(t)) return t;

  if (TRANSLATION_CACHE.has(t)) return TRANSLATION_CACHE.get(t);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(
      t
    )}`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) {
      TRANSLATION_CACHE.set(t, t);
      return t;
    }

    const data = await res.json();
    const translated =
      Array.isArray(data) && Array.isArray(data[0])
        ? data[0].map((chunk) => chunk[0] || "").join("")
        : t;

    const cleaned = cleanText(translated || t);
    TRANSLATION_CACHE.set(t, cleaned);
    return cleaned;
  } catch {
    TRANSLATION_CACHE.set(t, t);
    return t;
  }
}

function parseSportsRss(xml, source) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  return items.map((item, index) => {
    const rawTitle = extractTag(item, "title");
    const rawDescription = extractTag(item, "description");

    const title = stripHtml(rawTitle) || "بدون عنوان";
    const summary = stripHtml(rawDescription);
    const url = extractTag(item, "link") || "#";
    const time = extractTag(item, "pubDate") || new Date().toISOString();
    const image = extractImageFromDescription(rawDescription);
    const competition = normalizeCompetition(title, summary, source);

    return {
      id: makeId(source, url, `${title}-${index}`),
      title,
      summary,
      source,
      time,
      url,
      image,
      category: "sports",
      competition,
      competitionLabel: competitionLabel(competition),
      urgency: sportsUrgency(title, summary),
      isSharjah: isSharjahItem(title, summary)
    };
  });
}

async function fetchSportsSources(competition = "all") {
  const results = [];

  await Promise.all(
    SPORTS_SOURCES.map(async (src) => {
      // When UAE mode is requested, skip non-UAE primary sources to avoid world news pollution
      if (competition === "uae" && src.competition !== "uae") return;

      try {
        const res = await fetchWithTimeout(src.url, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!res.ok) return;
        const xml = await res.text();

        const parsed = parseSportsRss(xml, src.name).filter((item) =>
          competitionMatches(item.competition, competition)
        );

        results.push(...parsed);
      } catch {}
    })
  );

  // If primary sources returned fewer than the minimum, try fallback sources
  if (results.length < MIN_SPORTS) {
    await Promise.all(
      FALLBACK_SPORTS_SOURCES.map(async (src) => {
        // For specific competition requests, prefer matching fallback sources;
        // always include "world"-tagged fallbacks unless we're in strict UAE mode
        if (competition === "uae" && src.competition !== "uae") return;
        if (
          competition !== "all" &&
          competition !== "uae" &&
          src.competition !== "world" &&
          src.competition !== competition
        ) {
          return;
        }
        try {
          const res = await fetchWithTimeout(src.url, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });

          if (!res.ok) return;
          const xml = await res.text();

          const parsed = parseSportsRss(xml, src.name).filter((item) =>
            competitionMatches(item.competition, competition)
          );

          results.push(...parsed);
        } catch {}
      })
    );
  }

  // If UAE mode and still not enough items, allow world news as last resort
  if (competition === "uae" && results.length === 0) {
    await Promise.all(
      SPORTS_SOURCES.filter((src) => src.competition === "world").map(async (src) => {
        try {
          const res = await fetchWithTimeout(src.url, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!res.ok) return;
          const xml = await res.text();
          // In last-resort mode keep only articles that mention UAE keywords at all
          const parsed = parseSportsRss(xml, src.name).filter((item) =>
            isUaeItem(item.title, item.summary)
          );
          results.push(...parsed);
        } catch {}
      })
    );
  }

  return results;
}

function getFallbackSports(competition = "all") {
  const base = [
    {
      id: "sports-fallback-1",
      title: "آخر تطورات كرة القدم العالمية",
      summary: "هذه بيانات احتياطية رياضية تظهر عند تعذر الوصول إلى المصادر.",
      source: "Sports Feed",
      time: new Date().toISOString(),
      url: "#",
      image: "",
      category: "sports",
      competition: "world",
      competitionLabel: "كرة القدم العالمية",
      urgency: "low",
      isSharjah: false
    },
    {
      id: "sports-fallback-2",
      title: "متابعة مبدئية لأخبار الدوري الإنجليزي",
      summary: "يمكن استبدال هذا المحتوى مباشرة بالأخبار الحية عند عودة المصادر.",
      source: "Sports Feed",
      time: new Date().toISOString(),
      url: "#",
      image: "",
      category: "sports",
      competition: "premier-league",
      competitionLabel: "الدوري الإنجليزي",
      urgency: "medium",
      isSharjah: false
    },
    {
      id: "sports-fallback-3",
      title: "رصد مستمر لأخبار دوري أبطال أوروبا",
      summary: "محتوى احتياطي لتبويب الرياضة حتى لا يبقى القسم فارغًا.",
      source: "Sports Feed",
      time: new Date().toISOString(),
      url: "#",
      image: "",
      category: "sports",
      competition: "champions-league",
      competitionLabel: "دوري أبطال أوروبا",
      urgency: "medium",
      isSharjah: false
    }
  ];

  if (competition === "all") return base;
  return base.filter((item) => item.competition === competition);
}

// ── Shared news pipeline (dedup → score → sort → fallback → translate) ─────────

async function processNewsItems(rawNews, competition, now, wasFetchError = false) {
  let news = rawNews;
  let sourceState = wasFetchError ? "fallback" : "ok";

  const seen = new Set();
  news = news.filter((item) => {
    const key = cleanText((item.url && item.url !== "#" ? item.url : item.title) || "")
      .toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  news = news
    .map((item) => ({ ...item, _score: sportsScore(item, now) }))
    .sort(
      (a, b) =>
        b._score - a._score ||
        new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    .slice(0, MAX_SPORTS);

  if (!news.length) {
    news = getFallbackSports(competition);
    sourceState = "fallback";
  }

  news = await Promise.all(
    news.map(async (item) => {
      const title = cleanText(item.title);
      const summary = cleanText(item.summary);
      const [translatedTitle, translatedSummary] = await Promise.all([
        isArabicText(title) ? title : translateToArabic(title),
        isArabicText(summary) ? summary : translateToArabic(summary)
      ]);
      return { ...item, title: translatedTitle || title, summary: translatedSummary || summary };
    })
  );

  news = news.map(({ _score, ...rest }) => rest);
  return { news, sourceState };
}

// ── Live UAE standings from api-football.com (league 302, 10-minute cache) ──────

async function fetchLiveUaeStandings() {
  const now = Date.now();
  const cached = STANDINGS_CACHE.get("uae");

  // Return fresh cache if within TTL
  if (cached && now - cached.time < STANDINGS_CACHE_TTL) {
    return { standings: cached.standings, updatedAt: cached.time };
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    // No API key — return stale cache if available, otherwise empty
    if (cached) return { standings: cached.standings, updatedAt: cached.time };
    return { standings: [], updatedAt: null };
  }

  // UAE Pro League seasons are named by their start year (2025 = 2025-26 season).
  // Try the current calendar year first, then fall back to the previous year.
  const currentYear = new Date().getFullYear();

  async function tryFetch(season) {
    try {
      const res = await fetchWithTimeout(
        `https://v3.football.api-sports.io/standings?league=302&season=${season}`,
        {
          headers: {
            "x-apisports-key": apiKey
          }
        },
        8000
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Navigate: response[0] → league → standings[0] (first group = main table)
      const rows = data?.response?.[0]?.league?.standings?.[0];
      if (!Array.isArray(rows) || rows.length === 0) return null;
      return rows;
    } catch {
      return null;
    }
  }

  let rows = await tryFetch(currentYear);
  if (!rows) rows = await tryFetch(currentYear - 1);

  if (!rows) {
    // Live fetch failed — use stale cache if available, otherwise return empty
    if (cached) return { standings: cached.standings, updatedAt: cached.time };
    return { standings: [], updatedAt: null };
  }

  const standings = rows.map((entry) => ({
    rank: entry.rank,
    team: entry.team?.name || "",
    played: entry.all?.played ?? 0,
    won: entry.all?.win ?? 0,
    drawn: entry.all?.draw ?? 0,
    lost: entry.all?.lose ?? 0,
    points: entry.points ?? 0
  }));

  STANDINGS_CACHE.set("uae", { time: now, standings });
  return { standings, updatedAt: now };
}

async function fetchCachedUaeFixtures() {
  const now = Date.now();
  const cached = FIXTURES_CACHE.get("uae");
  if (cached && now - cached.time < FIXTURES_CACHE_TTL) {
    return { fixtures: cached.fixtures, updatedAt: cached.time };
  }

  const fixturesUrl =
    "https://news.google.com/rss/search?q=UAE+Pro+League+fixtures+schedule+match&hl=en&gl=AE&ceid=AE:en";

  try {
    const res = await fetchWithTimeout(fixturesUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) {
      if (cached) return { fixtures: cached.fixtures, updatedAt: cached.time };
      return { fixtures: [], updatedAt: null };
    }
    const xml = await res.text();
    const fixtures = parseSportsRss(xml, "UAE Fixtures").slice(0, 5);
    FIXTURES_CACHE.set("uae", { time: now, fixtures });
    return { fixtures, updatedAt: now };
  } catch {
    if (cached) return { fixtures: cached.fixtures, updatedAt: cached.time };
    return { fixtures: [], updatedAt: null };
  }
}

// UAE news with its own 300-second cache
async function fetchAndProcessUaeNews() {
  const now = Date.now();
  const cached = UAE_NEWS_CACHE.get("uae");
  if (cached && now - cached.time < UAE_NEWS_CACHE_TTL) {
    return { news: cached.news, sourceState: cached.sourceState, updatedAt: cached.time };
  }

  let rawNews = [];
  let fetchError = false;
  try {
    rawNews = await fetchSportsSources("uae");
  } catch {
    fetchError = true;
  }

  const { news, sourceState } = await processNewsItems(rawNews, "uae", now, fetchError);
  UAE_NEWS_CACHE.set("uae", { time: now, news, sourceState });
  return { news, sourceState, updatedAt: now };
}

export default async function handler(req, res) {
  const now = Date.now();
  const competition = String(req.query?.competition || "all").trim();

  // ── UAE mode: use 3 separate caches with independent TTLs ───────────────────
  if (competition === "uae") {
    const [standingsResult, fixturesResult, newsResult] = await Promise.all([
      fetchLiveUaeStandings(),
      fetchCachedUaeFixtures(),
      fetchAndProcessUaeNews()
    ]);

    const fmtTime = (ts) =>
      ts
        ? new Date(ts).toLocaleString("ar-AE", { timeZone: "Asia/Dubai" })
        : null;

    const result = {
      news: newsResult.news,
      standings: standingsResult.standings,
      fixtures: fixturesResult.fixtures,
      standingsUpdated: fmtTime(standingsResult.updatedAt),
      fixturesUpdated: fmtTime(fixturesResult.updatedAt),
      newsUpdated: fmtTime(newsResult.updatedAt),
      updated: fmtTime(now),
      category: "sports",
      competition,
      source: newsResult.sourceState
    };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(result);
  }

  // ── Non-UAE mode: single shared cache ───────────────────────────────────────
  const cached = CATEGORY_CACHE.get(competition);
  if (cached && now - cached.time < CACHE_TTL) {
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(cached.payload);
  }

  let rawNews = [];
  let fetchError = false;
  try {
    rawNews = await fetchSportsSources(competition);
  } catch {
    fetchError = true;
  }

  const { news, sourceState } = await processNewsItems(rawNews, competition, now, fetchError);

  const result = {
    news,
    updated: new Date(now).toLocaleString("ar-AE", { timeZone: "Asia/Dubai" }),
    category: "sports",
    competition,
    source: sourceState
  };

  CATEGORY_CACHE.set(competition, { time: now, payload: result });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json(result);
}
