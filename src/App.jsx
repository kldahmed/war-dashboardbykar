import { useState, useEffect, useCallback, useRef, memo } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────────
// ⚠️ ضع مفتاح Anthropic API هنا
const API_KEY = "YOUR_ANTHROPIC_API_KEY";
const AUTO_REFRESH_MINUTES = 10;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "news",   label: "الأخبار",  icon: "📰" },
  { id: "videos", label: "فيديوهات", icon: "🎬" },
  { id: "live",   label: "بث مباشر", icon: "📡" },
];

const CATEGORIES = [
  { id: "all",    label: "الكل",     emoji: "🌐" },
  { id: "iran",   label: "إيران",    emoji: "🇮🇷" },
  { id: "gulf",   label: "الخليج",   emoji: "🇸🇦" },
  { id: "usa",    label: "أمريكا",   emoji: "🇺🇸" },
  { id: "israel", label: "إسرائيل",  emoji: "🇮🇱" },
];

const CAT_COLORS = {
  iran:   { accent:"#c0392b", glow:"rgba(192,57,43,.4)",   light:"#e74c3c", bg:"#140606" },
  gulf:   { accent:"#16a085", glow:"rgba(22,160,133,.4)",  light:"#1abc9c", bg:"#061410" },
  usa:    { accent:"#2471a3", glow:"rgba(36,113,163,.4)",  light:"#3498db", bg:"#060c14" },
  israel: { accent:"#7d3c98", glow:"rgba(125,60,152,.4)",  light:"#9b59b6", bg:"#0a0612" },
  all:    { accent:"#c0392b", glow:"rgba(192,57,43,.4)",   light:"#e74c3c", bg:"#0d0d0d" },
};

const URGENCY_MAP = {
  high:   { label:"🔴 عاجل",   color:"#e74c3c", pulse:true  },
  medium: { label:"🟡 مهم",    color:"#f39c12", pulse:false },
  low:    { label:"⚪ متابعة", color:"#7f8c8d", pulse:false },
};

const CAT_UNSPLASH = {
  iran:   ["photo-1597852074816-d57796d60ea6","photo-1564419320461-6870880221ad","photo-1576086213369-97a306d36557"],
  gulf:   ["photo-1512632578888-169bbbc64f33","photo-1555448248-2571daf6344b","photo-1469041797191-50ace28483c3"],
  usa:    ["photo-1515187029135-18ee286d815b","photo-1501594907352-04cda38ebc29","photo-1473091534298-04dcbce3278c"],
  israel: ["photo-1544967082-d9d25d867d66","photo-1582555172866-f73bb12a2ab3","photo-1570957392122-7768e3cfc3d6"],
};

const LIVE_CHANNELS = [
  { id:"aljazeera_ar", name:"الجزيرة",           flag:"🇶🇦", color:"#c8960c", desc:"قناة الجزيرة الإخبارية",  youtubeId:"B0Bzmln-Z2Y" },
  { id:"alarabiya",    name:"العربية",            flag:"🇸🇦", color:"#1a6abf", desc:"قناة العربية الإخبارية",  youtubeId:"oMoiMq9FnQs" },
  { id:"aljazeera_en", name:"Al Jazeera English", flag:"🌐",  color:"#c8960c", desc:"Al Jazeera English Live", youtubeId:"h3MuIUNCCLI" },
  { id:"france24_ar",  name:"فرانس 24 عربي",     flag:"🇫🇷", color:"#c0392b", desc:"فرانس 24 عربي",          youtubeId:"vLjFSJFaHRk" },
  { id:"bbc_arabic",   name:"BBC عربي",           flag:"🇬🇧", color:"#cc0000", desc:"بي بي سي عربي",          youtubeId:"8qoLDMH8pnk" },
  { id:"sky_news_ar",  name:"سكاي نيوز عربية",   flag:"🇦🇪", color:"#0066cc", desc:"سكاي نيوز عربية",        youtubeId:"HHpTBCGQpgk" },
];

// ─── DEMO DATA (shown when no API key) ─────────────────────────────────────────
const DEMO_NEWS = [
  { title:"مناورات عسكرية إيرانية في مضيق هرمز", summary:"أجرت إيران مناورات عسكرية واسعة النطاق في مضيق هرمز تضمنت محاكاة لإغلاق المضيق أمام الملاحة الدولية.", category:"iran", urgency:"high", time:"منذ 2 ساعة", imageKeyword:"military" },
  { title:"القمة الخليجية تبحث التصعيد الإيراني", summary:"انعقدت قمة طارئة لدول مجلس التعاون الخليجي لبحث التطورات الأمنية المتصاعدة في المنطقة.", category:"gulf", urgency:"high", time:"منذ 3 ساعات", imageKeyword:"summit" },
  { title:"الأسطول الأمريكي الخامس يعزز وجوده في الخليج", summary:"أرسلت الولايات المتحدة تعزيزات بحرية إضافية إلى منطقة الخليج العربي ردًا على التوترات المتصاعدة.", category:"usa", urgency:"medium", time:"منذ 5 ساعات", imageKeyword:"navy" },
  { title:"إسرائيل تكشف عن منظومة دفاعية جديدة", summary:"كشفت إسرائيل عن منظومة دفاعية متطورة مصممة لاعتراض الصواريخ الباليستية الإيرانية بعيدة المدى.", category:"israel", urgency:"medium", time:"منذ 6 ساعات", imageKeyword:"defense" },
  { title:"إيران تعلن رفع مستوى تخصيب اليورانيوم", summary:"أعلنت إيران عن رفع مستوى تخصيب اليورانيوم في منشأة نطنز مما أثار قلقًا دوليًا واسعًا.", category:"iran", urgency:"high", time:"منذ 8 ساعات", imageKeyword:"nuclear" },
  { title:"الرياض وطهران تستأنفان المحادثات الدبلوماسية", summary:"استأنفت المملكة العربية السعودية وإيران جولة جديدة من المحادثات الدبلوماسية بوساطة صينية.", category:"gulf", urgency:"low", time:"منذ 10 ساعات", imageKeyword:"diplomacy" },
];

const DEMO_VIDEOS = [
  { title:"التوترات الإيرانية الأمريكية في الخليج", description:"تقرير شامل عن آخر التطورات العسكرية", youtubeId:"dQw4w9WgXcQ", category:"iran", duration:"8:24" },
  { title:"القدرات العسكرية الإسرائيلية في مواجهة إيران", description:"تحليل معمق للقوة العسكرية الإسرائيلية", youtubeId:"dQw4w9WgXcQ", category:"israel", duration:"12:10" },
  { title:"دول الخليج واستراتيجية الأمن الإقليمي", description:"كيف تتعامل دول الخليج مع التهديدات", youtubeId:"dQw4w9WgXcQ", category:"gulf", duration:"6:45" },
  { title:"الوجود العسكري الأمريكي في الشرق الأوسط", description:"تقرير عن القواعد والأساطيل الأمريكية", youtubeId:"dQw4w9WgXcQ", category:"usa", duration:"9:30" },
  { title:"البرنامج النووي الإيراني: آخر المستجدات", description:"تحديث عن الملف النووي الإيراني", youtubeId:"dQw4w9WgXcQ", category:"iran", duration:"15:20" },
  { title:"مناطق التوتر في الشرق الأوسط 2025", description:"خريطة التوترات في المنطقة", youtubeId:"dQw4w9WgXcQ", category:"all", duration:"11:05" },
];

// ─── API ────────────────────────────────────────────────────────────────────────
const NEWS_PROMPTS = {
  all:    `آخر 6 أخبار عاجلة عن التوترات بين إيران ودول الخليج وأمريكا وإسرائيل. أجب بـ JSON فقط بدون أي نص أو markdown، المصفوفة تبدأ بـ [ مباشرة: [{"title":"...","summary":"جملتين على الأقل...","category":"iran","urgency":"high","time":"منذ X ساعة","imageKeyword":"english"}]`,
  iran:   `آخر 6 أخبار عن إيران في سياق التوترات الإقليمية. JSON فقط يبدأ بـ [: [{"title":"...","summary":"...","category":"iran","urgency":"high|medium|low","time":"منذ X ساعة","imageKeyword":"english"}]`,
  gulf:   `آخر 6 أخبار عن دول الخليج في سياق التوترات مع إيران. JSON فقط يبدأ بـ [: [{"title":"...","summary":"...","category":"gulf","urgency":"high|medium|low","time":"منذ X ساعة","imageKeyword":"english"}]`,
  usa:    `آخر 6 أخبار عن أمريكا في الشرق الأوسط. JSON فقط يبدأ بـ [: [{"title":"...","summary":"...","category":"usa","urgency":"high|medium|low","time":"منذ X ساعة","imageKeyword":"english"}]`,
  israel: `آخر 6 أخبار عن إسرائيل وإيران. JSON فقط يبدأ بـ [: [{"title":"...","summary":"...","category":"israel","urgency":"high|medium|low","time":"منذ X ساعة","imageKeyword":"english"}]`,
};

const VIDEO_PROMPTS = {
  all:    `أعطني 6 مقاطع يوتيوب حقيقية (بمعرفات صحيحة 11 حرف) عن الصراعات في الشرق الأوسط 2024-2025. JSON فقط يبدأ بـ [: [{"title":"...","description":"...","youtubeId":"REAL_11CHAR_ID","category":"iran|gulf|usa|israel","duration":"X:XX"}]`,
  iran:   `6 فيديوهات يوتيوب حقيقية عن إيران 2024-2025. JSON فقط: [{"title":"...","description":"...","youtubeId":"REAL_ID","category":"iran","duration":"X:XX"}]`,
  gulf:   `6 فيديوهات يوتيوب حقيقية عن الخليج 2024-2025. JSON فقط: [{"title":"...","description":"...","youtubeId":"REAL_ID","category":"gulf","duration":"X:XX"}]`,
  usa:    `6 فيديوهات يوتيوب حقيقية عن أمريكا والشرق الأوسط 2024-2025. JSON فقط: [{"title":"...","description":"...","youtubeId":"REAL_ID","category":"usa","duration":"X:XX"}]`,
  israel: `6 فيديوهات يوتيوب حقيقية عن إسرائيل وإيران 2024-2025. JSON فقط: [{"title":"...","description":"...","youtubeId":"REAL_ID","category":"israel","duration":"X:XX"}]`,
};

function getImg(catId, seed) {
  const arr = CAT_UNSPLASH[catId] || CAT_UNSPLASH.iran;
  return `https://images.unsplash.com/${arr[seed % arr.length]}?w=600&q=75&auto=format&fit=crop`;
}

// FIX: better JSON extraction — greedy match + multi-attempt parsing
function extractJSON(text) {
  // Try to find JSON array
  const attempts = [
    text.match(/(\[[\s\S]*\])/),        // greedy - full array
    text.match(/\[[\s\S]+\]/),           // any array
  ];
  for (const m of attempts) {
    if (m) {
      try { return JSON.parse(m[1] || m[0]); } catch {}
    }
  }
  throw new Error("JSON parse failed");
}

async function callClaude(prompt, retries = 2) {
  if (!API_KEY || API_KEY === "YOUR_ANTHROPIC_API_KEY") {
    throw new Error("NO_API_KEY");
  }
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const txt = data.content?.find(b => b.type === "text")?.text || "";
      return extractJSON(txt);
    } catch (e) {
      if (e.message === "NO_API_KEY") throw e;
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ─── COMPONENTS ────────────────────────────────────────────────────────────────

const NewsCard = memo(({ item, index }) => {
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const col = CAT_COLORS[item.category] || CAT_COLORS.all;
  const urg = URGENCY_MAP[item.urgency] || URGENCY_MAP.medium;
  const cat = CATEGORIES.find(c => c.id === item.category);

  return (
    <div onClick={() => setOpen(v => !v)} style={{
      background: `linear-gradient(160deg,${col.bg} 0%,#080808 100%)`,
      border: `1px solid ${open ? col.accent+"bb" : "rgba(255,255,255,.08)"}`,
      borderRadius:"14px", overflow:"hidden", cursor:"pointer",
      transition:"all .25s", position:"relative",
      boxShadow: open ? `0 0 28px ${col.glow}` : "0 2px 12px rgba(0,0,0,.6)",
      animation:`fadeUp .4s ease ${Math.min(index,.07)*index}s both`,
    }}>
      {/* Image */}
      {!imgErr && (
        <div style={{ position:"relative", height:"155px", overflow:"hidden" }}>
          <img src={getImg(item.category, index)} alt="" onError={() => setImgErr(true)}
            style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(.65) saturate(.75)", transition:"transform .4s" }}
            loading="lazy"
          />
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom,rgba(0,0,0,.1) 30%,${col.bg} 100%)` }} />
          {/* Urgency */}
          <div style={{ position:"absolute", top:10, right:10, background:urg.color+"ee", color:"#fff", borderRadius:"20px", padding:"3px 11px", fontSize:"11px", fontWeight:"800", display:"flex", alignItems:"center", gap:"5px", backdropFilter:"blur(6px)" }}>
            {urg.pulse && <span style={{ width:6, height:6, borderRadius:"50%", background:"#fff", display:"inline-block", animation:"pulse 1s infinite" }} />}
            {urg.label}
          </div>
          {/* Category */}
          {cat && <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,.7)", color:col.light, borderRadius:"20px", padding:"3px 10px", fontSize:"12px", backdropFilter:"blur(6px)" }}>{cat.emoji} {cat.label}</div>}
        </div>
      )}

      {/* Body */}
      <div style={{ padding:"13px 16px 11px" }}>
        <div style={{ color:"#3a3a3a", fontSize:"11px", marginBottom:"5px", textAlign:"right", fontFamily:"monospace" }}>{item.time}</div>
        <h3 style={{ color:"#f0ece4", fontSize:"14.5px", fontWeight:"700", lineHeight:"1.7", margin:0, direction:"rtl", textAlign:"right" }}>
          {item.title}
        </h3>
        {open && (
          <p style={{ color:"#888", fontSize:"13px", lineHeight:"1.95", margin:"11px 0 0", direction:"rtl", textAlign:"right", borderTop:`1px solid ${col.accent}44`, paddingTop:"11px", animation:"expandIn .2s ease" }}>
            {item.summary}
          </p>
        )}
        <div style={{ color:"#252525", fontSize:"10px", textAlign:"center", marginTop:"9px" }}>{open ? "▲ طي" : "▼ التفاصيل"}</div>
      </div>

      {/* Side accent */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"3px", background:`linear-gradient(180deg,${col.accent},transparent)` }} />
    </div>
  );
});

const VideoCard = memo(({ item, index }) => {
  const [playing, setPlaying] = useState(false);
  const col = CAT_COLORS[item.category] || CAT_COLORS.all;
  const cat = CATEGORIES.find(c => c.id === item.category);

  return (
    <div style={{
      background:"#0d0d0d",
      border:`1px solid ${playing ? col.accent+"99" : "rgba(255,255,255,.07)"}`,
      borderRadius:"14px", overflow:"hidden",
      animation:`fadeUp .4s ease ${index*.06}s both`,
      boxShadow: playing ? `0 0 28px ${col.glow}` : "0 2px 12px rgba(0,0,0,.5)",
      transition:"border-color .25s, box-shadow .25s",
    }}>
      {playing ? (
        <div style={{ position:"relative", paddingBottom:"56.25%", background:"#000" }}>
          <iframe style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }}
            src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={item.title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        </div>
      ) : (
        <div onClick={() => setPlaying(true)} style={{ position:"relative", cursor:"pointer", overflow:"hidden" }}>
          <img src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`} alt={item.title}
            style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block", filter:"brightness(.75)", transition:"filter .3s" }}
            loading="lazy"
            onError={e => { e.target.src = getImg(item.category, index); }}
          />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.2)" }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(220,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 24px rgba(220,0,0,.5)", transition:"transform .2s" }}>
              <span style={{ color:"#fff", fontSize:"21px", marginRight:"-3px" }}>▶</span>
            </div>
          </div>
          {item.duration && <div style={{ position:"absolute", bottom:8, left:8, background:"rgba(0,0,0,.85)", color:"#fff", borderRadius:"4px", padding:"2px 7px", fontSize:"11px", fontWeight:"700" }}>{item.duration}</div>}
          {cat && <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.75)", color:col.light, borderRadius:"20px", padding:"2px 9px", fontSize:"12px" }}>{cat.emoji} {cat.label}</div>}
        </div>
      )}
      <div style={{ padding:"12px 14px 10px" }}>
        <h3 style={{ color:"#eee", fontSize:"13.5px", fontWeight:"600", lineHeight:"1.6", margin:0, direction:"rtl", textAlign:"right" }}>{item.title}</h3>
        {item.description && <p style={{ color:"#444", fontSize:"12px", margin:"5px 0 0", direction:"rtl", textAlign:"right", lineHeight:"1.6" }}>{item.description}</p>}
        {playing && <button onClick={() => setPlaying(false)} style={{ marginTop:"8px", background:"#1a1a1a", border:"1px solid #333", color:"#888", borderRadius:"6px", padding:"4px 12px", cursor:"pointer", fontSize:"12px", width:"100%", fontFamily:"inherit" }}>✕ إغلاق</button>}
      </div>
    </div>
  );
});

function ChannelCard({ ch, active, onSelect }) {
  return (
    <div onClick={() => onSelect(ch)} style={{
      background: active ? ch.color+"22" : "#0f0f0f",
      border:`1px solid ${active ? ch.color+"99" : "rgba(255,255,255,.07)"}`,
      borderRadius:"12px", padding:"12px 14px", cursor:"pointer",
      display:"flex", alignItems:"center", gap:"11px",
      transition:"all .2s",
      boxShadow: active ? `0 0 16px ${ch.color}44` : "none",
    }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:ch.color+"2a", border:`2px solid ${ch.color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"19px", flexShrink:0, position:"relative" }}>
        {ch.flag}
        {active && <span style={{ position:"absolute", top:-3, right:-3, width:10, height:10, borderRadius:"50%", background:"#e74c3c", border:"2px solid #080808", animation:"pulse 1s infinite" }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:active?"#fff":"#ccc", fontWeight:"700", fontSize:"13px" }}>{ch.name}</div>
        <div style={{ color:"#3a3a3a", fontSize:"11px", marginTop:"1px" }}>{ch.desc}</div>
      </div>
      <div style={{ background:active?"#e74c3c":"#1a1a1a", color:active?"#fff":"#3a3a3a", borderRadius:"6px", padding:"4px 10px", fontSize:"11px", fontWeight:"700", flexShrink:0, transition:"all .2s" }}>
        {active ? "● بث" : "▶"}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"16px" }}>
      {Array.from({length:6}).map((_,i) => (
        <div key={i} style={{ background:"#0f0f0f", borderRadius:"14px", overflow:"hidden", animation:`shimmer 1.5s ease ${i*.12}s infinite alternate` }}>
          <div style={{ height:"150px", background:"#161616" }} />
          <div style={{ padding:"14px 16px" }}>
            <div style={{ height:"10px", width:"50px", background:"#1c1c1c", borderRadius:"4px", marginBottom:"10px" }} />
            <div style={{ height:"14px", background:"#191919", borderRadius:"4px", marginBottom:"7px" }} />
            <div style={{ height:"14px", width:"70%", background:"#191919", borderRadius:"4px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoApiKeyBanner() {
  return (
    <div style={{ background:"linear-gradient(135deg,#1a0a00,#0d0d0d)", border:"1px solid #f39c1244", borderRadius:"14px", padding:"24px", marginBottom:"20px", direction:"rtl", textAlign:"right" }}>
      <div style={{ fontSize:"20px", marginBottom:"10px" }}>⚙️ إعداد مطلوب</div>
      <div style={{ color:"#f39c12", fontWeight:"700", fontSize:"15px", marginBottom:"8px" }}>لتفعيل الأخبار الحقيقية، أضف مفتاح Anthropic API</div>
      <div style={{ color:"#666", fontSize:"13px", lineHeight:"1.8" }}>
        1. افتح <span style={{ color:"#3498db" }}>console.anthropic.com</span> وأنشئ API key<br/>
        2. افتح ملف <span style={{ color:"#e74c3c" }}>src/App.jsx</span> في GitHub<br/>
        3. غيّر السطر الأول: <span style={{ color:"#2ecc71", fontFamily:"monospace" }}>const API_KEY = "sk-ant-..."</span>
      </div>
      <div style={{ marginTop:"14px", color:"#555", fontSize:"12px" }}>
        ⬇️ في الأسفل عرض توضيحي بأخبار نموذجية
      </div>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab]           = useState("news");
  const [cat, setCat]           = useState("all");
  const [news, setNews]         = useState([]);
  const [videos, setVideos]     = useState([]);
  const [loadN, setLoadN]       = useState(false);
  const [loadV, setLoadV]       = useState(false);
  const [errN, setErrN]         = useState(null);
  const [errV, setErrV]         = useState(null);
  const [liveCh, setLiveCh]     = useState(LIVE_CHANNELS[0]);
  const [ticker, setTicker]     = useState("⚡ مرحباً بك في داشبورد أخبار المنطقة");
  const [updated, setUpdated]   = useState(null);
  const [noKey, setNoKey]       = useState(false);
  const [nextRefresh, setNextRefresh] = useState(AUTO_REFRESH_MINUTES * 60);
  const nCache  = useRef({});
  const vCache  = useRef({});
  const timerRef = useRef(null);

  const fetchNews = useCallback(async (c, force = false) => {
    if (!force && nCache.current[c]) { setNews(nCache.current[c]); return; }
    setLoadN(true); setErrN(null); setNoKey(false);
    try {
      const items = await callClaude(NEWS_PROMPTS[c]);
      nCache.current[c] = items;
      setNews(items);
      setUpdated(new Date().toLocaleTimeString("ar-SA"));
      setTicker(items.map(i => `🔴 ${i.title}`).join("   ◆   "));
      setNextRefresh(AUTO_REFRESH_MINUTES * 60);
    } catch(e) {
      if (e.message === "NO_API_KEY") {
        setNoKey(true);
        setNews(DEMO_NEWS);
        setTicker(DEMO_NEWS.map(i => `📌 ${i.title}`).join("   ◆   "));
      } else {
        setErrN("تعذّر تحميل الأخبار — سيتم المحاولة مجدداً");
      }
    } finally { setLoadN(false); }
  }, []);

  const fetchVideos = useCallback(async (c, force = false) => {
    if (!force && vCache.current[c]) { setVideos(vCache.current[c]); return; }
    setLoadV(true); setErrV(null);
    try {
      const items = await callClaude(VIDEO_PROMPTS[c]);
      vCache.current[c] = items;
      setVideos(items);
    } catch(e) {
      if (e.message === "NO_API_KEY") {
        setVideos(DEMO_VIDEOS);
      } else {
        setErrV("تعذّر تحميل الفيديوهات");
      }
    } finally { setLoadV(false); }
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNextRefresh(p => {
        if (p <= 1) {
          nCache.current = {};
          fetchNews(cat, true);
          return AUTO_REFRESH_MINUTES * 60;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cat]);

  useEffect(() => { fetchNews(cat); }, [cat]);
  useEffect(() => { if (tab === "videos") fetchVideos(cat); }, [tab, cat]);

  const changeCat = (id) => {
    if (id === cat) return;
    nCache.current = {}; vCache.current = {};
    setCat(id);
  };

  const refresh = () => {
    nCache.current = {}; vCache.current = {};
    fetchNews(cat, true);
    if (tab === "videos") fetchVideos(cat, true);
    setNextRefresh(AUTO_REFRESH_MINUTES * 60);
  };

  const fmtCountdown = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ minHeight:"100vh", background:"#070707", color:"#e8e4dc", direction:"rtl", fontFamily:"'Noto Sans Arabic','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes expandIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.55)}}
        @keyframes shimmer{from{opacity:.35}to{opacity:.75}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes glow{0%,100%{text-shadow:0 0 16px rgba(192,57,43,.4)}50%{text-shadow:0 0 32px rgba(192,57,43,.85)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .tab:hover{background:rgba(255,255,255,.06)!important;color:#aaa!important}
        .catbtn:hover{filter:brightness(1.35)!important}
        .refbtn:hover{background:rgba(192,57,43,.32)!important}
        .chcard:hover{filter:brightness(1.1)}
        .news-grid,.vid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        @media(max-width:640px){
          .live-layout{grid-template-columns:1fr!important}
          .news-grid,.vid-grid{grid-template-columns:1fr!important}
        }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#0d0d0d}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(180deg,#0e0202 0%,#080808 100%)", borderBottom:"1px solid rgba(192,57,43,.2)", padding:"16px 20px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", flexWrap:"wrap", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:36, height:36, borderRadius:"9px", background:"linear-gradient(135deg,#c0392b,#7b1c10)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", boxShadow:"0 0 18px rgba(192,57,43,.55)", flexShrink:0 }}>⚔️</div>
            <div>
              <h1 style={{ fontSize:"18px", fontWeight:"900", color:"#f0ece4", animation:"glow 3s infinite", letterSpacing:"-0.3px" }}>داشبورد أخبار المنطقة</h1>
              <p style={{ color:"#3a3a3a", fontSize:"11px", marginTop:"2px" }}>إيران · الخليج · أمريكا · إسرائيل</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            {updated && (
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#2a2a2a", fontSize:"10px" }}>آخر تحديث</div>
                <div style={{ color:"#444", fontSize:"11px", fontFamily:"monospace" }}>{updated}</div>
              </div>
            )}
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#2a2a2a", fontSize:"10px" }}>تحديث تلقائي</div>
              <div style={{ color:"#16a085", fontSize:"11px", fontFamily:"monospace" }}>{fmtCountdown(nextRefresh)}</div>
            </div>
            <button className="refbtn" onClick={refresh} disabled={loadN||loadV} style={{ background:"rgba(192,57,43,.14)", border:"1px solid rgba(192,57,43,.3)", color:"#c0392b", borderRadius:"8px", padding:"7px 14px", cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:"inherit", transition:"all .2s", display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ display:"inline-block", animation:(loadN||loadV)?"spin 1s linear infinite":"none" }}>🔄</span>
              {loadN||loadV ? "جاري..." : "تحديث"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"4px" }}>
          {TABS.map(t => (
            <button key={t.id} className="tab" onClick={() => setTab(t.id)} style={{ background:tab===t.id?"rgba(192,57,43,.22)":"transparent", border:`1px solid ${tab===t.id?"rgba(192,57,43,.6)":"rgba(255,255,255,.07)"}`, color:tab===t.id?"#e74c3c":"#4a4a4a", borderRadius:"8px 8px 0 0", padding:"8px 16px", cursor:"pointer", fontSize:"13px", fontWeight:tab===t.id?"700":"400", fontFamily:"inherit", transition:"all .2s", display:"flex", alignItems:"center", gap:"6px" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {tab !== "live" && (
          <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", padding:"8px 0 0" }}>
            {CATEGORIES.map(c => (
              <button key={c.id} className="catbtn" onClick={() => changeCat(c.id)} style={{ background:cat===c.id?CAT_COLORS[c.id].accent+"25":"rgba(255,255,255,.03)", border:`1px solid ${cat===c.id?CAT_COLORS[c.id].accent+"77":"rgba(255,255,255,.07)"}`, color:cat===c.id?CAT_COLORS[c.id].light:"#4a4a4a", borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontSize:"12px", fontWeight:cat===c.id?"700":"400", fontFamily:"inherit", transition:"all .2s" }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TICKER ── */}
      <div style={{ background:"#090404", borderBottom:"1px solid rgba(192,57,43,.12)", padding:"7px 0", overflow:"hidden" }}>
        <div style={{ whiteSpace:"nowrap", animation:"ticker 55s linear infinite", display:"inline-block" }}>
          <span style={{ color:"#c0392b", fontSize:"12px", padding:"0 32px" }}>{ticker}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ticker}</span>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"18px 20px 50px" }}>

        {/* ── NEWS ── */}
        {tab === "news" && (
          <>
            {noKey && <NoApiKeyBanner />}
            {loadN && <Skeleton />}
            {errN && !loadN && (
              <div style={{ textAlign:"center", color:"#e74c3c", padding:"40px", fontSize:"14px" }}>
                ⚠️ {errN}<br/>
                <button onClick={() => fetchNews(cat, true)} style={{ marginTop:"14px", background:"rgba(192,57,43,.15)", border:"1px solid rgba(192,57,43,.3)", color:"#e74c3c", borderRadius:"8px", padding:"8px 18px", cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>
                  إعادة المحاولة
                </button>
              </div>
            )}
            {!loadN && news.length > 0 && (
              <>
                <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap", alignItems:"center" }}>
                  {["high","medium","low"].map(u => {
                    const n = news.filter(x => x.urgency===u).length;
                    if (!n) return null;
                    return (
                      <div key={u} style={{ background:URGENCY_MAP[u].color+"18", border:`1px solid ${URGENCY_MAP[u].color}33`, borderRadius:"8px", padding:"4px 11px", display:"flex", alignItems:"center", gap:"6px" }}>
                        <span style={{ width:7, height:7, borderRadius:"50%", background:URGENCY_MAP[u].color, flexShrink:0, animation:u==="high"?"pulse 1s infinite":"none" }} />
                        <span style={{ color:URGENCY_MAP[u].color, fontSize:"12px", fontWeight:"700" }}>{n} {u==="high"?"عاجل":u==="medium"?"مهم":"متابعة"}</span>
                      </div>
                    );
                  })}
                  <span style={{ color:"#222", fontSize:"12px", marginRight:"auto" }}>{news.length} خبر</span>
                </div>
                <div className="news-grid">
                  {news.map((item,i) => <NewsCard key={i} item={item} index={i} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* ── VIDEOS ── */}
        {tab === "videos" && (
          <>
            {loadV && <Skeleton />}
            {errV && !loadV && (
              <div style={{ textAlign:"center", color:"#e74c3c", padding:"40px", fontSize:"14px" }}>
                ⚠️ {errV}
                <br/>
                <button onClick={() => fetchVideos(cat, true)} style={{ marginTop:"14px", background:"rgba(192,57,43,.15)", border:"1px solid rgba(192,57,43,.3)", color:"#e74c3c", borderRadius:"8px", padding:"8px 18px", cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>
                  إعادة المحاولة
                </button>
              </div>
            )}
            {!loadV && videos.length > 0 && (
              <div className="vid-grid">
                {videos.map((v,i) => <VideoCard key={i} item={v} index={i} />)}
              </div>
            )}
            {!loadV && !errV && videos.length === 0 && (
              <div style={{ textAlign:"center", color:"#252525", padding:"60px", fontSize:"14px" }}>اضغط تحديث لتحميل الفيديوهات</div>
            )}
          </>
        )}

        {/* ── LIVE ── */}
        {tab === "live" && (
          <div className="live-layout" style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:"16px", alignItems:"start" }}>
            {/* Player */}
            <div style={{ background:"#0d0d0d", borderRadius:"16px", overflow:"hidden", border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ padding:"10px 14px", background:"#0f0f0f", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", gap:"9px" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:"#e74c3c", display:"inline-block", animation:"pulse 1s infinite" }} />
                <span style={{ color:"#e74c3c", fontWeight:"800", fontSize:"12px", letterSpacing:"1.5px" }}>● بث مباشر</span>
                <span style={{ color:"#555", fontSize:"13px", marginRight:"8px" }}>{liveCh.flag} {liveCh.name}</span>
              </div>
              <div style={{ position:"relative", paddingBottom:"56.25%", background:"#000" }}>
                <iframe key={liveCh.id}
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }}
                  src={`https://www.youtube.com/embed/${liveCh.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={liveCh.name} allow="autoplay; encrypted-media; fullscreen" allowFullScreen
                />
              </div>
              <div style={{ padding:"10px 14px", color:"#2a2a2a", fontSize:"11px", textAlign:"center" }}>
                💡 إذا لم يعمل البث — اضغط مجدداً أو جرب قناة أخرى
              </div>
            </div>

            {/* Channels */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <div style={{ color:"#2e2e2e", fontSize:"11px", marginBottom:"4px", fontWeight:"700", letterSpacing:"1px" }}>📡 القنوات</div>
              {LIVE_CHANNELS.map(ch => <ChannelCard key={ch.id} ch={ch} active={liveCh.id===ch.id} onSelect={setLiveCh} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.04)", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", color:"#1e1e1e", fontSize:"11px", flexWrap:"wrap", gap:"8px" }}>
        <span>⚡ مدعوم بالذكاء الاصطناعي · تحديث تلقائي كل {AUTO_REFRESH_MINUTES} دقائق</span>
        <span>للأغراض الإخبارية فقط</span>
      </div>
    </div>
  );
}
