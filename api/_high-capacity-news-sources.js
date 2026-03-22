export const SOURCE_TIERS = {
  hyper: { label: "hyper", intervalSeconds: 180 },
  fast: { label: "fast", intervalSeconds: 300 },
  medium: { label: "medium", intervalSeconds: 600 },
  slow: { label: "slow", intervalSeconds: 1500 },
};

const BASE_SOURCES = [
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", type: "rss", language: "en", category: "international", trustBaseScore: 94, tier: "hyper", region: "global" },
  { id: "reuters-world", name: "Reuters World", url: "https://feeds.reuters.com/reuters/worldNews", type: "rss", language: "en", category: "international", trustBaseScore: 95, tier: "hyper", region: "global" },
  { id: "ap-top", name: "AP Top News", url: "https://apnews.com/hub/ap-top-news?output=rss", type: "rss", language: "en", category: "international", trustBaseScore: 94, tier: "hyper", region: "global" },
  { id: "guardian-world", name: "The Guardian World", url: "https://www.theguardian.com/world/rss", type: "rss", language: "en", category: "international", trustBaseScore: 89, tier: "fast", region: "global" },
  { id: "nytimes-world", name: "New York Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", type: "rss", language: "en", category: "international", trustBaseScore: 90, tier: "fast", region: "global" },
  { id: "npr-world", name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", type: "rss", language: "en", category: "international", trustBaseScore: 88, tier: "fast", region: "global" },
  { id: "aljazeera-all", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", type: "rss", language: "en", category: "international", trustBaseScore: 85, tier: "hyper", region: "mena" },
  { id: "sky-world", name: "Sky News World", url: "https://feeds.skynews.com/feeds/rss/world.xml", type: "rss", language: "en", category: "international", trustBaseScore: 84, tier: "fast", region: "global" },
  { id: "france24-ar", name: "France 24 Arabic", url: "https://www.france24.com/ar/rss", type: "rss", language: "ar", category: "international", trustBaseScore: 83, tier: "medium", region: "mena" },
  { id: "dw-ar", name: "DW Arabic", url: "https://rss.dw.com/rdf/rss-ar-top", type: "rss", language: "ar", category: "international", trustBaseScore: 82, tier: "medium", region: "mena" },
  { id: "arabnews", name: "Arab News", url: "https://www.arabnews.com/rss.xml", type: "rss", language: "en", category: "regional", trustBaseScore: 80, tier: "medium", region: "mena" },
  { id: "thenational", name: "The National", url: "https://www.thenationalnews.com/world/rss", type: "rss", language: "en", category: "regional", trustBaseScore: 81, tier: "medium", region: "mena" },
  { id: "khaleejtimes-world", name: "Khaleej Times World", url: "https://www.khaleejtimes.com/rss/world", type: "rss", language: "en", category: "regional", trustBaseScore: 77, tier: "medium", region: "gulf" },
  { id: "un-news", name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", type: "rss", language: "en", category: "international", trustBaseScore: 90, tier: "medium", region: "global" },
  { id: "reliefweb", name: "ReliefWeb", url: "https://reliefweb.int/updates/rss.xml", type: "rss", language: "en", category: "international", trustBaseScore: 87, tier: "slow", region: "global" },

  { id: "cnbc-top", name: "CNBC Top", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", type: "rss", language: "en", category: "economy", trustBaseScore: 84, tier: "fast", region: "global" },
  { id: "marketwatch", name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", type: "rss", language: "en", category: "economy", trustBaseScore: 79, tier: "fast", region: "global" },
  { id: "yahoo-finance", name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", type: "rss", language: "en", category: "economy", trustBaseScore: 78, tier: "fast", region: "global" },
  { id: "worldbank", name: "World Bank", url: "https://www.worldbank.org/en/news/all/rss", type: "rss", language: "en", category: "economy", trustBaseScore: 89, tier: "slow", region: "global" },
  { id: "imf", name: "IMF", url: "https://www.imf.org/en/News/RSS", type: "rss", language: "en", category: "economy", trustBaseScore: 88, tier: "slow", region: "global" },
  { id: "oecd", name: "OECD", url: "https://www.oecd.org/newsroom/rss.xml", type: "rss", language: "en", category: "economy", trustBaseScore: 87, tier: "slow", region: "global" },

  { id: "espn-top", name: "ESPN", url: "https://www.espn.com/espn/rss/news", type: "rss", language: "en", category: "sports", trustBaseScore: 74, tier: "medium", region: "global" },
  { id: "goal", name: "Goal", url: "https://www.goal.com/feeds/en/news", type: "rss", language: "en", category: "sports", trustBaseScore: 69, tier: "medium", region: "global" },
  { id: "skysports", name: "Sky Sports", url: "https://www.skysports.com/rss/12040", type: "rss", language: "en", category: "sports", trustBaseScore: 73, tier: "medium", region: "global" },

  { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", type: "rss", language: "en", category: "technology", trustBaseScore: 75, tier: "medium", region: "global" },
  { id: "theverge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", type: "rss", language: "en", category: "technology", trustBaseScore: 74, tier: "medium", region: "global" },
  { id: "wired", name: "Wired", url: "https://www.wired.com/feed/rss", type: "rss", language: "en", category: "technology", trustBaseScore: 73, tier: "medium", region: "global" },

  { id: "who", name: "WHO News", url: "https://www.who.int/rss-feeds/news-english.xml", type: "rss", language: "en", category: "health", trustBaseScore: 89, tier: "slow", region: "global" },
  { id: "medicalxpress", name: "MedicalXpress", url: "https://medicalxpress.com/rss-feed/", type: "rss", language: "en", category: "health", trustBaseScore: 70, tier: "slow", region: "global" },

  { id: "euronews-world", name: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=world", type: "rss", language: "en", category: "international", trustBaseScore: 81, tier: "medium", region: "europe" },
  { id: "abc-international", name: "ABC International", url: "https://abcnews.go.com/abcnews/internationalheadlines", type: "rss", language: "en", category: "international", trustBaseScore: 80, tier: "medium", region: "americas" },
  { id: "cnn-world", name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", type: "rss", language: "en", category: "international", trustBaseScore: 76, tier: "fast", region: "americas" },
  { id: "cbs-world", name: "CBS World", url: "https://www.cbsnews.com/latest/rss/world", type: "rss", language: "en", category: "international", trustBaseScore: 76, tier: "fast", region: "americas" },
  { id: "independent-world", name: "Independent World", url: "https://www.independent.co.uk/news/world/rss", type: "rss", language: "en", category: "international", trustBaseScore: 75, tier: "medium", region: "europe" },
  { id: "japantimes-world", name: "Japan Times", url: "https://www.japantimes.co.jp/news_category/world/feed/", type: "rss", language: "en", category: "international", trustBaseScore: 77, tier: "slow", region: "asia" },
  { id: "nikkei-asia", name: "Nikkei Asia", url: "https://asia.nikkei.com/rss/feed/nar", type: "rss", language: "en", category: "economy", trustBaseScore: 81, tier: "slow", region: "asia" },
  { id: "anadolu-ar", name: "Anadolu Arabic", url: "https://www.aa.com.tr/ar/rss/default?cat=guncel", type: "rss", language: "ar", category: "regional", trustBaseScore: 76, tier: "medium", region: "mena" },
  { id: "trt-ar", name: "TRT Arabic", url: "https://www.trtarabi.com/rss", type: "rss", language: "ar", category: "regional", trustBaseScore: 74, tier: "medium", region: "mena" },
  { id: "alarabiya", name: "Al Arabiya", url: "https://www.alarabiya.net/.mrss/ar.xml", type: "rss", language: "ar", category: "regional", trustBaseScore: 76, tier: "medium", region: "mena" },
  { id: "alaraby", name: "Al Araby", url: "https://www.alaraby.co.uk/rss.xml", type: "rss", language: "ar", category: "regional", trustBaseScore: 75, tier: "medium", region: "mena" },
  { id: "aawsat", name: "Asharq Al Awsat", url: "https://aawsat.com/home/rss.xml", type: "rss", language: "ar", category: "regional", trustBaseScore: 79, tier: "medium", region: "mena" },
];

function createMirrorSources() {
  const mirrors = [];
  BASE_SOURCES.slice(0, 20).forEach((source, index) => {
    mirrors.push({
      ...source,
      id: `${source.id}-mirror-${index + 1}`,
      name: `${source.name} Mirror ${index + 1}`,
      manual: true,
      tier: source.tier === "hyper" ? "fast" : source.tier,
      trustBaseScore: Math.max(62, Number(source.trustBaseScore || 70) - 4),
    });
  });
  return mirrors;
}

export const HIGH_CAPACITY_NEWS_SOURCES = [...BASE_SOURCES, ...createMirrorSources()].map((source) => {
  const tier = SOURCE_TIERS[source.tier] || SOURCE_TIERS.medium;
  return {
    ...source,
    intervalSeconds: source.intervalSeconds || tier.intervalSeconds,
    active: source.active !== false,
    language: source.language || "en",
    category: source.category || "international",
    trustBaseScore: Number(source.trustBaseScore || 70),
    rateLimitPerMinute: Number(source.rateLimitPerMinute || 30),
  };
});

export function getSourceCategoryLabel(category = "international") {
  const map = {
    politics: "سياسة",
    economy: "اقتصاد",
    international: "دولي",
    regional: "إقليمي",
    local: "محلي",
    sports: "رياضة",
    technology: "تقنية",
    health: "صحة",
    culture: "ثقافة",
    misc: "منوعات",
  };
  return map[category] || map.international;
}
