import { useState, useEffect, useCallback, useRef, memo } from "react";
const API_KEY = "sk-ant-api03-zakPYUojOT4bAq7Y5MWzecXZIy2NlbaBL8MiEM5ABIG-E_oW-qObpuDaH6dN2AR
const AUTO_REFRESH_MINUTES = 10;
const TABS = [
{ id: "news", label: "اﻻﺧﺒﺎر", icon: { id: "map", label: "اﻟﺨﺮﯾﻄﺔ", { id: "stats", label: "اﺣﺼﺎء", { id: "ai", label: "ﻣﺤﻠﻞ AI", { id: "markets", label: "اﻻﺳﻮاق", icon: { id: "weather", label: "اﻟﻄﻘﺲ", { id: "timeline", label: "اﻟﺠﺪول", { id: "videos", label: "ﻓﯿﺪﯾﻮھﺎت", icon: " " },
{ id: "x", label: "X", { id: "live", label: "ﺑﺚ ﻣﺒﺎﺷﺮ", icon: " " " },
icon: " " },
icon: " " },
icon: " " },
" " },
icon: " " },
icon: " " },
icon: " " },
" },
;]
const CATEGORIES = [
emoji: " " },
emoji: " " },
emoji: " " },
{ id: "israel", label: "اﺳﺮاﺋﯿﻞ", emoji: " " },
{ id: "all", label: "اﻟﻜﻞ", emoji: " " },
{ id: "iran", label: "اﯾﺮان", { id: "gulf", label: "اﻟﺨﻠﯿﺞ", { id: "usa", label: "اﻣﺮﯾﻜﺎ", ;]
const CAT_COLORS = {
iran: { accent: "#c0392b", glow: "rgba(192,57,43,.4)", light: "#e74c3c", bg: "#140606" }
gulf: { accent: "#00732f", glow: "rgba(0,115,47,.4)", light: "#00c44f", bg: "#031408" }
usa: { accent: "#2471a3", glow: "rgba(36,113,163,.4)", light: "#3498db", bg: "#060c14" }
israel: { accent: "#7d3c98", glow: "rgba(125,60,152,.4)", light: "#9b59b6", bg: "#0a0612" }
all: { accent: "#c8960c", glow: "rgba(200,150,12,.4)", light: "#f0b429", bg: "#0d0b04" }
;}
const URGENCY_MAP = {
high: { label: "ﻋﺎﺟﻞ", color: "#e74c3c", pulse: true },
medium: { label: "ﻣﮭﻢ", color: "#f39c12", pulse: false },
low: { label: "ﻣﺘﺎﺑﻌﺔ", color: "#7f8c8d", pulse: false },
;}
const CAT_UNSPLASH = {
iran: ["photo-1597852074816-d57796d60ea6","photo-1564419320461-6870880221ad","photo-15760
gulf: ["photo-1512632578888-169bbbc64f33","photo-1555448248-2571daf6344b","photo-15124539
usa: ["photo-1515187029135-18ee286d815b","photo-1501594907352-04cda38ebc29","photo-14730
israel: ["photo-1544967082-d9d25d867d66","photo-1582555172866-f73bb12a2ab3","photo-15709573
;}
const LIVE_CHANNELS = [
ﺠﺰﯾﺮة" :flag: " ", color: "#c8960c", deﺮﺑﯿﺔ" : " ", color: "#1a6abf", Al JEnglish", flag: " ﻋﺮﺑﻲ" :flag: " ", color: "#c0392b", desﻋﺮﺑﻲ" :ag: " ", color: "#cc0000", deﺮﺑﯿﺔ" :flag: " ", color: "#0066cc", descﯾﺮdesc,", color: "#c8960c", desc: "Al
cid: " {
sc,"ﻋﺮﺑﻲ id: "bbc_arabic", name: "BB {
,"ﺳﻜﺎي ﻮز" :id: "sky_news_ar", name {
;]
// X/Twitter accounts to embed
const X_ACCOUNTS = [
رﯾﺔ" :flag: " ", color: "#1a6abf", desc ,"اﻟﻌﺮﺑﯿﺔ" :id: "AlArabiya", name {
ﯾﺮة" :flag: " ", color: "#c8960c", desc ,"اﻟﺠﺰﯾﺮة" :id: "AJArabic", name {
س" :id: "AFP", name: "AFP", flag: " ", color: "#e74c3c", desc {
ز" :id: "Reuters", name: "Reuters", flag: " ", color: "#f39c12", desc {
ﺑﻲ" :flag: " ", color: "#cc0000", desc ,"ﻋﺮﺑﻲ id: "BBCArabic", name: "BBC {
ﺔ" :id: "disclosetv", name: "Disclose TV", flag: " ", color: "#9b59b6", desc {
ة" :id: "BreakingNLive", name: "Breaking News Live", flag: " ", color: "#e74c3c", desc {
ت" :id: "spectatorindex", name: "Spectator Index", flag: " ", color: "#2ecc71", desc {
;]
// Tension heat data per country (0-100)
const TENSION_DATA = {
iran: { level: 85, trend: "up", events: 47, label: "اﯾﺮان", color: "#e74c3c", israel: { level: 78, trend: "up", events: 38, label: "اﺳﺮاﺋﯿﻞ", color: "#9b59b6", usa: { level: 62, trend: "same", events: 24, label: "اﻣﺮﯾﻜﺎ", color: "#3498db", gulf: { level: 45, trend: "down", events: 18, label: "اﻟﺨﻠﯿﺞ", color: "#00c44f", emoji:
emoji:
emoji:
emoji:
;}
// Hotspot locations on map (percentage positions)
const MAP_HOTSPOTS = [
{ id: "tehran", { id: "hormuz", { id: "gaza", { id: "lebanon", { id: "riyadh", { id: "dubai", { id: "baghdad", { id: "syria", { id: "yemen", { id: "strait", name: "ﻃﮭﺮان", name: "ھﺮﻣﺰ", name: "ﻏﺰة", name: "ﻟﺒﻨﺎن", name: "اﻟﺮﯾﺎض", name: "دﺑﻲ", name: "ﺑﻐﺪاد", name: "ﺳﻮرﯾﺎ", name: "اﻟﯿﻤﻦ", name: "ﻣﻀﯿﻖ ھﺮﻣﺰ", x: 68, y: 32, intensity: 90, country: "iran", x: 65, y: 52, intensity: 85, country: "iran", x: 40, y: 42, intensity: 95, country: "israel", si
x: 43, y: 35, intensity: 70, country: "israel", si
x: 57, y: 55, intensity: 40, country: "gulf", x: 66, y: 58, intensity: 30, country: "gulf", x: 60, y: 38, intensity: 65, country: "iran", x: 48, y: 30, intensity: 60, country: "israel", si
x: 55, y: 68, intensity: 75, country: "gulf", x: 67, y: 56, intensity: 80, country: "iran", si
si
si
si
si
si
si
;]
const DEMO_NEWS = [
ة ﻻﻏﻼق اﻟﻤﻀﯿﻖ اﻣﺎم اﻟﻤﻼﺣﺔ اﻟﺪوﻟﯿﺔ" :summary ,"ﻣﻨﺎورات ﻋﺴﻜﺮﯾﺔ اﯾﺮاﻧﯿﺔ ﻓﻲ ﻣﻀﯿﻖ ھﺮﻣﺰ" :title {
ﻄﻮرات اﻻﻣﻨﯿﺔ اﻟﻤﺘﺼﺎﻋﺪة ﻓﻲ اﻟﻤﻨﻄﻘﺔ" :summary ,"اﻟﻘﻤﺔ اﻟﺨﻠﯿﺠﯿﺔ ﺗﺒﺤﺚ اﻟﺘﺼﻌﯿﺪ اﻻﻗﻠﯿﻤﻲ" :title {
اﻟﻌﺮﺑﻲ ردا ﻋﻠﻰ اﻟﺘﻮﺗﺮات اﻟﻤﺘﺼﺎﻋﺪة" :summary ,"اﻻﺳﻄﻮل اﻻﻣﺮﯾﻜﻲ ﯾﻌﺰز وﺟﻮده ﻓﻲ اﻟﺨﻠﯿﺞ" :title {
ﺘﺮاض اﻟﺼﻮارﯾﺦ اﻟﺒﺎﻟﯿﺴﺘﯿﺔ اﻻﯾﺮاﻧﯿﺔ" :summary ,"اﺳﺮاﺋﯿﻞ ﺗﻜﺸﻒ ﻋﻦ ﻣﻨﻈﻮﻣﺔ دﻓﺎﻋﯿﺔ ﺟﺪﯾﺪة" :title {
م ﻓﻲ ﻣﻨﺸﺎة ﻧﻄﻨﺰ ﻣﻤﺎ اﺛﺎر ﻗﻠﻘﺎ دوﻟﯿﺎ" :summary ,"اﯾﺮان ﺗﺮﻓﻊ ﻣﺴﺘﻮى ﺗﺨﺼﯿﺐ اﻟﯿﻮراﻧﯿﻮم" :title {
ﻦ اﻟﻤﺤﺎدﺛﺎت اﻟﺪﺑﻠﻮﻣﺎﺳﯿﺔ ﺑﻮﺳﺎﻃﺔ ﺻﯿﻨﯿﺔ" :summary ,"اﻟﺮﯾﺎض وﻃﮭﺮان ﺗﺴﺘﺎﻧﻔﺎن اﻟﻤﺤﺎدﺛﺎت" :title {
;]
const DEMO_VIDEOS = [
ﺎﻣﻞ ﻋﻦ اﺧﺮ اﻟﺘﻄﻮرات اﻟﻌﺴﻜﺮﯾﺔ" :description ,"اﻟﺘﻮﺗﺮات اﻻﯾﺮاﻧﯿﺔ اﻻﻣﺮﯾﻜﯿﺔ ﻓﻲ اﻟﺨﻠﯿﺞ" :title {
"ﺗﺤﻠﯿﻞ ﻣﻌﻤﻖ ﻟﻠﻘﻮة اﻟﻌﺴﻜﺮﯾﺔ اﻻﺳﺮاﺋﯿﻠﯿﺔ" :description ,"اﻟﻘﺪرات اﻟﻌﺴﻜﺮﯾﺔ اﻻﺳﺮاﺋﯿﻠﯿﺔ" :title {
,"ﻛﯿﻒ ﺗﺘﻌﺎﻣﻞ دول اﻟﺨﻠﯿﺞ ﻣﻊ اﻟﺘﮭﺪﯾﺪات" :description ,"دول اﻟﺨﻠﯿﺞ واﺳﺘﺮاﺗﯿﺠﯿﺔ اﻻﻣﻦ" :title {
ﻦ اﻟﻘﻮاﻋﺪ واﻻﺳﺎﻃﯿﻞ اﻻﻣﺮﯾﻜﯿﺔ" :description ,"اﻟﻮﺟﻮد اﻟﻌﺴﻜﺮي اﻻﻣﺮﯾﻜﻲ ﻓﻲ اﻟﺸﺮق اﻻوﺳﻂ" :title {
ﯾﺚ ﻋﻦ اﻟﻤﻠﻒ اﻟﻨﻮوي اﻻﯾﺮاﻧﻲ" :description ,"اﻟﺒﺮﻧﺎﻣﺞ اﻟﻨﻮوي اﻻﯾﺮاﻧﻲ: اﺧﺮ اﻟﻤﺴﺘﺠﺪات" :title {
{ title: "2025 ﻣﻨﺎﻃﻖ اﻟﺘﻮﺗﺮ ﻓﻲ اﻟﺸﺮق اﻻوﺳﻂ", description: "ﺧﺮﯾﻄﺔ اﻟﺘﻮﺗﺮات ﻓﻲ اﻟﻤﻨﻄﻘﺔ", yout
;]
const NEWS_PROMPTS = {
all: "اﺧﺮ 6 اﺧﺒﺎر ﻋﺎﺟﻠﺔ ﻋﻦ اﯾﺮان واﻟﺨﻠﯿﺞ واﻣﺮﯾﻜﺎ واﺳﺮاﺋﯿﻞ. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title
iran: "اﺧﺮ 6 اﺧﺒﺎر ﻋﻦ اﯾﺮان. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title\":\"...\",\"summary\":\"...\",
gulf: "اﺧﺮ 6 اﺧﺒﺎر ﻋﻦ اﻟﺨﻠﯿﺞ. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title\":\"...\",\"summary\":\"...\"
usa: "اﺧﺮ 6 اﺧﺒﺎر ﻋﻦ اﻣﺮﯾﻜﺎ ﻓﻲ اﻟﺸﺮق اﻻوﺳﻂ. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title\":\"...\",\"su
israel: "اﺧﺮ 6 اﺧﺒﺎر ﻋﻦ اﺳﺮاﺋﯿﻞ. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title\":\"...\",\"summary\":\"...\
;}
const VIDEO_PROMPTS = {
all: "6 2025-2024 ﻓﯿﺪﯾﻮھﺎت ﯾﻮﺗﯿﻮب ﺣﻘﯿﻘﯿﺔ ﻋﻦ اﻟﺸﺮق اﻻوﺳﻂ. JSON ﻓﻘﻂ ﯾﺒﺪا ﺑـ [: [{\"title\"
iran: "6 2025 ﻓﯿﺪﯾﻮھﺎت ﯾﻮﺗﯿﻮب ﺣﻘﯿﻘﯿﺔ ﻋﻦ اﯾﺮان. JSON: [{\"title\":\"...\",\"description\":
gulf: "6 2025 ﻓﯿﺪﯾﻮھﺎت ﯾﻮﺗﯿﻮب ﺣﻘﯿﻘﯿﺔ ﻋﻦ اﻟﺨﻠﯿﺞ. JSON: [{\"title\":\"...\",\"description\"
usa: "6 2025 ﻓﯿﺪﯾﻮھﺎت ﯾﻮﺗﯿﻮب ﺣﻘﯿﻘﯿﺔ ﻋﻦ اﻣﺮﯾﻜﺎ واﻟﺸﺮق اﻻوﺳﻂ. JSON: [{\"title\":\"...\",\"
israel: "6 2025 ﻓﯿﺪﯾﻮھﺎت ﯾﻮﺗﯿﻮب ﺣﻘﯿﻘﯿﺔ ﻋﻦ اﺳﺮاﺋﯿﻞ. JSON: [{\"title\":\"...\",\"description\
;}
function getImg(catId, seed) {
var arr = CAT_UNSPLASH[catId] || CAT_UNSPLASH.iran;
return "https://images.unsplash.com/" + arr[seed % arr.length] + "?w=600&q=75&auto=format&f
}
function extractJSON(text) {
var m1 = text.match(/(\[[\s\S]*\])/);
if (m1) { try { return JSON.parse(m1[1]); } catch(e) {} }
var m2 = text.match(/\[[\s\S]+\]/);
if (m2) { try { return JSON.parse(m2[0]); } catch(e) {} }
throw new Error("no json");
}
async function callClaude(prompt, retries) {
if (retries === undefined) retries = 2;
if (!API_KEY || API_KEY === "YOUR_ANTHROPIC_API_KEY") throw new Error("NO_API_KEY");
for (var i = 0; i <= retries; i++) {
try {
var res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: {
"Content-Type": "application/json",
"x-api-key": API_KEY,
"anthropic-version": "2023-06-01",
"anthropic-dangerous-direct-browser-calls": "true",
},
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 1500,
tools: [{ type: "web_search_20250305", name: "web_search" }],
messages: [{ role: "user", content: prompt }],
}),
});
if (!res.ok) throw new Error("HTTP " + res.status);
var data = await res.json();
var txt = "";
if (data.content) {
for (var b = 0; b < data.content.length; b++) {
if (data.content[b].type === "text") { txt = data.content[b].text; break; }
}
}
return extractJSON(txt);
} catch(e) {
if (e.message === "NO_API_KEY") throw e;
if (i === retries) throw e;
await new Promise(function(r) { setTimeout(r, 1200 * (i + 1)); });
}
}
}
// ─── COMPONENTS ────────────────────────────────────────────────────────────────
function FalconSVG(props) {
var s = props.size || 36; var c = props.color || "#c8960c";
return (
<svg width={s} height={s} viewBox="0 0 80 80" fill="none">
<ellipse cx="40" cy="28" rx="11" ry="14" fill={c}/>
<path d="M29 32 Q16 50 8 70 Q26 57 40 59 Q54 57 72 70 Q64 50 51 32" fill={c} opacity="0
<path d="M40 44 L40 68" stroke={c} strokeWidth="2.5" opacity="0.6"/>
<circle cx="35" cy="23" r="2.5" fill="#0a0800"/>
<path d="M40 17 Q44 11 47 15" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="r
</svg>
;)
}
function UAEBar() {
return (
<div style={{ display: "flex", height: "3px", width: "100%", overflow: "hidden", borderRa
<div style={{ width: "22%", background: "#c0392b" }} />
<div style={{ flex: 1, background: "#00732f" }} />
<div style={{ flex: 1, background: "#ffffff22" }} />
<div style={{ flex: 1, background: "#111" }} />
</div>
;)
}
// Alert notification component
function AlertBanner(props) {
var alerts = props.alerts; var onClose = props.onClose;
if (!alerts || alerts.length === 0) return null;
var alert = alerts[0];
return (
<div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIn
<span style={{ fontSize: "18px", animation: "pulse 0.8s infinite" }}> </span>
<div style={{ flex: 1 }}>
<div style={{ color: "#e74c3c", fontWeight: "900", fontSize: "11px", letterSpacing: "
<div style={{ color: "#f0ece4", fontSize: "13px", fontWeight: "600", direction: "rtl"
</div>
<button onClick={onClose} style={{ background: "none", border: "none", color: "#555", f
</div>
;)
}
// Tension Heat Meter
function TensionMeter() {
var overall = Math.round(Object.values(TENSION_DATA).reduce(function(s, d) { return s + d.l
var color = overall > 75 ? "#e74c3c" : overall > 50 ? "#f39c12" : "#2ecc71";
;"ﺗﻮﺗﺮ ﻣﺘﻮﺳﻂ" : "ھﺎدئ ﻧﺴﺒﯿﺎ" ? 50 > overall : "ﺗﻮﺗﺮ ﺷﺪﯾﺪ" ? 75 > var label = overall
return (
<div style={{ background: "linear-gradient(135deg,#0d0b04,#0a0a0a)", border: "1px solid #
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", m
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<span style={{ fontSize: "18px" }}> </span>
ﻮﺗﺮ اﻻﻗﻠﯿﻤﻲ>}} "span style={{ color: "#c8960c", fontWeight: "800", fontSize: "14px<
</div>
<div style={{ background: color + "22", border: "1px solid " + color + "55", borderRa
{label} — {overall}%
</div>
</div>
{/* Overall bar */}
<div style={{ background: "#111", borderRadius: "8px", height: "10px", marginBottom: "1
<div style={{ height: "100%", width: overall + "%", background: "linear-gradient(90de
</div>
: "#88
{/* Per country */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr)
{Object.values(TENSION_DATA).map(function(d) {
var col = d.level > 75 ? "#e74c3c" : d.level > 50 ? "#f39c12" : "#2ecc71";
var trendIcon = d.trend === "up" ? "▲" : d.trend === "down" ? "▼" : "●";
var trendCol = d.trend === "up" ? "#e74c3c" : d.trend === "down" ? "#2ecc71" return (
<div key={d.label} style={{ background: "#0d0d0d", borderRadius: "10px", padding:
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "ce
<span style={{ color: "#ccc", fontSize: "13px", fontWeight: "700" }}>{d.emoji
<span style={{ color: trendCol, fontSize: "12px", fontWeight: "800" }}>{trend
</div>
<div style={{ background: "#1a1a1a", borderRadius: "6px", height: "7px", overfl
<div style={{ height: "100%", width: d.level + "%", background: "linear-gradi
</div>
<div style={{ color: "#333", fontSize: "10px", marginTop: "6px", textAlign: "ri
</div>
;)
})}
</div>
</div>
;)
}
// Interactive Map
function ConflictMap() {
var s = useState(null); var selected = s[0]; var setSelected = s[1];
return (
<div style={{ background: "linear-gradient(135deg,#060c14,#0a0a0a)", border: "1px solid #
<div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.05)", di
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<span style={{ fontSize: "18px" }}> </span>
اﻟﺸﺮق اﻻوﺳﻂ>}} "span style={{ color: "#3498db", fontWeight: "800", fontSize: "14px<
</div>
<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
{[{ label: "ﺷﺪﯾﺪ", color: "#e74c3c" }, { label: "ﻣﺘﻮﺳﻂ", color: "#f39c12" }, return (
<div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }
<div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }
<span style={{ color: "#444", fontSize: "11px" }}>{l.label}</span>
{ labe
</div>
;)
})}
</div>
</div>
{/* Map container */}
<div style={{ position: "relative", background: "linear-gradient(180deg,#060e1a 0%,#081
{/* Background map image */}
<img
src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=60&auto=form
alt="map"
style={{ width: "100%", height: "420px", objectFit: "cover", opacity: 0.18, display
>/
{/* Grid overlay */}
<div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(
{/* Country labels */}
[{
{ name: "اﯾﺮان", x: 64, y: 28, color: "#e74c3c" },
{ name: "اﻟﻌﺮاق", x: 57, y: 34, color: "#f39c12" },
{ name: "ﺳﻮرﯾﺎ", x: 46, y: 26, color: "#f39c12" },
{ name: "اﻟﺴﻌﻮدﯾﺔ", x: 54, y: 54, color: "#00c44f" },
{ name: "اﻻﻣﺎرات", x: 66, y: 57, color: "#00c44f" },
{ name: "اﺳﺮاﺋﯿﻞ", x: 39, y: 40, color: "#9b59b6" },
{ name: "اﻟﯿﻤﻦ", x: 53, y: 66, color: "#f39c12" },
{ name: "ﻟﺒﻨﺎن", x: 42, y: 32, color: "#e74c3c" },
].map(function(c) {
return (
<div key={c.name} style={{ position: "absolute", left: c.x + "%", top: c.y {c.name}
</div>
+ "%",
;)
})}
{/* Hotspots */}
{MAP_HOTSPOTS.map(function(spot) {
var col = CAT_COLORS[spot.country] ? CAT_COLORS[spot.country].accent : "#e74c3c";
var isSelected = selected && selected.id === spot.id;
var r = Math.round(spot.size / 2);
return (
<div key={spot.id} onClick={function() { setSelected(isSelected ? null : spot); }
style={{ position: "absolute", left: spot.x + "%", top: spot.y + "%", transform
{/* Pulse rings */}
<div style={{ position: "absolute", top: "50%", left: "50%", transform: "transl
<div style={{ position: "absolute", top: "50%", left: "50%", transform: "transl
{/* Dot */}
<div style={{ width: spot.size + "px", height: spot.size + "px", borderRadius:
{/* Label on select */}
{isSelected && (
<div style={{ position: "absolute", top: "120%", left: "50%", transform: "tra
<div style={{ color: col, fontWeight: "800", fontSize: "12px" }}>{spot.name
ى اﻟﺘﻮﺗﺮ>}} "div style={{ color: "#888", fontSize: "10px", marginTop: "2px<
</div>
})
</div>
;)
})}
{/* Corner label */}
<div style={{ position: "absolute", bottom: 10, right: 14, color: "#ffffff0a", </div>
fontSi
{/* Hotspot list */}
<div style={{ padding: "14px 18px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
{MAP_HOTSPOTS.sort(function(a, b) { return b.intensity - a.intensity; }).slice(0, 5).
var col = CAT_COLORS[spot.country] ? CAT_COLORS[spot.country].accent : "#e74c3c";
return (
<div key={spot.id} onClick={function() { setSelected(selected && selected.id ===
style={{ background: col + "14", border: "1px solid " + col + "44", borderRadiu
<span style={{ width: 6, height: 6, borderRadius: "50%", background: col, displ
<span style={{ color: col, fontSize: "12px", fontWeight: "700" }}>{spot.name}</
<span style={{ color: "#444", fontSize: "10px" }}>{spot.intensity}%</span>
</div>
;)
})}
</div>
</div>
;)
}
// Stats Panel
function StatsPanel(props) {
var news = props.news;
var totalEvents = Object.values(TENSION_DATA).reduce(function(s, d) { return s + d.events;
return (
<div>
{/* Top cards */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr)
[{
ع" :value: totalEvents, icon: " ", color: "#f39c12", sub ,"اﺟﻤﺎﻟﻲ اﻻﺣﺪاث" :label {
{ label: "اﺧﺒﺎر ﻋﺎﺟﻠﺔ", value: news.filter(function(n) { return n.urgency === "high
{ label: "ﻣﻨﺎﻃﻖ ﺳﺎﺧﻨﺔ", value: MAP_HOTSPOTS.filter(function(h) { return h.intensity
{ label: "ﻗﻨﻮات ﻣﺒﺎﺷﺮة", value: LIVE_CHANNELS.length, icon: " ].map(function(card) {
", color: "#3498db",
return (
<div key={card.label} style={{ background: "linear-gradient(135deg,#0d0d0d,#0a0a0
<div style={{ fontSize: "22px", marginBottom: "8px" }}>{card.icon}</div>
<div style={{ color: card.color, fontSize: "28px", fontWeight: "900", lineHeigh
<div style={{ color: "#ccc", fontSize: "12px", marginTop: "6px", fontWeight: "6
<div style={{ color: "#333", fontSize: "10px", marginTop: "3px" }}>{card.sub}</
</div>
;)
})}
</div>
{/* Tension meter in stats */}
<TensionMeter />
{/* Activity timeline */}
<div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,.06)", borderR
<div style={{ color: "#c8960c", fontWeight: "800", fontSize: "14px", marginBottom: "1
ﺳﺠﻞ اﻟﻨﺸﺎط اﻻﺧﯿﺮ >span> </span<
</div>
{news.slice(0, 5).map(function(item, i) {
var col = CAT_COLORS[item.category] || CAT_COLORS.all;
var urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
return (
<div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding
<div style={{ width: 8, height: 8, borderRadius: "50%", background: urg.color,
<div style={{ flex: 1, color: "#bbb", fontSize: "13px", direction: "rtl", textA
<div style={{ color: "#333", fontSize: "10px", flexShrink: 0, fontFamily: "mono
</div>
;)
})}
</div>
</div>
;)
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
.)ﺗﻮﯾﺘﺮ( X ﻋﻠﻰ ﻣﻨﺼﺔ " + acc.id + "@ اﻋﻄﻨﻲ اﺧﺮ 6 اﺧﺒﺎر او ﺗﻐﺮﯾﺪات ﻧﺸﺮھﺎ ﺣﺴﺎب" = var prompt
callClaude(prompt).then(function(data) {
setCache(function(prev) { var n = {}; Object.assign(n, prev); n[acc.id] = data; return
setItems(data);
}).catch(function(e) {
if (e.message === "NO_API_KEY") {
var demo = [
{ text: "ﻋﺎﺟﻞ: ﺗﻄﻮرات ﻣﯿﺪاﻧﯿﺔ ﺟﺪﯾﺪة ﻓﻲ اﻟﻤﻨﻄﻘﺔ", time: "ﻣﻨﺬ 5 دﻗﺎﺋﻖ", likes: "2.4K"
{ text: "ﻣﺼﺎدر: اﺟﺘﻤﺎع ﻃﺎرئ ﻟﺒﺤﺚ اﻟﺘﺼﻌﯿﺪ اﻻﺧﯿﺮ", time: "ﻣﻨﺬ 20 دﻗﯿﻘﺔ", likes: "1.1K
{ text: "ﺗﻘﺮﯾﺮ: ﺣﺮﻛﺔ ﻋﺴﻜﺮﯾﺔ ﻏﯿﺮ اﻋﺘﯿﺎدﯾﺔ رﺻﺪت ﻗﺮب اﻟﺤﺪود", time: "ﻣﻨﺬ 45 دﻗﯿﻘﺔ", li
{ text: "ﺑﯿﺎن رﺳﻤﻲ: ﻣﻮﻗﻒ اﻟﺤﻜﻮﻣﺔ ﻣﻦ اﻻﺣﺪاث اﻻﺧﯿﺮة", time: "ﻣﻨﺬ ﺳﺎﻋﺔ", likes: "560",
{ text: "ﻣﺤﻠﻞ: اﻟﻮﺿﻊ ﻗﺎﺑﻞ ﻟﻼﻧﻔﺠﺎر ﻓﻲ اي ﻟﺤﻈﺔ", time: "ﻣﻨﺬ ﺳﺎﻋﺘﯿﻦ", likes: "340", ur
{ text: "ﻣﺘﺎﺑﻌﺔ: اﺳﺘﻤﺮار اﻟﻤﻔﺎوﺿﺎت ﺧﻠﻒ اﻟﻜﻮاﻟﯿﺲ", time: "ﻣﻨﺬ 3 ﺳﺎﻋﺎت", likes: "210"
;]
setItems(demo);
setCache(function(prev) { var n = {}; Object.assign(n, prev); n[acc.id] = demo; retur
} else { setError("ﺗﻌﺬر ﺗﺤﻤﯿﻞ — " + e.message); }
}).finally(function() { setLoading(false); });
}
useEffect(function() { loadFeed(X_ACCOUNTS[0]); }, []);
return (
<div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", alignItems:
{/* Account list */}
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ color: "#ffffff18", fontSize: "9px", letterSpacing: "2px", marginBottom
{X_ACCOUNTS.map(function(acc) {
var active = selected.id === acc.id;
return (
<div key={acc.id} onClick={function() { loadFeed(acc); }}
style={{ background: active ? acc.color + "20" : "#0f0f0f", border: "1px solid
<div style={{ width: 32, height: 32, borderRadius: "50%", background: acc.color
{acc.flag}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ color: active ? "#fff" : "#bbb", fontWeight: "700", fontSize: "
<div style={{ color: "#282828", fontSize: "10px" }}>{acc.desc}</div>
</div>
{active && loading && <span style={{ color: acc.color, fontSize: "12px", animat
{active && !loading && <div style={{ width: 6, height: 6, borderRadius: "50%",
</div>
;)
})}
</div>
{/* Feed */}
<div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,.07)", borderR
{/* Header */}
<div style={{ padding: "11px 16px", background: "#0f0f0f", borderBottom: "1px solid r
<span style={{ fontSize: "15px" }}>{selected.flag}</span>
<span style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>@{selected.id}
<span style={{ color: "#383838", fontSize: "11px" }}>{selected.desc}</span>
<div style={{ marginRight: "auto", display: "flex", gap: "8px" }}>
<button onClick={function() {
setCache(function(prev) { var n = {}; Object.assign(n, prev); delete n[selected
loadFeed(selected);
}} style={{ background: "rgba(200,150,12,.1)", border: "1px solid #c8960c44", col
ﺗﺤﺪﯾﺚ ⟳
</button>
<a href={"https://x.com/" + selected.id} target="_blank" rel="noopener noreferrer
style={{ background: "#111", border: "1px solid #2a2a2a", color: "#888", border
↗ X ﻓﺘﺢ ﻓﻲ
</a>
</div>
</div>
{/* Content */}
<div style={{ padding: "14px 16px", minHeight: "300px" }}>
{loading && (
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
{[0,1,2,3].map(function(i) {
return (
<div key={i} style={{ background: "#111", borderRadius: "10px", padding: "1
<div style={{ height: "11px", background: "#1a1a1a", borderRadius: <div style={{ height: "11px", background: "#181818", borderRadius: </div>
"4px",
"4px",
;)
})}
</div>
})
{error && !loading && (
<div style={{ color: "#e74c3c", padding: "30px", textAlign: "center", fontSize: "
{error}
</div>
})
{!loading && items.length > 0 && (
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
{items.map(function(item, i) {
var urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
return (
<div key={i} style={{ background: "linear-gradient(135deg,#111,#0d0d0d)", b
<div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3
<div style={{ display: "flex", alignItems: "flex-start", gap: "10px", dir
<div style={{ flex: 1 }}>
<p style={{ color: "#ddd", fontSize: "13.5px", lineHeight: "1.8", mar
<div style={{ display: "flex", alignItems: "center", gap: "12px", mar
<span style={{ color: "#282828", fontSize: "11px", fontFamily: "mon
{item.likes && <span style={{ color: "#282828", fontSize: "11px" }}
<span style={{ background: urg.color + "22", color: urg.color, bord
{urg.pulse && <span style={{ width: 5, height: 5, borderRadius: "
{urg.label}
</span>
</div>
</div>
</div>
</div>
;)
})}
</div>
})
</div>
</div>
</div>
;)
}
// ── AI ANALYST ────────────────────────────────────────────────────────────────
function AIAnalyst() {
var s1 = useState(""); var q = s1[0]; var setQ = s1[1];
var s2 = useState(""); var answer = s2[0]; var setAnswer = s2[1];
var s3 = useState(false); var loading = s3[0]; var setLoading = s3[1];
var s4 = useState([]); var history = s4[0]; var setHistory = s4[1];
var QUICK = [
,"ﻣﺎ اﺣﺘﻤﺎل اﻧﺪﻻع ﺣﺮب ﺑﯿﻦ اﯾﺮان واﺳﺮاﺋﯿﻞ؟"
,"ﻣﺎ ﺗﺪاﻋﯿﺎت اﻏﻼق ﻣﻀﯿﻖ ھﺮﻣﺰ ﻋﻠﻰ اﻟﻨﻔﻂ اﻟﻌﺎﻟﻤﻲ؟"
,"ﻛﯿﻒ ﯾﺆﺛﺮ اﻟﻮﺿﻊ اﻟﺤﺎﻟﻲ ﻋﻠﻰ اﻻﻗﺘﺼﺎد اﻟﺨﻠﯿﺠﻲ؟"
,"ﻣﺎ ﻣﻮﻗﻒ اﻣﺮﯾﻜﺎ ﻣﻦ اﻟﺘﺼﻌﯿﺪ اﻻﺧﯿﺮ؟"
;]
function ask(question) {
var qq = question || q;
if (!qq.trim()) return;
setLoading(true); setAnswer(""); setQ("");
ﻣﺘﺨﺼﺺ ﻓﻲ ﺷﺆون اﻟﺸﺮق اﻻوﺳﻂ. اﺟﺐ ﻋﻠﻰ ھﺬا اﻟﺴﺆال ﺑﺘﺤﻠﯿﻞ دﻗﯿﻖ وﻣﺨﺘﺼﺮ )150 ﻛﻠﻤﺔ(" = var prompt
اﻻول ﻣﻦ .API key ﻻ ﯾﻤﻜﻦ اﻻﺟﺎﺑﺔ ﺑﺪون" :callClaude(prompt).catch(function() { return [{text
.then(function(r) {
var txt = Array.isArray(r) ? r[0].text : JSON.stringify(r);
setAnswer(txt);
setHistory(function(h) { return [{q: qq, a: txt}].concat(h).slice(0, 5); });
}).finally(function() { setLoading(false); });
}
return (
<div>
<div style={{ background: "linear-gradient(135deg,#080c08,#0a0a0a)", border: "1px solid
<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px
<span style={{ fontSize: "22px" }}> </span>
<div>
ﺤﻠﻞ اﻻﺣﺪاث>}} "div style={{ color: "#2ecc71", fontWeight: "800", fontSize: "15px<
ﻦ اي ﺣﺪث واﺣﺼﻞ ﻋﻠﻰ ﺗﺤﻠﯿﻞ ﻓﻮري>}} "div style={{ color: "#2a2a2a", fontSize: "11px<
</div>
</div>
{/* Quick questions */}
<div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "14px" }}>
{QUICK.map(function(qq, i) {
return (
<button key={i} onClick={function() { ask(qq); }} style={{ background: "rgba(46
{qq}
</button>
;)
})}
</div>
{/* Input */}
<div style={{ display: "flex", gap: "8px" }}>
<input value={q} onChange={function(e) { setQ(e.target.value); }}
onKeyDown={function(e) { if (e.key === "Enter") ask(); }}
"...اﻛﺘﺐ ﺳﺆاﻟﻚ ھﻨﺎ"=placeholder
style={{ flex: 1, background: "#111", border: "1px solid rgba(46,204,113,.2)", bo
<button onClick={function() { ask(); }} disabled={loading || !q.trim()} style={{ ba
{loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-
</button>
</div>
{/* Answer */}
{answer && (
<div style={{ marginTop: "16px", background: "#0d0d0d", border: "1px solid rgba(46,
<div style={{ color: "#2ecc71", fontSize: "11px", fontWeight: "700", marginBottom
<p style={{ color: "#ccc", fontSize: "13.5px", lineHeight: "2", margin: 0, direct
</div>
})
</div>
{/* History */}
{history.length > 0 && (
<div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,.06)", borde
<div style={{ color: "#555", fontSize: "11px", fontWeight: "700", marginBottom: "12
{history.map(function(h, i) {
return (
<div key={i} style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(25
<div style={{ color: "#2ecc71", fontSize: "12px", fontWeight: "700", directio
<div style={{ color: "#666", fontSize: "12px", lineHeight: "1.8", direction:
</div>
;)
})}
</div>
})
</div>
;)
}
// ── MARKETS ───────────────────────────────────────────────────────────────────
var MARKET_ITEMS = [
{ id: "oil_brent", name: "ﻧﻔﻂ ﺑﺮﻧﺖ", symbol: "BRENT", unit: "$/ﺑﺮﻣﯿﻞ", base: 82.4, co
{ id: "oil_wti", name: "ﻧﻔﻂ WTI", symbol: "WTI", unit: "$/ﺑﺮﻣﯿﻞ", base: 78.6, co
{ id: "gold", name: "اﻟﺬھﺐ", symbol: "XAU", unit: "$/أوﻗﯿﺔ", base: 2320, co
{ id: "silver", name: "اﻟﻔﻀﺔ", symbol: "XAG", unit: "$/أوﻗﯿﺔ", base: 27.4, co
{ id: "usd_aed", name: "دوﻻر/درھﻢ", symbol: "AED", unit: "درھﻢ", base: 3.672, col
{ id: "usd_sar", name: "دوﻻر/﷼", symbol: "SAR", unit: "﷼", base: 3.750, color: "#
;]
function MarketsPanel() {
var s1 = useState(function() {
var obj = {};
MARKET_ITEMS.forEach(function(m) {
var change = (Math.random() - 0.48) * 2;
obj[m.id] = { price: m.base + change * (m.base * 0.01), change: change, pct: (change /
;)}
return obj;
}); var prices = s1[0]; var setPrices = s1[1];
var s2 = useState(null); var lastUpdate = s2[0]; var setLastUpdate = s2[1];
function refresh() {
var obj = {};
MARKET_ITEMS.forEach(function(m) {
var change = (Math.random() - 0.48) * 2;
obj[m.id] = { price: m.base + change * (m.base * 0.01), change: change, pct: (change /
;)}
setPrices(obj);
setLastUpdate(new Date().toLocaleTimeString("ar-AE"));
}
useEffect(function() {
setLastUpdate(new Date().toLocaleTimeString("ar-AE"));
var t = setInterval(refresh, 30000);
return function() { clearInterval(t); };
;)][ ,}
return (
<div>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", m
<div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
<span style={{ fontSize: "20px" }}> </span>
وذھﺐ وﻋﻤﻼت>}} "span style={{ color: "#c8960c", fontWeight: "800", fontSize: "15px<
</div>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
{lastUpdate && <span style={{ color: "#282828", fontSize: "10px", fontFamily: "mono
<button onClick={refresh} style={{ background: "rgba(200,150,12,.1)", border: "1px
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr)
{MARKET_ITEMS.map(function(m) {
var p = prices[m.id] || { price: m.base, change: 0, pct: 0 };
var up = p.change >= 0;
var col = up ? "#2ecc71" : "#e74c3c";
return (
<div key={m.id} style={{ background: "linear-gradient(135deg,#0d0d0d,#0a0a0a)", b
<div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", b
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-bet
<span style={{ fontSize: "20px" }}>{m.icon}</span>
<span style={{ color: col, fontSize: "11px", fontWeight: "800", background: c
{up ? "▲" : "▼"} {Math.abs(p.pct).toFixed(2)}%
</span>
</div>
<div style={{ color: "#888", fontSize: "11px", marginBottom: "4px", direction:
<div style={{ color: "#f0ece4", fontSize: "20px", fontWeight: "900", fontFamily
{p.price.toFixed(m.base > 100 ? 1 : 3)}
</div>
<div style={{ color: "#333", fontSize: "10px", textAlign: "right", marginTop: "
<div style={{ color: col, fontSize: "11px", textAlign: "right", marginTop: "4px
{up ? "+" : ""}{p.change.toFixed(m.base > 100 ? 1 : 3)}
</div>
</div>
;)
})}
</div>
{/* Oil price note */}
<div style={{ background: "#0d0d0d", border: "1px solid rgba(200,150,12,.15)", borderRa
<span style={{ fontSize: "16px" }}> </span>
<p style={{ color: "#444", fontSize: "12px", direction: "rtl", textAlign: "right", ma
اﻻﺣﺪاث ﻋﻠﻰ اﻻﺳﻌﺎر AI ﻟﻠﺤﺼﻮل ﻋﻠﻰ ﺗﺤﻠﯿﻞ API key اﻻﺳﻌﺎر ﺗﻘﺮﯾﺒﯿﺔ ﻣﺤﺪﺛﺔ ﻛﻞ 30 ﺛﺎﻧﯿﺔ. اﺿﻒ
</p>
</div>
</div>
;)
}
// ── WEATHER ───────────────────────────────────────────────────────────────────
var CITIES = [
{ id: "dubai", name: "دﺑﻲ", flag: " ", lat: 25.2, lon: 55.3, color: "#00c44f" },
{ id: "abudhabi", name: "اﺑﻮﻇﺒﻲ", flag: " ", lat: 24.5, lon: 54.4, color: "#00a846" },
{ id: "tehran", name: "ﻃﮭﺮان", flag: " ", lat: 35.7, lon: 51.4, color: "#e74c3c" },
{ id: "telaviv", name: "ﺗﻞ اﺑﯿﺐ", flag: " ", lat: 32.1, lon: 34.8, color: "#9b59b6" },
{ id: "baghdad", name: "ﺑﻐﺪاد", flag: " ", lat: 33.3, lon: 44.4, color: "#f39c12" },
{ id: "riyadh", name: "اﻟﺮﯾﺎض", flag: " ", lat: 24.7, lon: 46.7, color: "#3498db" },
{ id: "muscat", name: "ﻣﺴﻘﻂ", flag: " ", lat: 23.6, lon: 58.6, color: "#2ecc71" },
{ id: "kuwait", name: "اﻟﻜﻮﯾﺖ", flag: " ", lat: 29.4, lon: 47.9, color: "#c8960c" },
;]
var DEMO_WEATHER = {
dubai: { temp: 38, feels: 41, humidity: 55, wind: 18, desc: "ﻣﺸﻤﺲ", icon: " abudhabi: { temp: 37, feels: 40, humidity: 52, wind: 15, desc: "ﺻﺎﻓﻲ", icon: " tehran: { temp: 22, feels: 20, humidity: 38, wind: 12, desc: "ﻏﺎﺋﻢ ﺟﺰﺋﯿﺎ", icon: " telaviv: { temp: 26, feels: 27, humidity: 68, wind: 22, desc: "ﻣﻌﺘﺪل", icon: " baghdad: { temp: 34, feels: 36, humidity: 30, wind: 14, desc: "ﻣﺸﻤﺲ", icon: " riyadh: { temp: 36, feels: 38, humidity: 20, wind: 10, desc: "ﺻﺎﻓﻲ", icon: " muscat: { temp: 35, feels: 40, humidity: 65, wind: 20, desc: "رﻃﺐ", icon: " kuwait: { temp: 39, feels: 43, humidity: 28, wind: 16, desc: "ﺣﺎر", icon: " " },
" },
" },
" },
" },
" },
" },
" },
;}
function WeatherPanel() {
var s1 = useState(DEMO_WEATHER); var weather = s1[0];
return (
<div>
<div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "16px" }
<span style={{ fontSize: "20px" }}> </span>
ﻨﻄﻘﺔ اﻟﺘﻮﺗﺮات>}} "span style={{ color: "#3498db", fontWeight: "800", fontSize: "15px<
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr)
{CITIES.map(function(city) {
var w = weather[city.id];
if (!w) return null;
return (
<div key={city.id} style={{ background: "linear-gradient(160deg,#0d0d0d,#0a0a0a)"
<div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", b
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "fl
<div>
<div style={{ color: city.color, fontWeight: "800", fontSize: "13px" <div style={{ color: "#333", fontSize: "10px", marginTop: "2px" }}>{w.desc}
</div>
<span style={{ fontSize: "26px" }}>{w.icon}</span>
}}>{ci
</div>
<div style={{ color: "#f0ece4", fontSize: "32px", fontWeight: "900", fontFamily
<div style={{ color: "#444", fontSize: "10px", textAlign: "right", marginTop: "
<div style={{ display: "flex", justifyContent: "space-between", marginTop: "12p
<div style={{ textAlign: "center" }}>
<div style={{ color: "#333", fontSize: "9px" }}> </div>
<div style={{ color: "#888", fontSize: "11px", fontWeight: "700" }}>{w.humi
</div>
<div style={{ textAlign: "center" }}>
<div style={{ color: "#333", fontSize: "9px" }}> </div>
<div style={{ color: "#888", fontSize: "11px", fontWeight: "700" }}>{w.wind
</div>
</div>
</div>
;)
})}
</div>
</div>
;)
}
// ── TIMELINE ──────────────────────────────────────────────────────────────────
var TIMELINE_EVENTS = [
ﺳﻌﺔ ﻓﻲ ﻣﻀﯿﻖ ھﺮﻣﺰ" :desc ,"ﻣﻨﺎورات اﯾﺮاﻧﯿﺔ ﻓﻲ ھﺮﻣﺰ" :time: "10:30", title ,"ﻣﺎرس 12" :date {
ﺟﯿﺔ اﻟﺨﻠﯿﺞ ﻟﺒﺤﺚ اﻟﺘﺼﻌﯿﺪ" :desc ,"ﻗﻤﺔ ﺧﻠﯿﺠﯿﺔ ﻃﺎرﺋﺔ" :time: "18:00", title ,"ﻣﺎرس 11" :date {
ﯿﺔ اﻟﻰ اﻟﻤﻨﻄﻘﺔ" :desc ,"ﺗﻌﺰﯾﺰات اﻣﺮﯾﻜﯿﺔ ﻓﻲ اﻟﺨﻠﯿﺞ" :time: "09:15", title ,"ﻣﺎرس 11" :date {
اﻟﺤﺪود اﻟﺸﻤﺎﻟﯿﺔ" :desc ,"اﺳﺮاﺋﯿﻞ ﺗﻌﻠﻦ ﺣﺎﻟﺔ اﻟﺘﺄھﺐ" :time: "22:00", title ,"ﻣﺎرس 10" :date {
ﺘﺨﺼﯿﺐ اﻟﻰ 84" :desc ,"اﯾﺮان ﺗﺮﻓﻊ ﺗﺨﺼﯿﺐ اﻟﯿﻮراﻧﯿﻮم" :time: "14:30", title ,"ﻣﺎرس 10" :date {
اﻟﻤﺤﺎدﺛﺎت ﻓﻲ ﺑﻜﯿﻦ" :desc ,"ﻣﺤﺎدﺛﺎت ﺳﻌﻮدﯾﺔ اﯾﺮاﻧﯿﺔ" :time: "11:00", title ,"ﻣﺎرس 9" :date {
ﺟﺪﯾﺪة ﻋﻠﻰ ﻣﻮاﻗﻊ ﻓﻲ اﻟﯿﻤﻦ" :desc ,"ﺿﺮﺑﺎت ﻋﻠﻰ اﻟﯿﻤﻦ" :time: "16:45", title ,"ﻣﺎرس 8" :date {
ﺮﻛﺔ ﻓﻲ اﻟﻤﺘﻮﺳﻂ" :desc ,"ﻣﻨﺎورات اﺳﺮاﺋﯿﻠﯿﺔ اﻣﺮﯾﻜﯿﺔ" :time: "08:00", title ,"ﻣﺎرس 7" :date {
;]
function TimelinePanel() {
var s1 = useState("all"); var filter = s1[0]; var setFilter = s1[1];
var filtered = filter === "all" ? TIMELINE_EVENTS : TIMELINE_EVENTS.filter(function(e) { re
return (
<div>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", m
<div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
<span style={{ fontSize: "20px" }}> </span>
ھﺬا اﻻﺳﺒﻮع>}} "span style={{ color: "#9b59b6", fontWeight: "800", fontSize: "15px<
</div>
<div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
{CATEGORIES.map(function(c) {
var active = filter === c.id;
var col = CAT_COLORS[c.id] || CAT_COLORS.all;
return (
<button key={c.id} onClick={function() { setFilter(c.id); }} style={{ backgroun
{c.emoji} {c.label}
</button>
);
})}
</div>
</div>
<div style={{ position: "relative", paddingRight: "20px" }}>
{/* Vertical line */}
<div style={{ position: "absolute", right: "6px", top: 0, bottom: 0, width: "2px", ba
<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
{filtered.map(function(ev, i) {
var col = CAT_COLORS[ev.category] || CAT_COLORS.all;
var urg = URGENCY_MAP[ev.urgency] || URGENCY_MAP.medium;
return (
<div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start", p
{/* Dot */}
<div style={{ position: "absolute", right: "-14px", top: "14px", width: "10px
<div style={{ background: "linear-gradient(135deg," + col.bg + ",#0a0a0a)", b
<div style={{ display: "flex", justifyContent: "space-between", alignItems:
<h4 style={{ color: "#eee", fontSize: "13px", fontWeight: "700", margin:
<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
<span style={{ color: "#333", fontSize: "10px", fontFamily: "monospace"
<span style={{ background: urg.color + "22", color: urg.color, borderRa
</div>
</div>
<p style={{ color: "#555", fontSize: "12px", margin: 0, lineHeight: "1.7" }
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
background: "linear-gradient(155deg," + col.bg + " 0%,#060606 100%)",
border: "1px solid " + (open ? col.accent + "cc" : "rgba(255,255,255,.07)"),
borderRadius: "14px", overflow: "hidden", cursor: "pointer",
transition: "all .25s", position: "relative",
boxShadow: open ? "0 0 30px " + col.glow : "0 2px 14px rgba(0,0,0,.7)",
}}>
{!imgErr && (
<div style={{ position: "relative", height: "148px", overflow: "hidden" }}>
<img src={getImg(item.category, index)} alt="" onError={function() { setImgErr(true
style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.
<div style={{ position: "absolute", inset: 0, background: "linear-gradient(to botto
<div style={{ position: "absolute", top: 10, right: 10, background: urg.color + "ee
{urg.pulse && <span style={{ width: 6, height: 6, borderRadius: "50%", background
{urg.label}
</div>
{cat && <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,
</div>
)}
<div style={{ padding: "12px 15px 10px" }}>
<div style={{ color: "#2e2e2e", fontSize: "10px", marginBottom: "5px", textAlign: "ri
<h3 style={{ color: "#ede9e1", fontSize: "14px", fontWeight: "700", lineHeight: "1.7"
{open && <p style={{ color: "#888", fontSize: "13px", lineHeight: "1.9", margin: "10p
<div style={{ color: "#1e1e1e", fontSize: "10px", textAlign: "center", marginTop: "8p
</div>
<div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", backgroun
</div>
);
});
const VideoCard = memo(function VideoCard(props) {
var item = props.item; var index = props.index;
var s1 = useState(false); var playing = s1[0]; var setPlaying = s1[1];
var col = CAT_COLORS[item.category] || CAT_COLORS.all;
var cat = CATEGORIES.find(function(c) { return c.id === item.category; });
return (
<div style={{ background: "#0d0d0d", border: "1px solid " + (playing ? col.accent + "99"
{playing ? (
<div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
<iframe style={{ position: "absolute", inset: 0, width: "100%", height: "100%", bor
src={"https://www.youtube.com/embed/" + item.youtubeId + "?autoplay=1&rel=0&modes
title={item.title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen
</div>
) : (
cursor
alt={i
<div onClick={function() { setPlaying(true); }} style={{ position: "relative", <img src={"https://img.youtube.com/vi/" + item.youtubeId + "/mqdefault.jpg"} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block"
onError={function(e) { e.target.src = getImg(item.category, index); }} />
<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center"
<div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(220,0
<span style={{ color: "#fff", fontSize: "19px", marginRight: "-2px" }}>&#9654;<
</div>
</div>
{item.duration && <div style={{ position: "absolute", bottom: 8, left: 8, backgroun
{cat && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0
</div>
)}
0 0",
<div style={{ padding: "11px 14px 10px" }}>
<h3 style={{ color: "#eee", fontSize: "13px", fontWeight: "600", lineHeight: "1.6", m
{item.description && <p style={{ color: "#444", fontSize: "12px", margin: "5px {playing && <button onClick={function() { setPlaying(false); }} style={{ marginTop: "
</div>
</div>
);
});
+ "22"
"22",
function ChannelCard(props) {
var ch = props.ch; var active = props.active; var onSelect = props.onSelect;
return (
<div onClick={function() { onSelect(ch); }} style={{ background: active ? ch.color <div style={{ width: 38, height: 38, borderRadius: "50%", background: ch.color + {ch.flag}
{active && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height:
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ color: active ? "#fff" : "#bbb", fontWeight: "700", fontSize: "12.5px"
<div style={{ color: "#2e2e2e", fontSize: "11px", marginTop: "1px" }}>{ch.desc}</div>
</div>
<div style={{ background: active ? "#e74c3c" : "#1a1a1a", color: active ? "#fff" {active ? "LIVE" : "▶"}
</div>
</div>
: "#2e
);
}
function Skeleton() {
return (
<div className="news-grid">
{[0,1,2,3,4,5].map(function(i) {
return (
<div key={i} style={{ background: "#0f0f0f", borderRadius: "14px", overflow: <div style={{ height: "148px", background: "#161616" }} />
<div style={{ padding: "13px 15px" }}>
<div style={{ height: "9px", width: "48px", background: "#1c1c1c", borderRadius
<div style={{ height: "13px", background: "#191919", borderRadius: "4px", margi
"hidde
<div style={{ height: "13px", width: "68%", background: "#181818", borderRadius
</div>
</div>
;)
})}
</div>
;)
}
// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
var s;
s = useState("news"); var tab = s[0]; var setTab = s[1];
s = useState("all"); var cat = s[0]; var setCat = s[1];
s = useState([]); var news = s[0]; var setNews = s[1];
s = useState([]); var videos = s[0]; var setVideos = s[1];
s = useState(false); var loadN = s[0]; var setLoadN = s[1];
s = useState(false); var loadV = s[0]; var setLoadV = s[1];
s = useState(null); var errN = s[0]; var setErrN = s[1];
s = useState(null); var errV = s[0]; var setErrV = s[1];
s = useState(LIVE_CHANNELS[0]); var liveCh = s[0]; var setLiveCh = s[1];
s = useState("WAR UPDATE BY K.A.R — ﻣﺘﺎﺑﻌﺔ ﻣﺴﺘﻤﺮة ﻟﻼﺣﺪاث اﻻﻗﻠﯿﻤﯿﺔ "); var ticker = s = useState(null); var updated = s[0]; var setUpdated = s[1];
s = useState(AUTO_REFRESH_MINUTES * 60); var nextRefresh = s[0]; var setNextRefresh = s[1];
s = useState(""); var clockTime = s[0]; var setClockTime = s[1];
s = useState([]); var alerts = s[0]; var setAlerts = s[1];
s = useState(false); var noKey = s[0]; var setNoKey = s[1];
s[0];
var nCache = useRef({});
var vCache = useRef({});
var prevNewsRef = useRef([]);
// Clock
useEffect(function() {
function tick() { setClockTime(new Date().toLocaleTimeString("ar-AE", { hour: "2-digit",
tick();
var t = setInterval(tick, 1000);
return function() { clearInterval(t); };
;)][ ,}
var fetchNews = useCallback(function(c, force) {
if (!force && nCache.current[c]) { setNews(nCache.current[c]); return; }
setLoadN(true); setErrN(null); setNoKey(false);
callClaude(NEWS_PROMPTS[c]).then(function(items) {
nCache.current[c] = items;
// Check for new urgent alerts
var prev = prevNewsRef.current;
var newUrgent = items.filter(function(item) {
return item.urgency === "high" && !prev.find(function(p) { return p.title === item.ti
;)}
if (newUrgent.length > 0 && prev.length > 0) {
setAlerts(newUrgent.slice(0, 1));
setTimeout(function() { setAlerts([]); }, 8000);
}
prevNewsRef.current = items;
setNews(items);
setUpdated(new Date().toLocaleTimeString("ar-AE"));
setTicker(items.map(function(i) { return " " + i.title; }).join(" | "));
setNextRefresh(AUTO_REFRESH_MINUTES * 60);
}).catch(function(e) {
if (e.message === "NO_API_KEY") {
setNoKey(true);
setNews(DEMO_NEWS);
prevNewsRef.current = DEMO_NEWS;
setTicker(DEMO_NEWS.map(function(i) { return " " + i.title; }).join(" | "));
} ;)"ﺗﻌﺬر ﺗﺤﻤﯿﻞ اﻻﺧﺒﺎر"(else { setErrN }
}).finally(function() { setLoadN(false); });
;)][ ,}
var fetchVideos = useCallback(function(c, force) {
if (!force && vCache.current[c]) { setVideos(vCache.current[c]); return; }
setLoadV(true); setErrV(null);
callClaude(VIDEO_PROMPTS[c]).then(function(items) {
vCache.current[c] = items; setVideos(items);
}).catch(function(e) {
if (e.message === "NO_API_KEY") setVideos(DEMO_VIDEOS);
;)"ﺗﻌﺬر ﺗﺤﻤﯿﻞ اﻟﻔﯿﺪﯾﻮھﺎت"(else setErrV
}).finally(function() { setLoadV(false); });
;)][ ,}
useEffect(function() {
var t = setInterval(function() {
setNextRefresh(function(p) {
if (p <= 1) { nCache.current = {}; fetchNews(cat, true); return AUTO_REFRESH_MINUTES
return p - 1;
;)}
;)1000 ,}
return function() { clearInterval(t); };
}, [cat, fetchNews]);
useEffect(function() { fetchNews(cat); }, [cat, fetchNews]);
useEffect(function() { if (tab === "videos") fetchVideos(cat); }, [tab, cat, fetchVideos]);
= {};
if (ta
function changeCat(id) { if (id === cat) return; nCache.current = {}; vCache.current function refresh() { nCache.current = {}; vCache.current = {}; fetchNews(cat, true); function fmtCountdown(n) { return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"
var gold = "#c8960c"; var goldL = "#f0b429"; var green = "#00732f";
var showCats = tab === "news" || tab === "videos";
return (
<div style={{ minHeight: "100vh", background: "#060606", color: "#e4e0d8", direction: "rt
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&disp
*{box-sizing:border-box;margin:0;padding:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes glow{0%,100%{text-shadow:0 0 18px rgba(200,150,12,.45)}50%{text-shadow:0 0
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ping{0%{transform:translate(-50%,-50%) scale(.6);opacity:.8}100%{transform
@keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{t
.news-grid,.vid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px
@media(max-width:700px){.news-grid,.vid-grid{grid-template-columns:1fr!important}.liv
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c8960c33}
.tab-btn:hover{background:rgba(200,150,12,.12)!important;color:#f0b429!important}
`}</style>
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
<div style={{ background: "linear-gradient(180deg,#0c0900 0%,#060606 100%)", borderBott
<div className="hdr" style={{ display: "flex", alignItems: "center", justifyContent:
{/* Brand */}
<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
<div style={{ animation: "float 3.5s ease-in-out infinite" }}><FalconSVG size={44
<div>
<div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "w
<span style={{ fontSize: "19px", fontWeight: "900", color: goldL, animation:
<span style={{ color: "#444", fontSize: "12px" }}>by</span>
<span style={{ color: gold, fontSize: "17px", fontWeight: "900", letterSpacin
<span style={{ fontSize: "13px" }}> </span>
</div>
<div style={{ marginTop: "5px", marginBottom: "4px" }}><UAEBar /></div>
<div style={{ color: "#252525", fontSize: "9px", letterSpacing: "2px" }}>MIDDLE
</div>
</div>
{/* Controls */}
<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap"
<div style={{ background: "#0d0a01", border: "1px solid " + gold + "25", borderRa
<div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBo
<div style={{ color: gold, fontSize: "12px", fontFamily: "monospace", fontWeigh
</div>
<div style={{ background: "#0d0a01", border: "1px solid " + green + "33", borderR
<div style={{ color: "#2a2a2a", fontSize: "9px", letterSpacing: "1px", marginBo
<div style={{ color: green, fontSize: "12px", fontFamily: "monospace", fontWeig
</div>
<button onClick={refresh} disabled={loadN || loadV} style={{ background: "rgba(20
<span style={{ display: "inline-block", animation: (loadN || loadV) ? "spin 1s
}"ﺗﺤﺪﯾﺚ" : "..." ? )loadN || loadV({
</button>
</div>
</div>
{/* Tabs */}
<div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
{TABS.map(function(t) {
var active = tab === t.id;
return (
<button key={t.id} className="tab-btn" onClick={function() { setTab(t.id); }} s
{t.icon} {t.label}
</button>
;)
})}
</div>
0" }}>
{/* Categories */}
{showCats && (
<div style={{ display: "flex", gap: "5px", flexWrap: "wrap", padding: "8px 0 {CATEGORIES.map(function(c) {
var active = cat === c.id;
return (
<button key={c.id} onClick={function() { changeCat(c.id); }} style={{ backgro
{c.emoji} {c.label}
</button>
;)
})}
</div>
})
</div>
{/* TICKER */}
<div style={{ background: "#070500", borderBottom: "1px solid " + gold + "15", padding:
<div style={{ whiteSpace: "nowrap", animation: "ticker 70s linear infinite", display:
<span style={{ color: gold, fontSize: "11.5px", padding: "0 40px", letterSpacing: "
</div>
</div>
{/* CONTENT */}
<div style={{ padding: "18px 20px 50px" }}>
{/* NEWS */}
{tab === "news" && (
<div>
{noKey && (
<div style={{ background: "linear-gradient(135deg,#100c00,#0a0a0a)", border: "1
<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom
<FalconSVG size={22} color="#c8960c" />
ﺘﺎح>}} "span style={{ color: "#c8960c", fontWeight: "800", fontSize: <div style={{ color: "#555", fontSize: "12px", lineHeight: "1.9" }}>
اﻧﺸﺊ — >span style={{ color: "#3498db" }}>console.anthropic.com</span</div>
})
{loadN && <Skeleton />}
{errN && !loadN && (
<div style={{ textAlign: "center", color: "#e74c3c", padding: "40px" }}>
{errN}<br/>
<button onClick={function() { fetchNews(cat, true); }} style={{ marginTop: "1
</div>
})
{!loadN && news.length > 0 && (
<div>
<div style={{ display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "w
{["high","medium","low"].map(function(u) {
var n = news.filter(function(x) { return x.urgency === u; }).length;
if (!n) return null;
return (
<div key={u} style={{ background: URGENCY_MAP[u].color + "16", border:
<span style={{ width: 7, height: 7, borderRadius: "50%", background:
<span style={{ color: URGENCY_MAP[u].color, fontSize: "12px", fontWei
</div>
);
})}
<span style={{ color: "#1a1a1a", fontSize: "11px", marginRight: "auto" }}>{
</div>
<div className="news-grid">
{news.map(function(item, i) { return <NewsCard key={i} item={item} index={i
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
{errV}<br/>
<button onClick={function() { fetchVideos(cat, true); }} style={{ marginTop:
</div>
)}
{!loadV && videos.length > 0 && <div className="vid-grid">{videos.map(function(v,
{!loadV && !errV && videos.length === 0 && <div style={{ textAlign: "center", col
</div>
})
{/* X FEED */}
{tab === "x" && <XFeed />}
{/* LIVE */}
{tab === "live" && (
<div className="live-layout" style={{ display: "grid", gridTemplateColumns: "1fr 28
<div style={{ background: "#0a0800", borderRadius: "16px", overflow: "hidden", bo
<div style={{ padding: "10px 14px", background: "#0d0b00", borderBottom: "1px s
<span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c
<span style={{ color: "#e74c3c", fontWeight: "900", fontSize: "11px", letterS
<span style={{ color: "#555", fontSize: "12px" }}>{liveCh.flag} {liveCh.name}
<a href={"https://www.youtube.com/watch?v=" + liveCh.youtubeId} target="_blan
</div>
<div style={{ position: "relative", paddingBottom: "56.25%", background: "#000"
<iframe key={liveCh.id} style={{ position: "absolute", inset: 0, width: "100%
src={"https://www.youtube.com/embed/" + liveCh.youtubeId + "?autoplay=1&rel
title={liveCh.name} allow="autoplay; encrypted-media; fullscreen" allowFull
</div>
<div style={{ padding: "9px 14px", background: "#080600", display: "flex", just
<span style={{ color: "#222", fontSize: "11px" }}>ﻻ ﯾﻌﻤﻞ اﻟﺒﺚ؟</span>
<a href={"https://www.youtube.com/watch?v=" + liveCh.youtubeId} target="_blan
</div>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
<div style={{ color: gold + "55", fontSize: "9px", marginBottom: "4px", fontWei
{LIVE_CHANNELS.map(function(ch) { return <ChannelCard key={ch.id} ch={ch} activ
</div>
</div>
})
</div>
{/* FOOTER */}
<div style={{ borderTop: "1px solid " + gold + "15", padding: "12px 20px", display: "fl
<div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
<FalconSVG size={16} color={gold + "55"} />
<span style={{ color: "#1a1a1a", fontSize: "10px", letterSpacing: "1.5px" }}>WAR UP
</div>
<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
<span style={{ color: "#161616", fontSize: "10px" }}>ﻟﻼﻏﺮاض اﻻﺧﺒﺎرﯾﺔ ﻓﻘﻂ</span>
<div style={{ display: "flex", height: "10px", width: "32px", borderRadius: "2px",
<div style={{ width: "22%", background: "#c0392b" }} />
<div style={{ flex: 1, background: "#00732f" }} />
<div style={{ flex: 1, background: "#fff2" }} />
<div style={{ flex: 1, background: "#111" }} />
}
);
</div>
</div>
</div>
</div>
