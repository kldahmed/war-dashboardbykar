const MAX_SPORTS = 100;
const FETCH_TIMEOUT = 6000;
const CACHE_TTL = 60 * 1000;

// ─── DIRECT RSS SOURCES ───────────────────────────────────────────────────────
const SPORTS_SOURCES = [
  // Global
  { name: "BBC Sport Football",    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",                             competition: "world" },
  { name: "Sky Sports Football",   url: "https://www.skysports.com/rss/12040",                                         competition: "world" },
  { name: "ESPN Soccer",           url: "https://www.espn.com/espn/rss/soccer/news",                                   competition: "world" },
  { name: "Goal.com",              url: "https://www.goal.com/feeds/en/news",                                          competition: "world" },
  { name: "Football365",           url: "https://www.football365.com/feed",                                            competition: "world" },
  { name: "FourFourTwo",           url: "https://www.fourfourtwo.com/rss.xml",                                         competition: "world" },
  { name: "TalkSport Football",    url: "https://talksport.com/football/feed/",                                        competition: "world" },
  { name: "90min Football",        url: "https://www.90min.com/posts.rss",                                             competition: "world" },
  { name: "CBS Sports Soccer",     url: "https://www.cbssports.com/rss/headlines/soccer/",                             competition: "world" },
  { name: "Bleacher Report Soccer",url: "https://bleacherreport.com/articles/feed?tag_id=soccer",                     competition: "world" },
  { name: "SportBible Football",   url: "https://www.sportbible.com/football/feed/",                                  competition: "world" },
  { name: "Marca English",         url: "https://www.marca.com/en/rss/football.xml",                                   competition: "laliga" },
  { name: "AS English",            url: "https://en.as.com/rss/futbol.xml",                                            competition: "laliga" },
  // Middle East / UAE
  { name: "The National Sport",    url: "https://www.thenationalnews.com/sport/rss.xml",                               competition: "uae" },
  { name: "Gulf News Sport",       url: "https://gulfnews.com/rss/sport",                                              competition: "uae" },
  { name: "Arab News Sport",       url: "https://www.arabnews.com/cat/sport/rss.xml",                                  competition: "uae" },
  { name: "Khaleej Times Sport",   url: "https://www.khaleejtimes.com/sport/rss.xml",                                  competition: "uae" },
  { name: "Al Jazeera Sport",      url: "https://www.aljazeera.com/xml/rss/all.xml",                                   competition: "world" },
  { name: "FilGoal",               url: "https://www.filgoal.com/feed/",                                               competition: "uae" },
  { name: "Kooora",                url: "https://www.kooora.com/?feed=rss2",                                           competition: "uae" }
];

// ─── GOOGLE NEWS RSS QUERIES ─────────────────────────────────────────────────
// Google News RSS is reliable and covers any query in real-time.
const GOOGLE_NEWS_QUERIES = [
  // UAE Pro League — highest priority
  { query: "UAE Pro League",               lang: "en", competition: "uae" },
  { query: "ADNOC Pro League",             lang: "en", competition: "uae" },
  { query: "Sharjah FC football",          lang: "en", competition: "uae" },
  { query: "Al Ain FC UAE football",       lang: "en", competition: "uae" },
  { query: "Shabab Al Ahli Dubai FC",      lang: "en", competition: "uae" },
  { query: "Al Wasl FC UAE",               lang: "en", competition: "uae" },
  { query: "Al Jazira FC Abu Dhabi",       lang: "en", competition: "uae" },
  { query: "Al Wahda FC UAE",              lang: "en", competition: "uae" },
  { query: "UAE football news",            lang: "en", competition: "uae" },
  { query: "Emirates football league",     lang: "en", competition: "uae" },
  // Arabic UAE queries
  { query: "دوري أدنوك للمحترفين",         lang: "ar", competition: "uae" },
  { query: "الدوري الإماراتي للمحترفين",   lang: "ar", competition: "uae" },
  { query: "أخبار الشارقة الرياضي",        lang: "ar", competition: "uae" },
  { query: "أخبار العين الإماراتي",        lang: "ar", competition: "uae" },
  { query: "شباب الأهلي دبي أخبار",        lang: "ar", competition: "uae" },
  { query: "أخبار الوصل الإماراتي",        lang: "ar", competition: "uae" },
  { query: "أخبار الجزيرة الإماراتي",      lang: "ar", competition: "uae" },
  // Global football
  { query: "Premier League news today",    lang: "en", competition: "premier-league" },
  { query: "La Liga news today",           lang: "en", competition: "laliga" },
  { query: "Champions League news",        lang: "en", competition: "champions-league" },
  { query: "football transfer news",       lang: "en", competition: "transfers" },
  { query: "soccer news today",            lang: "en", competition: "world" }
];

function buildGoogleNewsUrl(query, lang = "en") {
  const gl   = lang === "ar" ? "AE" : "US";
  const ceid = lang === "ar" ? "AE:ar" : "US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${gl}&ceid=${ceid}`;
}

// Hard filter — remove obviously non-sports articles
function isNonSportsContent(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();
  return /\bwar\b|military strike|geopolit|\bsanction|\btariff\b|oil market|stock market|inflation|\belection\b|diplomacy|bilateral|trade war|\bminister\b|\bparliament\b|\bpresident\b(?!.*cup|.*league|.*football)/.test(hay);
}

const CATEGORY_CACHE = new Map();
const TRANSLATION_CACHE = new Map();

function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

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

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
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
    /uae|emirates|adnoc|pro league|دوري أدنوك|الدوري الإماراتي|الإماراتي|العين|الجزيرة|الوصل|شباب الأهلي|النصر|الشارقة/.test(
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
  if (/injury|suspension|win|defeat|goal|draw|إصابة|إيقاف|فوز|خسارة|تعادل|هدف/.test(hay)) {
    return "medium";
  }
  return "low";
}

function sportsScore(item, nowTime) {
  let score = 0;
  const joined = `${item.title} ${item.summary}`.toLowerCase();

  if (item.urgency === "high") score += 40;
  else if (item.urgency === "medium") score += 20;

  if (["BBC Sport Football", "Sky Sports Football", "ESPN Soccer", "Goal"].includes(item.source)) {
    score += 20;
  }

  if (item.competition === "champions-league") score += 20;
  if (item.competition === "premier-league") score += 15;
  if (item.competition === "laliga") score += 15;
  if (item.competition === "uae") score += 18;
  if (item.competition === "transfers") score += 10;

  if (/liverpool|arsenal|manchester|real madrid|barcelona|uefa|champions/.test(joined)) {
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
      urgency: sportsUrgency(title, summary)
    };
  });
}

async function fetchSportsSources(competition = "all") {
  const results = [];

  // ── Direct RSS sources ────────────────────────────────────────────────────
  const directPromises = SPORTS_SOURCES.map(async (src) => {
    try {
      const res = await fetchWithTimeout(src.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
        }
      });
      if (!res.ok) return;
      const xml = await res.text();
      const parsed = parseSportsRss(xml, src.name).filter((item) =>
        competitionMatches(item.competition, competition)
      );
      results.push(...parsed);
    } catch {}
  });

  // ── Google News RSS queries ───────────────────────────────────────────────
  const relevantQueries =
    competition === "all"
      ? GOOGLE_NEWS_QUERIES
      : GOOGLE_NEWS_QUERIES.filter(
          (q) => q.competition === competition || q.competition === "world"
        );

  const googlePromises = relevantQueries.map(async (q) => {
    try {
      const url = buildGoogleNewsUrl(q.query, q.lang);
      const res = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*"
        }
      });
      if (!res.ok) return;
      const xml = await res.text();
      const parsed = parseSportsRss(xml, "Google News").map((item) => ({
        ...item,
        // If normalizeCompetition returned "world" but query is UAE-specific, promote
        competition:
          item.competition === "world" && q.competition !== "world"
            ? q.competition
            : item.competition
      })).filter((item) => competitionMatches(item.competition, competition));
      results.push(...parsed);
    } catch {}
  });

  await Promise.all([...directPromises, ...googlePromises]);
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
      urgency: "low"
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
      urgency: "medium"
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
      urgency: "medium"
    }
  ];

  if (competition === "all") return base;
  return base.filter((item) => item.competition === competition);
}

function isUaeLeagueItem(title = "", summary = "") {
  const hay = `${title} ${summary}`.toLowerCase();
  return /uae|emirates|adnoc|pro league|دوري أدنوك|الدوري الإماراتي|الإماراتي|شباب الأهلي|shabab al.?ahli|العين\b|al.?ain|الوصل\b|al.?wasl|الجزيرة\b|al.?jazira|الوحدة\b|al.?wahda|النصر\b|al.?nasr|الشارقة\b|sharjah|عجمان\b|ajman|بني ياس|bani.?yas|خورفكان|khorfakkan|كلباء\b|kalba\b|الظفرة\b|al.?dhafra|البطائح|al.?bataeh|دبا\b|dibba\b/.test(
    hay
  );
}

function getUaeFallbackNews() {
  const now = new Date().toISOString();
  return [
    {
      id: "uae-fb-1",
      title: "شباب الأهلي يحافظ على صدارة دوري أدنوك للمحترفين",
      summary: "يواصل شباب الأهلي تصدره للمشهد في الدوري الإماراتي للمحترفين موسم 2025/2026.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "medium",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-2",
      title: "العين يطارد صدارة الدوري الإماراتي",
      summary: "يسعى نادي العين إلى تعزيز مركزه في الترتيب والتنافس على لقب دوري أدنوك للمحترفين.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "medium",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-3",
      title: "الشارقة يتطلع للعودة إلى المنافسة في الدوري الإماراتي",
      summary: "يواصل نادي الشارقة استعداداته لمواجهات دوري أدنوك للمحترفين 2025/2026.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "medium",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-4",
      title: "الجزيرة يُعزز موقعه في الترتيب",
      summary: "نادي الجزيرة يواصل مسيرته في دوري أدنوك للمحترفين ساعياً للتأهل للمراكز الأوروبية.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "low",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-5",
      title: "الوصل يتحرك في منتصف الترتيب بدوري أدنوك",
      summary: "يسعى نادي الوصل إلى تحسين نتائجه والارتقاء في جدول ترتيب الدوري الإماراتي.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "low",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-6",
      title: "الوحدة يستعد لمواجهاته القادمة في دوري أدنوك",
      summary: "يواصل نادي الوحدة تدريباته استعداداً للجولات القادمة من الدوري الإماراتي للمحترفين.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "low",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-7",
      title: "خورفكان يسعى لتجاوز منطقة الخطر في الدوري الإماراتي",
      summary: "يعمل نادي خورفكان على تحسين أدائه لابتعاد عن مناطق الهبوط في دوري أدنوك للمحترفين.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "low",
      isUaeLeagueNews: true
    },
    {
      id: "uae-fb-8",
      title: "النصر يبحث عن انتصارات حاسمة في الدوري الإماراتي",
      summary: "يسعى نادي النصر إلى تحقيق نتائج أفضل والارتقاء في جدول ترتيب دوري أدنوك للمحترفين.",
      source: "دوري أدنوك",
      time: now,
      url: "https://www.uaeproleague.ae/en/standings",
      image: "",
      category: "sports",
      competition: "uae",
      competitionLabel: "الدوري الإماراتي",
      urgency: "low",
      isUaeLeagueNews: true
    }
  ];
}

function uaeScore(item) {
  const hay = `${item.title} ${item.summary}`.toLowerCase();
  let bonus = 0;
  if (/adnoc|دوري أدنوك/.test(hay)) bonus += 20;
  if (/الدوري الإماراتي|uae pro league/.test(hay)) bonus += 15;
  if (/شباب الأهلي|shabab al.?ahli/.test(hay)) bonus += 12;
  if (/العين\b|al.?ain\b/.test(hay)) bonus += 12;
  if (/الشارقة\b|sharjah/.test(hay)) bonus += 12;
  if (/الجزيرة\b|al.?jazira/.test(hay)) bonus += 10;
  if (/الوحدة\b|al.?wahda/.test(hay)) bonus += 10;
  if (/الوصل\b|al.?wasl/.test(hay)) bonus += 10;
  if (/النصر\b|al.?nasr/.test(hay)) bonus += 8;
  return bonus;
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const competition = String(req.query?.competition || "all").trim();

  const cached = CATEGORY_CACHE.get(competition);
  if (cached && now - cached.time < CACHE_TTL) {
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(cached.payload);
  }

  let news = [];
  let sourceState = "ok";

  try {
    news = await fetchSportsSources(competition);
  } catch {
    sourceState = "fallback";
  }

  // Hard filter: strip obviously non-sports content
  news = news.filter((item) => !isNonSportsContent(item.title, item.summary));

  // Deduplicate
  const seen = new Set();
  news = news.filter((item) => {
    const key = cleanText((item.url && item.url !== "#" ? item.url : item.title) || "")
      .toLowerCase();

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // --- UAE-specific filtering and boosting (70% UAE / 30% global) ---
  if (competition === "uae") {
    news = news.map((item) => ({
      ...item,
      isUaeLeagueNews: isUaeLeagueItem(item.title, item.summary)
    }));

    news = news
      .map((item) => ({
        ...item,
        _score: sportsScore(item, now) + (item.isUaeLeagueNews ? 60 + uaeScore(item) : 0)
      }))
      .sort(
        (a, b) =>
          b._score - a._score ||
          new Date(b.time).getTime() - new Date(a.time).getTime()
      );

    const uaeItems   = news.filter((i) => i.isUaeLeagueNews);
    const globalItems = news.filter((i) => !i.isUaeLeagueNews);

    // 70/30 split, minimum 20 total
    const targetTotal  = Math.max(20, Math.min(MAX_SPORTS, news.length + 8));
    const targetUae    = Math.ceil(targetTotal * 0.7);
    const targetGlobal = targetTotal - targetUae;

    const uaePadded =
      uaeItems.length >= targetUae
        ? uaeItems.slice(0, targetUae)
        : [
            ...uaeItems,
            ...getUaeFallbackNews().slice(0, targetUae - uaeItems.length)
          ];

    news = [...uaePadded, ...globalItems.slice(0, targetGlobal)];
  } else {
    news = news
      .map((item) => ({
        ...item,
        _score: sportsScore(item, now)
      }))
      .sort(
        (a, b) =>
          b._score - a._score ||
          new Date(b.time).getTime() - new Date(a.time).getTime()
      )
      .slice(0, MAX_SPORTS);
  }

  if (!news.length) {
    news = competition === "uae" ? getUaeFallbackNews() : getFallbackSports(competition);
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

      return {
        ...item,
        title: translatedTitle || title,
        summary: translatedSummary || summary
      };
    })
  );

  news = news.map(({ _score, ...rest }) => rest);

  const result = {
    news,
    standings: competition === "uae" ? UAE_STANDINGS : [],
    updated: new Date().toLocaleString("ar-AE", {
      timeZone: "Asia/Dubai"
    }),
    category: "sports",
    competition,
    source: sourceState
  };

  CATEGORY_CACHE.set(competition, {
    time: now,
    payload: result
  });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json(result);
}
