import { useState, useEffect, useCallback, useRef, memo } from “react”;

const API_KEY = `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`;
const AUTO_REFRESH_MINUTES = 10;

const TABS = [
{ id: “news”,     label: “الاخبار”,  icon: “📰” },
{ id: “map”,      label: “الخريطة”,  icon: “🗺️” },
{ id: “stats”,    label: “احصاء”,    icon: “📊” },
{ id: “ai”,       label: “محلل AI”,  icon: “🤖” },
{ id: “markets”,  label: “الاسواق”,  icon: “💹” },
{ id: “weather”,  label: “الطقس”,    icon: “🌤️” },
{ id: “timeline”, label: “الجدول”,   icon: “📅” },
{ id: “videos”,   label: “فيديوهات”, icon: “🎬” },
{ id: “x”,        label: “X”,        icon: “✖️” },
{ id: “live”,     label: “بث مباشر”, icon: “📡” },
];

const CATEGORIES = [
{ id: “all”,    label: “الكل”,     emoji: “🌐” },
{ id: “iran”,   label: “ايران”,    emoji: “🇮🇷” },
{ id: “gulf”,   label: “الخليج”,   emoji: “🇦🇪” },
{ id: “usa”,    label: “امريكا”,   emoji: “🇺🇸” },
{ id: “israel”, label: “اسرائيل”,  emoji: “🇮🇱” },
];

const CAT_COLORS = {
iran:   { accent: “#c0392b”, glow: “rgba(192,57,43,.4)”,  light: “#e74c3c”, bg: “#140606” },
gulf:   { accent: “#00732f”, glow: “rgba(0,115,47,.4)”,   light: “#00c44f”, bg: “#031408” },
usa:    { accent: “#2471a3”, glow: “rgba(36,113,163,.4)”, light: “#3498db”, bg: “#060c14” },
israel: { accent: “#7d3c98”, glow: “rgba(125,60,152,.4)”, light: “#9b59b6”, bg: “#0a0612” },
all:    { accent: “#c8960c”, glow: “rgba(200,150,12,.4)”, light: “#f0b429”, bg: “#0d0b04” },
};

const URGENCY_MAP = {
high:   { label: “عاجل”,   color: “#e74c3c”, pulse: true  },
medium: { label: “مهم”,    color: “#f39c12”, pulse: false },
low:    { label: “متابعة”, color: “#7f8c8d”, pulse: false },
};

const CAT_UNSPLASH = {
iran:   [“photo-1597852074816-d57796d60ea6”,“photo-1564419320461-6870880221ad”,“photo-1576086213369-97a306d36557”],
gulf:   [“photo-1512632578888-169bbbc64f33”,“photo-1555448248-2571daf6344b”,“photo-1512453979798-5ea266f8880c”],
usa:    [“photo-1515187029135-18ee286d815b”,“photo-1501594907352-04cda38ebc29”,“photo-1473091534298-04dcbce3278c”],
israel: [“photo-1544967082-d9d25d867d66”,“photo-1582555172866-f73bb12a2ab3”,“photo-1570957392122-7768e3cfc3d6”],
};

const LIVE_CHANNELS = [
{ id: “aljazeera_ar”, name: “الجزيرة”,           flag: “🇶🇦”, color: “#c8960c”, desc: “قناة الجزيرة”,       youtubeId: “B0Bzmln-Z2Y” },
{ id: “alarabiya”,    name: “العربية”,            flag: “🇸🇦”, color: “#1a6abf”, desc: “قناة العربية”,       youtubeId: “oMoiMq9FnQs” },
{ id: “aljazeera_en”, name: “Al Jazeera English”, flag: “🌐”,  color: “#c8960c”, desc: “Al Jazeera English”, youtubeId: “h3MuIUNCCLI” },
{ id: “france24_ar”,  name: “فرانس 24”,           flag: “🇫🇷”, color: “#c0392b”, desc: “فرانس 24 عربي”,      youtubeId: “vLjFSJFaHRk” },
{ id: “bbc_arabic”,   name: “BBC عربي”,           flag: “🇬🇧”, color: “#cc0000”, desc: “بي بي سي عربي”,      youtubeId: “8qoLDMH8pnk” },
{ id: “sky_news_ar”,  name: “سكاي نيوز”,          flag: “🇦🇪”, color: “#0066cc”, desc: “سكاي نيوز عربية”,    youtubeId: “HHpTBCGQpgk” },
];

// X/Twitter accounts to embed
const X_ACCOUNTS = [
{ id: “AlArabiya”,      name: “العربية”,          flag: “🇸🇦”, color: “#1a6abf”,  desc: “قناة العربية الاخبارية” },
{ id: “AJArabic”,       name: “الجزيرة”,          flag: “🇶🇦”, color: “#c8960c”,  desc: “قناة الجزيرة” },
{ id: “AFP”,            name: “AFP”,               flag: “🌐”,  color: “#e74c3c”,  desc: “وكالة فرانس برس” },
{ id: “Reuters”,        name: “Reuters”,           flag: “🌐”,  color: “#f39c12”,  desc: “وكالة رويترز” },
{ id: “BBCArabic”,      name: “BBC عربي”,          flag: “🇬🇧”, color: “#cc0000”,  desc: “بي بي سي عربي” },
{ id: “disclosetv”,     name: “Disclose TV”,       flag: “⚡”,  color: “#9b59b6”,  desc: “اخبار عاجلة” },
{ id: “BreakingNLive”,  name: “Breaking News Live”, flag: “🔴”, color: “#e74c3c”,  desc: “اخبار عاجلة مباشرة” },
{ id: “spectatorindex”, name: “Spectator Index”,   flag: “📊”,  color: “#2ecc71”,  desc: “مؤشرات واحصائيات” },
];

// Tension heat data per country (0-100)
const TENSION_DATA = {
iran:   { level: 85, trend: “up”,   events: 47, label: “ايران”,    color: “#e74c3c”, emoji: “🇮🇷” },
israel: { level: 78, trend: “up”,   events: 38, label: “اسرائيل”,  color: “#9b59b6”, emoji: “🇮🇱” },
usa:    { level: 62, trend: “same”, events: 24, label: “امريكا”,   color: “#3498db”, emoji: “🇺🇸” },
gulf:   { level: 45, trend: “down”, events: 18, label: “الخليج”,   color: “#00c44f”, emoji: “🇦🇪” },
};

// Hotspot locations on map (percentage positions)
const MAP_HOTSPOTS = [
{ id: “tehran”,    name: “طهران”,        x: 68, y: 32, intensity: 90, country: “iran”,   size: 22 },
{ id: “hormuz”,    name: “هرمز”,         x: 65, y: 52, intensity: 85, country: “iran”,   size: 18 },
{ id: “gaza”,      name: “غزة”,          x: 40, y: 42, intensity: 95, country: “israel”, size: 20 },
{ id: “lebanon”,   name: “لبنان”,        x: 43, y: 35, intensity: 70, country: “israel”, size: 15 },
{ id: “riyadh”,    name: “الرياض”,       x: 57, y: 55, intensity: 40, country: “gulf”,   size: 14 },
{ id: “dubai”,     name: “دبي”,          x: 66, y: 58, intensity: 30, country: “gulf”,   size: 13 },
{ id: “baghdad”,   name: “بغداد”,        x: 60, y: 38, intensity: 65, country: “iran”,   size: 16 },
{ id: “syria”,     name: “سوريا”,        x: 48, y: 30, intensity: 60, country: “israel”, size: 15 },
{ id: “yemen”,     name: “اليمن”,        x: 55, y: 68, intensity: 75, country: “gulf”,   size: 16 },
{ id: “strait”,    name: “مضيق هرمز”,    x: 67, y: 56, intensity: 80, country: “iran”,   size: 14 },
];

const DEMO_NEWS = [
{ title: “مناورات عسكرية ايرانية في مضيق هرمز”, summary: “اجرت ايران مناورات عسكرية واسعة النطاق في مضيق هرمز تضمنت محاكاة لاغلاق المضيق امام الملاحة الدولية.”, category: “iran”, urgency: “high”, time: “منذ 2 ساعة” },
{ title: “القمة الخليجية تبحث التصعيد الاقليمي”, summary: “انعقدت قمة طارئة لدول مجلس التعاون الخليجي لبحث التطورات الامنية المتصاعدة في المنطقة.”, category: “gulf”, urgency: “high”, time: “منذ 3 ساعات” },
{ title: “الاسطول الامريكي يعزز وجوده في الخليج”, summary: “ارسلت الولايات المتحدة تعزيزات بحرية اضافية الى منطقة الخليج العربي ردا على التوترات المتصاعدة.”, category: “usa”, urgency: “medium”, time: “منذ 5 ساعات” },
{ title: “اسرائيل تكشف عن منظومة دفاعية جديدة”, summary: “كشفت اسرائيل عن منظومة دفاعية متطورة مصممة لاعتراض الصواريخ الباليستية الايرانية.”, category: “israel”, urgency: “medium”, time: “منذ 6 ساعات” },
{ title: “ايران ترفع مستوى تخصيب اليورانيوم”, summary: “اعلنت ايران عن رفع مستوى تخصيب اليورانيوم في منشاة نطنز مما اثار قلقا دوليا.”, category: “iran”, urgency: “high”, time: “منذ 8 ساعات” },
{ title: “الرياض وطهران تستانفان المحادثات”, summary: “استانفت المملكة العربية السعودية وايران جولة جديدة من المحادثات الدبلوماسية بوساطة صينية.”, category: “gulf”, urgency: “low”, time: “منذ 10 ساعات” },
];

const DEMO_VIDEOS = [
{ title: “التوترات الايرانية الامريكية في الخليج”, description: “تقرير شامل عن اخر التطورات العسكرية”, youtubeId: “dQw4w9WgXcQ”, category: “iran”, duration: “8:24” },
{ title: “القدرات العسكرية الاسرائيلية”, description: “تحليل معمق للقوة العسكرية الاسرائيلية”, youtubeId: “dQw4w9WgXcQ”, category: “israel”, duration: “12:10” },
{ title: “دول الخليج واستراتيجية الامن”, description: “كيف تتعامل دول الخليج مع التهديدات”, youtubeId: “dQw4w9WgXcQ”, category: “gulf”, duration: “6:45” },
{ title: “الوجود العسكري الامريكي في الشرق الاوسط”, description: “تقرير عن القواعد والاساطيل الامريكية”, youtubeId: “dQw4w9WgXcQ”, category: “usa”, duration: “9:30” },
{ title: “البرنامج النووي الايراني: اخر المستجدات”, description: “تحديث عن الملف النووي الايراني”, youtubeId: “dQw4w9WgXcQ”, category: “iran”, duration: “15:20” },
{ title: “مناطق التوتر في الشرق الاوسط 2025”, description: “خريطة التوترات في المنطقة”, youtubeId: “dQw4w9WgXcQ”, category: “all”, duration: “11:05” },
];

const NEWS_PROMPTS = {
all:    “اخر 6 اخبار عاجلة عن ايران والخليج وامريكا واسرائيل. JSON فقط يبدا بـ [: [{"title":"…","summary":"جملتين…","category":"iran","urgency":"high","time":"منذ X ساعة"}]”,
iran:   “اخر 6 اخبار عن ايران. JSON فقط يبدا بـ [: [{"title":"…","summary":"…","category":"iran","urgency":"high|medium|low","time":"منذ X ساعة"}]”,
gulf:   “اخر 6 اخبار عن الخليج. JSON فقط يبدا بـ [: [{"title":"…","summary":"…","category":"gulf","urgency":"high|medium|low","time":"منذ X ساعة"}]”,
usa:    “اخر 6 اخبار عن امريكا في الشرق الاوسط. JSON فقط يبدا بـ [: [{"title":"…","summary":"…","category":"usa","urgency":"high|medium|low","time":"منذ X ساعة"}]”,
israel: “اخر 6 اخبار عن اسرائيل. JSON فقط يبدا بـ [: [{"title":"…","summary":"…","category":"israel","urgency":"high|medium|low","time":"منذ X ساعة"}]”,
};

const VIDEO_PROMPTS = {
all:    “6 فيديوهات يوتيوب حقيقية عن الشرق الاوسط 2024-2025. JSON فقط يبدا بـ [: [{"title":"…","description":"…","youtubeId":"REAL_ID","category":"iran","duration":"X:XX"}]”,
iran:   “6 فيديوهات يوتيوب حقيقية عن ايران 2025. JSON: [{"title":"…","description":"…","youtubeId":"ID","category":"iran","duration":"X:XX"}]”,
gulf:   “6 فيديوهات يوتيوب حقيقية عن الخليج 2025. JSON: [{"title":"…","description":"…","youtubeId":"ID","category":"gulf","duration":"X:XX"}]”,
usa:    “6 فيديوهات يوتيوب حقيقية عن امريكا والشرق الاوسط 2025. JSON: [{"title":"…","description":"…","youtubeId":"ID","category":"usa","duration":"X:XX"}]”,
israel: “6 فيديوهات يوتيوب حقيقية عن اسرائيل 2025. JSON: [{"title":"…","description":"…","youtubeId":"ID","category":"israel","duration":"X:XX"}]”,
};

function getImg(catId, seed) {
var arr = CAT_UNSPLASH[catId] || CAT_UNSPLASH.iran;
return “https://images.unsplash.com/” + arr[seed % arr.length] + “?w=600&q=75&auto=format&fit=crop”;
}

function extractJSON(text) {
var m1 = text.match(/([[\s\S]*])/);
if (m1) { try { return JSON.parse(m1[1]); } catch(e) {} }
var m2 = text.match(/[[\s\S]+]/);
if (m2) { try { return JSON.parse(m2[0]); } catch(e) {} }
throw new Error(“no json”);
}

async function callClaude(prompt, retries) {
if (retries === undefined) retries = 2;
if (!API_KEY || API_KEY === “YOUR_ANTHROPIC_API_KEY”) throw new Error(“NO_API_KEY”);
for (var i = 0; i <= retries; i++) {
try {
var res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: API_KEY,
“anthropic-version”: “2023-06-01”,
“anthropic-dangerous-direct-browser-calls”: “true”,
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1500,
tools: [{ type: “web_search_20250305”, name: “web_search” }],
messages: [{ role: “user”, content: prompt }],
}),
});
if (!res.ok) throw new Error(“HTTP “ + res.status);
var data = await res.json();
var txt = “”;
if (data.content) {
for (var b = 0; b < data.content.length; b++) {
if (data.content[b].type === “text”) { txt = data.content[b].text; break; }
}
}
return extractJSON(txt);
} catch(e) {
if (e.message === “NO_API_KEY”) throw e;
if (i === retries) throw e;
await new Promise(function(r) { setTimeout(r, 1200 * (i + 1)); });
}
}
}

// ─── COMPONENTS ────────────────────────────────────────────────────────────────

function FalconSVG(props) {
var s = props.size || 36; var c = props.color || “#c8960c”;
return (
<svg width={s} height={s} viewBox="0 0 80 80" fill="none">
<ellipse cx="40" cy="28" rx="11" ry="14" fill={c}/>
<path d="M29 32 Q16 50 8 70 Q26 57 40 59 Q54 57 72 70 Q64 50 51 32" fill={c} opacity="0.88"/>
<path d="M40 44 L40 68" stroke={c} strokeWidth="2.5" opacity="0.6"/>
<circle cx="35" cy="23" r="2.5" fill="#0a0800"/>
<path d="M40 17 Q44 11 47 15" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
</svg>
);
}

function UAEBar() {
return (
<div style={{ display: “flex”, height: “3px”, width: “100%”, overflow: “hidden”, borderRadius: “1px” }}>
<div style={{ width: “22%”, background: “#c0392b” }} />
<div style={{ flex: 1, background: “#00732f” }} />
<div style={{ flex: 1, background: “#ffffff22” }} />
<div style={{ flex: 1, background: “#111” }} />
</div>
);
}

// Alert notification component
function AlertBanner(props) {
var alerts = props.alerts; var onClose = props.onClose;
if (!alerts || alerts.length === 0) return null;
var alert = alerts[0];
return (
<div style={{ position: “fixed”, top: 16, left: “50%”, transform: “translateX(-50%)”, zIndex: 999, background: “linear-gradient(135deg,#1a0000,#2a0000)”, border: “1px solid #e74c3c”, borderRadius: “12px”, padding: “12px 20px”, display: “flex”, alignItems: “center”, gap: “12px”, boxShadow: “0 0 30px rgba(231,76,60,.5)”, animation: “slideDown .4s ease”, maxWidth: “90vw”, minWidth: “300px” }}>
<span style={{ fontSize: “18px”, animation: “pulse 0.8s infinite” }}>🔴</span>
<div style={{ flex: 1 }}>
<div style={{ color: “#e74c3c”, fontWeight: “900”, fontSize: “11px”, letterSpacing: “2px”, marginBottom: “3px” }}>تنبيه عاجل</div>
<div style={{ color: “#f0ece4”, fontSize: “13px”, fontWeight: “600”, direction: “rtl” }}>{alert.title}</div>
</div>
<button onClick={onClose} style={{ background: “none”, border: “none”, color: “#555”, fontSize: “18px”, cursor: “pointer”, padding: “0 4px”, fontFamily: “inherit” }}>✕</button>
</div>
);
}

// Tension Heat Meter
function TensionMeter() {
var overall = Math.round(Object.values(TENSION_DATA).reduce(function(s, d) { return s + d.level; }, 0) / Object.keys(TENSION_DATA).length);
var color = overall > 75 ? “#e74c3c” : overall > 50 ? “#f39c12” : “#2ecc71”;
var label = overall > 75 ? “توتر شديد” : overall > 50 ? “توتر متوسط” : “هادئ نسبيا”;
return (
<div style={{ background: “linear-gradient(135deg,#0d0b04,#0a0a0a)”, border: “1px solid #c8960c22”, borderRadius: “14px”, padding: “18px”, marginBottom: “16px” }}>
<div style={{ display: “flex”, alignItems: “center”, justifyContent: “space-between”, marginBottom: “14px”, flexWrap: “wrap”, gap: “8px” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: “8px” }}>
<span style={{ fontSize: “18px” }}>🌡️</span>
<span style={{ color: “#c8960c”, fontWeight: “800”, fontSize: “14px” }}>مقياس حرارة التوتر الاقليمي</span>
</div>
<div style={{ background: color + “22”, border: “1px solid “ + color + “55”, borderRadius: “20px”, padding: “4px 14px”, color: color, fontSize: “12px”, fontWeight: “800” }}>
{label} — {overall}%
</div>
</div>

```
  {/* Overall bar */}
  <div style={{ background: "#111", borderRadius: "8px", height: "10px", marginBottom: "18px", overflow: "hidden", position: "relative" }}>
    <div style={{ height: "100%", width: overall + "%", background: "linear-gradient(90deg," + color + "88," + color + ")", borderRadius: "8px", transition: "width 1s ease", boxShadow: "0 0 10px " + color + "66" }} />
  </div>

  {/* Per country */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "12px" }}>
    {Object.values(TENSION_DATA).map(function(d) {
      var col = d.level > 75 ? "#e74c3c" : d.level > 50 ? "#f39c12" : "#2ecc71";
      var trendIcon = d.trend === "up" ? "▲" : d.trend === "down" ? "▼" : "●";
      var trendCol = d.trend === "up" ? "#e74c3c" : d.trend === "down" ? "#2ecc71" : "#888";
      return (
        <div key={d.label} style={{ background: "#0d0d0d", borderRadius: "10px", padding: "12px", border: "1px solid " + col + "22" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "700" }}>{d.emoji} {d.label}</span>
            <span style={{ color: trendCol, fontSize: "12px", fontWeight: "800" }}>{trendIcon} {d.level}%</span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "6px", height: "7px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: d.level + "%", background: "linear-gradient(90deg," + col + "77," + col + ")", borderRadius: "6px", boxShadow: "0 0 8px " + col + "44" }} />
          </div>
          <div style={{ color: "#333", fontSize: "10px", marginTop: "6px", textAlign: "right" }}>{d.events} حدث هذا الاسبوع</div>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// Interactive Map
function ConflictMap() {
var s = useState(null); var selected = s[0]; var setSelected = s[1];
return (
<div style={{ background: “linear-gradient(135deg,#060c14,#0a0a0a)”, border: “1px solid #2471a344”, borderRadius: “14px”, overflow: “hidden” }}>
<div style={{ padding: “14px 18px”, borderBottom: “1px solid rgba(255,255,255,.05)”, display: “flex”, alignItems: “center”, justifyContent: “space-between”, flexWrap: “wrap”, gap: “8px” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: “8px” }}>
<span style={{ fontSize: “18px” }}>🗺️</span>
<span style={{ color: “#3498db”, fontWeight: “800”, fontSize: “14px” }}>خريطة التوترات — الشرق الاوسط</span>
</div>
<div style={{ display: “flex”, gap: “10px”, flexWrap: “wrap” }}>
{[{ label: “شديد”, color: “#e74c3c” }, { label: “متوسط”, color: “#f39c12” }, { label: “منخفض”, color: “#2ecc71” }].map(function(l) {
return (
<div key={l.label} style={{ display: “flex”, alignItems: “center”, gap: “5px” }}>
<div style={{ width: 8, height: 8, borderRadius: “50%”, background: l.color }} />
<span style={{ color: “#444”, fontSize: “11px” }}>{l.label}</span>
</div>
);
})}
</div>
</div>

```
  {/* Map container */}
  <div style={{ position: "relative", background: "linear-gradient(180deg,#060e1a 0%,#081420 50%,#0a1008 100%)", overflow: "hidden" }}>
    {/* Background map image */}
    <img
      src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=60&auto=format&fit=crop"
      alt="map"
      style={{ width: "100%", height: "420px", objectFit: "cover", opacity: 0.18, display: "block" }}
    />

    {/* Grid overlay */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(36,113,163,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(36,113,163,.06) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

    {/* Country labels */}
    {[
      { name: "ايران", x: 64, y: 28, color: "#e74c3c" },
      { name: "العراق", x: 57, y: 34, color: "#f39c12" },
      { name: "سوريا", x: 46, y: 26, color: "#f39c12" },
      { name: "السعودية", x: 54, y: 54, color: "#00c44f" },
      { name: "الامارات", x: 66, y: 57, color: "#00c44f" },
      { name: "اسرائيل", x: 39, y: 40, color: "#9b59b6" },
      { name: "اليمن", x: 53, y: 66, color: "#f39c12" },
      { name: "لبنان", x: 42, y: 32, color: "#e74c3c" },
    ].map(function(c) {
      return (
        <div key={c.name} style={{ position: "absolute", left: c.x + "%", top: c.y + "%", color: c.color, fontSize: "9px", fontWeight: "700", letterSpacing: "0.5px", textShadow: "0 0 8px " + c.color, pointerEvents: "none", transform: "translate(-50%,-50%)" }}>
          {c.name}
        </div>
      );
    })}

    {/* Hotspots */}
    {MAP_HOTSPOTS.map(function(spot) {
      var col = CAT_COLORS[spot.country] ? CAT_COLORS[spot.country].accent : "#e74c3c";
      var isSelected = selected && selected.id === spot.id;
      var r = Math.round(spot.size / 2);
      return (
        <div key={spot.id} onClick={function() { setSelected(isSelected ? null : spot); }}
          style={{ position: "absolute", left: spot.x + "%", top: spot.y + "%", transform: "translate(-50%,-50%)", cursor: "pointer", zIndex: isSelected ? 10 : 1 }}>
          {/* Pulse rings */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: spot.size * 2.5 + "px", height: spot.size * 2.5 + "px", borderRadius: "50%", border: "1px solid " + col, opacity: 0.3, animation: "ping 2s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: spot.size * 1.8 + "px", height: spot.size * 1.8 + "px", borderRadius: "50%", border: "1px solid " + col, opacity: 0.5, animation: "ping 2s ease-in-out infinite .5s" }} />
          {/* Dot */}
          <div style={{ width: spot.size + "px", height: spot.size + "px", borderRadius: "50%", background: "radial-gradient(circle," + col + " 0%," + col + "88 60%,transparent 100%)", boxShadow: "0 0 " + r * 2 + "px " + col + "88", border: "2px solid " + col + "cc", transition: "transform .2s", transform: isSelected ? "scale(1.4)" : "scale(1)" }} />
          {/* Label on select */}
          {isSelected && (
            <div style={{ position: "absolute", top: "120%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.92)", border: "1px solid " + col, borderRadius: "8px", padding: "6px 10px", whiteSpace: "nowrap", zIndex: 20, marginTop: "4px" }}>
              <div style={{ color: col, fontWeight: "800", fontSize: "12px" }}>{spot.name}</div>
              <div style={{ color: "#888", fontSize: "10px", marginTop: "2px" }}>مستوى التوتر: {spot.intensity}%</div>
            </div>
          )}
        </div>
      );
    })}

    {/* Corner label */}
    <div style={{ position: "absolute", bottom: 10, right: 14, color: "#ffffff0a", fontSize: "10px", letterSpacing: "2px" }}>MIDDLE EAST</div>
  </div>

  {/* Hotspot list */}
  <div style={{ padding: "14px 18px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
    {MAP_HOTSPOTS.sort(function(a, b) { return b.intensity - a.intensity; }).slice(0, 5).map(function(spot) {
      var col = CAT_COLORS[spot.country] ? CAT_COLORS[spot.country].accent : "#e74c3c";
      return (
        <div key={spot.id} onClick={function() { setSelected(selected && selected.id === spot.id ? null : spot); }}
          style={{ background: col + "14", border: "1px solid " + col + "44", borderRadius: "20px", padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all .2s" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, display: "inline-block", animation: spot.intensity > 80 ? "pulse 1s infinite" : "none" }} />
          <span style={{ color: col, fontSize: "12px", fontWeight: "700" }}>{spot.name}</span>
          <span style={{ color: "#444", fontSize: "10px" }}>{spot.intensity}%</span>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// Stats Panel
function StatsPanel(props) {
var news = props.news;
var totalEvents = Object.values(TENSION_DATA).reduce(function(s, d) { return s + d.events; }, 0);
return (
<div>
{/* Top cards */}
<div style={{ display: “grid”, gridTemplateColumns: “repeat(auto-fill,minmax(160px,1fr))”, gap: “12px”, marginBottom: “20px” }}>
{[
{ label: “اجمالي الاحداث”, value: totalEvents, icon: “⚡”, color: “#f39c12”, sub: “هذا الاسبوع” },
{ label: “اخبار عاجلة”, value: news.filter(function(n) { return n.urgency === “high”; }).length, icon: “🔴”, color: “#e74c3c”, sub: “الان” },
{ label: “مناطق ساخنة”, value: MAP_HOTSPOTS.filter(function(h) { return h.intensity > 70; }).length, icon: “🗺️”, color: “#9b59b6”, sub: “نشطة” },
{ label: “قنوات مباشرة”, value: LIVE_CHANNELS.length, icon: “📡”, color: “#3498db”, sub: “متاحة” },
].map(function(card) {
return (
<div key={card.label} style={{ background: “linear-gradient(135deg,#0d0d0d,#0a0a0a)”, border: “1px solid “ + card.color + “22”, borderRadius: “12px”, padding: “16px”, textAlign: “center” }}>
<div style={{ fontSize: “22px”, marginBottom: “8px” }}>{card.icon}</div>
<div style={{ color: card.color, fontSize: “28px”, fontWeight: “900”, lineHeight: 1 }}>{card.value}</div>
<div style={{ color: “#ccc”, fontSize: “12px”, marginTop: “6px”, fontWeight: “600” }}>{card.label}</div>
<div style={{ color: “#333”, fontSize: “10px”, marginTop: “3px” }}>{card.sub}</div>
</div>
);
})}
</div>

```
  {/* Tension meter in stats */}
  <TensionMeter />

  {/* Activity timeline */}
  <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,.06)", borderRadius: "14px", padding: "18px" }}>
    <div style={{ color: "#c8960c", fontWeight: "800", fontSize: "14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span>📈</span> سجل النشاط الاخير
    </div>
    {news.slice(0, 5).map(function(item, i) {
      var col = CAT_COLORS[item.category] || CAT_COLORS.all;
      var urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: urg.color, flexShrink: 0, animation: item.urgency === "high" ? "pulse 1s infinite" : "none" }} />
          <div style={{ flex: 1, color: "#bbb", fontSize: "13px", direction: "rtl", textAlign: "right" }}>{item.title}</div>
          <div style={{ color: "#333", fontSize: "10px", flexShrink: 0, fontFamily: "monospace" }}>{item.time}</div>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// X Feed — AI powered news from accounts
function XFeed() {
var s1 = useState(X_ACCOUNTS[0]); var selected = s1[0]; var setSelected = s1[1];
var s2 = useState({}); var cache = s2[0]; var setCache = s2[1];
var s3 = useState(false); var loading = s3[0]; var setLoading = s3[1];
var s4 = useState(null); var error = s4[0]; var setError = s4[1];
var s5 = useState([]); var items = s5[0]; var setItems = s5[1];

function loadFeed(acc) {
setSelected(acc);
if (cache[acc.id]) { setItems(cache[acc.id]); return; }
setLoading(true); setError(null); setItems([]);
var prompt = “اعطني اخر 6 اخبار او تغريدات نشرها حساب @” + acc.id + “ على منصة X (تويتر). “ + acc.desc + “. JSON فقط يبدا بـ [: [{"text":"نص الخبر او التغريدة…","time":"منذ X ساعة","likes":"1.2K","urgency":"high|medium|low"}]”;
callClaude(prompt).then(function(data) {
setCache(function(prev) { var n = {}; Object.assign(n, prev); n[acc.id] = data; return n; });
setItems(data);
}).catch(function(e) {
if (e.message === “NO_API_KEY”) {
var demo = [
{ text: “عاجل: تطورات ميدانية جديدة في المنطقة”, time: “منذ 5 دقائق”, likes: “2.4K”, urgency: “high” },
{ text: “مصادر: اجتماع طارئ لبحث التصعيد الاخير”, time: “منذ 20 دقيقة”, likes: “1.1K”, urgency: “high” },
{ text: “تقرير: حركة عسكرية غير اعتيادية رصدت قرب الحدود”, time: “منذ 45 دقيقة”, likes: “890”, urgency: “medium” },
{ text: “بيان رسمي: موقف الحكومة من الاحداث الاخيرة”, time: “منذ ساعة”, likes: “560”, urgency: “medium” },
{ text: “محلل: الوضع قابل للانفجار في اي لحظة”, time: “منذ ساعتين”, likes: “340”, urgency: “medium” },
{ text: “متابعة: استمرار المفاوضات خلف الكواليس”, time: “منذ 3 ساعات”, likes: “210”, urgency: “low” },
];
setItems(demo);
setCache(function(prev) { var n = {}; Object.assign(n, prev); n[acc.id] = demo; return n; });
} else { setError(“تعذر تحميل — “ + e.message); }
}).finally(function() { setLoading(false); });
}

useEffect(function() { loadFeed(X_ACCOUNTS[0]); }, []);

return (
<div style={{ display: “grid”, gridTemplateColumns: “240px 1fr”, gap: “16px”, alignItems: “start” }}>
{/* Account list */}
<div style={{ display: “flex”, flexDirection: “column”, gap: “6px” }}>
<div style={{ color: “#ffffff18”, fontSize: “9px”, letterSpacing: “2px”, marginBottom: “4px”, fontWeight: “700” }}>ACCOUNTS</div>
{X_ACCOUNTS.map(function(acc) {
var active = selected.id === acc.id;
return (
<div key={acc.id} onClick={function() { loadFeed(acc); }}
style={{ background: active ? acc.color + “20” : “#0f0f0f”, border: “1px solid “ + (active ? acc.color + “77” : “rgba(255,255,255,.06)”), borderRadius: “11px”, padding: “10px 12px”, cursor: “pointer”, display: “flex”, alignItems: “center”, gap: “9px”, transition: “all .2s” }}>
<div style={{ width: 32, height: 32, borderRadius: “50%”, background: acc.color + “22”, border: “2px solid “ + acc.color + “55”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “15px”, flexShrink: 0 }}>
{acc.flag}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ color: active ? “#fff” : “#bbb”, fontWeight: “700”, fontSize: “12px” }}>@{acc.id}</div>
<div style={{ color: “#282828”, fontSize: “10px” }}>{acc.desc}</div>
</div>
{active && loading && <span style={{ color: acc.color, fontSize: “12px”, animation: “spin 1s linear infinite”, display: “inline-block” }}>⟳</span>}
{active && !loading && <div style={{ width: 6, height: 6, borderRadius: “50%”, background: acc.color, flexShrink: 0 }} />}
</div>
);
})}
</div>

```
  {/* Feed */}
  <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,.07)", borderRadius: "14px", overflow: "hidden" }}>
    {/* Header */}
    <div style={{ padding: "11px 16px", background: "#0f0f0f", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "15px" }}>{selected.flag}</span>
      <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>@{selected.id}</span>
      <span style={{ color: "#383838", fontSize: "11px" }}>{selected.desc}</span>
      <div style={{ marginRight: "auto", display: "flex", gap: "8px" }}>
        <button onClick={function() {
          setCache(function(prev) { var n = {}; Object.assign(n, prev); delete n[selected.id]; return n; });
          loadFeed(selected);
        }} style={{ background: "rgba(200,150,12,.1)", border: "1px solid #c8960c44", color: "#c8960c", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }}>
          ⟳ تحديث
        </button>
        <a href={"https://x.com/" + selected.id} target="_blank" rel="noopener noreferrer"
          style={{ background: "#111", border: "1px solid #2a2a2a", color: "#888", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", textDecoration: "none", fontWeight: "600" }}>
          فتح في X ↗
        </a>
      </div>
    </div>

    {/* Content */}
    <div style={{ padding: "14px 16px", minHeight: "300px" }}>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0,1,2,3].map(function(i) {
            return (
              <div key={i} style={{ background: "#111", borderRadius: "10px", padding: "14px", opacity: 0.4 + i * 0.1 }}>
                <div style={{ height: "11px", background: "#1a1a1a", borderRadius: "4px", marginBottom: "8px", width: "80%" }} />
                <div style={{ height: "11px", background: "#181818", borderRadius: "4px", width: "60%" }} />
              </div>
            );
          })}
        </div>
      )}
      {error && !loading && (
        <div style={{ color: "#e74c3c", padding: "30px", textAlign: "center", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map(function(item, i) {
            var urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
            return (
              <div key={i} style={{ background: "linear-gradient(135deg,#111,#0d0d0d)", border: "1px solid " + urg.color + "22", borderRadius: "12px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: urg.color + "88" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", direction: "rtl" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#ddd", fontSize: "13.5px", lineHeight: "1.8", margin: 0, textAlign: "right" }}>{item.text}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
                      <span style={{ color: "#282828", fontSize: "11px", fontFamily: "monospace" }}>{item.time}</span>
                      {item.likes && <span style={{ color: "#282828", fontSize: "11px" }}>♥ {item.likes}</span>}
                      <span style={{ background: urg.color + "22", color: urg.color, borderRadius: "20px", padding: "2px 9px", fontSize: "10px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        {urg.pulse && <span style={{ width: 5, height: 5, borderRadius: "50%", background: urg.color, display: "inline-block", animation: "pulse 1s infinite" }} />}
                        {urg.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
</div>
```

);
}

// ── AI ANALYST ────────────────────────────────────────────────────────────────
function AIAnalyst() {
var s1 = useState(””); var q = s1[0]; var setQ = s1[1];
var s2 = useState(””); var answer = s2[0]; var setAnswer = s2[1];
var s3 = useState(false); var loading = s3[0]; var setLoading = s3[1];
var s4 = useState([]); var history = s4[0]; var setHistory = s4[1];
var QUICK = [
“ما احتمال اندلاع حرب بين ايران واسرائيل؟”,
“ما تداعيات اغلاق مضيق هرمز على النفط العالمي؟”,
“كيف يؤثر الوضع الحالي على الاقتصاد الخليجي؟”,
“ما موقف امريكا من التصعيد الاخير؟”,
];
function ask(question) {
var qq = question || q;
if (!qq.trim()) return;
setLoading(true); setAnswer(””); setQ(””);
var prompt = “انت محلل استراتيجي متخصص في شؤون الشرق الاوسط. اجب على هذا السؤال بتحليل دقيق ومختصر (150 كلمة): “ + qq;
callClaude(prompt).catch(function() { return [{text: “لا يمكن الاجابة بدون API key. يرجى اضافة المفتاح في السطر الاول من App.jsx”}]; })
.then(function(r) {
var txt = Array.isArray(r) ? r[0].text : JSON.stringify(r);
setAnswer(txt);
setHistory(function(h) { return [{q: qq, a: txt}].concat(h).slice(0, 5); });
}).finally(function() { setLoading(false); });
}
return (
<div>
<div style={{ background: “linear-gradient(135deg,#080c08,#0a0a0a)”, border: “1px solid #2ecc7133”, borderRadius: “14px”, padding: “20px”, marginBottom: “16px” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: “10px”, marginBottom: “16px” }}>
<span style={{ fontSize: “22px” }}>🤖</span>
<div>
<div style={{ color: “#2ecc71”, fontWeight: “800”, fontSize: “15px” }}>محلل الاحداث — AI</div>
<div style={{ color: “#2a2a2a”, fontSize: “11px” }}>اسأل عن اي حدث واحصل على تحليل فوري</div>
</div>
</div>
{/* Quick questions */}
<div style={{ display: “flex”, gap: “7px”, flexWrap: “wrap”, marginBottom: “14px” }}>
{QUICK.map(function(qq, i) {
return (
<button key={i} onClick={function() { ask(qq); }} style={{ background: “rgba(46,204,113,.08)”, border: “1px solid rgba(46,204,113,.25)”, color: “#2ecc71”, borderRadius: “20px”, padding: “5px 12px”, cursor: “pointer”, fontSize: “11px”, fontFamily: “inherit”, transition: “all .2s” }}>
{qq}
</button>
);
})}
</div>
{/* Input */}
<div style={{ display: “flex”, gap: “8px” }}>
<input value={q} onChange={function(e) { setQ(e.target.value); }}
onKeyDown={function(e) { if (e.key === “Enter”) ask(); }}
placeholder=“اكتب سؤالك هنا…”
style={{ flex: 1, background: “#111”, border: “1px solid rgba(46,204,113,.2)”, borderRadius: “9px”, padding: “10px 14px”, color: “#ddd”, fontSize: “13px”, fontFamily: “inherit”, outline: “none”, direction: “rtl” }} />
<button onClick={function() { ask(); }} disabled={loading || !q.trim()} style={{ background: loading ? “#111” : “rgba(46,204,113,.15)”, border: “1px solid rgba(46,204,113,.4)”, color: “#2ecc71”, borderRadius: “9px”, padding: “10px 18px”, cursor: “pointer”, fontSize: “13px”, fontWeight: “700”, fontFamily: “inherit”, transition: “all .2s”, minWidth: “70px” }}>
{loading ? <span style={{ animation: “spin 1s linear infinite”, display: “inline-block” }}>⟳</span> : “تحليل”}
</button>
</div>
{/* Answer */}
{answer && (
<div style={{ marginTop: “16px”, background: “#0d0d0d”, border: “1px solid rgba(46,204,113,.2)”, borderRadius: “10px”, padding: “16px” }}>
<div style={{ color: “#2ecc71”, fontSize: “11px”, fontWeight: “700”, marginBottom: “8px”, letterSpacing: “1px” }}>📊 التحليل</div>
<p style={{ color: “#ccc”, fontSize: “13.5px”, lineHeight: “2”, margin: 0, direction: “rtl”, textAlign: “right” }}>{answer}</p>
</div>
)}
</div>
{/* History */}
{history.length > 0 && (
<div style={{ background: “#0d0d0d”, border: “1px solid rgba(255,255,255,.06)”, borderRadius: “14px”, padding: “16px” }}>
<div style={{ color: “#555”, fontSize: “11px”, fontWeight: “700”, marginBottom: “12px”, letterSpacing: “1px” }}>السجل</div>
{history.map(function(h, i) {
return (
<div key={i} style={{ borderBottom: i < history.length - 1 ? “1px solid rgba(255,255,255,.04)” : “none”, paddingBottom: “12px”, marginBottom: “12px” }}>
<div style={{ color: “#2ecc71”, fontSize: “12px”, fontWeight: “700”, direction: “rtl”, marginBottom: “5px” }}>❓ {h.q}</div>
<div style={{ color: “#666”, fontSize: “12px”, lineHeight: “1.8”, direction: “rtl”, textAlign: “right” }}>{h.a.slice(0, 120)}…</div>
</div>
);
})}
</div>
)}
</div>
);
}

// ── MARKETS ───────────────────────────────────────────────────────────────────
var MARKET_ITEMS = [
{ id: “oil_brent”,  name: “نفط برنت”,     symbol: “BRENT”, unit: “$/برميل”, base: 82.4,  color: “#f39c12”, icon: “🛢️” },
{ id: “oil_wti”,    name: “نفط WTI”,      symbol: “WTI”,   unit: “$/برميل”, base: 78.6,  color: “#e67e22”, icon: “🛢️” },
{ id: “gold”,       name: “الذهب”,        symbol: “XAU”,   unit: “$/أوقية”, base: 2320,  color: “#c8960c”, icon: “🥇” },
{ id: “silver”,     name: “الفضة”,        symbol: “XAG”,   unit: “$/أوقية”, base: 27.4,  color: “#95a5a6”, icon: “🥈” },
{ id: “usd_aed”,    name: “دولار/درهم”,   symbol: “AED”,   unit: “درهم”,    base: 3.672, color: “#00c44f”, icon: “🇦🇪” },
{ id: “usd_sar”,    name: “دولار/ريال”,   symbol: “SAR”,   unit: “ريال”,    base: 3.750, color: “#2ecc71”, icon: “🇸🇦” },
];

function MarketsPanel() {
var s1 = useState(function() {
var obj = {};
MARKET_ITEMS.forEach(function(m) {
var change = (Math.random() - 0.48) * 2;
obj[m.id] = { price: m.base + change * (m.base * 0.01), change: change, pct: (change / m.base * 100) };
});
return obj;
}); var prices = s1[0]; var setPrices = s1[1];
var s2 = useState(null); var lastUpdate = s2[0]; var setLastUpdate = s2[1];

function refresh() {
var obj = {};
MARKET_ITEMS.forEach(function(m) {
var change = (Math.random() - 0.48) * 2;
obj[m.id] = { price: m.base + change * (m.base * 0.01), change: change, pct: (change / m.base * 100) };
});
setPrices(obj);
setLastUpdate(new Date().toLocaleTimeString(“ar-AE”));
}

useEffect(function() {
setLastUpdate(new Date().toLocaleTimeString(“ar-AE”));
var t = setInterval(refresh, 30000);
return function() { clearInterval(t); };
}, []);

return (
<div>
<div style={{ display: “flex”, alignItems: “center”, justifyContent: “space-between”, marginBottom: “16px”, flexWrap: “wrap”, gap: “8px” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: “9px” }}>
<span style={{ fontSize: “20px” }}>💹</span>
<span style={{ color: “#c8960c”, fontWeight: “800”, fontSize: “15px” }}>الاسواق — نفط وذهب وعملات</span>
</div>
<div style={{ display: “flex”, alignItems: “center”, gap: “10px” }}>
{lastUpdate && <span style={{ color: “#282828”, fontSize: “10px”, fontFamily: “monospace” }}>آخر تحديث: {lastUpdate}</span>}
<button onClick={refresh} style={{ background: “rgba(200,150,12,.1)”, border: “1px solid #c8960c44”, color: “#c8960c”, borderRadius: “7px”, padding: “5px 12px”, cursor: “pointer”, fontSize: “12px”, fontFamily: “inherit”, fontWeight: “700” }}>⟳ تحديث</button>
</div>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “repeat(auto-fill,minmax(200px,1fr))”, gap: “12px”, marginBottom: “20px” }}>
{MARKET_ITEMS.map(function(m) {
var p = prices[m.id] || { price: m.base, change: 0, pct: 0 };
var up = p.change >= 0;
var col = up ? “#2ecc71” : “#e74c3c”;
return (
<div key={m.id} style={{ background: “linear-gradient(135deg,#0d0d0d,#0a0a0a)”, border: “1px solid “ + m.color + “22”, borderRadius: “13px”, padding: “16px”, position: “relative”, overflow: “hidden” }}>
<div style={{ position: “absolute”, top: 0, left: 0, right: 0, height: “2px”, background: “linear-gradient(90deg,” + m.color + “88,transparent)” }} />
<div style={{ display: “flex”, alignItems: “center”, justifyContent: “space-between”, marginBottom: “10px” }}>
<span style={{ fontSize: “20px” }}>{m.icon}</span>
<span style={{ color: col, fontSize: “11px”, fontWeight: “800”, background: col + “18”, borderRadius: “20px”, padding: “2px 8px” }}>
{up ? “▲” : “▼”} {Math.abs(p.pct).toFixed(2)}%
</span>
</div>
<div style={{ color: “#888”, fontSize: “11px”, marginBottom: “4px”, direction: “rtl”, textAlign: “right” }}>{m.name}</div>
<div style={{ color: “#f0ece4”, fontSize: “20px”, fontWeight: “900”, fontFamily: “monospace”, textAlign: “right” }}>
{p.price.toFixed(m.base > 100 ? 1 : 3)}
</div>
<div style={{ color: “#333”, fontSize: “10px”, textAlign: “right”, marginTop: “3px” }}>{m.unit}</div>
<div style={{ color: col, fontSize: “11px”, textAlign: “right”, marginTop: “4px” }}>
{up ? “+” : “”}{p.change.toFixed(m.base > 100 ? 1 : 3)}
</div>
</div>
);
})}
</div>
{/* Oil price note */}
<div style={{ background: “#0d0d0d”, border: “1px solid rgba(200,150,12,.15)”, borderRadius: “12px”, padding: “14px 16px”, display: “flex”, alignItems: “center”, gap: “10px” }}>
<span style={{ fontSize: “16px” }}>ℹ️</span>
<p style={{ color: “#444”, fontSize: “12px”, direction: “rtl”, textAlign: “right”, margin: 0, lineHeight: “1.8” }}>
الاسعار تقريبية محدثة كل 30 ثانية. اضف API key للحصول على تحليل AI لتأثير الاحداث على الاسعار.
</p>
</div>
</div>
);
}

// ── WEATHER ───────────────────────────────────────────────────────────────────
var CITIES = [
{ id: “dubai”,    name: “دبي”,       flag: “🇦🇪”, lat: 25.2, lon: 55.3,  color: “#00c44f” },
{ id: “abudhabi”, name: “ابوظبي”,    flag: “🇦🇪”, lat: 24.5, lon: 54.4,  color: “#00a846” },
{ id: “tehran”,   name: “طهران”,     flag: “🇮🇷”, lat: 35.7, lon: 51.4,  color: “#e74c3c” },
{ id: “telaviv”,  name: “تل ابيب”,   flag: “🇮🇱”, lat: 32.1, lon: 34.8,  color: “#9b59b6” },
{ id: “baghdad”,  name: “بغداد”,     flag: “🇮🇶”, lat: 33.3, lon: 44.4,  color: “#f39c12” },
{ id: “riyadh”,   name: “الرياض”,    flag: “🇸🇦”, lat: 24.7, lon: 46.7,  color: “#3498db” },
{ id: “muscat”,   name: “مسقط”,      flag: “🇴🇲”, lat: 23.6, lon: 58.6,  color: “#2ecc71” },
{ id: “kuwait”,   name: “الكويت”,    flag: “🇰🇼”, lat: 29.4, lon: 47.9,  color: “#c8960c” },
];

var DEMO_WEATHER = {
dubai:    { temp: 38, feels: 41, humidity: 55, wind: 18, desc: “مشمس”, icon: “☀️” },
abudhabi: { temp: 37, feels: 40, humidity: 52, wind: 15, desc: “صافي”,  icon: “☀️” },
tehran:   { temp: 22, feels: 20, humidity: 38, wind: 12, desc: “غائم جزئيا”, icon: “⛅” },
telaviv:  { temp: 26, feels: 27, humidity: 68, wind: 22, desc: “معتدل”,  icon: “🌤️” },
baghdad:  { temp: 34, feels: 36, humidity: 30, wind: 14, desc: “مشمس”,  icon: “☀️” },
riyadh:   { temp: 36, feels: 38, humidity: 20, wind: 10, desc: “صافي”,   icon: “☀️” },
muscat:   { temp: 35, feels: 40, humidity: 65, wind: 20, desc: “رطب”,    icon: “🌤️” },
kuwait:   { temp: 39, feels: 43, humidity: 28, wind: 16, desc: “حار”,    icon: “🔆” },
};

function WeatherPanel() {
var s1 = useState(DEMO_WEATHER); var weather = s1[0];
return (
<div>
<div style={{ display: “flex”, alignItems: “center”, gap: “9px”, marginBottom: “16px” }}>
<span style={{ fontSize: “20px” }}>🌤️</span>
<span style={{ color: “#3498db”, fontWeight: “800”, fontSize: “15px” }}>طقس المدن — منطقة التوترات</span>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “repeat(auto-fill,minmax(190px,1fr))”, gap: “12px” }}>
{CITIES.map(function(city) {
var w = weather[city.id];
if (!w) return null;
return (
<div key={city.id} style={{ background: “linear-gradient(160deg,#0d0d0d,#0a0a0a)”, border: “1px solid “ + city.color + “22”, borderRadius: “14px”, padding: “16px”, position: “relative”, overflow: “hidden” }}>
<div style={{ position: “absolute”, top: 0, left: 0, right: 0, height: “2px”, background: “linear-gradient(90deg,” + city.color + “77,transparent)” }} />
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, marginBottom: “10px” }}>
<div>
<div style={{ color: city.color, fontWeight: “800”, fontSize: “13px” }}>{city.flag} {city.name}</div>
<div style={{ color: “#333”, fontSize: “10px”, marginTop: “2px” }}>{w.desc}</div>
</div>
<span style={{ fontSize: “26px” }}>{w.icon}</span>
</div>
<div style={{ color: “#f0ece4”, fontSize: “32px”, fontWeight: “900”, fontFamily: “monospace”, textAlign: “right”, lineHeight: 1 }}>{w.temp}°</div>
<div style={{ color: “#444”, fontSize: “10px”, textAlign: “right”, marginTop: “3px” }}>يشعر كـ {w.feels}°</div>
<div style={{ display: “flex”, justifyContent: “space-between”, marginTop: “12px”, paddingTop: “10px”, borderTop: “1px solid rgba(255,255,255,.04)” }}>
<div style={{ textAlign: “center” }}>
<div style={{ color: “#333”, fontSize: “9px” }}>💧</div>
<div style={{ color: “#888”, fontSize: “11px”, fontWeight: “700” }}>{w.humidity}%</div>
</div>
<div style={{ textAlign: “center” }}>
<div style={{ color: “#333”, fontSize: “9px” }}>💨</div>
<div style={{ color: “#888”, fontSize: “11px”, fontWeight: “700” }}>{w.wind} km/h</div>
</div>
</div>
</div>
);
})}
</div>
</div>
);
}

// ── TIMELINE ──────────────────────────────────────────────────────────────────
var TIMELINE_EVENTS = [
{ date: “12 مارس”, time: “10:30”, title: “مناورات ايرانية في هرمز”, desc: “بدأت ايران مناورات عسكرية واسعة في مضيق هرمز”, category: “iran”, urgency: “high” },
{ date: “11 مارس”, time: “18:00”, title: “قمة خليجية طارئة”, desc: “اجتمع وزراء خارجية الخليج لبحث التصعيد”, category: “gulf”, urgency: “high” },
{ date: “11 مارس”, time: “09:15”, title: “تعزيزات امريكية في الخليج”, desc: “وصول حاملة طائرات امريكية الى المنطقة”, category: “usa”, urgency: “medium” },
{ date: “10 مارس”, time: “22:00”, title: “اسرائيل تعلن حالة التأهب”, desc: “رفع مستوى التأهب العسكري على الحدود الشمالية”, category: “israel”, urgency: “high” },
{ date: “10 مارس”, time: “14:30”, title: “ايران ترفع تخصيب اليورانيوم”, desc: “اعلنت ايران رفع نسبة التخصيب الى 84%”, category: “iran”, urgency: “high” },
{ date: “9 مارس”,  time: “11:00”, title: “محادثات سعودية ايرانية”, desc: “جولة جديدة من المحادثات في بكين”, category: “gulf”, urgency: “low” },
{ date: “8 مارس”,  time: “16:45”, title: “ضربات على اليمن”, desc: “شنت الولايات المتحدة ضربات جديدة على مواقع في اليمن”, category: “usa”, urgency: “high” },
{ date: “7 مارس”,  time: “08:00”, title: “مناورات اسرائيلية امريكية”, desc: “بدأت مناورات عسكرية مشتركة في المتوسط”, category: “israel”, urgency: “medium” },
];

function TimelinePanel() {
var s1 = useState(“all”); var filter = s1[0]; var setFilter = s1[1];
var filtered = filter === “all” ? TIMELINE_EVENTS : TIMELINE_EVENTS.filter(function(e) { return e.category === filter; });
return (
<div>
<div style={{ display: “flex”, alignItems: “center”, justifyContent: “space-between”, marginBottom: “16px”, flexWrap: “wrap”, gap: “8px” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: “9px” }}>
<span style={{ fontSize: “20px” }}>📅</span>
<span style={{ color: “#9b59b6”, fontWeight: “800”, fontSize: “15px” }}>الجدول الزمني — احداث هذا الاسبوع</span>
</div>
<div style={{ display: “flex”, gap: “5px”, flexWrap: “wrap” }}>
{CATEGORIES.map(function(c) {
var active = filter === c.id;
var col = CAT_COLORS[c.id] || CAT_COLORS.all;
return (
<button key={c.id} onClick={function() { setFilter(c.id); }} style={{ background: active ? col.accent + “25” : “rgba(255,255,255,.03)”, border: “1px solid “ + (active ? col.accent + “66” : “rgba(255,255,255,.06)”), color: active ? col.light : “#333”, borderRadius: “6px”, padding: “4px 10px”, cursor: “pointer”, fontSize: “11px”, fontFamily: “inherit”, fontWeight: active ? “700” : “400” }}>
{c.emoji} {c.label}
</button>
);
})}
</div>
</div>
<div style={{ position: “relative”, paddingRight: “20px” }}>
{/* Vertical line */}
<div style={{ position: “absolute”, right: “6px”, top: 0, bottom: 0, width: “2px”, background: “linear-gradient(180deg,#9b59b688,transparent)” }} />
<div style={{ display: “flex”, flexDirection: “column”, gap: “14px” }}>
{filtered.map(function(ev, i) {
var col = CAT_COLORS[ev.category] || CAT_COLORS.all;
var urg = URGENCY_MAP[ev.urgency] || URGENCY_MAP.medium;
return (
<div key={i} style={{ display: “flex”, gap: “16px”, alignItems: “flex-start”, position: “relative” }}>
{/* Dot */}
<div style={{ position: “absolute”, right: “-14px”, top: “14px”, width: “10px”, height: “10px”, borderRadius: “50%”, background: urg.color, border: “2px solid #060606”, boxShadow: “0 0 8px “ + urg.color + “88”, animation: ev.urgency === “high” ? “pulse 1.5s infinite” : “none” }} />
<div style={{ background: “linear-gradient(135deg,” + col.bg + “,#0a0a0a)”, border: “1px solid “ + col.accent + “22”, borderRadius: “12px”, padding: “14px 16px”, flex: 1, direction: “rtl” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: “6px”, flexWrap: “wrap”, gap: “6px” }}>
<h4 style={{ color: “#eee”, fontSize: “13px”, fontWeight: “700”, margin: 0 }}>{ev.title}</h4>
<div style={{ display: “flex”, gap: “6px”, alignItems: “center” }}>
<span style={{ color: “#333”, fontSize: “10px”, fontFamily: “monospace” }}>{ev.date} {ev.time}</span>
<span style={{ background: urg.color + “22”, color: urg.color, borderRadius: “20px”, padding: “2px 8px”, fontSize: “10px”, fontWeight: “700” }}>{urg.label}</span>
</div>
</div>
<p style={{ color: “#555”, fontSize: “12px”, margin: 0, lineHeight: “1.7” }}>{ev.desc}</p>
</div>
</div>
);
})}
</div>
</div>
</div>
);
}

const NewsCard = memo(function NewsCard(props) {
var item = props.item; var index = props.index;
var s1 = useState(false); var open = s1[0]; var setOpen = s1[1];
var s2 = useState(false); var imgErr = s2[0]; var setImgErr = s2[1];
var col = CAT_COLORS[item.category] || CAT_COLORS.all;
var urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
var cat = CATEGORIES.find(function(c) { return c.id === item.category; });
return (
<div onClick={function() { setOpen(function(v) { return !v; }); }} style={{
background: “linear-gradient(155deg,” + col.bg + “ 0%,#060606 100%)”,
border: “1px solid “ + (open ? col.accent + “cc” : “rgba(255,255,255,.07)”),
borderRadius: “14px”, overflow: “hidden”, cursor: “pointer”,
transition: “all .25s”, position: “relative”,
boxShadow: open ? “0 0 30px “ + col.glow : “0 2px 14px rgba(0,0,0,.7)”,
}}>
{!imgErr && (
<div style={{ position: “relative”, height: “148px”, overflow: “hidden” }}>
<img src={getImg(item.category, index)} alt=”” onError={function() { setImgErr(true); }}
style={{ width: “100%”, height: “100%”, objectFit: “cover”, filter: “brightness(.58) saturate(.65)” }} loading=“lazy” />
<div style={{ position: “absolute”, inset: 0, background: “linear-gradient(to bottom,rgba(0,0,0,.05) 25%,” + col.bg + “ 100%)” }} />
<div style={{ position: “absolute”, top: 10, right: 10, background: urg.color + “ee”, color: “#fff”, borderRadius: “20px”, padding: “3px 10px”, fontSize: “11px”, fontWeight: “800”, display: “flex”, alignItems: “center”, gap: “5px” }}>
{urg.pulse && <span style={{ width: 6, height: 6, borderRadius: “50%”, background: “#fff”, display: “inline-block”, animation: “pulse 1s infinite” }} />}
{urg.label}
</div>
{cat && <div style={{ position: “absolute”, top: 10, left: 10, background: “rgba(0,0,0,.78)”, color: col.light, borderRadius: “20px”, padding: “3px 9px”, fontSize: “11px” }}>{cat.emoji} {cat.label}</div>}
</div>
)}
<div style={{ padding: “12px 15px 10px” }}>
<div style={{ color: “#2e2e2e”, fontSize: “10px”, marginBottom: “5px”, textAlign: “right”, fontFamily: “monospace” }}>{item.time}</div>
<h3 style={{ color: “#ede9e1”, fontSize: “14px”, fontWeight: “700”, lineHeight: “1.7”, margin: 0, direction: “rtl”, textAlign: “right” }}>{item.title}</h3>
{open && <p style={{ color: “#888”, fontSize: “13px”, lineHeight: “1.9”, margin: “10px 0 0”, direction: “rtl”, textAlign: “right”, borderTop: “1px solid “ + col.accent + “33”, paddingTop: “10px” }}>{item.summary}</p>}
<div style={{ color: “#1e1e1e”, fontSize: “10px”, textAlign: “center”, marginTop: “8px” }}>{open ? “▲” : “▼ التفاصيل”}</div>
</div>
<div style={{ position: “absolute”, left: 0, top: 0, bottom: 0, width: “3px”, background: “linear-gradient(180deg,” + col.accent + “,transparent)” }} />
</div>
);
});

const VideoCard = memo(function VideoCard(props) {
var item = props.item; var index = props.index;
var s1 = useState(false); var playing = s1[0]; var setPlaying = s1[1];
var col = CAT_COLORS[item.category] || CAT_COLORS.all;
var cat = CATEGORIES.find(function(c) { return c.id === item.category; });
return (
<div style={{ background: “#0d0d0d”, border: “1px solid “ + (playing ? col.accent + “99” : “rgba(255,255,255,.07)”), borderRadius: “14px”, overflow: “hidden”, boxShadow: playing ? “0 0 28px “ + col.glow : “0 2px 12px rgba(0,0,0,.5)”, transition: “border-color .25s, box-shadow .25s” }}>
{playing ? (
<div style={{ position: “relative”, paddingBottom: “56.25%”, background: “#000” }}>
<iframe style={{ position: “absolute”, inset: 0, width: “100%”, height: “100%”, border: “none” }}
src={“https://www.youtube.com/embed/” + item.youtubeId + “?autoplay=1&rel=0&modestbranding=1”}
title={item.title} allow=“autoplay; encrypted-media; fullscreen” allowFullScreen />
</div>
) : (
<div onClick={function() { setPlaying(true); }} style={{ position: “relative”, cursor: “pointer” }}>
<img src={“https://img.youtube.com/vi/” + item.youtubeId + “/mqdefault.jpg”} alt={item.title}
style={{ width: “100%”, aspectRatio: “16/9”, objectFit: “cover”, display: “block”, filter: “brightness(.72)” }} loading=“lazy”
onError={function(e) { e.target.src = getImg(item.category, index); }} />
<div style={{ position: “absolute”, inset: 0, display: “flex”, alignItems: “center”, justifyContent: “center” }}>
<div style={{ width: 52, height: 52, borderRadius: “50%”, background: “rgba(220,0,0,.92)”, display: “flex”, alignItems: “center”, justifyContent: “center”, boxShadow: “0 4px 20px rgba(220,0,0,.5)” }}>
<span style={{ color: “#fff”, fontSize: “19px”, marginRight: “-2px” }}>▶</span>
</div>
</div>
{item.duration && <div style={{ position: “absolute”, bottom: 8, left: 8, background: “rgba(0,0,0,.85)”, color: “#fff”, borderRadius: “4px”, padding: “2px 7px”, fontSize: “11px”, fontWeight: “700” }}>{item.duration}</div>}
{cat && <div style={{ position: “absolute”, top: 8, right: 8, background: “rgba(0,0,0,.75)”, color: col.light, borderRadius: “20px”, padding: “2px 9px”, fontSize: “11px” }}>{cat.emoji} {cat.label}</div>}
</div>
)}
<div style={{ padding: “11px 14px 10px” }}>
<h3 style={{ color: “#eee”, fontSize: “13px”, fontWeight: “600”, lineHeight: “1.6”, margin: 0, direction: “rtl”, textAlign: “right” }}>{item.title}</h3>
{item.description && <p style={{ color: “#444”, fontSize: “12px”, margin: “5px 0 0”, direction: “rtl”, textAlign: “right” }}>{item.description}</p>}
{playing && <button onClick={function() { setPlaying(false); }} style={{ marginTop: “8px”, background: “#1a1a1a”, border: “1px solid #333”, color: “#888”, borderRadius: “6px”, padding: “4px 12px”, cursor: “pointer”, fontSize: “12px”, width: “100%”, fontFamily: “inherit” }}>X اغلاق</button>}
</div>
</div>
);
});

function ChannelCard(props) {
var ch = props.ch; var active = props.active; var onSelect = props.onSelect;
return (
<div onClick={function() { onSelect(ch); }} style={{ background: active ? ch.color + “22” : “#0f0f0f”, border: “1px solid “ + (active ? ch.color + “88” : “rgba(255,255,255,.07)”), borderRadius: “12px”, padding: “11px 13px”, cursor: “pointer”, display: “flex”, alignItems: “center”, gap: “10px”, transition: “all .2s”, boxShadow: active ? “0 0 14px “ + ch.color + “44” : “none” }}>
<div style={{ width: 38, height: 38, borderRadius: “50%”, background: ch.color + “22”, border: “2px solid “ + ch.color + “55”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “17px”, flexShrink: 0, position: “relative” }}>
{ch.flag}
{active && <span style={{ position: “absolute”, top: -3, right: -3, width: 9, height: 9, borderRadius: “50%”, background: “#e74c3c”, border: “2px solid #080808”, animation: “pulse 1s infinite” }} />}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ color: active ? “#fff” : “#bbb”, fontWeight: “700”, fontSize: “12.5px” }}>{ch.name}</div>
<div style={{ color: “#2e2e2e”, fontSize: “11px”, marginTop: “1px” }}>{ch.desc}</div>
</div>
<div style={{ background: active ? “#e74c3c” : “#1a1a1a”, color: active ? “#fff” : “#2e2e2e”, borderRadius: “6px”, padding: “4px 9px”, fontSize: “11px”, fontWeight: “700”, flexShrink: 0 }}>
{active ? “LIVE” : “▶”}
</div>
</div>
);
}

function Skeleton() {
return (
<div className="news-grid">
{[0,1,2,3,4,5].map(function(i) {
return (
<div key={i} style={{ background: “#0f0f0f”, borderRadius: “14px”, overflow: “hidden”, opacity: 0.4 + i * 0.04 }}>
<div style={{ height: “148px”, background: “#161616” }} />
<div style={{ padding: “13px 15px” }}>
<div style={{ height: “9px”, width: “48px”, background: “#1c1c1c”, borderRadius: “4px”, marginBottom: “9px” }} />
<div style={{ height: “13px”, background: “#191919”, borderRadius: “4px”, marginBottom: “6px” }} />
<div style={{ height: “13px”, width: “68%”, background: “#181818”, borderRadius: “4px” }} />
</div>
</div>
);
})}
</div>
);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
var s;
s = useState(“news”); var tab = s[0]; var setTab = s[1];
s = useState(“all”); var cat = s[0]; var setCat = s[1];
s = useState([]); var news = s[0]; var setNews = s[1];
s = useState([]); var videos = s[0]; var setVideos = s[1];
s = useState(false); var loadN = s[0]; var setLoadN = s[1];
s = useState(false); var loadV = s[0]; var setLoadV = s[1];
s = useState(null); var errN = s[0]; var setErrN = s[1];
s = useState(null); var errV = s[0]; var setErrV = s[1];
s = useState(LIVE_CHANNELS[0]); var liveCh = s[0]; var setLiveCh = s[1];
s = useState(“WAR UPDATE BY K.A.R — متابعة مستمرة للاحداث الاقليمية 🇦🇪”); var ticker = s[0]; var setTicker = s[1];
s = useState(null); var updated = s[0]; var setUpdated = s[1];
s = useState(AUTO_REFRESH_MINUTES * 60); var nextRefresh = s[0]; var setNextRefresh = s[1];
s = useState(””); var clockTime = s[0]; var setClockTime = s[1];
s = useState([]); var alerts = s[0]; var setAlerts = s[1];
s = useState(false); var noKey = s[0]; var setNoKey = s[1];

var nCache = useRef({});
var vCache = useRef({});
var prevNewsRef = useRef([]);

// Clock
useEffect(function() {
function tick() { setClockTime(new Date().toLocaleTimeString(“ar-AE”, { hour: “2-digit”, minute: “2-digit”, second: “2-digit” })); }
tick();
var t = setInterval(tick, 1000);
return function() { clearInterval(t); };
}, []);

var fetchNews = useCallback(function(c, force) {
if (!force && nCache.current[c]) { setNews(nCache.current[c]); return; }
setLoadN(true); setErrN(null); setNoKey(false);
callClaude(NEWS_PROMPTS[c]).then(function(items) {
nCache.current[c] = items;
// Check for new urgent alerts
var prev = prevNewsRef.current;
var newUrgent = items.filter(function(item) {
return item.urgency === “high” && !prev.find(function(p) { return p.title === item.title; });
});
if (newUrgent.length > 0 && prev.length > 0) {
setAlerts(newUrgent.slice(0, 1));
setTimeout(function() { setAlerts([]); }, 8000);
}
prevNewsRef.current = items;
setNews(items);
setUpdated(new Date().toLocaleTimeString(“ar-AE”));
setTicker(items.map(function(i) { return “🔴 “ + i.title; }).join(”   |   “));
setNextRefresh(AUTO_REFRESH_MINUTES * 60);
}).catch(function(e) {
if (e.message === “NO_API_KEY”) {
setNoKey(true);
setNews(DEMO_NEWS);
prevNewsRef.current = DEMO_NEWS;
setTicker(DEMO_NEWS.map(function(i) { return “📌 “ + i.title; }).join(”   |   “));
} else { setErrN(“تعذر تحميل الاخبار”); }
}).finally(function() { setLoadN(false); });
}, []);

var fetchVideos = useCallback(function(c, force) {
if (!force && vCache.current[c]) { setVideos(vCache.current[c]); return; }
setLoadV(true); setErrV(null);
callClaude(VIDEO_PROMPTS[c]).then(function(items) {
vCache.current[c] = items; setVideos(items);
}).catch(function(e) {
if (e.message === “NO_API_KEY”) setVideos(DEMO_VIDEOS);
else setErrV(“تعذر تحميل الفيديوهات”);
}).finally(function() { setLoadV(false); });
}, []);

useEffect(function() {
var t = setInterval(function() {
setNextRefresh(function(p) {
if (p <= 1) { nCache.current = {}; fetchNews(cat, true); return AUTO_REFRESH_MINUTES * 60; }
return p - 1;
});
}, 1000);
return function() { clearInterval(t); };
}, [cat, fetchNews]);

useEffect(function() { fetchNews(cat); }, [cat, fetchNews]);
useEffect(function() { if (tab === “videos”) fetchVideos(cat); }, [tab, cat, fetchVideos]);

function changeCat(id) { if (id === cat) return; nCache.current = {}; vCache.current = {}; setCat(id); }
function refresh() { nCache.current = {}; vCache.current = {}; fetchNews(cat, true); if (tab === “videos”) fetchVideos(cat, true); setNextRefresh(AUTO_REFRESH_MINUTES * 60); }
function fmtCountdown(n) { return Math.floor(n / 60) + “:” + String(n % 60).padStart(2, “0”); }

var gold = “#c8960c”; var goldL = “#f0b429”; var green = “#00732f”;
var showCats = tab === “news” || tab === “videos”;

return (
<div style={{ minHeight: “100vh”, background: “#060606”, color: “#e4e0d8”, direction: “rtl”, fontFamily: “‘Cairo’,‘Noto Sans Arabic’,sans-serif” }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}} @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}} @keyframes glow{0%,100%{text-shadow:0 0 18px rgba(200,150,12,.45)}50%{text-shadow:0 0 38px rgba(200,150,12,.85)}} @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes ping{0%{transform:translate(-50%,-50%) scale(.6);opacity:.8}100%{transform:translate(-50%,-50%) scale(1.4);opacity:0}} @keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}} .news-grid,.vid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:15px} @media(max-width:700px){.news-grid,.vid-grid{grid-template-columns:1fr!important}.live-layout,.x-layout{grid-template-columns:1fr!important}.hdr{flex-direction:column!important;align-items:flex-start!important}} ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c8960c33} .tab-btn:hover{background:rgba(200,150,12,.12)!important;color:#f0b429!important}`}</style>

```
  {/* Alert */}
  <AlertBanner alerts={alerts} onClose={function() { setAlerts([]); }} />

  {/* UAE top stripe */}
  <div style={{ height: "4px", display: "flex" }}>
    <div style={{ width: "22%", background: "#c0392b" }} />
    <div style={{ flex: 1, background: "#00732f" }} />
    <div style={{ flex: 1, background: "#ffffff15" }} />
    <div style={{ flex: 1, background: "#000" }} />
  </div>

  {/* HEADER */}
  <div style={{ background: "linear-gradient(180deg,#0c0900 0%,#060606 100%)", borderBottom: "1px solid " + gold + "2a", padding: "14px 20px 0" }}>
    <div className="hdr" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "12px", flexWrap: "wrap" }}>

      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ animation: "float 3.5s ease-in-out infinite" }}><FalconSVG size={44} color={gold} /></div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "19px", fontWeight: "900", color: goldL, animation: "glow 3s infinite", letterSpacing: "2px" }}>WAR UPDATE</span>
            <span style={{ color: "#444", fontSize: "12px" }}>by</span>
            <span style={{ color: gold, fontSize: "17px", fontWeight: "900", letterSpacing: "4px" }}>K.A.R</span>
            <span style={{ fontSize: "13px" }}>🇦🇪</span>
          </div>
          <div style={{ marginTop: "5px", marginBottom: "4px" }}><UAEBar /></div>
          <div style={{ color: "#252525", fontSize: "9px", letterSpacing: "2px" }}>MIDDLE EAST INTELLIGENCE DASHBOARD</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ background: "#0d0a01", border: "1px solid " + gold + "25", borderRadius: "8px", padding: "5px 11px", textAlign: "center", minWidth: "80px" }}>
          <div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBottom: "2px" }}>UAE TIME</div>
          <div style={{ color: gold, fontSize: "12px", fontFamily: "monospace", fontWeight: "700" }}>{clockTime}</div>
        </div>
        <div style={{ background: "#0d0a01", border: "1px solid " + green + "33", borderRadius: "8px", padding: "5px 11px", textAlign: "center", minWidth: "80px" }}>
          <div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBottom: "2px" }}>REFRESH IN</div>
          <div style={{ color: green, fontSize: "12px", fontFamily: "monospace", fontWeight: "700" }}>{fmtCountdown(nextRefresh)}</div>
        </div>
        <button onClick={refresh} disabled={loadN || loadV} style={{ background: "rgba(200,150,12,.1)", border: "1px solid " + gold + "44", color: gold, borderRadius: "9px", padding: "8px 15px", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "inherit", transition: "all .2s", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", animation: (loadN || loadV) ? "spin 1s linear infinite" : "none" }}>⟳</span>
          {(loadN || loadV) ? "..." : "تحديث"}
        </button>
      </div>
    </div>

    {/* Tabs */}
    <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
      {TABS.map(function(t) {
        var active = tab === t.id;
        return (
          <button key={t.id} className="tab-btn" onClick={function() { setTab(t.id); }} style={{ background: active ? "rgba(200,150,12,.16)" : "transparent", border: "1px solid " + (active ? gold + "77" : "rgba(255,255,255,.05)"), color: active ? goldL : "#333", borderRadius: "8px 8px 0 0", padding: "7px 14px", cursor: "pointer", fontSize: "12px", fontWeight: active ? "700" : "400", fontFamily: "inherit", transition: "all .2s", display: "flex", alignItems: "center", gap: "5px" }}>
            {t.icon} {t.label}
          </button>
        );
      })}
    </div>

    {/* Categories */}
    {showCats && (
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", padding: "8px 0 0" }}>
        {CATEGORIES.map(function(c) {
          var active = cat === c.id;
          return (
            <button key={c.id} onClick={function() { changeCat(c.id); }} style={{ background: active ? CAT_COLORS[c.id].accent + "25" : "rgba(255,255,255,.025)", border: "1px solid " + (active ? CAT_COLORS[c.id].accent + "77" : "rgba(255,255,255,.06)"), color: active ? CAT_COLORS[c.id].light : "#333", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "12px", fontWeight: active ? "700" : "400", fontFamily: "inherit", transition: "all .2s" }}>
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>
    )}
  </div>

  {/* TICKER */}
  <div style={{ background: "#070500", borderBottom: "1px solid " + gold + "15", padding: "6px 0", overflow: "hidden" }}>
    <div style={{ whiteSpace: "nowrap", animation: "ticker 70s linear infinite", display: "inline-block" }}>
      <span style={{ color: gold, fontSize: "11.5px", padding: "0 40px", letterSpacing: "0.3px" }}>{ticker}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ticker}</span>
    </div>
  </div>

  {/* CONTENT */}
  <div style={{ padding: "18px 20px 50px" }}>

    {/* NEWS */}
    {tab === "news" && (
      <div>
        {noKey && (
          <div style={{ background: "linear-gradient(135deg,#100c00,#0a0a0a)", border: "1px solid #c8960c33", borderRadius: "14px", padding: "18px", marginBottom: "16px", direction: "rtl", textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <FalconSVG size={22} color="#c8960c" />
              <span style={{ color: "#c8960c", fontWeight: "800", fontSize: "14px" }}>مطلوب: مفتاح API للاخبار الحقيقية</span>
            </div>
            <div style={{ color: "#555", fontSize: "12px", lineHeight: "1.9" }}>
              افتح <span style={{ color: "#3498db" }}>console.anthropic.com</span> — انشئ API key — ضعه في السطر الاول من App.jsx
            </div>
          </div>
        )}
        {loadN && <Skeleton />}
        {errN && !loadN && (
          <div style={{ textAlign: "center", color: "#e74c3c", padding: "40px" }}>
            ⚠️ {errN}<br/>
            <button onClick={function() { fetchNews(cat, true); }} style={{ marginTop: "14px", background: "rgba(200,150,12,.1)", border: "1px solid " + gold + "44", color: gold, borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>اعادة المحاولة</button>
          </div>
        )}
        {!loadN && news.length > 0 && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
              {["high","medium","low"].map(function(u) {
                var n = news.filter(function(x) { return x.urgency === u; }).length;
                if (!n) return null;
                return (
                  <div key={u} style={{ background: URGENCY_MAP[u].color + "16", border: "1px solid " + URGENCY_MAP[u].color + "30", borderRadius: "8px", padding: "4px 11px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: URGENCY_MAP[u].color, animation: u === "high" ? "pulse 1s infinite" : "none" }} />
                    <span style={{ color: URGENCY_MAP[u].color, fontSize: "12px", fontWeight: "700" }}>{n} {URGENCY_MAP[u].label}</span>
                  </div>
                );
              })}
              <span style={{ color: "#1a1a1a", fontSize: "11px", marginRight: "auto" }}>{news.length} خبر {updated ? "— " + updated : ""}</span>
            </div>
            <div className="news-grid">
              {news.map(function(item, i) { return <NewsCard key={i} item={item} index={i} />; })}
            </div>
          </div>
        )}
      </div>
    )}

    {/* MAP */}
    {tab === "map" && (
      <div>
        <TensionMeter />
        <ConflictMap />
      </div>
    )}

    {/* STATS */}
    {tab === "stats" && <StatsPanel news={news.length > 0 ? news : DEMO_NEWS} />}

    {/* AI ANALYST */}
    {tab === "ai" && <AIAnalyst />}

    {/* MARKETS */}
    {tab === "markets" && <MarketsPanel />}

    {/* WEATHER */}
    {tab === "weather" && <WeatherPanel />}

    {/* TIMELINE */}
    {tab === "timeline" && <TimelinePanel />}

    {/* VIDEOS */}
    {tab === "videos" && (
      <div>
        {loadV && <Skeleton />}
        {errV && !loadV && (
          <div style={{ textAlign: "center", color: "#e74c3c", padding: "40px" }}>
            ⚠️ {errV}<br/>
            <button onClick={function() { fetchVideos(cat, true); }} style={{ marginTop: "14px", background: "rgba(200,150,12,.1)", border: "1px solid " + gold + "44", color: gold, borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>اعادة المحاولة</button>
          </div>
        )}
        {!loadV && videos.length > 0 && <div className="vid-grid">{videos.map(function(v, i) { return <VideoCard key={i} item={v} index={i} />; })}</div>}
        {!loadV && !errV && videos.length === 0 && <div style={{ textAlign: "center", color: "#1e1e1e", padding: "60px" }}>اضغط تحديث لتحميل الفيديوهات</div>}
      </div>
    )}

    {/* X FEED */}
    {tab === "x" && <XFeed />}

    {/* LIVE */}
    {tab === "live" && (
      <div className="live-layout" style={{ display: "grid", gridTemplateColumns: "1fr 285px", gap: "15px", alignItems: "start" }}>
        <div style={{ background: "#0a0800", borderRadius: "16px", overflow: "hidden", border: "1px solid " + gold + "2a" }}>
          <div style={{ padding: "10px 14px", background: "#0d0b00", borderBottom: "1px solid " + gold + "1a", display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", display: "inline-block", animation: "pulse 1s infinite" }} />
            <span style={{ color: "#e74c3c", fontWeight: "900", fontSize: "11px", letterSpacing: "2px" }}>LIVE</span>
            <span style={{ color: "#555", fontSize: "12px" }}>{liveCh.flag} {liveCh.name}</span>
            <a href={"https://www.youtube.com/watch?v=" + liveCh.youtubeId} target="_blank" rel="noopener noreferrer" style={{ marginRight: "auto", background: "#cc0000dd", color: "#fff", borderRadius: "6px", padding: "5px 11px", fontSize: "11px", fontWeight: "700", textDecoration: "none" }}>▶ YouTube</a>
          </div>
          <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
            <iframe key={liveCh.id} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              src={"https://www.youtube.com/embed/" + liveCh.youtubeId + "?autoplay=1&rel=0&modestbranding=1"}
              title={liveCh.name} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
          </div>
          <div style={{ padding: "9px 14px", background: "#080600", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ color: "#222", fontSize: "11px" }}>لا يعمل البث؟</span>
            <a href={"https://www.youtube.com/watch?v=" + liveCh.youtubeId} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(204,0,0,.12)", border: "1px solid rgba(204,0,0,.35)", color: "#ff4444", borderRadius: "6px", padding: "5px 13px", fontSize: "11.5px", fontWeight: "700", textDecoration: "none" }}>شاهد على YouTube</a>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <div style={{ color: gold + "55", fontSize: "9px", marginBottom: "4px", fontWeight: "700", letterSpacing: "2.5px" }}>LIVE CHANNELS</div>
          {LIVE_CHANNELS.map(function(ch) { return <ChannelCard key={ch.id} ch={ch} active={liveCh.id === ch.id} onSelect={setLiveCh} />; })}
        </div>
      </div>
    )}
  </div>

  {/* FOOTER */}
  <div style={{ borderTop: "1px solid " + gold + "15", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
      <FalconSVG size={16} color={gold + "55"} />
      <span style={{ color: "#1a1a1a", fontSize: "10px", letterSpacing: "1.5px" }}>WAR UPDATE BY K.A.R 🇦🇪</span>
    </div>
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span style={{ color: "#161616", fontSize: "10px" }}>للاغراض الاخبارية فقط</span>
      <div style={{ display: "flex", height: "10px", width: "32px", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: "22%", background: "#c0392b" }} />
        <div style={{ flex: 1, background: "#00732f" }} />
        <div style={{ flex: 1, background: "#fff2" }} />
        <div style={{ flex: 1, background: "#111" }} />
      </div>
    </div>
  </div>
</div>
```

);
}
