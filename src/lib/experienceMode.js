import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ExperienceModeContext = createContext(null);
const STORAGE_KEY = "kar-experience-mode";

function normalizeMode(value) {
  return value === "advanced" ? "advanced" : "simplified";
}

export function ExperienceModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "simplified";
    return normalizeMode(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    isAdvanced: mode === "advanced",
    setMode: (nextMode) => setMode(normalizeMode(nextMode)),
    toggleMode: () => setMode((current) => (current === "advanced" ? "simplified" : "advanced")),
  }), [mode]);

  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>;
}

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);
  if (!context) {
    throw new Error("useExperienceMode must be used inside ExperienceModeProvider");
  }
  return context;
}
