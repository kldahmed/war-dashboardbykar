import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeWorldStateSources, normalizeEndpointPayload, safeArray } from "./aggregation";

const WORLD_STATE_ENDPOINTS = [
  "/api/global-map-state",
  "/api/global-events",
  "/api/radar",
  "/api/news?category=all",
  "/api/intelnews",
  "/api/x-feed",
];

const WORLD_STATE_CACHE_KEY = "kar-world-state:snapshot";
const WORLD_STATE_CACHE_TTL_MS = 90 * 1000;

const EMPTY_STATE = {
  aircraft: [],
  events: [],
  signals: [],
  links: [],
  countries: [],
  summary: {
    topRegions: [],
    topCategories: [],
    dominantDrivers: [],
    connectedEntities: [],
    totalSignals: 0,
    totalCountries: 0,
    totalLinks: 0,
  },
};

async function fetchEndpoint(endpoint, signal) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) {
        if (attempt === 1) return { endpoint, ok: false, payload: null };
        continue;
      }

      const payload = await response.json();
      return { endpoint, ok: true, payload };
    } catch {
      if (attempt === 1) {
        return { endpoint, ok: false, payload: null };
      }
    }
  }
  return { endpoint, ok: false, payload: null };
}

function readWorldStateCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(WORLD_STATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.state || !Number.isFinite(parsed.savedAt)) return null;
    if (Date.now() - parsed.savedAt > WORLD_STATE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeWorldStateCache(payload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      WORLD_STATE_CACHE_KEY,
      JSON.stringify({ ...payload, savedAt: Date.now() })
    );
  } catch {
    // Non-critical: request pipeline continues even without cache persistence.
  }
}

function isValidNormalizedPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return ["signals", "events", "aircraft"].every((key) => Array.isArray(payload[key]));
}

export function useWorldStateData(language = "ar") {
  const [state, setState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [sourceHealth, setSourceHealth] = useState([]);
  const requestRef = useRef(0);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    const currentRequest = ++requestRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const cachedSnapshot = readWorldStateCache();
    if (cachedSnapshot?.state) {
      setState(cachedSnapshot.state);
      setSourceHealth(safeArray(cachedSnapshot.sourceHealth));
      setLastUpdated(cachedSnapshot.lastUpdated || "");
    }

    setLoading(!cachedSnapshot?.state);
    setError("");

    const results = await Promise.all(
      WORLD_STATE_ENDPOINTS.map((endpoint) => fetchEndpoint(endpoint, controller.signal))
    );

    if (currentRequest !== requestRef.current) {
      controller.abort();
      return;
    }

    const normalized = results.map((result) => {
      const data = result.ok ? normalizeEndpointPayload(result.endpoint, result.payload) : null;
      const validData = isValidNormalizedPayload(data) ? data : null;
      return {
      endpoint: result.endpoint,
      ok: result.ok,
      data: validData,
      };
    });

    const merged = mergeWorldStateSources(
      normalized.filter((result) => result.ok && result.data).map((result) => result.data)
    );

    setSourceHealth(
      normalized.map((result) => ({
        endpoint: result.endpoint,
        ok: result.ok,
        signals: safeArray(result.data?.signals).length,
        events: safeArray(result.data?.events).length,
        aircraft: safeArray(result.data?.aircraft).length,
      }))
    );

    const hasUsefulData = merged.signals.length > 0 || merged.events.length > 0 || merged.aircraft.length > 0;
    if (!hasUsefulData) {
      if (cachedSnapshot?.state) {
        setState(cachedSnapshot.state);
        setSourceHealth(safeArray(cachedSnapshot.sourceHealth));
        setLastUpdated(cachedSnapshot.lastUpdated || "");
        setError(language === "ar" ? "تم عرض آخر نسخة محفوظة مؤقتاً بسبب تعذر التحديث" : "Showing the latest cached snapshot because refresh failed");
      } else {
        setState(EMPTY_STATE);
        setError(language === "ar" ? "تعذر تحميل هذا القسم حالياً" : "Unable to load this section right now");
      }
      setLoading(false);
      return;
    }

    setState(merged);
    const syncedAt = new Date().toISOString();
    setLastUpdated(syncedAt);
    writeWorldStateCache({ state: merged, sourceHealth: normalized.map((result) => ({
      endpoint: result.endpoint,
      ok: result.ok,
      signals: safeArray(result.data?.signals).length,
      events: safeArray(result.data?.events).length,
      aircraft: safeArray(result.data?.aircraft).length,
    })), lastUpdated: syncedAt });
    setLoading(false);
  }, [language]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  const operationalStatus = useMemo(() => {
    const healthySources = sourceHealth.filter((source) => source.ok).length;
    return {
      healthySources,
      totalSources: sourceHealth.length,
      lastUpdated,
    };
  }, [lastUpdated, sourceHealth]);

  return {
    ...state,
    loading,
    error,
    retry,
    sourceHealth,
    operationalStatus,
  };
}