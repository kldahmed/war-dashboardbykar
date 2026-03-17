import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const I18nContext = createContext(null);
const STORAGE_KEY = "kar-language";

function getDeepValue(obj, path) {
  return path.split(".").reduce((acc, segment) => (acc && acc[segment] !== undefined ? acc[segment] : undefined), obj);
}

function interpolate(template, vars = {}) {
  if (typeof template !== "string") return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "ar";
  });

  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [language, direction]);

  const value = useMemo(() => {
    const t = (key, vars) => {
      const table = translations[language] || translations.ar;
      const fallback = translations.en;
      const candidate = getDeepValue(table, key);
      const backup = getDeepValue(fallback, key);
      const finalValue = candidate ?? backup ?? key;
      return interpolate(finalValue, vars);
    };

    const formatDateTime = (value, options = {}) => {
      try {
        const locale = language === "ar" ? "ar-AE" : "en-GB";
        return new Intl.DateTimeFormat(locale, {
          timeZone: options.timeZone || "Asia/Dubai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date(value));
      } catch {
        return "-";
      }
    };

    return {
      language,
      setLanguage,
      direction,
      isArabic: language === "ar",
      t,
      formatDateTime
    };
  }, [language, direction]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}