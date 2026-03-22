// Centralized registry for all RSS sources used by news endpoints.
// Endpoints can import profile lists instead of hardcoding their own feeds.

export const NEWS_SOURCE_REGISTRY = [
  // Global wire / mainstream
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world", tier: "global-core" },
  { name: "Reuters", url: "https://feeds.reuters.com/reuters/worldNews", category: "world", tier: "global-core" },
  { name: "AP News", url: "https://apnews.com/hub/ap-top-news?output=rss", category: "world", tier: "global-core" },
  { name: "NPR", url: "https://feeds.npr.org/1004/rss.xml", category: "world", tier: "global-core" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "world", tier: "global-core" },
  { name: "NYTimes", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "world", tier: "global-core" },

  // Regional Arabic / Gulf
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world", tier: "arabic-core" },
  { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/world.xml", category: "world", tier: "arabic-core" },
  { name: "France 24 Arabic", url: "https://www.france24.com/ar/rss", category: "world", tier: "arabic-extended" },
  { name: "DW Arabic", url: "https://rss.dw.com/rdf/rss-ar-top", category: "world", tier: "arabic-extended" },
  { name: "RT Arabic", url: "https://arabic.rt.com/rss/", category: "world", tier: "arabic-extended" },
  { name: "Arab News", url: "https://www.arabnews.com/rss.xml", category: "world", tier: "gulf-extended" },
  { name: "The National", url: "https://www.thenationalnews.com/world/rss", category: "world", tier: "gulf-extended" },
  { name: "Khaleej Times", url: "https://www.khaleejtimes.com/rss/world", category: "world", tier: "gulf-extended" },
  { name: "Gulf News", url: "https://gulfnews.com/rss", category: "world", tier: "gulf-extended" },

  // Economy / markets
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", category: "markets", tier: "markets-core" },
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "markets", tier: "markets-core" },
  { name: "World Bank", url: "https://www.worldbank.org/en/news/all/rss", category: "markets", tier: "markets-core" },
  { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", category: "markets", tier: "markets-extended" },
  { name: "IMF", url: "https://www.imf.org/en/News/RSS", category: "markets", tier: "markets-extended" },

  // Humanitarian / institutions
  { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", category: "world", tier: "institutional" },
  { name: "ReliefWeb", url: "https://reliefweb.int/updates/rss.xml", category: "world", tier: "institutional" },

  // Expanded global coverage
  { name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", category: "world", tier: "global-extended" },
  { name: "CBS World", url: "https://www.cbsnews.com/latest/rss/world", category: "world", tier: "global-extended" },
  { name: "ABC News", url: "https://abcnews.go.com/abcnews/internationalheadlines", category: "world", tier: "global-extended" },
  { name: "The Independent", url: "https://www.independent.co.uk/news/world/rss", category: "world", tier: "global-extended" },
  { name: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=world", category: "world", tier: "global-extended" },
  { name: "France24", url: "https://www.france24.com/en/rss", category: "world", tier: "global-extended" },
  { name: "DW", url: "https://rss.dw.com/xml/rss-en-all", category: "world", tier: "global-extended" },
  { name: "The Times", url: "https://www.thetimes.co.uk/rss", category: "world", tier: "global-extended" },
  { name: "Japan Times", url: "https://www.japantimes.co.jp/news_category/world/feed/", category: "world", tier: "global-extended" },
  { name: "Asia Nikkei", url: "https://asia.nikkei.com/rss/feed/nar", category: "world", tier: "asia-extended" },

  // Expanded Arab / regional coverage
  { name: "Asharq Al-Awsat", url: "https://aawsat.com/home/rss.xml", category: "world", tier: "arabic-extended" },
  { name: "Al Arabiya", url: "https://www.alarabiya.net/.mrss/ar.xml", category: "world", tier: "arabic-extended" },
  { name: "Al Araby", url: "https://www.alaraby.co.uk/rss.xml", category: "world", tier: "arabic-extended" },
  { name: "Anadolu Arabic", url: "https://www.aa.com.tr/ar/rss/default?cat=guncel", category: "world", tier: "arabic-extended" },
  { name: "TRT Arabic", url: "https://www.trtarabi.com/rss", category: "world", tier: "arabic-extended" },

  // Expanded markets/economy coverage
  { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", category: "markets", tier: "markets-extended" },
  { name: "Reuters Markets", url: "https://feeds.reuters.com/news/wealth", category: "markets", tier: "markets-extended" },
  { name: "Financial Times", url: "https://www.ft.com/world?format=rss", category: "markets", tier: "markets-extended" },
  { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", category: "markets", tier: "markets-extended" },
  { name: "Investing", url: "https://www.investing.com/rss/news_285.rss", category: "markets", tier: "markets-extended" },
  { name: "OECD", url: "https://www.oecd.org/newsroom/rss.xml", category: "markets", tier: "institutional" },
  { name: "WTO", url: "https://www.wto.org/english/news_e/news_e.xml", category: "markets", tier: "institutional" },
];

export const BREAKING_SOURCE_REGISTRY = [
  { name: "BBC Breaking", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "world", tier: "breaking-core" },
  { name: "Reuters Top", url: "https://feeds.reuters.com/reuters/topNews", category: "world", tier: "breaking-core" },
  { name: "AP Breaking", url: "https://apnews.com/hub/breaking-news?output=rss", category: "world", tier: "breaking-core" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world", tier: "breaking-extended" },
  { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/home.xml", category: "world", tier: "breaking-extended" },
  { name: "CNN Breaking", url: "http://rss.cnn.com/rss/edition.rss", category: "world", tier: "breaking-extended" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", category: "world", tier: "breaking-extended" },
  { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", category: "world", tier: "breaking-extended" },
];

// Lean profile for fast endpoint.
export const FAST_NEWS_SOURCE_URLS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://feeds.reuters.com/reuters/worldNews",
  "https://feeds.skynews.com/feeds/rss/world.xml",
  "https://www.theguardian.com/world/rss",
  "https://www.france24.com/ar/rss",
  "http://rss.cnn.com/rss/edition_world.rss",
  "https://abcnews.go.com/abcnews/internationalheadlines",
  "https://www.independent.co.uk/news/world/rss",
  "https://www.arabnews.com/rss.xml",
  "https://aawsat.com/home/rss.xml",
  "https://www.alarabiya.net/.mrss/ar.xml",
  "https://www.trtarabi.com/rss",
];

// Wider profile for intelligence endpoint.
export const INTEL_NEWS_SOURCE_URLS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://feeds.reuters.com/reuters/worldNews",
  "https://feeds.skynews.com/feeds/rss/world.xml",
  "https://feeds.bloomberg.com/markets/news.rss",
  "https://www.france24.com/ar/rss",
  "https://rss.dw.com/rdf/rss-ar-top",
  "http://rss.cnn.com/rss/edition_world.rss",
  "https://abcnews.go.com/abcnews/internationalheadlines",
  "https://www.independent.co.uk/news/world/rss",
  "https://www.euronews.com/rss?level=theme&name=world",
  "https://aawsat.com/home/rss.xml",
  "https://www.alarabiya.net/.mrss/ar.xml",
  "https://www.alaraby.co.uk/rss.xml",
  "https://www.trtarabi.com/rss",
  "https://feeds.reuters.com/reuters/businessNews",
  "https://feeds.marketwatch.com/marketwatch/topstories/",
  "https://www.investing.com/rss/news_285.rss",
  "https://www.worldbank.org/en/news/all/rss",
  "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
];

export function resolveSourceNameFromUrl(url = "") {
  const entry = NEWS_SOURCE_REGISTRY.find((item) => item.url === url)
    || BREAKING_SOURCE_REGISTRY.find((item) => item.url === url);
  return entry?.name || url || "News Feed";
}
