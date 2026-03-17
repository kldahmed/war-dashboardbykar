import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "../i18n/I18nProvider";
import "../styles/LanguageSwitcher.css";

export function LanguageSwitcher() {
  const { language, setLanguage, direction } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const isArabic = language === "ar";

  return (
    <div ref={menuRef} className="language-switcher-container" dir={direction}>
      <button
        className="language-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch language"
        aria-expanded={isOpen}
      >
        <span className="language-flag">{isArabic ? "AR" : "EN"}</span>
        <span className="language-label">{isArabic ? "العربية" : "English"}</span>
        <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="language-menu">
          <button
            className={`language-option ${language === "ar" ? "active" : ""}`}
            onClick={() => handleLanguageChange("ar")}
          >
            <span className="option-flag">🇸🇦</span>
            <span className="option-text">العربية</span>
            {language === "ar" && <span className="checkmark">✓</span>}
          </button>
          <button
            className={`language-option ${language === "en" ? "active" : ""}`}
            onClick={() => handleLanguageChange("en")}
          >
            <span className="option-flag">🇬🇧</span>
            <span className="option-text">English</span>
            {language === "en" && <span className="checkmark">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
