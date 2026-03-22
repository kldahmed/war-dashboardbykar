import React, { useState } from "react";

// ── helpers ────────────────────────────────────────────────────────────────
function fmt1(n) { return typeof n === "number" ? n.toFixed(1) : "–"; }
function fmt0(n) { return typeof n === "number" ? Math.round(n) : "–"; }

function uvLabel(uv, isAr) {
  if (typeof uv !== "number") return "";
  if (uv <= 2)  return isAr ? "منخفض"   : "Low";
  if (uv <= 5)  return isAr ? "متوسط"   : "Moderate";
  if (uv <= 7)  return isAr ? "مرتفع"   : "High";
  if (uv <= 10) return isAr ? "مرتفع جداً" : "Very High";
  return isAr ? "شديد"     : "Extreme";
}

function uvClass(uv) {
  if (typeof uv !== "number") return "";
  if (uv <= 2)  return "uv-low";
  if (uv <= 5)  return "uv-moderate";
  if (uv <= 7)  return "uv-high";
  if (uv <= 10) return "uv-very-high";
  return "uv-extreme";
}

function tempClass(temp) {
  if (typeof temp !== "number") return "";
  if (temp >= 46)  return "temp-extreme-hot";
  if (temp >= 38)  return "temp-hot";
  if (temp >= 28)  return "temp-warm";
  if (temp >= 15)  return "temp-mild";
  if (temp >= 0)   return "temp-cool";
  if (temp >= -10) return "temp-cold";
  return "temp-extreme-cold";
}

function alertClass(severity) {
  if (severity === "extreme") return "wx-alert--extreme";
  if (severity === "alert")   return "wx-alert--alert";
  return "wx-alert--watch";
}

function formatShortDate(dateStr, language) {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const locale = language === "ar" ? "ar-SA" : "en-GB";
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  } catch { return dateStr; }
}

// ── sub-components ─────────────────────────────────────────────────────────
function CityCard({ city, language, isSelected, onSelect }) {
  const isAr = language === "ar";
  const cur  = city.current || {};

  return (
    <button
      type="button"
      className={`wx-city-card${isSelected ? " wx-city-card--active" : ""} ${tempClass(cur.temperature_2m)}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="wx-city-card__header">
        <span className="wx-city-card__flag">{city.flag}</span>
        <span className="wx-city-card__name">{isAr ? city.nameAr : city.nameEn}</span>
      </div>
      <div className="wx-city-card__icon">{cur.icon || "🌡️"}</div>
      <div className="wx-city-card__temp">{fmt1(cur.temperature_2m)}°</div>
      <div className="wx-city-card__desc">{isAr ? cur.descAr : cur.descEn}</div>
    </button>
  );
}

function CurrentDetail({ city, language }) {
  const isAr = language === "ar";
  const cur  = city.current || {};
  const L    = {
    feelsLike:  isAr ? "يشعر كأنه"    : "Feels like",
    humidity:   isAr ? "الرطوبة"       : "Humidity",
    wind:       isAr ? "الرياح"        : "Wind",
    precip:     isAr ? "الهطول"        : "Precip.",
    uv:         isAr ? "مؤشر الأشعة"   : "UV Index",
    forecast:   isAr ? "توقعات 7 أيام" : "7-Day Forecast",
    dir:        isAr ? "اتجاه"         : "Dir",
    source:     isAr ? "المصدر: Open-Meteo — بيانات WMO الرسمية" : "Source: Open-Meteo — Official WMO data",
  };

  return (
    <div className="wx-detail">
      <div className="wx-detail__hero">
        <div className="wx-detail__icon">{cur.icon || "🌡️"}</div>
        <div className="wx-detail__temps">
          <span className={`wx-detail__temp ${tempClass(cur.temperature_2m)}`}>{fmt1(cur.temperature_2m)}°C</span>
          <span className="wx-detail__feels">{L.feelsLike}: {fmt1(cur.apparent_temperature)}°C</span>
        </div>
        <div className="wx-detail__city">
          {city.flag} {isAr ? city.nameAr : city.nameEn}
          <span className="wx-detail__desc">{isAr ? cur.descAr : cur.descEn}</span>
        </div>
      </div>

      <div className="wx-detail__stats">
        <div className="wx-stat">
          <span className="wx-stat__label">{L.humidity}</span>
          <span className="wx-stat__value">{fmt0(cur.relative_humidity_2m)}%</span>
        </div>
        <div className="wx-stat">
          <span className="wx-stat__label">{L.wind}</span>
          <span className="wx-stat__value">{fmt0(cur.wind_speed_10m)} km/h</span>
          <span className="wx-stat__sub">{cur.windDirLabel || ""}</span>
        </div>
        <div className="wx-stat">
          <span className="wx-stat__label">{L.precip}</span>
          <span className="wx-stat__value">{fmt1(cur.precipitation)} mm</span>
        </div>
        <div className="wx-stat">
          <span className="wx-stat__label">{L.uv}</span>
          <span className={`wx-stat__value ${uvClass(cur.uv_index)}`}>{fmt1(cur.uv_index)}</span>
          <span className="wx-stat__sub">{uvLabel(cur.uv_index, isAr)}</span>
        </div>
      </div>

      <div className="wx-forecast">
        <div className="wx-forecast__title">{L.forecast}</div>
        <div className="wx-forecast__row">
          {(city.forecast || []).map((day) => (
            <div key={day.date} className="wx-forecast__day">
              <div className="wx-forecast__day-name">{formatShortDate(day.date, language)}</div>
              <div className="wx-forecast__day-icon">{day.icon || "🌡️"}</div>
              <div className="wx-forecast__day-temps">
                <span className={`fx-hi ${tempClass(day.tempMax)}`}>{fmt0(day.tempMax)}°</span>
                <span className="fx-lo">{fmt0(day.tempMin)}°</span>
              </div>
              {day.precipProb > 20 ? (
                <div className="wx-forecast__day-rain">💧{day.precipProb}%</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="wx-detail__source">{L.source}</div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export default function WeatherPanel({ cities = [], alerts = [], loading = false, error = "", language = "en", fetchedAt = "" }) {
  const isAr = language === "ar";
  const [selectedId, setSelectedId] = useState(cities[0]?.id || null);

  const selected = cities.find((c) => c.id === selectedId) || cities[0] || null;

  const L = {
    title:     isAr ? "الطقس العالمي"           : "Global Weather",
    subtitle:  isAr ? "بيانات جوية دقيقة وفورية لأبرز العواصم والمدن ذات الثقل الاستراتيجي." : "Precise real-time weather data for key capitals and strategically significant cities.",
    alertsTitle: isAr ? "تنبيهات جوية"          : "Weather Alerts",
    loading:   isAr ? "يتم تحميل بيانات الطقس…" : "Loading weather data…",
    error:     isAr ? "تعذّر تحميل بيانات الطقس" : "Could not load weather data",
    updated:   isAr ? "آخر تحديث"               : "Last updated",
    noAlerts:  isAr ? "لا تنبيهات جوية حالياً"   : "No weather alerts at this time",
  };

  return (
    <div className="wx-panel">
      <div className="wx-panel__heading">
        <div>
          <div className="wx-panel__eyebrow">{L.title}</div>
          <p className="wx-panel__subtitle">{L.subtitle}</p>
        </div>
        {fetchedAt ? <div className="wx-panel__updated">{L.updated}: {new Date(fetchedAt).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</div> : null}
      </div>

      {/* ── weather alerts ── */}
      {alerts.length > 0 ? (
        <div className="wx-alerts-bar">
          <div className="wx-alerts-bar__label">⚠️ {L.alertsTitle}</div>
          <div className="wx-alerts-bar__list">
            {alerts.map((a, i) => (
              <div key={i} className={`wx-alert ${alertClass(a.severity)}`}>
                {a.flag} <strong>{isAr ? a.cityAr : a.cityEn}</strong> — {isAr ? a.msgAr : a.msgEn}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading && cities.length === 0 ? (
        <div className="wx-loading">{L.loading}</div>
      ) : null}

      {!loading && error && cities.length === 0 ? (
        <div className="wx-error">{L.error}: {error}</div>
      ) : null}

      {cities.length > 0 ? (
        <div className="wx-layout">
          {/* ── city selector grid ── */}
          <div className="wx-city-grid">
            {cities.map((city) => (
              <CityCard
                key={city.id}
                city={city}
                language={language}
                isSelected={city.id === (selected?.id)}
                onSelect={() => setSelectedId(city.id)}
              />
            ))}
          </div>

          {/* ── detail pane ── */}
          {selected ? (
            <CurrentDetail city={selected} language={language} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
