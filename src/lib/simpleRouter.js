import { useEffect, useMemo, useState } from "react";

export const SECTION_ROUTES = [
  { id: "overview", path: "/", icon: "◉", tier: "public", titleAr: "الرئيسية", titleEn: "Home", descriptionAr: "أهم ما يحدث الآن بصورة مبسطة", descriptionEn: "Simple executive snapshot" },
  { id: "world", path: "/world-state", icon: "🌐", tier: "public", titleAr: "حالة العالم", titleEn: "World State", descriptionAr: "التوتر العالمي والمناطق الأكثر تأثراً", descriptionEn: "Global tension and affected regions" },
  { id: "events", path: "/events", icon: "🌍", tier: "public", titleAr: "الأحداث العالمية", titleEn: "Global Events", descriptionAr: "الأحداث المهمة ولماذا تهم", descriptionEn: "Key events and why they matter" },
  { id: "news", path: "/news", icon: "📰", tier: "public", titleAr: "الأخبار", titleEn: "News", descriptionAr: "قصص مختارة مع شرح التأثير", descriptionEn: "Curated stories with impact" },
  { id: "live", path: "/live", icon: "📺", tier: "public", titleAr: "البث المباشر", titleEn: "Live Broadcast", descriptionAr: "قنوات وبث مباشر مختار", descriptionEn: "Live channels and broadcast" },
  { id: "console", path: "/intelligence-console", icon: "🧭", tier: "advanced", titleAr: "التحليل المتقدم", titleEn: "Advanced Analysis", descriptionAr: "بوابة الأدوات الاستخباراتية المتقدمة", descriptionEn: "Gateway to advanced intelligence" },
  { id: "radar", path: "/radar", icon: "📡", tier: "advanced", titleAr: "الرادار", titleEn: "Radar", descriptionAr: "إشارات وقياسات متقدمة", descriptionEn: "Signal and depth radar" },
  { id: "analysis", path: "/analysis-center", icon: "🧠", tier: "advanced", titleAr: "مركز التحليل", titleEn: "Analysis Center", descriptionAr: "تحليل عميق وترابط المؤشرات", descriptionEn: "Deep analysis and correlations" },
  { id: "links", path: "/link-center", icon: "🕸", tier: "advanced", titleAr: "مركز الربط", titleEn: "Link Center", descriptionAr: "علاقات الأحداث والجهات", descriptionEn: "Event relationships and actors" },
  { id: "forecast", path: "/forecast", icon: "🎯", tier: "advanced", titleAr: "الاستشراف", titleEn: "Forecast", descriptionAr: "سيناريوهات وتوقعات متقدمة", descriptionEn: "Advanced forecasts and scenarios" },
  { id: "agent", path: "/agent", icon: "🤖", tier: "advanced", titleAr: "الوكيل الذكي", titleEn: "AI Agent", descriptionAr: "حالة الوكيل والتدقيق التحليلي", descriptionEn: "Agent state and audit metrics" },
];

export function getRoutesForMode(mode = "simplified") {
  if (mode === "advanced") return SECTION_ROUTES;
  return SECTION_ROUTES.filter((route) => route.tier === "public" || route.id === "console");
}

export function normalizePath(path) {
  if (!path || path === "/") return "/";
  const plain = String(path).split("?")[0].split("#")[0] || "/";
  const clean = plain.replace(/\/+$/, "");
  return clean || "/";
}

export function isKnownRoute(path) {
  return SECTION_ROUTES.some((route) => route.path === normalizePath(path));
}

export function navigateTo(path, options = {}) {
  if (typeof window === "undefined") return;
  const rawPath = String(path || "/");
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