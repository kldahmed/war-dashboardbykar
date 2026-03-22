import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero, pageShell } from "./shared/pagePrimitives";

const WORLD_STATE_ENDPOINTS = ["/api/global-map-state", "/api/global-events", "/api/radar"];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function extractValidatedPayload(endpoint, payload) {
  if (!isObject(payload)) return null;

  if (endpoint === "/api/global-map-state") {
    const countries = toArray(payload.countries);
    const links = toArray(payload.links);
    const signals = toArray(payload.signals);
    return {
      endpoint,
      countries,
      links,
      signals,
      events: [],
      aircraft: [],
      generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : "",
    };
  }

  if (endpoint === "/api/global-events") {
    const events = toArray(payload.events);
    return {
      endpoint,
      countries: [],
      links: [],
      signals: [],
      events,
      aircraft: [],
      generatedAt: typeof payload.updated === "string" ? payload.updated : "",
    };
  }

  if (endpoint === "/api/radar") {
    const aircraft = toArray(payload.aircraft);
    return {
      endpoint,
      countries: [],
      links: [],
      signals: [],
      events: [],
      aircraft,
      generatedAt: "",
    };
  }

  return null;
}

async function fetchJsonWithTimeout(endpoint, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) return { ok: false, payload: null };

    try {
      const payload = await response.json();
      return { ok: true, payload };
    } catch {
      return { ok: false, payload: null };
    }
  } catch {
    return { ok: false, payload: null };
  } finally {
    clearTimeout(timeout);
  }
}

export default function WorldStatePage({ language }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeEndpoint, setActiveEndpoint] = useState("");
  const [payload, setPayload] = useState(() => ({
    endpoint: "",
    countries: [],
    links: [],
    signals: [],
    events: [],
    aircraft: [],
    generatedAt: "",
  }));
  const [reloadKey, setReloadKey] = useState(0);

  const loadWorldState = useCallback(async () => {
    setLoading(true);
    setError("");

    for (const endpoint of WORLD_STATE_ENDPOINTS) {
      setActiveEndpoint(endpoint);
      const result = await fetchJsonWithTimeout(endpoint);
      if (!result.ok) continue;

      const validated = extractValidatedPayload(endpoint, result.payload);
      if (!validated) continue;

      setPayload(validated);
      setLoading(false);
      return;
    }

    setLoading(false);
    setError(language === "ar" ? "تعذر تحميل هذا القسم حالياً" : "Unable to load this section right now");
  }, [language]);

  useEffect(() => {
    loadWorldState();
  }, [loadWorldState, reloadKey]);

  const summary = useMemo(() => {
    return {
      countries: toArray(payload.countries).length,
      links: toArray(payload.links).length,
      signals: toArray(payload.signals).length,
      events: toArray(payload.events).length,
      aircraft: toArray(payload.aircraft).length,
    };
  }, [payload]);

  const listItems = useMemo(() => {
    if (payload.endpoint === "/api/global-map-state") {
      return toArray(payload.signals).slice(0, 8).map((item, index) => ({
        id: item && (item.id || `signal-${index}`),
        title: item && (item.title || item.summary || "Untitled signal"),
      }));
    }

    if (payload.endpoint === "/api/global-events") {
      return toArray(payload.events).slice(0, 8).map((item, index) => ({
        id: item && (item.id || `event-${index}`),
        title: item && (item.title || item.summary || "Untitled event"),
      }));
    }

    if (payload.endpoint === "/api/radar") {
      return toArray(payload.aircraft).slice(0, 8).map((item, index) => ({
        id: item && (item.id || `aircraft-${index}`),
        title: item && (item.callsign || item.altitude || `Track ${index + 1}`),
      }));
    }

    return [];
  }, [payload]);

  return (
    <div style={pageShell}>
      <PageHero
        eyebrow={language === "ar" ? "حالة العالم" : "WORLD STATE"}
        title={language === "ar" ? "القراءة العليا للمشهد العالمي" : "Top-layer reading of the global landscape"}
        description={language === "ar"
          ? "نسخة مستقرة وآمنة بتحميل متسلسل من واجهات API المتاحة."
          : "A stable safe-mode view with sequential fallback API loading."}
      />

      <section
        style={{
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 16,
          padding: 16,
          background: "rgba(15,23,42,0.5)",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          {language === "ar" ? "المسار الحالي:" : "Current endpoint:"} {activeEndpoint || "-"}
        </div>

        {loading ? (
          <div style={{ fontSize: 14, color: "#cbd5e1" }}>
            {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : null}

        {!loading && error ? (
          <div
            style={{
              color: "#fca5a5",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(127,29,29,0.18)",
            }}
          >
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10 }}>Countries: {summary.countries}</div>
              <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10 }}>Links: {summary.links}</div>
              <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10 }}>Signals: {summary.signals}</div>
              <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10 }}>Events: {summary.events}</div>
              <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10 }}>Aircraft: {summary.aircraft}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                {language === "ar" ? "آخر تحديث:" : "Last update:"} {payload.generatedAt || "-"}
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {toArray(listItems).length === 0 ? (
                  <li style={{ color: "#94a3b8" }}>{language === "ar" ? "لا توجد عناصر لعرضها" : "No items to display"}</li>
                ) : (
                  toArray(listItems).map((item) => (
                    <li key={String((item && item.id) || Math.random())} style={{ color: "#e2e8f0", marginBottom: 6 }}>
                      {String((item && item.title) || "Untitled")}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : null}

        <div>
          <button
            type="button"
            onClick={() => setReloadKey((v) => v + 1)}
            style={{
              border: "1px solid rgba(56,189,248,0.35)",
              background: "rgba(56,189,248,0.12)",
              color: "#7dd3fc",
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </section>
    </div>
  );
}
