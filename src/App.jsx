/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef, memo } from "react";

// ✅ كل الطلبات تمر عبر /api/claude
const AUTO_REFRESH_MINUTES = 10;

const TABS = [
  { id: "news", label: "الاخبار", icon: "📰" },
  { id: "map", label: "الخريطة", icon: "🗺️" },
  { id: "stats", label: "احصائيات", icon: "📊" },
  { id: "videos", label: "فيديوهات", icon: "🎬" },
  { id: "x", label: "X / تويتر", icon: "✖️" },
  { id: "live", label: "بث مباشر", icon: "📡" },
];

const CATEGORIES = [
  { id: "all", label: "الكل", emoji: "🌐" },
  { id: "iran", label: "ايران", emoji: "🇮🇷" },
  { id: "gulf", label: "الخليج", emoji: "🇦🇪" },
  { id: "usa", label: "امريكا", emoji: "🇺🇸" },
  { id: "israel", label: "اسرائيل", emoji: "🇮🇱" },
];

const CAT_COLORS = {
  iran: { accent: "#c0392b", glow: "rgba(192,57,43,.4)", light: "#e74c3c", bg: "#140606" },
  gulf: { accent: "#00732f", glow: "rgba(0,115,47,.4)", light: "#00c44f", bg: "#031408" },
  usa: { accent: "#2471a3", glow: "rgba(36,113,163,.4)", light: "#3498db", bg: "#060c14" },
  israel: { accent: "#7d3c98", glow: "rgba(125,60,152,.4)", light: "#9b59b6", bg: "#0a0612" },
  all: { accent: "#c8960c", glow: "rgba(200,150,12,.4)", light: "#f0b429", bg: "#0d0b04" },
};

const URGENCY_MAP = {
  high: { label: "عاجل", color: "#e74c3c", pulse: true },
  medium: { label: "مهم", color: "#f39c12", pulse: false },
  low: { label: "متابعة", color: "#7f8c8d", pulse: false },
};

const CAT_UNSPLASH = {
  iran: [
    "photo-1597852074816-d57796d60ea6",
    "photo-1564419320461-6870880221ad",
    "photo-1576086213369-97a306d36557",
  ],
  gulf: [
    "photo-1512632578888-169bbbc64f33",
    "photo-1555448248-2571daf6344b",
    "photo-1512453979798-5ea266f8880c",
  ],
  usa: [
    "photo-1515187029135-18ee286d815b",
    "photo-1501594907352-04cda38ebc29",
    "photo-1473091534298-04dcbce3278c",
  ],
  israel: [
    "photo-1544967082-d9d25d867d66",
    "photo-1582555172866-f73bb12a2ab3",
    "photo-1570957392122-7768e3cfc3d6",
  ],
};

const LIVE_CHANNELS = [
  { id: "aljazeera_ar", name: "الجزيرة", flag: "🇶🇦", color: "#c8960c", desc: "قناة الجزيرة", youtubeId: "B0Bzmln-Z2Y" },
  { id: "alarabiya", name: "العربية", flag: "🇸🇦", color: "#1a6abf", desc: "قناة العربية", youtubeId: "oMoiMq9FnQs" },
  { id: "aljazeera_en", name: "Al Jazeera English", flag: "🌐", color: "#c8960c", desc: "Al Jazeera English", youtubeId: "h3MuIUNCCLI" },
  { id: "france24_ar", name: "فرانس 24", flag: "🇫🇷", color: "#c0392b", desc: "فرانس 24 عربي", youtubeId: "vLjFSJFaHRk" },
  { id: "bbc_arabic", name: "BBC عربي", flag: "🇬🇧", color: "#cc0000", desc: "بي بي سي عربي", youtubeId: "8qoLDMH8pnk" },
  { id: "sky_news_ar", name: "سكاي نيوز", flag: "🇦🇪", color: "#0066cc", desc: "سكاي نيوز عربية", youtubeId: "HHpTBCGQpgk" },
];

const X_ACCOUNTS = [
  { id: "AlArabiya", name: "العربية", flag: "🇸🇦", color: "#1a6abf", desc: "قناة العربية الاخبارية" },
  { id: "AJArabic", name: "الجزيرة", flag: "🇶🇦", color: "#c8960c", desc: "قناة الجزيرة" },
  { id: "AFP", name: "AFP", flag: "🌐", color: "#e74c3c", desc: "وكالة فرانس برس" },
  { id: "Reuters", name: "Reuters", flag: "🌐", color: "#f39c12", desc: "وكالة رويترز" },
  { id: "BBCArabic", name: "BBC عربي", flag: "🇬🇧", color: "#cc0000", desc: "بي بي سي عربي" },
  { id: "disclosetv", name: "Disclose TV", flag: "⚡", color: "#9b59b6", desc: "اخبار عاجلة" },
  { id: "BreakingNLive", name: "Breaking News Live", flag: "🔴", color: "#e74c3c", desc: "اخبار عاجلة مباشرة" },
  { id: "spectatorindex", name: "Spectator Index", flag: "📊", color: "#2ecc71", desc: "مؤشرات واحصائيات" },
];

const MAP_HOTSPOTS = [
  { id: "tehran", name: "طهران", x: 68, y: 32, intensity: 90, country: "iran", size: 22 },
  { id: "hormuz", name: "هرمز", x: 65, y: 52, intensity: 85, country: "iran", size: 18 },
  { id: "gaza", name: "غزة", x: 40, y: 42, intensity: 95, country: "israel", size: 20 },
  { id: "lebanon", name: "لبنان", x: 43, y: 35, intensity: 70, country: "israel", size: 15 },
  { id: "riyadh", name: "الرياض", x: 57, y: 55, intensity: 40, country: "gulf", size: 14 },
  { id: "dubai", name: "دبي", x: 66, y: 58, intensity: 30, country: "gulf", size: 13 },
  { id: "baghdad", name: "بغداد", x: 60, y: 38, intensity: 65, country: "iran", size: 16 },
  { id: "syria", name: "سوريا", x: 48, y: 30, intensity: 60, country: "israel", size: 15 },
  { id: "yemen", name: "اليمن", x: 55, y: 68, intensity: 75, country: "gulf", size: 16 },
  { id: "strait", name: "مضيق هرمز", x: 67, y: 56, intensity: 80, country: "iran", size: 14 },
];

const DEMO_NEWS = [
  {
    title: "مناورات عسكرية ايرانية في مضيق هرمز",
    summary: "اجرت ايران مناورات عسكرية واسعة النطاق في مضيق هرمز تضمنت محاكاة لاغلاق المضيق امام الملاحة الدولية.",
    category: "iran",
    urgency: "high",
    time: "منذ 2 ساعة",
  },
  {
    title: "القمة الخليجية تبحث التصعيد الاقليمي",
    summary: "انعقدت قمة طارئة لدول مجلس التعاون الخليجي لبحث التطورات الامنية المتصاعدة في المنطقة.",
    category: "gulf",
    urgency: "high",
    time: "منذ 3 ساعات",
  },
  {
    title: "الاسطول الامريكي يعزز وجوده في الخليج",
    summary: "ارسلت الولايات المتحدة تعزيزات بحرية اضافية الى منطقة الخليج العربي ردا على التوترات المتصاعدة.",
    category: "usa",
    urgency: "medium",
    time: "منذ 5 ساعات",
  },
  {
    title: "اسرائيل تكشف عن منظومة دفاعية جديدة",
    summary: "كشفت اسرائيل عن منظومة دفاعية متطورة مصممة لاعتراض الصواريخ الباليستية الايرانية.",
    category: "israel",
    urgency: "medium",
    time: "منذ 6 ساعات",
  },
  {
    title: "ايران ترفع مستوى تخصيب اليورانيوم",
    summary: "اعلنت ايران عن رفع مستوى تخصيب اليورانيوم في منشاة نطنز مما اثار قلقا دوليا.",
    category: "iran",
    urgency: "high",
    time: "منذ 8 ساعات",
  },
  {
    title: "الرياض وطهران تستانفان المحادثات",
    summary: "استانفت المملكة العربية السعودية وايران جولة جديدة من المحادثات الدبلوماسية بوساطة صينية.",
    category: "gulf",
    urgency: "low",
    time: "منذ 10 ساعات",
  },
];

const DEMO_VIDEOS = [
  {
    title: "التوترات الايرانية الامريكية في الخليج",
    description: "تقرير شامل عن اخر التطورات العسكرية",
    youtubeId: "dQw4w9WgXcQ",
    category: "iran",
    duration: "8:24",
  },
  {
    title: "القدرات العسكرية الاسرائيلية",
    description: "تحليل معمق للقوة العسكرية الاسرائيلية",
    youtubeId: "dQw4w9WgXcQ",
    category: "israel",
    duration: "12:10",
  },
  {
    title: "دول الخليج واستراتيجية الامن",
    description: "كيف تتعامل دول الخليج مع التهديدات",
    youtubeId: "dQw4w9WgXcQ",
    category: "gulf",
    duration: "6:45",
  },
  {
    title: "الوجود العسكري الامريكي في الشرق الاوسط",
    description: "تقرير عن القواعد والاساطيل الامريكية",
    youtubeId: "dQw4w9WgXcQ",
    category: "usa",
    duration: "9:30",
  },
  {
    title: "البرنامج النووي الايراني: اخر المستجدات",
    description: "تحديث عن الملف النووي الايراني",
    youtubeId: "dQw4w9WgXcQ",
    category: "iran",
    duration: "15:20",
  },
  {
    title: "مناطق التوتر في الشرق الاوسط 2025",
    description: "خريطة التوترات في المنطقة",
    youtubeId: "dQw4w9WgXcQ",
    category: "all",
    duration: "11:05",
  },
];

const NEWS_PROMPTS = {
  all: 'اعطني اخر 6 اخبار عاجلة عن ايران والخليج وامريكا واسرائيل. رد بـ JSON فقط بهذا الشكل: [{"title":"...","summary":"...","category":"iran","urgency":"high","time":"منذ X ساعة"}]',
  iran: 'اعطني اخر 6 اخبار عن ايران. رد بـ JSON فقط بهذا الشكل: [{"title":"...","summary":"...","category":"iran","urgency":"high","time":"منذ X ساعة"}]',
  gulf: 'اعطني اخر 6 اخبار عن الخليج. رد بـ JSON فقط بهذا الشكل: [{"title":"...","summary":"...","category":"gulf","urgency":"high","time":"منذ X ساعة"}]',
  usa: 'اعطني اخر 6 اخبار عن امريكا والشرق الاوسط. رد بـ JSON فقط بهذا الشكل: [{"title":"...","summary":"...","category":"usa","urgency":"medium","time":"منذ X ساعة"}]',
  israel: 'اعطني اخر 6 اخبار عن اسرائيل. رد بـ JSON فقط بهذا الشكل: [{"title":"...","summary":"...","category":"israel","urgency":"high","time":"منذ X ساعة"}]',
};

const VIDEO_PROMPTS = {
  all: 'اعطني 6 فيديوهات يوتيوب حقيقية عن الشرق الاوسط 2025. JSON فقط بهذا الشكل: [{"title":"...","description":"...","youtubeId":"ID","category":"iran","duration":"X:XX"}]',
  iran: 'اعطني 6 فيديوهات يوتيوب عن ايران 2025. JSON فقط بهذا الشكل: [{"title":"...","description":"...","youtubeId":"ID","category":"iran","duration":"X:XX"}]',
  gulf: 'اعطني 6 فيديوهات يوتيوب عن الخليج 2025. JSON فقط بهذا الشكل: [{"title":"...","description":"...","youtubeId":"ID","category":"gulf","duration":"X:XX"}]',
  usa: 'اعطني 6 فيديوهات يوتيوب عن امريكا والشرق الاوسط 2025. JSON فقط بهذا الشكل: [{"title":"...","description":"...","youtubeId":"ID","category":"usa","duration":"X:XX"}]',
  israel: 'اعطني 6 فيديوهات يوتيوب عن اسرائيل 2025. JSON فقط بهذا الشكل: [{"title":"...","description":"...","youtubeId":"ID","category":"israel","duration":"X:XX"}]',
};

const TENSION_PROMPT =
  'اعطني مستوى التوتر لكل منطقة من 0 الى 100 بناء على اخبار اليوم. JSON فقط بهذا الشكل: {"iran":{"level":85,"trend":"up","events":47},"israel":{"level":78,"trend":"up","events":38},"usa":{"level":62,"trend":"same","events":24},"gulf":{"level":45,"trend":"down","events":18}}';

// ─── API CALL عبر /api/claude ────────────────────────────────────────────────

function extractJSON(text) {
  const t = String(text || "").trim();

  if (!t) {
    throw new Error("الرد فارغ");
  }

  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch (_) {}
  }

  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {}
  }

  const firstBracket = t.indexOf("[");
  const lastBracket = t.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const arrText = t.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(arrText);
    } catch (_) {}
  }

  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const objText = t.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(objText);
    } catch (_) {}
  }

  throw new Error("لم يتم العثور على JSON صالح في الرد");
}

async function callAPI(prompt, useWebSearch = true, retries = 2) {
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          useWebSearch,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 405) {
          console.warn("Ignoring API health-check 405");
          return null;
        }

        throw new Error(
          data?.error ||
            data?.details?.error?.message ||
            `HTTP ${res.status}`
        );
      }

      if (typeof data?.text === "string") {
        return extractJSON(data.text);
      }

      throw new Error("Invalid API response");
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  return null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getImg(catId, seed) {
  const arr = CAT_UNSPLASH[catId] || CAT_UNSPLASH.iran;
  return `https://images.unsplash.com/${arr[seed % arr.length]}?w=600&q=75&auto=format&fit=crop`;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function FalconSVG({ size = 36, color = "#c8960c" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <ellipse cx="40" cy="28" rx="11" ry="14" fill={color} />
      <path d="M29 32 Q16 50 8 70 Q26 57 40 59 Q54 57 72 70 Q64 50 51 32" fill={color} opacity=".88" />
      <path d="M40 44 L40 68" stroke={color} strokeWidth="2.5" opacity=".6" />
      <circle cx="35" cy="23" r="2.5" fill="#0a0800" />
      <path d="M40 17 Q44 11 47 15" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function UAEBar() {
  return (
    <div style={{ display: "flex", height: "3px", width: "100%", overflow: "hidden", borderRadius: "1px" }}>
      <div style={{ width: "22%", background: "#c0392b" }} />
      <div style={{ flex: 1, background: "#00732f" }} />
      <div style={{ flex: 1, background: "#ffffff22" }} />
      <div style={{ flex: 1, background: "#111" }} />
    </div>
  );
}

function AlertBanner({ alerts, onClose }) {
  if (!alerts?.length) return null;
  const alert = alerts[0];

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        background: "linear-gradient(135deg,#1a0000,#2a0000)",
        border: "1px solid #e74c3c",
        borderRadius: "12px",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 0 30px rgba(231,76,60,.5)",
        animation: "slideDown .4s ease",
        maxWidth: "90vw",
        minWidth: "300px",
      }}
    >
      <span style={{ fontSize: "18px", animation: "pulse 0.8s infinite" }}>🔴</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#e74c3c", fontWeight: "900", fontSize: "11px", letterSpacing: "2px", marginBottom: "3px" }}>
          تنبيه عاجل
        </div>
        <div style={{ color: "#f0ece4", fontSize: "13px", fontWeight: "600", direction: "rtl" }}>{alert.title}</div>
      </div>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
      >
        ✕
      </button>
    </div>
  );
}

function TensionMeter({ data }) {
  const tensions = data || {
    iran: { level: 85, trend: "up", events: 47, label: "ايران", color: "#e74c3c", emoji: "🇮🇷" },
    israel: { level: 78, trend: "up", events: 38, label: "اسرائيل", color: "#9b59b6", emoji: "🇮🇱" },
    usa: { level: 62, trend: "same", events: 24, label: "امريكا", color: "#3498db", emoji: "🇺🇸" },
    gulf: { level: 45, trend: "down", events: 18, label: "الخليج", color: "#00c44f", emoji: "🇦🇪" },
  };

  const enriched = {
    iran: { ...tensions.iran, label: "ايران", color: "#e74c3c", emoji: "🇮🇷" },
    israel: { ...tensions.israel, label: "اسرائيل", color: "#9b59b6", emoji: "🇮🇱" },
    usa: { ...tensions.usa, label: "امريكا", color: "#3498db", emoji: "🇺🇸" },
    gulf: { ...tensions.gulf, label: "الخليج", color: "#00c44f", emoji: "🇦🇪" },
  };

  const overall = Math.round(Object.values(enriched).reduce((s, d) => s + (Number(d.level) || 0), 0) / 4);
  const color = overall > 75 ? "#e74c3c" : overall > 50 ? "#f39c12" : "#2ecc71";
  const label = overall > 75 ? "توتر شديد" : overall > 50 ? "توتر متوسط" : "هادئ نسبيا";

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#0d0b04,#0a0a0a)",
        border: "1px solid #c8960c22",
        borderRadius: "14px",
        padding: "18px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>🌡️</span>
          <span style={{ color: "#c8960c", fontWeight: "800", fontSize: "14px" }}>مقياس حرارة التوتر الاقليمي</span>
        </div>
        <div
          style={{
            background: `${color}22`,
            border: `1px solid ${color}55`,
            borderRadius: "20px",
            padding: "4px 14px",
            color,
            fontSize: "12px",
            fontWeight: "800",
          }}
        >
          {label} — {overall}%
        </div>
      </div>

      <div style={{ background: "#111", borderRadius: "8px", height: "10px", marginBottom: "18px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${overall}%`,
            background: `linear-gradient(90deg,${color}88,${color})`,
            borderRadius: "8px",
            transition: "width 1s ease",
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "12px" }}>
        {Object.values(enriched).map((d) => {
          const col = d.level > 75 ? "#e74c3c" : d.level > 50 ? "#f39c12" : "#2ecc71";
          const trendIcon = d.trend === "up" ? "▲" : d.trend === "down" ? "▼" : "●";
          const trendCol = d.trend === "up" ? "#e74c3c" : d.trend === "down" ? "#2ecc71" : "#888";

          return (
            <div key={d.label} style={{ background: "#0d0d0d", borderRadius: "10px", padding: "12px", border: `1px solid ${col}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "700" }}>
                  {d.emoji} {d.label}
                </span>
                <span style={{ color: trendCol, fontSize: "12px", fontWeight: "800" }}>
                  {trendIcon} {d.level}%
                </span>
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: "6px", height: "7px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${d.level}%`,
                    background: `linear-gradient(90deg,${col}77,${col})`,
                    borderRadius: "6px",
                    boxShadow: `0 0 8px ${col}44`,
                  }}
                />
              </div>

              <div style={{ color: "#333", fontSize: "10px", marginTop: "6px", textAlign: "right" }}>{d.events} حدث هذا الاسبوع</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConflictMap() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ background: "linear-gradient(135deg,#060c14,#0a0a0a)", border: "1px solid #2471a344", borderRadius: "14px", overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>🗺️</span>
          <span style={{ color: "#3498db", fontWeight: "800", fontSize: "14px" }}>خريطة التوترات — الشرق الاوسط</span>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[{ label: "شديد", color: "#e74c3c" }, { label: "متوسط", color: "#f39c12" }, { label: "منخفض", color: "#2ecc71" }].map((l) => (
            <div key={l.label} style={{ display
