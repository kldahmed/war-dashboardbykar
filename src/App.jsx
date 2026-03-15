import React, { useEffect, useMemo, useState } from "react";

import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
/* =========================
   Constants
========================= */
const gold = "#c8960c";
const goldL = "#f0d27a";
const green = "#0fa958";

const TABS = [
  { id: "news", label: "الأخبار", icon: "📰" },
  { id: "videos", label: "الفيديوهات", icon: "🎥" },
  { id: "stats", label: "الإحصائيات", icon: "📊" },
  { id: "live", label: "البث المباشر", icon: "🔴" }
];

const CATEGORIES = [
  { id: "all", label: "الكل", emoji: "🌍" },
  { id: "regional", label: "إقليمي", emoji: "📍" },
  { id: "politics", label: "سياسة", emoji: "🏛️" },
  { id: "military", label: "عسكري", emoji: "🛡️" },
  { id: "economy", label: "اقتصاد", emoji: "💹" }
];

const CAT_COLORS = {
  all: { accent: "#c8960c", light: "#f0d27a" },
  regional: { accent: "#16a085", light: "#7fe3cf" },
  politics: { accent: "#8e44ad", light: "#d2a8ea" },
  military: { accent: "#c0392b", light: "#f0a39b" },
  economy: { accent: "#2980b9", light: "#9ccbed" }
};

const URGENCY_MAP = {
  high: { label: "عاجل", color: "#e74c3c" },
  medium: { label: "متوسط", color: "#f39c12" },
  low: { label: "منخفض", color: "#27ae60" }
};

const DEMO_NEWS = [
  {
    id: 1,
    title: "تحديثات إقليمية مستمرة في عدد من المناطق",
    summary: "هذه بيانات احتياطية تظهر عند تعذر الوصول إلى الخادم.",
    urgency: "medium",
    source: "Fallback Feed",
    time: new Date().toISOString(),
    category: "regional"
  },
  {
    id: 2,
    title: "تحليل سياسي للتطورات الأخيرة",
    summary: "يمكن استبدال هذا المحتوى بالبيانات الحقيقية من نقطة النهاية الخاصة بالأخبار.",
    urgency: "low",
    source: "Fallback Feed",
    time: new Date().toISOString(),
    category: "politics"
  }
];

const FALLBACK_LIVE_CHANNEL = {
  id: "fallback-live",
  name: "Live Channel",
  flag: "🌍",
  youtubeId: "",
  title: ""
};

/* =========================
   Helpers
========================= */
function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id || "").trim());
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getUserErrorMessage() {
  return "تعذر تحميل البيانات حاليًا. يرجى المحاولة مرة أخرى.";
}

function formatDubaiTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Dubai"
    }).format(date);
  } catch {
    return "--:--:--";
  }
}

function formatDisplayTime(dateValue) {
  try {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "وقت غير متوفر";
    return new Intl.DateTimeFormat("ar-AE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Dubai"
    }).format(d);
  } catch {
    return "وقت غير متوفر";
  }
}

function fmtCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function normalizeNewsItem(item, index = 0) {
  return {
    id: item?.id ?? `news-${index}`,
    title: safeText(item?.title, "بدون عنوان"),
    summary: safeText(item?.summary, "لا يوجد ملخص متاح."),
    urgency: ["high", "medium", "low"].includes(item?.urgency) ? item.urgency : "low",
    source: safeText(item?.source, "مصدر غير معروف"),
    time: item?.time || new Date().toISOString(),
    category: safeText(item?.category, "all")
  };
}

function normalizeVideoItem(item, index = 0) {
  return {
    id: item?.id ?? `video-${index}`,
    youtubeId: isValidYouTubeId(item?.youtubeId) ? item.youtubeId : "",
    title: safeText(item?.title, "فيديو بدون عنوان"),
    channel: safeText(item?.channel, "قناة غير معروفة")
  };
}

function normalizeLiveChannel(item, index = 0) {
  return {
    id: item?.id ?? `live-${index}`,
    name: safeText(item?.name, "Live Channel"),
    flag: safeText(item?.flag, "🌍"),
    title: safeText(item?.title, ""),
    mode: item?.mode === "external" ? "external" : "embed",
    externalUrl: safeText(item?.externalUrl, ""),
    youtubeId: isValidYouTubeId(item?.youtubeId) ? item.youtubeId : ""
  };
}

/* =========================
   Small UI Components
========================= */
function FalconSVG({ size = 32, color = gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M9 41c7-1 12-5 16-10 5-7 10-10 20-12-4 4-7 8-8 13 7-1 11-4 18-9-4 12-13 21-29 25-6 2-11 1-17-7z"
        fill={color}
      />
      <circle cx="39" cy="23" r="2.4" fill="#111" />
    </svg>
  );
}

function UAEBar() {
  return (
    <div style={{ display: "flex", height: "6px", width: "120px", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: "22%", background: "#c0392b" }} />
      <div style={{ flex: 1, background: "#00732f" }} />
      <div style={{ flex: 1, background: "#e9e9e9" }} />
      <div style={{ flex: 1, background: "#000" }} />
    </div>
  );
}

function AlertBanner({ alerts, onClose }) {
  if (!alerts.length) return null;

  return (
    <div style={{ padding: "10px 20px", background: "#120606", borderBottom: "1px solid #e74c3c30" }}>
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          {alerts.map((alert, i) => (
            <div
              key={`${alert}-${i}`}
              style={{
                color: "#ffb4ac",
                fontSize: "13px",
                background: "rgba(231,76,60,.06)",
                border: "1px solid rgba(231,76,60,.16)",
                borderRadius: "10px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span style={{ color: "#ff6b5f", fontWeight: "900" }}>⚠</span>
              <span>{safeText(alert, "تنبيه")}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={buttonStyle({
            color: "#ff8a80",
            borderColor: "#ff8a8030",
            background: "rgba(255,138,128,.07)"
          })}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            border: "1px solid rgba(255,255,255,.05)",
            background: "linear-gradient(90deg,#0b0b0b,#131313,#0b0b0b)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite linear",
            borderRadius: "14px",
            height: "100px"
          }}
        />
      ))}
    </div>
  );
}

function NewsCard({ item, index = 0 }) {
  const urgency = URGENCY_MAP[item.urgency] || URGENCY_MAP.low;

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "14px",
        boxShadow: index === 0 ? "0 0 0 1px rgba(200,150,12,.06)" : "none"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: urgency.color,
            boxShadow: item.urgency === "high" ? `0 0 12px ${urgency.color}` : "none"
          }}
        />
        <span style={{ color: urgency.color, fontSize: "12px", fontWeight: 800 }}>{urgency.label}</span>
        <span style={{ color: "#555", fontSize: "11px", marginRight: "auto" }}>{item.source}</span>
      </div>

      <div style={{ color: goldL, fontSize: "15px", fontWeight: 800, lineHeight: 1.5, marginBottom: "8px" }}>
        {item.title}
      </div>

      <div style={{ color: "#b8b8b8", fontSize: "13px", lineHeight: 1.8, marginBottom: "12px" }}>
        {item.summary}
      </div>

      <div style={{ color: "#666", fontSize: "11px" }}>{formatDisplayTime(item.time)}</div>
    </div>
  );
}

function VideoCard({ item }) {
  const safeId = isValidYouTubeId(item.youtubeId) ? item.youtubeId : "";
  const embedUrl = safeId ? `https://www.youtube-nocookie.com/embed/${safeId}` : "";

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        overflow: "hidden"
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ color: goldL, fontSize: "14px", fontWeight: 800, marginBottom: "6px" }}>{item.title}</div>
        <div style={{ color: "#777", fontSize: "12px" }}>{item.channel}</div>
      </div>

      <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
        {safeId ? (
          <iframe
            title={item.title}
            src={embedUrl}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "13px"
            }}
          >
            رابط الفيديو غير صالح
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelCard({ ch, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(ch)}
      style={{
        width: "100%",
        textAlign: "right",
        background: active ? "rgba(200,150,12,.14)" : "rgba(255,255,255,.02)",
        border: `1px solid ${active ? "rgba(200,150,12,.4)" : "rgba(255,255,255,.06)"}`,
        borderRadius: "12px",
        padding: "10px 12px",
        color: active ? goldL : "#ccc",
        cursor: "pointer"
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800 }}>
        {ch.flag} {ch.name}
      </div>
      <div style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>
        {ch.mode === "external" ? "يفتح على YouTube" : ch.title ? ch.title : "YouTube Live"}
      </div>
    </button>
  );
}
function cleanSourceName(source) {
  const s = safeText(source, "غير معروف").toLowerCase();

  const rules = [
    { test: /aawsat|الشرق الأوسط/, value: "الشرق الأوسط" },
    { test: /alarabiya|العربية/, value: "العربية" },
    { test: /aljazeera|الجزيرة/, value: "الجزيرة" },
    { test: /skynewsarabia|سكاي نيوز عربية/, value: "سكاي نيوز عربية" },
    { test: /cnn|cnn arabic|سي ان ان/, value: "CNN Arabic" },
    { test: /reuters/, value: "Reuters" },
    { test: /france24|فرانس ?24/, value: "France 24" },
    { test: /bbc/, value: "BBC" },
    { test: /rt/, value: "RT Arabic" },
    { test: /akhbaralyawm|أخبار اليوم/, value: "أخبار اليوم" },
    { test: /youm7|اليوم السابع/, value: "اليوم السابع" },
    { test: /almasryalyoum|المصري اليوم/, value: "المصري اليوم" },
    { test: /dostor|الدستور/, value: "الدستور" },
    { test: /annahar|النهار/, value: "النهار" },
    { test: /sharq|الشرق/, value: "الشرق" }
  ];

  const match = rules.find((r) => r.test.test(s));
  return match ? match.value : safeText(source, "غير معروف");
}

function getUrgencyScore(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}
function getWarRiskLevel(news, tensionData) {
  const tension = tensionData[tensionData.length - 1]?.value ?? 0;

  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;

  const militaryKeywords =
    /هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|طائرة مسيرة|اشتباكات|استهداف|ضربة|ضربات|اعتراض|منظومة دفاع|drone|missile|strike|raid|attack|intercept/i;

  const militaryHits = news.reduce((acc, item) => {
    const hay = `${item.title} ${item.summary}`;
    return acc + (militaryKeywords.test(hay) ? 1 : 0);
  }, 0);

  const score = Math.min(
    100,
    Math.round(tension * 0.35 + high * 8 + medium * 4 + militaryHits * 5)
  );

  let label = "منخفض";
  let color = "#27ae60";

  if (score >= 75) {
    label = "حرج";
    color = "#e74c3c";
  } else if (score >= 50) {
    label = "مرتفع";
    color = "#f39c12";
  } else if (score >= 25) {
    label = "متوسط";
    color = "#f1c40f";
  }

  return { score, label, color };
}

function extractEventLocations(news) {
  const rules = [
    { name: "إيران", lat: 32.4279, lng: 53.688, test: /إيران|ايران|iran/i },
    { name: "إسرائيل", lat: 31.0461, lng: 34.8516, test: /إسرائيل|اسرائيل|israel/i },
    { name: "غزة", lat: 31.3547, lng: 34.3088, test: /غزة|gaza/i },
    { name: "لبنان", lat: 33.8547, lng: 35.8623, test: /لبنان|lebanon/i },
    { name: "سوريا", lat: 34.8021, lng: 38.9968, test: /سوريا|syria/i },
    { name: "العراق", lat: 33.2232, lng: 43.6793, test: /العراق|iraq/i },
    { name: "اليمن", lat: 15.5527, lng: 48.5164, test: /اليمن|yemen/i },
    { name: "الإمارات", lat: 23.4241, lng: 53.8478, test: /الإمارات|الامارات|uae|emirates/i },
    { name: "السعودية", lat: 23.8859, lng: 45.0792, test: /السعودية|saudi/i },
    { name: "قطر", lat: 25.3548, lng: 51.1839, test: /قطر|qatar/i },
    { name: "مضيق هرمز", lat: 26.5667, lng: 56.25, test: /مضيق هرمز|هرمز|strait of hormuz/i }
  ];

  const points = [];

  news.forEach((item) => {
    const hay = `${item.title} ${item.summary}`;
    rules.forEach((rule) => {
      if (rule.test.test(hay)) {
        points.push({
          name: rule.name,
          lat: rule.lat,
          lng: rule.lng,
          title: item.title,
          urgency: item.urgency
        });
      }
    });
  });

  const unique = [];
  const seen = new Set();

  points.forEach((p) => {
    const key = `${p.name}-${p.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  });

  return unique.slice(0, 20);
}

function WarRiskCard({ news, tensionData }) {
  const risk = getWarRiskLevel(news, tensionData);

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
        مؤشر خطر الحرب
      </div>

      <div style={{ display: "flex", alignItems: "end", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ color: risk.color, fontSize: "34px", fontWeight: 900 }}>{risk.score}%</div>
        <div style={{ color: risk.color, fontSize: "16px", fontWeight: 800 }}>{risk.label}</div>
      </div>

      <div
        style={{
          height: "12px",
          background: "#121212",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.05)"
        }}
      >
        <div
          style={{
            width: `${risk.score}%`,
            height: "100%",
            background:
              risk.score >= 75
                ? "#e74c3c"
                : risk.score >= 50
                ? "#f39c12"
                : risk.score >= 25
                ? "#f1c40f"
                : "#27ae60",
            transition: "width .3s ease"
          }}
        />
      </div>

      <div style={{ color: "#888", fontSize: "12px", marginTop: "10px", lineHeight: 1.8 }}>
        يعتمد على عدد الأخبار العاجلة، الكلمات العسكرية، ومؤشر التوتر العام.
      </div>
    </div>
  );
}function ConflictMiniMap({ news }) {
  const points = extractEventLocations(news);
  const defaultCenter = [29.5, 47.5];

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
        خريطة الأحداث التفاعلية
      </div>

      <div
        style={{
          height: "420px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.05)"
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={5}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.length > 0 ? (
            points.map((p, i) => {
              const color =
                p.urgency === "high"
                  ? "#e74c3c"
                  : p.urgency === "medium"
                  ? "#f39c12"
                  : "#27ae60";

              return (
                <CircleMarker
                  key={`${p.name}-${i}`}
                  center={[p.lat, p.lng]}
                  radius={8}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div dir="rtl" style={{ minWidth: "180px", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: "800", marginBottom: "6px" }}>{p.name}</div>
                      <div style={{ fontSize: "13px", marginBottom: "6px" }}>{p.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        مستوى الأهمية:{" "}
                        {p.urgency === "high"
                          ? "عاجل"
                          : p.urgency === "medium"
                          ? "متوسط"
                          : "منخفض"}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          ) : (
            <Marker position={defaultCenter}>
              <Popup>
                <div dir="rtl">لا توجد نقاط جغرافية كافية حاليًا</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
function StatsPanel({ news, tensionData }) {
  const now = Date.now();

  const last6hItems = news.filter((n) => {
    const t = new Date(n.time).getTime();
    return Number.isFinite(t) && now - t < 6 * 60 * 60 * 1000;
  });

  const todayItems = news.filter((n) => {
    const t = new Date(n.time).getTime();
    return Number.isFinite(t) && now - t < 24 * 60 * 60 * 1000;
  });

  const last6h = last6hItems.length;
  const today = todayItems.length;

  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;
  const low = news.filter((n) => n.urgency === "low").length;

  const tension = tensionData[tensionData.length - 1]?.value ?? 0;

  const sources = {};
  news.forEach((n) => {
    const src = cleanSourceName(n?.source);
    sources[src] = (sources[src] || 0) + 1;
  });

  const topSource =
    Object.entries(sources).sort((a, b) => b[1] - a[1])[0]?.[0] || "غير معروف";

  const categories = {};
  news.forEach((n) => {
    const c = n?.category || "all";
    categories[c] = (categories[c] || 0) + 1;
  });

  const topCategory =
    Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "all";

  const categoryLabelMap = {
    all: "الكل",
    regional: "إقليمي",
    politics: "سياسة",
    military: "عسكري",
    economy: "اقتصاد"
  };

  const regionPatterns = [
    { label: "إيران", re: /إيران|ايران|iran/i },
    { label: "إسرائيل", re: /إسرائيل|اسرائيل|israel/i },
    { label: "غزة", re: /غزة|gaza/i },
    { label: "لبنان", re: /لبنان|lebanon/i },
    { label: "سوريا", re: /سوريا|syria/i },
    { label: "العراق", re: /العراق|iraq/i },
    { label: "اليمن", re: /اليمن|yemen/i },
    { label: "الإمارات", re: /الإمارات|الامارات|uae|emirates/i },
    { label: "السعودية", re: /السعودية|saudi/i },
    { label: "قطر", re: /قطر|qatar/i }
  ];

  const regionCounts = {};
  news.forEach((item) => {
    const hay = `${item.title} ${item.summary}`;
    regionPatterns.forEach((r) => {
      if (r.re.test(hay)) {
        regionCounts[r.label] = (regionCounts[r.label] || 0) + 1;
      }
    });
  });

  const topRegion =
    Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "غير واضح";

  const militaryKeywords =
    /هجوم|قصف|غارة|صاروخ|صواريخ|مسيرة|طائرة مسيرة|اشتباكات|استهداف|ضربة|ضربات|اعتراض|منظومة دفاع|drone|missile|strike|raid|attack|intercept/i;

  const militaryEscalation = Math.min(
    100,
    news.reduce((acc, item) => {
      const hay = `${item.title} ${item.summary}`;
      return acc + (militaryKeywords.test(hay) ? 18 : 0);
    }, 0)
  );

  const newsVelocity = Number((last6h / 6).toFixed(1));

  const avgUrgency = news.length
    ? (news.reduce((acc, item) => acc + getUrgencyScore(item.urgency), 0) / news.length).toFixed(1)
    : "0.0";

  const newestTime = news[0]?.time ? formatDisplayTime(news[0].time) : "غير متوفر";

  const cards = [
    { label: "سرعة الأخبار/ساعة", value: newsVelocity, accent: "#00c2ff" },
    { label: "أخبار آخر 6 ساعات", value: last6h, accent: "#e67e22" },
    { label: "أخبار اليوم", value: today, accent: "#c8960c" },
    { label: "عاجل", value: high, accent: "#e74c3c" },
    { label: "متوسط", value: medium, accent: "#f39c12" },
    { label: "منخفض", value: low, accent: "#27ae60" },
    { label: "مؤشر التوتر", value: `${tension}%`, accent: "#3498db" },
    { label: "التصعيد العسكري", value: `${militaryEscalation}%`, accent: "#ff5e57" },
    { label: "أكثر منطقة ذكرًا", value: topRegion, accent: "#1abc9c" },
    { label: "أكثر مصدر نشرًا", value: topSource, accent: "#9b59b6" },
    { label: "أكثر تصنيف", value: categoryLabelMap[topCategory] || topCategory, accent: "#16a085" },
    { label: "متوسط الشدة", value: avgUrgency, accent: "#f7dc6f" }
  ];

  const maxBar = Math.max(high, medium, low, 1);

  const topSources = Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "12px"
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "linear-gradient(180deg,#0a0906,#080808)",
              border: "1px solid rgba(255,255,255,.06)",
              borderRadius: "16px",
              padding: "16px"
            }}
          >
            <div style={{ color: "#777", fontSize: "12px", marginBottom: "8px" }}>
              {card.label}
            </div>
            <div
              style={{
                color: card.accent,
                fontSize:
                  typeof card.value === "string" && String(card.value).length > 18 ? "18px" : "26px",
                fontWeight: 900,
                lineHeight: 1.4,
                wordBreak: "break-word"
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "16px"
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg,#0a0906,#080808)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: "16px",
            padding: "16px"
          }}
        >
          <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
            توزيع شدة الأخبار
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "عاجل", value: high, color: "#e74c3c" },
              { label: "متوسط", value: medium, color: "#f39c12" },
              { label: "منخفض", value: low, color: "#27ae60" }
            ].map((row) => (
              <div key={row.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px"
                  }}
                >
                  <span style={{ color: row.color, fontSize: "12px", fontWeight: "700" }}>
                    {row.label}
                  </span>
                  <span style={{ color: "#888", fontSize: "12px" }}>{row.value}</span>
                </div>

                <div
                  style={{
                    height: "10px",
                    background: "#121212",
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.04)"
                  }}
                >
                  <div
                    style={{
                      width: `${(row.value / maxBar) * 100}%`,
                      height: "100%",
                      background: row.color,
                      borderRadius: "999px",
                      transition: "width .3s ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(180deg,#0a0906,#080808)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: "16px",
            padding: "16px"
          }}
        >
          <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
            المصادر الأكثر نشاطًا
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {topSources.length > 0 ? (
              topSources.map(([name, count]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    borderBottom: "1px solid rgba(255,255,255,.05)",
                    paddingBottom: "8px"
                  }}
                >
                  <span style={{ color: "#ddd", fontSize: "13px" }}>{name}</span>
                  <span style={{ color: goldL, fontSize: "13px", fontWeight: "700" }}>{count}</span>
                </div>
              ))
            ) : (
              <div style={{ color: "#777", fontSize: "13px" }}>لا توجد بيانات كافية</div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(180deg,#0a0906,#080808)",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: "16px",
          padding: "16px"
        }}
      >
        <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "12px" }}>
          ملخص استخباري سريع
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "10px"
          }}
        >
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            سرعة التدفق الحالية: <span style={{ color: "#fff" }}>{newsVelocity} خبر/ساعة</span>
          </div>
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            أعلى نشاط جغرافي: <span style={{ color: "#fff" }}>{topRegion}</span>
          </div>
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            أكثر مصدر نشاطًا: <span style={{ color: "#fff" }}>{topSource}</span>
          </div>
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            مستوى التصعيد العسكري: <span style={{ color: "#fff" }}>{militaryEscalation}%</span>
          </div>
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            متوسط الشدة: <span style={{ color: "#fff" }}>{avgUrgency}</span>
          </div>
          <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
            آخر تحديث مرصود: <span style={{ color: "#fff" }}>{newestTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function TensionHeatmap({ news }) {
  const regions = [
    { key: "إيران", test: /إيران|ايران|iran/i },
    { key: "إسرائيل", test: /إسرائيل|اسرائيل|israel/i },
    { key: "غزة", test: /غزة|gaza/i },
    { key: "لبنان", test: /لبنان|lebanon/i },
    { key: "سوريا", test: /سوريا|syria/i },
    { key: "العراق", test: /العراق|iraq/i },
    { key: "اليمن", test: /اليمن|yemen/i },
    { key: "مضيق هرمز", test: /مضيق هرمز|هرمز|strait of hormuz/i }
  ];

  const scores = regions.map((region) => {
    let score = 0;

    news.forEach((item) => {
      const hay = `${item.title} ${item.summary}`;
      if (region.test.test(hay)) {
        if (item.urgency === "high") score += 3;
        else if (item.urgency === "medium") score += 2;
        else score += 1;
      }
    });

    return {
      name: region.key,
      score,
      color:
        score >= 8 ? "#e74c3c" :
        score >= 5 ? "#f39c12" :
        score >= 2 ? "#f1c40f" :
        "#27ae60"
    };
  });

  const maxScore = Math.max(...scores.map((s) => s.score), 1);

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
        خريطة حرارة التوتر
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        {scores.map((row) => (
          <div key={row.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
                alignItems: "center"
              }}
            >
              <span style={{ color: "#ddd", fontSize: "13px" }}>{row.name}</span>
              <span style={{ color: row.color, fontSize: "12px", fontWeight: "700" }}>
                {row.score}
              </span>
            </div>

            <div
              style={{
                height: "12px",
                background: "#121212",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,.04)"
              }}
            >
              <div
                style={{
                  width: `${(row.score / maxScore) * 100}%`,
                  height: "100%",
                  background: row.color,
                  borderRadius: "999px",
                  transition: "width .3s ease"
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelinePanel({ news }) {
  const sorted = [...news]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
        التسلسل الزمني للأحداث
      </div>

      <div style={{ display: "grid", gap: "14px" }}>
        {sorted.map((item, i) => {
          const urgency = URGENCY_MAP[item.urgency] || URGENCY_MAP.low;

          return (
            <div
              key={`${item.id}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                gap: "10px",
                alignItems: "start"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: urgency.color,
                    marginTop: "4px",
                    boxShadow: `0 0 10px ${urgency.color}`
                  }}
                />
                <div
                  style={{
                    width: "2px",
                    flex: 1,
                    background: "rgba(255,255,255,.08)",
                    marginTop: "4px"
                  }}
                />
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,.05)",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "rgba(255,255,255,.015)"
                }}
              >
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px", alignItems: "center" }}>
                  <span style={{ color: urgency.color, fontSize: "12px", fontWeight: "800" }}>
                    {urgency.label}
                  </span>
                  <span style={{ color: "#666", fontSize: "11px" }}>
                    {formatDisplayTime(item.time)}
                  </span>
                  <span style={{ color: "#555", fontSize: "11px", marginRight: "auto" }}>
                    {item.source}
                  </span>
                </div>

                <div style={{ color: goldL, fontWeight: "800", lineHeight: 1.6, marginBottom: "6px" }}>
                  {item.title}
                </div>

                <div style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.7 }}>
                  {item.summary}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AISummaryPanel({ news }) {
  const high = news.filter((n) => n.urgency === "high").length;
  const medium = news.filter((n) => n.urgency === "medium").length;

  const combinedText = news.map((n) => `${n.title} ${n.summary}`).join(" ");

  const mentions = {
    iran: /إيران|ايران|iran/i.test(combinedText),
    israel: /إسرائيل|اسرائيل|israel/i.test(combinedText),
    hormuz: /مضيق هرمز|هرمز|strait of hormuz/i.test(combinedText),
    drones: /مسيرة|طائرة مسيرة|drone|uav/i.test(combinedText),
    missiles: /صاروخ|صواريخ|missile/i.test(combinedText),
    shipping: /ملاحة|سفن|ناقلات|شحن|shipping|tankers|maritime/i.test(combinedText)
  };

  let assessment = "المشهد العام منخفض التصعيد.";
  if (high >= 8) assessment = "المشهد العام شديد الحساسية والتصعيد مرتفع جدًا.";
  else if (high >= 4 || medium >= 6) assessment = "المشهد العام متوتر مع تسارع واضح في التدفق الإخباري.";

  const bullets = [
    mentions.iran && mentions.israel ? "التركيز الرئيسي يدور حول إيران وإسرائيل." : null,
    mentions.hormuz ? "هناك حضور واضح لمضيق هرمز ضمن الأخبار الحالية." : null,
    mentions.drones ? "رُصد تكرار لملف الطائرات المسيّرة." : null,
    mentions.missiles ? "الأخبار تشير إلى تكرار ملف الصواريخ والضربات." : null,
    mentions.shipping ? "يوجد أثر محتمل على الملاحة أو الشحن الإقليمي." : null
  ].filter(Boolean);

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#0a0906,#080808)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: "16px",
        padding: "16px"
      }}
    >
      <div style={{ color: goldL, fontWeight: 800, fontSize: "14px", marginBottom: "14px" }}>
        الملخص الذكي
      </div>

      <div style={{ color: "#ddd", fontSize: "14px", lineHeight: 1.9, marginBottom: "12px" }}>
        {assessment}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {bullets.length > 0 ? (
          bullets.map((item, i) => (
            <div
              key={i}
              style={{
                color: "#aaa",
                fontSize: "13px",
                lineHeight: 1.8,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,.05)",
                borderRadius: "10px",
                background: "rgba(255,255,255,.015)"
              }}
            >
              • {item}
            </div>
          ))
        ) : (
          <div style={{ color: "#777", fontSize: "13px" }}>
            لا توجد أنماط كافية لاستخراج ملخص أعمق حاليًا.
          </div>
        )}
      </div>
    </div>
  );
}
/* =========================
   Styling Helper
========================= */
function buttonStyle({
  color = gold,
  borderColor = `${gold}44`,
  background = "rgba(200,150,12,.1)"
} = {}) {
  return {
    background,
    border: `1px solid ${borderColor}`,
    color,
    borderRadius: "9px",
    padding: "8px 15px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    fontFamily: "inherit",
    transition: "all .2s",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  };
}

/* =========================
   Main App
========================= */
export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("news");
  const [cat, setCat] = useState("all");

  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [updated, setUpdated] = useState("");

  const [loadN, setLoadN] = useState(false);
  const [loadV, setLoadV] = useState(false);
  const [loadL, setLoadL] = useState(false);

  const [errN, setErrN] = useState("");
  const [errV, setErrV] = useState("");
  const [errL, setErrL] = useState("");

  const [liveChannels, setLiveChannels] = useState([]);
  const [clockTime, setClockTime] = useState(formatDubaiTime());
  const [nextRefresh, setNextRefresh] = useState(60 * 1000);
  const [liveCh, setLiveCh] = useState(FALLBACK_LIVE_CHANNEL);

  const showCats = tab === "news" || tab === "videos";

  const tensionData = useMemo(() => {
    const source = news.length ? news : DEMO_NEWS;

    const value = Math.min(
      100,
      source.reduce((acc, item) => {
        if (item.urgency === "high") return acc + 28;
        if (item.urgency === "medium") return acc + 14;
        return acc + 6;
      }, 0)
    );

    return [{ label: "now", value }];
  }, [news]);

  const ticker = useMemo(() => {
    const source = news.length ? news : DEMO_NEWS;
    return source.map((n) => n.title).slice(0, 5).join("   •   ");
  }, [news]);
async function fetchNews(category = "all", force = false) {
  try {
    setLoadN(true);
    setErrN("");

    const url = `/api/news?category=${encodeURIComponent(category)}${force ? "&force=1" : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error("NEWS_API_FAILED");
    }

    const data = await res.json();
    const safeNewsData = safeArray(data?.news).map(normalizeNewsItem);

    setNews(safeNewsData);
    setUpdated(safeText(data?.updated, formatDisplayTime(new Date())));
  } catch {
    setErrN(getUserErrorMessage());
    setNews([]);
    setAlerts((prev) =>
      prev.includes("تعذر تحميل الأخبار من الخادم")
        ? prev
        : [...prev, "تعذر تحميل الأخبار من الخادم"]
    );
  } finally {
    setLoadN(false);
  }
}

  async function fetchVideos(category = "all", force = false) {
    try {
      setLoadV(true);
      setErrV("");

      const url = `/api/videos?category=${encodeURIComponent(category)}${force ? "&force=1" : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) {
        throw new Error("VIDEOS_API_FAILED");
      }

      const data = await res.json();
      const safeVideosData = safeArray(data?.videos).map(normalizeVideoItem);

      setVideos(safeVideosData.filter((v) => v.youtubeId));
    } catch {
      setErrV(getUserErrorMessage());
      setVideos([]);
      setAlerts((prev) =>
        prev.includes("تعذر تحميل الفيديوهات من الخادم")
          ? prev
          : [...prev, "تعذر تحميل الفيديوهات من الخادم"]
      );
    } finally {
      setLoadV(false);
    }
  }

  async function fetchLiveChannels() {
  try {
    setLoadL(true);
    setErrL("");

    let data = null;

    const primaryRes = await fetch("/api/live", {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (primaryRes.ok) {
      data = await primaryRes.json();
    } else {
      const backupRes = await fetch("/api/livebackup", {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!backupRes.ok) {
        throw new Error("LIVE_AND_BACKUP_FAILED");
      }

      data = await backupRes.json();
    }

    const channels = safeArray(data?.channels)
      .map(normalizeLiveChannel)
   .filter((ch) => ch.youtubeId || ch.externalUrl);

    setLiveChannels(channels);

    if (channels.length > 0) {
      setLiveCh((prev) => {
        const existing = channels.find((ch) => ch.id === prev?.id);
        return existing || channels[0];
      });
    } else {
      setLiveCh(FALLBACK_LIVE_CHANNEL);
      setErrL("لا توجد قنوات مباشرة متاحة الآن");
    }
  } catch {
    setErrL("تعذر تحميل البث المباشر");
    setLiveChannels([]);
    setLiveCh(FALLBACK_LIVE_CHANNEL);
  } finally {
    setLoadL(false);
  }
}
  function changeCat(categoryId) {
    setCat(categoryId);
  }

  function refresh() {
  void fetchNews(cat, true);
  void fetchVideos(cat, true);
  void fetchLiveChannels();
  setNextRefresh(60 * 1000);
}

  useEffect(() => {
    void fetchNews(cat);
    void fetchVideos(cat);
  }, [cat]);

  useEffect(() => {
    void fetchLiveChannels();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setClockTime(formatDubaiTime());
      setNextRefresh((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (nextRefresh === 0) {
      refresh();
    }
  }, [nextRefresh]);

  const safeNewsList = news.length ? news : [];
  const safeVideosList = videos.length ? videos : [];
  const safeLiveChannels = liveChannels.length ? liveChannels : [];

  const currentLiveId =
  liveCh?.mode === "embed" && isValidYouTubeId(liveCh?.youtubeId)
    ? liveCh.youtubeId
    : "";

const currentWatchUrl =
  liveCh?.mode === "external" && liveCh?.externalUrl
    ? liveCh.externalUrl
    : currentLiveId
      ? `https://www.youtube.com/watch?v=${currentLiveId}`
      : "#";

const currentEmbedUrl = currentLiveId
  ? `https://www.youtube-nocookie.com/embed/${currentLiveId}?autoplay=1&rel=0&modestbranding=1`
  : "";

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#040404,#090804)",
        color: "#eee",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; background: #050505; }
        a { color: inherit; }
        .news-grid, .vid-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: .75; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glow {
          0% { text-shadow: 0 0 0 rgba(240,210,122,0); }
          50% { text-shadow: 0 0 10px rgba(240,210,122,.22); }
          100% { text-shadow: 0 0 0 rgba(240,210,122,0); }
        }
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 900px) {
          .live-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <AlertBanner alerts={alerts} onClose={() => setAlerts([])} />

      <div style={{ height: "4px", display: "flex" }}>
        <div style={{ width: "22%", background: "#c0392b" }} />
        <div style={{ flex: 1, background: "#00732f" }} />
        <div style={{ flex: 1, background: "#ffffff15" }} />
        <div style={{ flex: 1, background: "#000" }} />
      </div>

      <div
        style={{
          background: "linear-gradient(180deg,#0c0900,#060606)",
          borderBottom: `1px solid ${gold}2a`,
          padding: "14px 20px 0"
        }}
      >
        <div
          className="hdr"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ animation: "float 3.5s ease-in-out infinite" }}>
              <FalconSVG size={44} color={gold} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "19px",
                    fontWeight: "900",
                    color: goldL,
                    animation: "glow 3s infinite",
                    letterSpacing: "2px"
                  }}
                >
                  WAR UPDATE
                </span>
                <span style={{ color: "#444", fontSize: "12px" }}>by</span>
                <span style={{ color: gold, fontSize: "17px", fontWeight: "900", letterSpacing: "4px" }}>
                  K.A.R
                </span>
                <span style={{ fontSize: "13px" }}>🇦🇪</span>
              </div>

              <div style={{ marginTop: "5px", marginBottom: "4px" }}>
                <UAEBar />
              </div>

              <div style={{ color: "#252525", fontSize: "9px", letterSpacing: "2px" }}>
                MIDDLE EAST INTELLIGENCE DASHBOARD
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                background: "#0d0a01",
                border: `1px solid ${gold}25`,
                borderRadius: "8px",
                padding: "5px 11px",
                textAlign: "center",
                minWidth: "80px"
              }}
            >
              <div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBottom: "2px" }}>
                UAE TIME
              </div>
              <div style={{ color: gold, fontSize: "12px", fontFamily: "monospace", fontWeight: "700" }}>
                {clockTime}
              </div>
            </div>

            <div
              style={{
                background: "#0d0a01",
                border: `1px solid ${green}33`,
                borderRadius: "8px",
                padding: "5px 11px",
                textAlign: "center",
                minWidth: "80px"
              }}
            >
              <div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBottom: "2px" }}>
                REFRESH IN
              </div>
              <div style={{ color: green, fontSize: "12px", fontFamily: "monospace", fontWeight: "700" }}>
                {fmtCountdown(nextRefresh)}
              </div>
            </div>

            <button onClick={refresh} disabled={loadN || loadV || loadL} style={buttonStyle()}>
              <span style={{ display: "inline-block", animation: loadN || loadV || loadL ? "spin 1s linear infinite" : "none" }}>
                ⟳
              </span>
              {loadN || loadV || loadL ? "..." : "تحديث"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: active ? "rgba(200,150,12,.16)" : "transparent",
                  border: `1px solid ${active ? `${gold}77` : "rgba(255,255,255,.05)"}`,
                  color: active ? goldL : "#666",
                  borderRadius: "8px 8px 0 0",
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: active ? "700" : "400",
                  fontFamily: "inherit",
                  transition: "all .2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {showCats && (
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", padding: "8px 0 0" }}>
            {CATEGORIES.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => changeCat(c.id)}
                  style={{
                    background: active ? `${CAT_COLORS[c.id].accent}25` : "rgba(255,255,255,.025)",
                    border: `1px solid ${active ? `${CAT_COLORS[c.id].accent}77` : "rgba(255,255,255,.06)"}`,
                    color: active ? CAT_COLORS[c.id].light : "#666",
                    borderRadius: "6px",
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: active ? "700" : "400",
                    fontFamily: "inherit",
                    transition: "all .2s"
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: "#070500", borderBottom: `1px solid ${gold}15`, padding: "6px 0", overflow: "hidden" }}>
        <div style={{ whiteSpace: "nowrap", animation: "ticker 70s linear infinite", display: "inline-block" }}>
          <span style={{ color: gold, fontSize: "11.5px", padding: "0 40px", letterSpacing: ".3px" }}>
            {ticker || "لا توجد تحديثات حالية"}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {ticker || "لا توجد تحديثات حالية"}
          </span>
        </div>
      </div>

      <div style={{ padding: "18px 20px 50px" }}>
        {tab === "news" && (
          <div>
            {loadN && <Skeleton />}

            {errN && !loadN && (
              <div
                style={{
                  background: "linear-gradient(135deg,#100500,#0a0a0a)",
                  border: "1px solid #e74c3c33",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "16px",
                  textAlign: "center"
                }}
              >
                <div style={{ color: "#e74c3c", fontSize: "14px", marginBottom: "8px" }}>⚠️ {errN}</div>
                <button onClick={() => fetchNews(cat, true)} style={buttonStyle()}>
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!loadN && safeNewsList.length > 0 && (
              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
                  {["high", "medium", "low"].map((u) => {
                    const n = safeNewsList.filter((x) => x.urgency === u).length;
                    if (!n) return null;

                    return (
                      <div
                        key={u}
                        style={{
                          background: `${URGENCY_MAP[u].color}16`,
                          border: `1px solid ${URGENCY_MAP[u].color}30`,
                          borderRadius: "8px",
                          padding: "4px 11px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: URGENCY_MAP[u].color,
                            animation: u === "high" ? "pulse 1s infinite" : "none"
                          }}
                        />
                        <span style={{ color: URGENCY_MAP[u].color, fontSize: "12px", fontWeight: "700" }}>
                          {n} {URGENCY_MAP[u].label}
                        </span>
                      </div>
                    );
                  })}

                  <span style={{ color: "#444", fontSize: "11px", marginRight: "auto" }}>
                    {safeNewsList.length} خبر {updated ? `— ${updated}` : ""}
                  </span>

                  <span style={{ color: "#1f7a4d", fontSize: "11px", fontWeight: "700" }}>
                    LIVE FEED
                  </span>
                </div>

                <div className="news-grid">
                  {safeNewsList.map((item, i) => (
                    <NewsCard key={`${item.id}-${i}`} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}

            {!loadN && !errN && safeNewsList.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#666",
                  padding: "40px",
                  border: "1px solid rgba(255,255,255,.05)",
                  borderRadius: "14px"
                }}
              >
                لا توجد أخبار متاحة حاليًا
              </div>
            )}
          </div>
        )}

        {tab === "videos" && (
          <div>
            {loadV && <Skeleton />}

            {errV && !loadV && (
              <div style={{ textAlign: "center", color: "#e74c3c", padding: "40px" }}>
                ⚠️ {errV}
                <br />
                <button onClick={() => fetchVideos(cat, true)} style={{ ...buttonStyle(), marginTop: "14px" }}>
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!loadV && safeVideosList.length > 0 && (
              <div className="vid-grid">
                {safeVideosList.map((v, i) => (
                  <VideoCard key={`${v.id}-${i}`} item={v} />
                ))}
              </div>
            )}

            {!loadV && !errV && safeVideosList.length === 0 && (
              <div style={{ textAlign: "center", color: "#666", padding: "60px" }}>
                اضغط تحديث لتحميل الفيديوهات
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <StatsPanel news={safeNewsList.length > 0 ? safeNewsList : DEMO_NEWS} tensionData={tensionData} />
        )}

        {tab === "live" && (
          <div className="live-grid" style={{ display: "grid", gridTemplateColumns: "1fr 285px", gap: "15px", alignItems: "start" }}>
            <div style={{ background: "#0a0800", borderRadius: "16px", overflow: "hidden", border: `1px solid ${gold}2a` }}>
              <div
                style={{
                  padding: "10px 14px",
                  background: "#0d0b00",
                  borderBottom: `1px solid ${gold}1a`,
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  flexWrap: "wrap"
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#e74c3c",
                    display: "inline-block",
                    animation: "pulse 1s infinite"
                  }}
                />
                <span style={{ color: "#e74c3c", fontWeight: "900", fontSize: "11px", letterSpacing: "2px" }}>
                  LIVE
                </span>

                <span style={{ color: "#555", fontSize: "12px" }}>
                  {liveCh?.flag} {liveCh?.name}
                </span>

                {currentLiveId && (
                  <a
                    href={currentWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginRight: "auto",
                      background: "#cc0000dd",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "5px 11px",
                      fontSize: "11px",
                      fontWeight: "700",
                      textDecoration: "none"
                    }}
                  >
                    ▶ YouTube
                  </a>
                )}
              </div>

              <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                {currentLiveId ? (
                  <iframe
                    key={liveCh?.id}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    src={currentEmbedUrl}
                    title={liveCh?.name || "Live stream"}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#777",
                      fontSize: "14px"
                    }}
                  >
                    رابط البث غير صالح
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "9px 14px",
                  background: "#080600",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px"
                }}
              >
                <span style={{ color: "#333", fontSize: "11px" }}>لا يعمل البث؟</span>

                {currentLiveId && (
                  <a
                    href={currentWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(204,0,0,.12)",
                      border: "1px solid rgba(204,0,0,.35)",
                      color: "#ff4444",
                      borderRadius: "6px",
                      padding: "5px 13px",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      textDecoration: "none"
                    }}
                  >
                    شاهد على YouTube
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <div
                style={{
                  color: `${gold}55`,
                  fontSize: "9px",
                  marginBottom: "4px",
                  fontWeight: "700",
                  letterSpacing: "2.5px"
                }}
              >
                LIVE CHANNELS
              </div>

              {loadL && <Skeleton />}

              {errL && !loadL && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#e74c3c",
                    padding: "18px",
                    border: "1px solid rgba(231,76,60,.2)",
                    borderRadius: "12px",
                    background: "rgba(231,76,60,.05)"
                  }}
                >
                  {errL}
                </div>
              )}

              {!loadL &&
                safeLiveChannels.map((ch) => (
                  <ChannelCard key={ch.id} ch={ch} active={liveCh?.id === ch.id} onSelect={setLiveCh} />
                ))}

              {!loadL && !errL && safeLiveChannels.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#666",
                    padding: "18px",
                    border: "1px solid rgba(255,255,255,.05)",
                    borderRadius: "12px"
                  }}
                >
                  لا توجد قنوات مباشرة متاحة الآن
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: `1px solid ${gold}15`,
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <FalconSVG size={16} color={`${gold}55`} />
          <span style={{ color: "#333", fontSize: "10px", letterSpacing: "1.5px" }}>WAR UPDATE BY K.A.R 🇦🇪</span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ color: "#2c2c2c", fontSize: "10px" }}>للأغراض الإخبارية فقط</span>
          <div style={{ display: "flex", height: "10px", width: "32px", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: "22%", background: "#c0392b" }} />
            <div style={{ flex: 1, background: "#00732f" }} />
            <div style={{ flex: 1, background: "#fff2" }} />
            <div style={{ flex: 1, background: "#111" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
