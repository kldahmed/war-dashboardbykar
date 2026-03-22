/**
 * UAEWeatherPage — /uae-weather
 *
 * Dedicated weather page for all 7 UAE emirates.
 * Data comes from the existing /api/weather endpoint (which includes
 * all UAE cities). Non-UAE cities are filtered client-side.
 */

import React, { useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { pageShell, panelStyle } from "./shared/pagePrimitives";

// ── UAE city IDs (must match the IDs in api/weather.js) ──────────────────
const UAE_CITY_IDS = new Set([
  "abu-dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "ras-al-khaimah",
  "fujairah",
  "umm-al-quwain",
]);

// ── helpers ────────────────────────────────────────────────────────────────

function fmt1(n) { return typeof n === "number" ? n.toFixed(1) : "—"; }
function fmt0(n) { return typeof n === "number" ? Math.round(n) : "—"; }

function tempColor(t) {
  if (typeof t !== "number") return "#94a3b8";
  if (t >= 46) return "#ef4444";
  if (t >= 38) return "#f97316";
  if (t >= 28) return "#eab308";
  return "#4ade80";
}

function uvLabel(uv, isAr) {
  if (typeof uv !== "number") return "";
  if (uv <= 2)  return isAr ? "منخفض"     : "Low";
  if (uv <= 5)  return isAr ? "متوسط"     : "Moderate";
  if (uv <= 7)  return isAr ? "مرتفع"     : "High";
  if (uv <= 10) return isAr ? "مرتفع جداً" : "Very High";
  return isAr ? "خطير" : "Extreme";
}

function shortDate(dateStr, language) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", {
      weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dubai",
    });
  } catch { return dateStr; }
}

function markerColorFromTemp(t) {
  if (typeof t !== "number") return "#94a3b8";
  if (t >= 42) return "#ef4444";
  if (t >= 36) return "#f97316";
  if (t >= 30) return "#eab308";
  return "#22c55e";
}

function markerRadiusFromTemp(t, selected) {
  const base = typeof t === "number" ? Math.max(9, Math.min(16, 8 + (t - 24) * 0.35)) : 10;
  return selected ? base + 4 : base;
}

// ── sub-components ─────────────────────────────────────────────────────────

function CityCard({ city, language, isSelected, onSelect }) {
  const isAr = language === "ar";
  const cur  = city.current || {};
  const temp = cur.temperature_2m;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      style={{
        background: isSelected
          ? "linear-gradient(135deg, rgba(103,232,249,0.14), rgba(167,139,250,0.08))"
          : "rgba(255,255,255,0.04)",
        border: isSelected ? "1px solid rgba(103,232,249,0.35)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: isAr ? "right" : "left",
        transition: "all 0.15s",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#67e8f9" : "#cbd5e1" }}>
          {city.flag} {isAr ? city.nameAr : city.nameEn}
        </span>
        <span style={{ fontSize: 22 }}>{cur.icon || "🌡️"}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tempColor(temp), lineHeight: 1 }}>
        {fmt1(temp)}°
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
        {isAr ? cur.descAr : cur.descEn}
      </div>
    </button>
  );
}

function DetailPanel({ city, language }) {
  const isAr = language === "ar";
  const cur  = city.current || {};

  const L = {
    feelsLike: isAr ? "يشعر كأنه"    : "Feels like",
    humidity:  isAr ? "الرطوبة"       : "Humidity",
    wind:      isAr ? "الرياح"        : "Wind",
    precip:    isAr ? "الهطول"        : "Precipitation",
    uv:        isAr ? "مؤشر الأشعة"   : "UV Index",
    forecast:  isAr ? "توقعات 7 أيام" : "7-Day Forecast",
    source:    isAr ? "المصدر: Open-Meteo (بيانات WMO الرسمية)" : "Source: Open-Meteo (Official WMO data)",
  };

  return (
    <div style={{ ...panelStyle, padding: "22px 24px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 40 }}>{cur.icon || "🌡️"}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
            {city.flag} {isAr ? city.nameAr : city.nameEn}
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: tempColor(cur.temperature_2m), lineHeight: 1.1 }}>
            {fmt1(cur.temperature_2m)}°C
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>
            {L.feelsLike} {fmt1(cur.apparent_temperature)}°C · {isAr ? cur.descAr : cur.descEn}
          </div>
        </div>
      </div>

      {/* stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: L.humidity,  value: `${fmt0(cur.relative_humidity_2m)}%` },
          { label: L.wind,      value: `${fmt0(cur.wind_speed_10m)} km/h`, sub: cur.windDirLabel || "" },
          { label: L.precip,    value: `${fmt1(cur.precipitation)} mm` },
          { label: L.uv,        value: fmt1(cur.uv_index), sub: uvLabel(cur.uv_index, isAr) },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px" }}
          >
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 700 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>{stat.value}</div>
            {stat.sub ? <div style={{ fontSize: 11, color: "#475569" }}>{stat.sub}</div> : null}
          </div>
        ))}
      </div>

      {/* 7-day forecast */}
      {Array.isArray(city.forecast) && city.forecast.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#67e8f9", letterSpacing: "0.06em", marginBottom: 12, textTransform: "uppercase" }}>
            {L.forecast}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {city.forecast.map((day) => (
              <div
                key={day.date}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "center",
                  minWidth: 72,
                  flex: "1 1 72px",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                  {shortDate(day.date, language)}
                </div>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{day.icon || "🌡️"}</div>
                <div>
                  <span style={{ fontWeight: 800, color: tempColor(day.tempMax), fontSize: 14 }}>{fmt0(day.tempMax)}°</span>
                  <span style={{ color: "#475569", fontSize: 12, marginInlineStart: 4 }}>{fmt0(day.tempMin)}°</span>
                </div>
                {day.precipProb > 20 ? (
                  <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 3 }}>💧{day.precipProb}%</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 16, fontSize: 11, color: "#334155" }}>{L.source}</div>
    </div>
  );
}

function AlertBar({ alerts, language, uaeCityNames }) {
  const isAr = language === "ar";
  // Only show alerts for UAE cities
  const uaeAlerts = (alerts || []).filter((a) => {
    const name = isAr ? a.cityAr : a.cityEn;
    return uaeCityNames.has(String(name || "").toLowerCase());
  });

  if (uaeAlerts.length === 0) return null;

  return (
    <div style={{
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>
        ⚠️ {isAr ? "تنبيهات جوية" : "Weather Alerts"}
      </div>
      {uaeAlerts.map((a, i) => (
        <div key={i} style={{ color: "#fca5a5", fontSize: 13, marginBottom: 4 }}>
          {a.flag} <strong>{isAr ? a.cityAr : a.cityEn}</strong> — {isAr ? a.msgAr : a.msgEn}
        </div>
      ))}
    </div>
  );
}

function UAEWeatherMap({ cities, selectedId, onSelect, language }) {
  const isAr = language === "ar";
  const center = [24.2, 54.5];

  return (
    <div style={{ ...panelStyle, padding: 0, overflow: "hidden", marginBottom: 20 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.65))",
      }}>
        <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13 }}>
          🗺️ {isAr ? "خريطة طقس الإمارات الحية" : "UAE Live Weather Map"}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          {isAr ? "اضغط على أي نقطة لعرض التفاصيل" : "Tap any point for details"}
        </div>
      </div>

      <div style={{ height: 430, width: "100%" }}>
        <MapContainer
          center={center}
          zoom={7}
          minZoom={6}
          maxZoom={11}
          style={{ height: "100%", width: "100%", background: "#0f172a" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          />

          {cities.map((city) => {
            const temp = city?.current?.temperature_2m;
            const selected = city.id === selectedId;
            const color = markerColorFromTemp(temp);
            const radius = markerRadiusFromTemp(temp, selected);

            return (
              <CircleMarker
                key={city.id}
                center={[city.lat, city.lon]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: selected ? 0.95 : 0.72,
                  weight: selected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => onSelect(city.id),
                }}
              >
                <Tooltip direction="top" opacity={1}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {city.flag} {isAr ? city.nameAr : city.nameEn}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {fmt1(temp)}°C · {isAr ? (city?.current?.descAr || "—") : (city?.current?.descEn || "—")}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        padding: "10px 14px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(2,6,23,0.55)",
        fontSize: 11,
        color: "#94a3b8",
      }}>
        <span style={{ color: "#22c55e" }}>● {isAr ? "معتدل" : "Mild"}</span>
        <span style={{ color: "#eab308" }}>● {isAr ? "حار" : "Warm"}</span>
        <span style={{ color: "#f97316" }}>● {isAr ? "شديد الحرارة" : "Hot"}</span>
        <span style={{ color: "#ef4444" }}>● {isAr ? "حرارة قصوى" : "Extreme heat"}</span>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function UAEWeatherPage({ language = "ar", cities = [], alerts = [], loading = false, error = "", fetchedAt = "", onRetry }) {
  const isAr = language === "ar";

  // Filter to UAE cities only
  const uaeCities = (cities || []).filter((c) => UAE_CITY_IDS.has(c.id));
  const [selectedId, setSelectedId] = useState(null);

  const selectedCity = uaeCities.find((c) => c.id === selectedId) || uaeCities[0] || null;

  const mapCities = useMemo(
    () => uaeCities.filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lon)),
    [uaeCities]
  );

  // Build a set of UAE city names for alert filtering
  const uaeCityNames = new Set(
    uaeCities.flatMap((c) => [String(c.nameAr || "").toLowerCase(), String(c.nameEn || "").toLowerCase()])
  );

  const L = {
    hero:      isAr ? "طقس الإمارات" : "UAE Weather",
    heroDesc:  isAr ? "حالة الطقس الآنية في إمارات الدولة السبع" : "Live weather across all 7 UAE emirates",
    source:    isAr ? "المصدر: Open-Meteo — بيانات WMO الرسمية" : "Source: Open-Meteo — Official WMO data",
    loading:   isAr ? "جارٍ تحميل بيانات الطقس…" : "Loading weather data…",
    error:     isAr ? "تعذّر تحميل بيانات الطقس" : "Could not load weather data",
    retry:     isAr ? "إعادة المحاولة" : "Retry",
    updated:   isAr ? "آخر تحديث" : "Last updated",
    noData:    isAr ? "لا تتوفر بيانات الطقس حالياً. يرجى المحاولة لاحقاً." : "No weather data available. Please try again later.",
  };

  return (
    <div style={pageShell}>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#67e8f9", textTransform: "uppercase" }}>
            {L.hero}
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>
          🇦🇪 {L.heroDesc}
        </h1>
        {fetchedAt ? (
          <span style={{ fontSize: 12, color: "#475569" }}>
            {L.updated}: {new Date(fetchedAt).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
          </span>
        ) : null}
      </div>

      {/* ── loading ───────────────────────────────────────────────────────── */}
      {loading && uaeCities.length === 0 ? (
        <div style={{ ...panelStyle, padding: "36px 20px", textAlign: "center", color: "#67e8f9", fontSize: 15 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌤️</div>
          <div>{L.loading}</div>
        </div>
      ) : null}

      {/* ── error ────────────────────────────────────────────────────────── */}
      {!loading && error && uaeCities.length === 0 ? (
        <div style={{ ...panelStyle, padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "#f87171", marginBottom: 16, fontSize: 14 }}>{L.error}: {error}</div>
          {typeof onRetry === "function" ? (
            <button
              type="button"
              onClick={onRetry}
              style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#f1f5f9", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {L.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ── no UAE data ──────────────────────────────────────────────────── */}
      {!loading && !error && uaeCities.length === 0 ? (
        <div style={{ ...panelStyle, padding: "32px 20px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌤️</div>
          <div>{L.noData}</div>
        </div>
      ) : null}

      {/* ── main layout ──────────────────────────────────────────────────── */}
      {uaeCities.length > 0 ? (
        <>
          <AlertBar alerts={alerts} language={language} uaeCityNames={uaeCityNames} />

          <UAEWeatherMap
            cities={mapCities}
            selectedId={selectedCity?.id || ""}
            onSelect={setSelectedId}
            language={language}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {uaeCities.map((city) => (
              <CityCard
                key={city.id}
                city={city}
                language={language}
                isSelected={city.id === selectedCity?.id}
                onSelect={() => setSelectedId(city.id)}
              />
            ))}
          </div>

          {selectedCity ? <DetailPanel city={selectedCity} language={language} /> : null}
        </>
      ) : null}
    </div>
  );
}
