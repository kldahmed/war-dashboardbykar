import { useEffect, useMemo, useState } from "react";

export const SECTION_ROUTES = [
  { id: "news",        path: "/news",        icon: "📰", tier: "public", titleAr: "الأخبار",       titleEn: "News",        descriptionAr: "أهم الأخبار من مصادر متعددة موثوقة",      descriptionEn: "Top news from multiple trusted sources" },
  { id: "news-operations", path: "/admin/news-operations", icon: "🛠️", tier: "admin", titleAr: "تشغيل الأخبار", titleEn: "News Operations", descriptionAr: "لوحة تشغيل المصادر والسعة وإعادة المعالجة", descriptionEn: "Operations panel for sources, capacity, and reprocessing" },
  { id: "news-analytics", path: "/admin/news-analytics", icon: "📊", tier: "admin", titleAr: "تحليلات الأخبار", titleEn: "News Analytics", descriptionAr: "عدادات يومية، جودة، توزيع، وتنبيهات الأداء", descriptionEn: "Daily counters, quality, distributions, and performance alerts" },
  { id: "news-sources", path: "/admin/news-sources", icon: "🧭", tier: "admin", titleAr: "مصادر الأخبار", titleEn: "News Sources", descriptionAr: "حالة المصادر، الفشل، التكرار، ومعدلات السحب", descriptionEn: "Source health, failure, duplicates, and polling rates" },
  { id: "news-clusters", path: "/admin/news-clusters", icon: "🧩", tier: "admin", titleAr: "تجميع التكرار", titleEn: "News Clusters", descriptionAr: "عرض المجموعات المتشابهة وربط المصادر", descriptionEn: "View similarity clusters and linked sources" },
  { id: "live",        path: "/live",        icon: "📡", tier: "public", titleAr: "البث الحي",     titleEn: "Live Feed",   descriptionAr: "تسلسل زمني مباشر للأحداث العاجلة",        descriptionEn: "Real-time timeline of breaking events" },
  { id: "live-news-ai", path: "/live-news-ai", icon: "🎙️", tier: "public", titleAr: "Live News by AI", titleEn: "Live News by AI", descriptionAr: "مذيع افتراضي يقرأ الأخبار العاجلة مع إظهار المصدر والتحقق", descriptionEn: "AI presenter reading live news with source attribution and verification" },
  { id: "world-eye",   path: "/world-eye",   icon: "👁️", tier: "public", titleAr: "عين العالم",   titleEn: "World Eye",   descriptionAr: "تقرير استخباراتي واضح عما يجري الآن",     descriptionEn: "Clear intelligence brief on what is happening now" },
  { id: "uae-weather", path: "/uae-weather", icon: "🌤️", tier: "public", titleAr: "طقس الإمارات", titleEn: "UAE Weather", descriptionAr: "حالة الطقس في إمارات الدولة السبع",        descriptionEn: "Live weather across all 7 UAE emirates" },
];

// The home route "/" redirects to "/news" in App.jsx
export const HOME_REDIRECT = "/news";

const PATH_ALIASES = {
  "/news-operations": "/admin/news-operations",
  "/admin/news-control": "/admin/news-operations",
  "/admin/news-metrics": "/admin/news-analytics",
};

export function getRoutesForMode({ includeAdmin = false } = {}) {
  return SECTION_ROUTES.filter((route) => includeAdmin || route.tier !== "admin");
}

export function normalizePath(path) {
  if (!path || path === "/") return "/";
  const plain = String(path).split("?")[0].split("#")[0] || "/";
  const clean = plain.replace(/\/+$/, "");
  const resolved = clean || "/";
  return PATH_ALIASES[resolved] || resolved;
}

export function isKnownRoute(path) {
  const normalized = normalizePath(path);
  if (normalized === "/") return true; // home → redirect handled in App
  return SECTION_ROUTES.some((route) => route.path === normalized);
}

export function navigateTo(path, options = {}) {
  if (typeof window === "undefined") return;
  const rawPath = String(path || HOME_REDIRECT);
  const [pathPart, rawQuery = ""] = rawPath.split("?");
  const nextPath = normalizePath(pathPart);
  const normalizedQuery = rawQuery ? `?${rawQuery.replace(/^\?+/, "")}` : "";
  const nextUrl = `${nextPath}${normalizedQuery}`;

  const currentUrl = `${normalizePath(window.location.pathname)}${window.location.search || ""}`;
  if (currentUrl === nextUrl) {
    window.scrollTo({ top: 0, behavior: options.behavior || "smooth" });
    return;
  }

  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextUrl);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: options.behavior || "smooth" });
}

export function useCurrentPath(defaultPath = HOME_REDIRECT) {
  const resolveInitial = () => {
    if (typeof window === "undefined") return defaultPath;
    const raw = normalizePath(window.location.pathname || defaultPath);
    if (raw === "/") return HOME_REDIRECT;
    return isKnownRoute(raw) ? raw : defaultPath;
  };

  const [currentPath, setCurrentPath] = useState(resolveInitial);

  useEffect(() => {
    const sync = () => {
      const rawPathname = String(window.location.pathname || defaultPath);
      const normalizedPathname = normalizePath(rawPathname);

      if (rawPathname.startsWith("/category/")) {
        const category = rawPathname.split("/").filter(Boolean)[1] || "all";
        const next = `/news?category=${encodeURIComponent(category.toLowerCase())}`;
        window.history.replaceState({}, "", next);
        setCurrentPath("/news");
        return;
      }

      if (rawPathname.startsWith("/news/") && rawPathname !== "/news") {
        window.history.replaceState({}, "", "/news");
        setCurrentPath("/news");
        return;
      }

      const raw = normalizedPathname;
      // Redirect bare "/" to news
      if (raw === "/") {
        window.history.replaceState({}, "", HOME_REDIRECT);
        setCurrentPath(HOME_REDIRECT);
        return;
      }
      const safe = isKnownRoute(raw) ? raw : defaultPath;
      if (safe !== raw) {
        window.history.replaceState({}, "", safe);
      }
      setCurrentPath(safe);
    };

    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [defaultPath]);

  const currentRoute = useMemo(
    () => SECTION_ROUTES.find((route) => route.path === currentPath) || SECTION_ROUTES[0],
    [currentPath]
  );

  return {
    currentPath,
    currentRoute,
    navigate: navigateTo,
  };
}