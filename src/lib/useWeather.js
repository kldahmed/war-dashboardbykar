import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes — matches server cache TTL
const RETRY_DELAY  = 30 * 1000;       // 30 s on error

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export function useWeather() {
  const [cities,    setCities]    = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const timerRef = useRef(null);

  const fetchWeather = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/weather", { signal: controller.signal });
      clearTimeout(timeoutId);

      const text = await res.text();
      const data = safeJson(text);
      if (!data || !Array.isArray(data.cities)) throw new Error("Invalid response");

      setCities(data.cities);
      setAlerts(data.alerts || []);
      setFetchedAt(data.fetchedAt || "");
      setError("");
      timerRef.current = setTimeout(fetchWeather, POLL_INTERVAL);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(String(err?.message || "Weather unavailable"));
      }
      timerRef.current = setTimeout(fetchWeather, RETRY_DELAY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchWeather]);

  return { cities, alerts, loading, error, fetchedAt, retry: fetchWeather };
}
