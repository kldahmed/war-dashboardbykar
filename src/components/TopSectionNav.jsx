import React, { useEffect, useRef } from "react";
import { getRoutesForMode } from "../lib/simpleRouter";

export default function TopSectionNav({ currentPath, navigate, language = "ar", mode = "simplified" }) {
  const scrollRef = useRef(null);
  const routeList = getRoutesForMode(mode);

  const handleKeyDown = (event) => {
    const buttons = Array.from(scrollRef.current?.querySelectorAll("button") || []);
    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    if (currentIndex === -1 || buttons.length === 0) return;

    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = language === "ar"
        ? Math.max(0, currentIndex - 1)
        : Math.min(buttons.length - 1, currentIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      nextIndex = language === "ar"
        ? Math.min(buttons.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    }

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      buttons[nextIndex]?.focus();
    }
  };

  useEffect(() => {
    const activeButton = scrollRef.current?.querySelector('[aria-current="page"]');
    if (!activeButton) return;
    activeButton.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentPath]);

  return (
    <div className="app-sticky-nav-wrap">
      <nav className="app-sticky-nav">
        <div
          ref={scrollRef}
          className="app-sticky-nav-scroll"
          dir={language === "ar" ? "rtl" : "ltr"}
          onKeyDown={handleKeyDown}
        >
          {routeList.map((route) => {
            const active = currentPath === route.path;
            const label = language === "ar" ? route.titleAr : route.titleEn;
            return (
              <button
                key={route.path}
                type="button"
                onClick={() => navigate(route.path)}
                className={active ? "tab-pill top-section-nav__item active" : "tab-pill top-section-nav__item inactive"}
                style={{ flexShrink: 0 }}
                aria-current={active ? "page" : undefined}
                title={language === "ar" ? route.descriptionAr : route.descriptionEn}
              >
                <span className="top-section-nav__icon">{route.icon}</span>
                <span className="top-section-nav__label">{label}</span>
                {route.tier === "advanced" ? <span className="top-section-nav__tier">{language === "ar" ? "متقدم" : "Advanced"}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="top-section-nav__legend" style={{ padding: "0 12px 10px" }}>
          <span>{language === "ar" ? "الوضع العام" : "Public mode"}: <strong>{language === "ar" ? "مبسط" : "Simplified"}</strong></span>
          <span>{language === "ar" ? "الأدوات المتقدمة" : "Advanced tools"}: <strong>{language === "ar" ? "داخل التحليل المتقدم" : "In Advanced Analysis"}</strong></span>
        </div>
      </nav>
    </div>
  );
}