import { useEffect, useMemo, useState } from "react";

export const SECTION_ROUTES = [
  { id: "overview", path: "/", icon: "◉", titleAr: "الرئيسية", titleEn: "Overview", descriptionAr: "ملخص سريع لكل المنصة", descriptionEn: "Compact platform overview" },
  { id: "world", path: "/world-state", icon: "🌐", titleAr: "حالة العالم", titleEn: "World State", descriptionAr: "الصورة العامة والضغط العالمي", descriptionEn: "Global status and pressure" },
  { id: "news", path: "/news", icon: "📰", titleAr: "الأخبار", titleEn: "News", descriptionAr: "تدفق الأخبار والرياضة", descriptionEn: "News and sports feed" },
  { id: "radar", path: "/radar", icon: "📡", titleAr: "الرادار", titleEn: "Radar", descriptionAr: "رادار الإشارات العالمية", descriptionEn: "Global signal radar" },
  { id: "events", path: "/events", icon: "🌍", titleAr: "الأحداث العالمية", titleEn: "Global Events", descriptionAr: "الأحداث الحية والتسلسل", descriptionEn: "Live events and timelines" },
  { id: "links", path: "/link-center", icon: "🕸", titleAr: "مركز الربط", titleEn: "Link Center", descriptionAr: "العلاقات والترابطات", descriptionEn: "Links and correlations" },
  { id: "analysis", path: "/analysis-center", icon: "🧠", titleAr: "مركز التحليل", titleEn: "Analysis Center", descriptionAr: "لوحات التحليل والاستخبارات", descriptionEn: "Analysis and intelligence boards" },
  { id: "forecast", path: "/forecast", icon: "🎯", titleAr: "الاستشراف", titleEn: "Forecast", descriptionAr: "التوقعات والسيناريوهات", descriptionEn: "Forecasts and scenarios" },
  { id: "agent", path: "/agent", icon: "🤖", titleAr: "الوكيل الذكي", titleEn: "AI Agent", descriptionAr: "مراقبة أداء الوكيل", descriptionEn: "Monitor agent capability" },
  { id: "live", path: "/live", icon: "📺", titleAr: "البث المباشر", titleEn: "Live", descriptionAr: "القنوات والبث الحي", descriptionEn: "Live channels and streams" },
];

export function normalizePath(path) {
  if (!path || path === "/") return "/";
  const clean = String(path).replace(/\/+$/, "");
  return clean || "/";
}

export function isKnownRoute(path) {
  return SECTION_ROUTES.some((route) => route.path === normalizePath(path));
}

export function navigateTo(path, options = {}) {
  if (typeof window === "undefined") return;
  const nextPath = normalizePath(path);
  if (normalizePath(window.location.pathname) === nextPath) {
    window.scrollTo({ top: 0, behavior: options.behavior || "smooth" });
    return;
  }

  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: options.behavior || "smooth" });
}

export function useCurrentPath(defaultPath = "/") {
  const initial = typeof window === "undefined" ? defaultPath : normalizePath(window.location.pathname || defaultPath);
  const [currentPath, setCurrentPath] = useState(isKnownRoute(initial) ? initial : defaultPath);

  useEffect(() => {
    const sync = () => {
      const next = normalizePath(window.location.pathname || defaultPath);
      const safe = isKnownRoute(next) ? next : defaultPath;
      if (safe !== next) {
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