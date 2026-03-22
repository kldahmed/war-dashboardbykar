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
    setLoading(true);
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
      setState(EMPTY_STATE);
      setError(language === "ar" ? "تعذر تحميل هذا القسم حالياً" : "Unable to load this section right now");
      setLoading(false);
      return;
    }

    setState(merged);
    setLastUpdated(new Date().toISOString());
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