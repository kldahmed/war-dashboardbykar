import { useEffect, useMemo, useState } from "react";

export const SECTION_ROUTES = [
  { id: "news",        path: "/news",        icon: "📰", tier: "public", titleAr: "الأخبار",       titleEn: "News",        descriptionAr: "أهم الأخبار من مصادر متعددة موثوقة",      descriptionEn: "Top news from multiple trusted sources" },
  { id: "live",        path: "/live",        icon: "📡", tier: "public", titleAr: "البث الحي",     titleEn: "Live Feed",   descriptionAr: "تسلسل زمني مباشر للأحداث العاجلة",        descriptionEn: "Real-time timeline of breaking events" },
  { id: "live-news-ai", path: "/live-news-ai", icon: "🎙️", tier: "public", titleAr: "Live News by AI", titleEn: "Live News by AI", descriptionAr: "مذيع افتراضي يقرأ الأخبار العاجلة مع إظهار المصدر والتحقق", descriptionEn: "AI presenter reading live news with source attribution and verification" },
  { id: "world-eye",   path: "/world-eye",   icon: "👁️", tier: "public", titleAr: "عين العالم",   titleEn: "World Eye",   descriptionAr: "تقرير استخباراتي واضح عما يجري الآن",     descriptionEn: "Clear intelligence brief on what is happening now" },
  { id: "uae-weather", path: "/uae-weather", icon: "🌤️", tier: "public", titleAr: "طقس الإمارات", titleEn: "UAE Weather", descriptionAr: "حالة الطقس في إمارات الدولة السبع",        descriptionEn: "Live weather across all 7 UAE emirates" },
];

// The home route "/" redirects to "/world-eye" in App.jsx
export const HOME_REDIRECT = "/world-eye";

export function getRoutesForMode() {
  return SECTION_ROUTES;
}

export function normalizePath(path) {
  if (!path || path === "/") return "/";
  const plain = String(path).split("?")[0].split("#")[0] || "/";
  const clean = plain.replace(/\/+$/, "");
  return clean || "/";
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
      const raw = normalizePath(window.location.pathname || defaultPath);
      // Redirect bare "/" to world-eye
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