import React from "react";
import { SECTION_ROUTES } from "../lib/simpleRouter";

export default function TopSectionNav({ currentPath, navigate, language = "ar" }) {
  return (
    <div className="app-sticky-nav-wrap">
      <nav className="app-sticky-nav">
        <div className="app-sticky-nav-scroll">
          {SECTION_ROUTES.map((route) => {
            const active = currentPath === route.path;
            const label = language === "ar" ? route.titleAr : route.titleEn;
            return (
              <button
                key={route.path}
                type="button"
                onClick={() => navigate(route.path)}
                className={active ? "tab-pill active" : "tab-pill inactive"}
                style={{ flexShrink: 0 }}
                aria-current={active ? "page" : undefined}
                title={language === "ar" ? route.descriptionAr : route.descriptionEn}
              >
                <span>{route.icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}