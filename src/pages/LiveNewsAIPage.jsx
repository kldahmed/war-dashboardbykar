import React, { useEffect, useMemo, useRef, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

const FILTER_DEFAULTS = {
  source: "all",
  trust: "all",
  priority: "all",
  status: "all",
};

function formatTime(value, language) {
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-AE" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      hour12: false,
      timeZone: "Asia/Dubai",
    }).format(new Date(value));
  } catch {
    return "--:--";
  }
}

function statusTone(status) {
  if (status === "Live") return "#ef4444";
  if (status === "Verified" || status === "Multi-source Confirmed") return "#22c55e";
  if (status === "Updating") return "#f59e0b";
  return "#94a3b8";
}

function labelForMode(mode, language) {
  if (mode === "manual") return language === "ar" ? "Manual Review" : "Manual Review";
  if (mode === "semi-auto") return language === "ar" ? "Semi-auto" : "Semi-auto";
  return language === "ar" ? "Auto" : "Auto";
}

function callApi(url, options = {}) {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "request_failed");
    return payload;
  });
}

function pickArabicVoice(voices, gender) {
  const arVoices = voices.filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith("ar"));
  if (arVoices.length === 0) return voices[0] || null;
  if (gender === "male") {
    return arVoices.find((voice) => /male|majed|maged|hamed/i.test(`${voice.name} ${voice.voiceURI}`)) || arVoices[0];
  }
  return arVoices.find((voice) => /female|woman|laila|mariam|zeina|amira/i.test(`${voice.name} ${voice.voiceURI}`)) || arVoices[0];
}

function playBreakingTone() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.25);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.38);
  oscillator.onended = () => audioContext.close().catch(() => {});
}

function PresenterAvatar({ current, isSpeaking, muted, settings, language, broadcastState }) {
  const breaking = current?.priority_action === "breaking_interrupt";
  const attireMap = {
    "formal-navy": ["#123d6b", "#071b2e"],
    charcoal: ["#374151", "#111827"],
    burgundy: ["#7f1d1d", "#3f0c0c"],
  };
  const backdropMap = {
    "digital-studio": "linear-gradient(140deg, rgba(18,27,55,0.92), rgba(5,9,18,0.92))",
    "world-wall": "radial-gradient(circle at center, rgba(8,145,178,0.16), transparent 36%), linear-gradient(140deg, rgba(13,34,53,0.94), rgba(4,10,22,0.96))",
    "red-alert": "radial-gradient(circle at 50% 30%, rgba(239,68,68,0.18), transparent 28%), linear-gradient(140deg, rgba(46,10,20,0.94), rgba(9,7,16,0.96))",
  };
  const [jacket, jacketShadow] = attireMap[settings.attire] || attireMap["formal-navy"];
  const studioBackground = backdropMap[settings.background] || backdropMap["digital-studio"];

  return (
    <div className={isSpeaking ? "ai-presenter-stage speaking" : "ai-presenter-stage"} style={{ background: studioBackground }}>
      <div className="ai-presenter-grid" />
      <div className={breaking ? "ai-presenter-alert is-active" : "ai-presenter-alert"}>
        BREAKING
      </div>

      <div className="ai-disclosure-pill top-left">AI Generated Presenter</div>
      <div className="ai-disclosure-pill top-right">{language === "ar" ? "المصدر ظاهر على الشاشة" : "Sources shown on screen"}</div>

      <div className="ai-studio-wall">
        <div className="ai-studio-orb" />
        <div className="ai-studio-panel left" />
        <div className="ai-studio-panel right" />
      </div>

      <div className="ai-presenter-anchor">
        <div className="ai-presenter-shadow" />
        <div className="ai-presenter-head">
          <div className="ai-presenter-hair" />
          <div className="ai-presenter-face">
            <div className="ai-presenter-brows" />
            <div className="ai-presenter-eyes">
              <span />
              <span />
            </div>
            <div className="ai-presenter-nose" />
            <div className="ai-presenter-mouth" />
          </div>
        </div>
        <div className="ai-presenter-torso" style={{ background: `linear-gradient(180deg, ${jacket}, ${jacketShadow})` }}>
          <div className="ai-presenter-shirt" />
          <div className="ai-presenter-tie" />
        </div>
      </div>

      <div className="ai-video-overlay">
        <div className="ai-video-meta-row">
          <span className="ai-status-chip live">{broadcastState || "Live"}</span>
          <span className="ai-status-chip" style={{ borderColor: `${statusTone(current?.verification_status)}66`, color: statusTone(current?.verification_status) }}>
            {current?.verification_status || "Source Pending"}
          </span>
          <span className="ai-status-chip">{muted ? (language === "ar" ? "Muted" : "Muted") : (language === "ar" ? "Audio On" : "Audio On")}</span>
        </div>

        <div className="ai-lower-third">
          <div className="ai-lower-third__eyebrow">LIVE NEWS BY AI</div>
          <div className="ai-lower-third__title">{current?.normalized_title || (language === "ar" ? "في انتظار تحديث مباشر جديد" : "Waiting for the next live update")}</div>
          <div className="ai-lower-third__meta">
            <span>{current?.source_name || "--"}</span>
            <span>{formatTime(current?.published_at || new Date().toISOString(), language)}</span>
            <span>{language === "ar" ? "مستوى الثقة" : "Trust"} {current?.trust_score || 0}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminQueueItem({ item, language, onAction }) {
  const actionButtons = [
    { label: "Approve", key: "approve", tone: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.34)", color: "#86efac" },
    { label: "Reject", key: "reject", tone: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.35)", color: "#fca5a5" },
    { label: "Hold", key: "hold", tone: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.35)", color: "#fcd34d" },
    { label: "Read Now", key: "read_now", tone: "rgba(56,189,248,0.18)", border: "rgba(56,189,248,0.36)", color: "#7dd3fc" },
    { label: "Push to Ticker", key: "push_to_ticker", tone: "rgba(168,85,247,0.18)", border: "rgba(168,85,247,0.34)", color: "#d8b4fe" },
    { label: "Interrupt Broadcast", key: "interrupt_broadcast", tone: "rgba(248,113,113,0.18)", border: "rgba(248,113,113,0.34)", color: "#fda4af" },
  ];

  return (
    <article style={{ ...panelStyle, borderRadius: 18, padding: 14, background: "linear-gradient(155deg, rgba(255,255,255,0.04), rgba(10,18,30,0.82))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 800, lineHeight: 1.6 }}>{item.normalized_title}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#93a4ba", fontSize: 11, marginTop: 6 }}>
            <span>{item.source_name}</span>
            <span>{formatTime(item.published_at, language)}</span>
            <span>{item.verification_status}</span>
            <span>{language === "ar" ? "مقروء" : "Read"}: {item.read_already ? (language === "ar" ? "نعم" : "Yes") : (language === "ar" ? "لا" : "No")}</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span style={{ color: statusTone(item.verification_status), fontWeight: 800, fontSize: 11 }}>{item.status_label}</span>
          <span style={{ color: "#f4c97b", fontSize: 11, fontWeight: 700 }}>{item.trust_score}/100</span>
        </div>
      </div>

      <div style={{ color: "#b7c3d2", fontSize: 12, lineHeight: 1.8, marginBottom: 10 }}>{item.short_anchor_text}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actionButtons.map((button) => (
          <button
            key={`${item.id}-${button.key}`}
            type="button"
            onClick={() => onAction(button.key, item)}
            style={{
              borderRadius: 999,
              border: `1px solid ${button.border}`,
              background: button.tone,
              color: button.color,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function LiveNewsAIPage({ language = "ar" }) {
  const isAr = language === "ar";
  const synthRef = useRef(null);
  const voicesRef = useRef([]);
  const spokenItemRef = useRef("");
  const [data, setData] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [muted, setMuted] = useState(false);
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [presenterSettings, setPresenterSettings] = useState({
    gender: "female",
    dialect: "msa",
    attire: "formal-navy",
    background: "digital-studio",
    deliveryStyle: "measured",
    speechRate: 0.96,
  });

  const hydrate = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [livePayload, adminPayload] = await Promise.all([
        callApi("/api/news/live"),
        callApi("/api/admin/queue"),
      ]);
      setData(livePayload);
      setAdmin(adminPayload);
      setAutoPlay(Boolean(livePayload?.broadcast_status?.auto_play ?? true));
      setMuted(Boolean(livePayload?.broadcast_status?.muted ?? false));
      setPresenterSettings((current) => ({
        ...current,
        ...(livePayload?.settings?.presenter || {}),
      }));
      setError("");
    } catch (requestError) {
      setError(requestError.message || (isAr ? "تعذر تحميل البث" : "Failed to load live broadcast"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
    const timer = window.setInterval(() => hydrate({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    synthRef.current = window.speechSynthesis;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const current = data?.current_broadcast_with_assets;
    if (!current || !synthRef.current) return;
    if (!autoPlay || muted) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }
    if (spokenItemRef.current === current.id && !current.priority_action?.includes("breaking")) return;

    const voice = pickArabicVoice(voicesRef.current, presenterSettings.gender);
    synthRef.current.cancel();
    if (current.priority_action === "breaking_interrupt") playBreakingTone();

    const utterance = new SpeechSynthesisUtterance(current.full_anchor_text || current.short_anchor_text || current.normalized_title);
    utterance.lang = isAr ? "ar-AE" : "en-GB";
    utterance.rate = Number(presenterSettings.speechRate || 0.96);
    utterance.pitch = presenterSettings.gender === "male" ? 0.78 : 1.0;
    utterance.volume = muted ? 0 : 1;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      spokenItemRef.current = current.id;
    };
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [data?.current_broadcast_with_assets?.id, autoPlay, muted, presenterSettings, isAr]);

  const sourceOptions = useMemo(() => {
    const set = new Set((admin?.queue || []).map((item) => item.source_name).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [admin]);

  const filteredQueue = useMemo(() => {
    const items = Array.isArray(admin?.queue) ? admin.queue : [];
    return items.filter((item) => {
      if (filters.source !== "all" && item.source_name !== filters.source) return false;
      if (filters.trust === "high" && item.trust_score < 80) return false;
      if (filters.trust === "medium" && (item.trust_score < 60 || item.trust_score >= 80)) return false;
      if (filters.trust === "low" && item.trust_score >= 60) return false;
      if (filters.priority === "breaking" && item.priority_action !== "breaking_interrupt") return false;
      if (filters.priority === "anchor" && item.priority_action !== "anchor_read") return false;
      if (filters.priority === "ticker" && item.priority_action !== "ticker_only") return false;
      if (filters.priority === "review" && item.priority_action !== "hold_for_review") return false;
      if (filters.status !== "all" && item.verification_status !== filters.status) return false;
      return true;
    }).slice(0, 16);
  }, [admin, filters]);

  const handleAdminAction = async (action, item) => {
    const routes = {
      approve: `/api/admin/item/${item.id}/approve`,
      reject: `/api/scripts/${item.id}/reject`,
      hold: `/api/admin/item/${item.id}/hold`,
      read_now: "/api/broadcast/push",
      push_to_ticker: "/api/broadcast/push",
      interrupt_broadcast: "/api/broadcast/interrupt",
    };
    const bodyMap = {
      read_now: { item_id: item.id, mode: "read_now" },
      push_to_ticker: { item_id: item.id, mode: "push_to_ticker" },
      interrupt_broadcast: { item_id: item.id, reason: "editor_interrupt" },
      approve: { read_now: false },
    };

    try {
      await callApi(routes[action], {
        method: "POST",
        body: JSON.stringify(bodyMap[action] || {}),
      });
      spokenItemRef.current = "";
      await hydrate({ silent: true });
    } catch (requestError) {
      setError(requestError.message || "admin_action_failed");
    }
  };

  const current = data?.current_broadcast_with_assets || null;
  const ticker = Array.isArray(data?.ticker) ? data.ticker : [];
  const metrics = data?.metrics || {};
  const systems = data?.systems || {};
  const queueItems = Array.isArray(data?.recent_items) ? data.recent_items : [];

  return (
    <div style={pageShell} className="ai-news-page">
      <PageHero
        eyebrow="LIVE NEWS BY AI"
        title={isAr ? "Live News by AI" : "Live News by AI"}
        description={isAr
          ? "بث إخباري حي بمذيع افتراضي عربي مولد بالذكاء الاصطناعي مع إظهار دائم للمصادر وطبقة تحقق للأخبار الحساسة قبل القراءة الحية."
          : "A live news stream with an AI-generated Arabic presenter, persistent source attribution, and an extra verification layer for sensitive stories."}
        right={
          <div style={{ ...panelStyle, padding: 18, borderRadius: 20, background: "radial-gradient(circle at top, rgba(239,68,68,0.15), transparent 28%), linear-gradient(180deg, rgba(10,18,30,0.94), rgba(5,10,18,0.98))" }}>
            <div style={{ color: "#fda4af", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Disclosure</div>
            <div style={{ color: "#f8fafc", fontSize: 15, fontWeight: 800, lineHeight: 1.6, marginBottom: 10 }}>
              AI-Assisted News Broadcast
            </div>
            <div style={{ color: "#b7c3d2", fontSize: 12, lineHeight: 1.8 }}>
              {data?.transparency_notice || "This broadcast uses AI-generated presenter and AI-assisted summarization."}
            </div>
          </div>
        }
      />

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 0.9fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <section style={{ ...panelStyle, padding: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="ai-status-chip live">Live</span>
                <span className="ai-status-chip" style={{ borderColor: `${statusTone(data?.broadcast_status?.state)}66`, color: statusTone(data?.broadcast_status?.state) }}>{data?.broadcast_status?.state || "Updating"}</span>
                <span className="ai-status-chip" style={{ borderColor: `${statusTone(current?.verification_status)}66`, color: statusTone(current?.verification_status) }}>{current?.verification_status || "Source Pending"}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setMuted((value) => !value)} className="ai-ctl-btn">
                  {muted ? (isAr ? "تشغيل الصوت" : "Unmute") : (isAr ? "كتم الصوت" : "Mute")}
                </button>
                <button type="button" onClick={() => setAutoPlay((value) => !value)} className="ai-ctl-btn secondary">
                  {autoPlay ? (isAr ? "إيقاف التشغيل التلقائي" : "Autoplay Off") : (isAr ? "تشغيل تلقائي" : "Autoplay On")}
                </button>
                <button type="button" onClick={() => hydrate()} className="ai-ctl-btn secondary">
                  {isAr ? "تحديث الآن" : "Refresh now"}
                </button>
              </div>
            </div>

            <div className="ai-video-shell">
              <PresenterAvatar
                current={current}
                isSpeaking={isSpeaking}
                muted={muted}
                settings={presenterSettings}
                language={language}
                broadcastState={data?.broadcast_status?.state}
              />
            </div>

            <div className="ai-breaking-ticker-wrap">
              <div className="ai-breaking-ticker-label">BREAKING</div>
              <div className="ai-breaking-ticker-window">
                <div className="ai-breaking-ticker-track">
                  {[...ticker, ...ticker].map((item, index) => (
                    <span key={`${item.id || index}-${index}`} className="ai-breaking-ticker-item">
                      <strong>{item.source_name}</strong>
                      <span>{item.ticker_text || item.normalized_title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
              {[
                { label: isAr ? "المصادر النشطة" : "Active sources", value: metrics.active_sources || 0, hint: isAr ? "مصادر تعمل الآن" : "Sources currently feeding the stream", color: "#67e8f9" },
                { label: isAr ? "جاهز للقراءة" : "Anchor queue", value: metrics.queued_for_anchor || 0, hint: isAr ? "عناصر يمكن أن يقرأها المذيع" : "Items eligible for presenter reading", color: "#f4c97b" },
                { label: isAr ? "يحتاج مراجعة" : "Needs review", value: metrics.needs_review || 0, hint: isAr ? "قصص حساسة أو أقل ثقة" : "Sensitive or low-confidence items", color: "#fb7185" },
                { label: isAr ? "موثّق" : "Verified", value: metrics.verified_items || 0, hint: isAr ? "قصص موثقة أو مؤكدة متعدد المصادر" : "Verified or multi-source confirmed items", color: "#4ade80" },
              ].map((metric) => (
                <div key={metric.label} style={{ ...panelStyle, borderRadius: 18, padding: 14, background: `radial-gradient(circle at top right, ${metric.color}22, transparent 32%), linear-gradient(160deg, rgba(9,15,25,0.9), rgba(5,10,18,0.96))` }}>
                  <div style={{ color: "#8fa0b5", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{metric.label}</div>
                  <div style={{ color: metric.color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{metric.value}</div>
                  <div style={{ color: "#aab7c8", fontSize: 11, lineHeight: 1.7, marginTop: 8 }}>{metric.hint}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                  {isAr ? "آخر الأخبار" : "Latest items"}
                </div>
                <div style={{ color: "#f8fafc", fontSize: 20, fontWeight: 800 }}>{isAr ? "آخر 20 خبرًا" : "Latest 20 stories"}</div>
              </div>
              {current?.source_url && current.source_url !== "#" ? (
                <a href={current.source_url} target="_blank" rel="noreferrer" className="ai-source-link">
                  {isAr ? "فتح المصدر الأصلي" : "Open original source"}
                </a>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {queueItems.slice(0, 20).map((item) => (
                <article key={item.id} style={{ border: "1px solid rgba(148,163,184,0.12)", borderRadius: 16, padding: 14, background: "rgba(6,12,20,0.74)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 14, lineHeight: 1.6 }}>{item.normalized_title}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#92a4bb", fontSize: 11, marginTop: 6 }}>
                        <span>{item.source_name}</span>
                        <span>{formatTime(item.published_at, language)}</span>
                        <span>{item.verification_status}</span>
                        <span>{isAr ? "قُرئ" : "Read"}: {item.read_already ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                      <span style={{ color: statusTone(item.status_label), fontSize: 11, fontWeight: 800 }}>{item.status_label}</span>
                      <span style={{ color: "#f4c97b", fontSize: 11 }}>{item.trust_score}/100</span>
                    </div>
                  </div>
                  <div style={{ color: "#b4c1cf", fontSize: 12, lineHeight: 1.8, marginTop: 8 }}>{item.trust_reason}</div>
                </article>
              ))}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              {isAr ? "لوحة التحكم" : "Admin control panel"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className="ai-select">
                {sourceOptions.map((option) => <option key={option} value={option}>{option === "all" ? (isAr ? "كل المصادر" : "All sources") : option}</option>)}
              </select>
              <select value={filters.trust} onChange={(event) => setFilters((current) => ({ ...current, trust: event.target.value }))} className="ai-select">
                <option value="all">{isAr ? "كل مستويات الثقة" : "All trust levels"}</option>
                <option value="high">High trust</option>
                <option value="medium">Medium trust</option>
                <option value="low">Low trust</option>
              </select>
              <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))} className="ai-select">
                <option value="all">{isAr ? "كل الأولويات" : "All priority states"}</option>
                <option value="breaking">Breaking interrupt</option>
                <option value="anchor">Anchor read</option>
                <option value="ticker">Ticker only</option>
                <option value="review">Hold for review</option>
              </select>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="ai-select">
                <option value="all">{isAr ? "كل الحالات" : "All statuses"}</option>
                <option value="Verified">Verified</option>
                <option value="Multi-source Confirmed">Multi-source Confirmed</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Source Pending">Source Pending</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filteredQueue.map((item) => (
                <AdminQueueItem key={item.id} item={item} language={language} onAction={handleAdminAction} />
              ))}
            </div>
          </section>
        </div>

        <aside style={{ display: "grid", gap: 16 }}>
          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ color: "#f4c97b", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              {isAr ? "حالة الأنظمة" : "System status"}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {Object.entries(systems).map(([key, value]) => (
                <div key={key} style={{ border: "1px solid rgba(148,163,184,0.12)", borderRadius: 16, padding: 12, background: "rgba(8,14,24,0.82)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13, textTransform: "capitalize" }}>{key}</span>
                    <span style={{ color: statusTone(value.status), fontSize: 11, fontWeight: 800 }}>{value.status}</span>
                  </div>
                  <div style={{ color: "#9db0c7", fontSize: 12, lineHeight: 1.7 }}>{value.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              {isAr ? "إعدادات المذيع" : "Presenter settings"}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <select className="ai-select" value={presenterSettings.gender} onChange={(event) => setPresenterSettings((current) => ({ ...current, gender: event.target.value }))}>
                <option value="female">{isAr ? "الجنس: أنثى" : "Gender: female"}</option>
                <option value="male">{isAr ? "الجنس: ذكر" : "Gender: male"}</option>
              </select>
              <select className="ai-select" value={presenterSettings.dialect} onChange={(event) => setPresenterSettings((current) => ({ ...current, dialect: event.target.value }))}>
                <option value="msa">{isAr ? "اللهجة: فصحى" : "Dialect: MSA"}</option>
                <option value="gulf">{isAr ? "اللهجة: خليجية" : "Dialect: Gulf"}</option>
                <option value="levant">{isAr ? "اللهجة: شامية" : "Dialect: Levant"}</option>
              </select>
              <select className="ai-select" value={presenterSettings.attire} onChange={(event) => setPresenterSettings((current) => ({ ...current, attire: event.target.value }))}>
                <option value="formal-navy">{isAr ? "اللباس: رسمي كحلي" : "Attire: navy formal"}</option>
                <option value="charcoal">{isAr ? "اللباس: فحمي" : "Attire: charcoal"}</option>
                <option value="burgundy">{isAr ? "اللباس: خمري" : "Attire: burgundy"}</option>
              </select>
              <select className="ai-select" value={presenterSettings.background} onChange={(event) => setPresenterSettings((current) => ({ ...current, background: event.target.value }))}>
                <option value="digital-studio">{isAr ? "الخلفية: استوديو رقمي" : "Background: digital studio"}</option>
                <option value="world-wall">{isAr ? "الخلفية: جدار عالمي" : "Background: world wall"}</option>
                <option value="red-alert">{isAr ? "الخلفية: وضع عاجل" : "Background: red alert"}</option>
              </select>
              <select className="ai-select" value={presenterSettings.deliveryStyle} onChange={(event) => setPresenterSettings((current) => ({ ...current, deliveryStyle: event.target.value }))}>
                <option value="measured">{isAr ? "الأداء: رزِين" : "Delivery: measured"}</option>
                <option value="urgent">{isAr ? "الأداء: عاجل" : "Delivery: urgent"}</option>
                <option value="calm">{isAr ? "الأداء: هادئ" : "Delivery: calm"}</option>
              </select>
              <label style={{ color: "#c0cedd", fontSize: 12, lineHeight: 1.7 }}>
                {isAr ? "سرعة الإلقاء" : "Speech rate"}
                <input
                  type="range"
                  min="0.8"
                  max="1.15"
                  step="0.01"
                  value={presenterSettings.speechRate}
                  onChange={(event) => setPresenterSettings((current) => ({ ...current, speechRate: Number(event.target.value) }))}
                  style={{ width: "100%", marginTop: 8, accentColor: "#67e8f9" }}
                />
              </label>
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ color: "#f4c97b", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              {isAr ? "وضع البث" : "Broadcast mode"}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="ai-sidebar-row"><span>{isAr ? "الوضع" : "Mode"}</span><strong>{labelForMode(data?.settings?.mode, language)}</strong></div>
              <div className="ai-sidebar-row"><span>{isAr ? "آخر مزامنة" : "Last sync"}</span><strong>{formatTime(data?.generated_at || new Date().toISOString(), language)}</strong></div>
              <div className="ai-sidebar-row"><span>{isAr ? "تحديث سريع" : "Fast sources"}</span><strong>{data?.refresh_plan?.fastSourcesSeconds || 30}s</strong></div>
              <div className="ai-sidebar-row"><span>{isAr ? "تحديث قياسي" : "Standard sources"}</span><strong>{data?.refresh_plan?.standardSourcesSeconds || 60}s</strong></div>
              <div className="ai-sidebar-row"><span>{isAr ? "إعادة مزامنة كاملة" : "Full resync"}</span><strong>{data?.refresh_plan?.fullResyncSeconds || 300}s</strong></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="ai-ctl-btn secondary" onClick={() => handleAdminAction("interrupt_broadcast", current || { id: "" })}>
                {isAr ? "قطع البث" : "Interrupt"}
              </button>
              <button
                type="button"
                className="ai-ctl-btn"
                onClick={async () => {
                  try {
                    await callApi("/api/broadcast/resume", { method: "POST", body: JSON.stringify({}) });
                    spokenItemRef.current = "";
                    await hydrate({ silent: true });
                  } catch (requestError) {
                    setError(requestError.message || "resume_failed");
                  }
                }}
              >
                {isAr ? "استئناف البث" : "Resume"}
              </button>
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              {isAr ? "سجل التدقيق" : "Audit log"}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {(admin?.audit_logs || []).slice(0, 10).map((entry) => (
                <div key={entry.id} style={{ border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14, padding: 10, background: "rgba(8,14,24,0.8)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 12 }}>{entry.action}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{formatTime(entry.created_at, language)}</span>
                  </div>
                  <div style={{ color: "#aebdce", fontSize: 11, lineHeight: 1.7 }}>{entry.target_id}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {loading ? <div style={{ color: "#67e8f9", textAlign: "center", padding: 24 }}>{isAr ? "جارٍ تحميل بث الذكاء الاصطناعي..." : "Loading AI live broadcast..."}</div> : null}
      {error ? <div style={{ color: "#fca5a5", textAlign: "center", padding: 16 }}>{error}</div> : null}
    </div>
  );
}
