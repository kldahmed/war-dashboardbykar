import React, { useEffect, useMemo, useRef, useState } from "react";
import { PageHero, pageShell, panelStyle } from "./shared/pagePrimitives";

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

function tone(status) {
  if (status === "Live") return "#ef4444";
  if (status === "Verified" || status === "Multi-source Confirmed") return "#22c55e";
  if (status === "Muted") return "#94a3b8";
  if (status === "Updating") return "#f59e0b";
  return "#67e8f9";
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
  oscillator.frequency.setValueAtTime(820, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.24);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.33);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.35);
  oscillator.onended = () => audioContext.close().catch(() => {});
}

function PresenterFrame({ item, isSpeaking, presenterSettings, language, broadcastState, audioState }) {
  const media = item?.video_asset?.optional_media || {};
  const source = media.webm || media.mp4 || "";
  const poster = media.poster || "";
  const isBreaking = item?.priority_action === "breaking_interrupt";

  return (
    <div className={isSpeaking ? "ai-broadcast-stage speaking" : "ai-broadcast-stage"}>
      <div className="ai-broadcast-stage__studio" />
      <div className="ai-broadcast-stage__vignette" />

      {source ? (
        <video
          key={`${item?.id || "item"}-${source}`}
          className="ai-anchor-video"
          autoPlay
          playsInline
          loop
          muted
          poster={poster || undefined}
          preload="auto"
        >
          {media.webm ? <source src={media.webm} type="video/webm" /> : null}
          {media.mp4 ? <source src={media.mp4} type="video/mp4" /> : null}
        </video>
      ) : (
        <div className="ai-anchor-fallback">
          <div className="ai-anchor-fallback__light" />
          <div className="ai-anchor-fallback__desk" />
          <div className="ai-anchor-fallback__silhouette" />
        </div>
      )}

      <div className="ai-overlay-top">
        <span className="ai-pill ai-pill--live">
          <span className="ai-live-dot" /> LIVE
        </span>
        <span className="ai-pill">{broadcastState || "Live"}</span>
        <span className="ai-pill" style={{ color: tone(item?.verification_status), borderColor: `${tone(item?.verification_status)}55` }}>
          {item?.verification_status || "Attributed"}
        </span>
        <span className="ai-pill">{audioState.message}</span>
      </div>

      <div className="ai-disclosure-stack">
        <span className="ai-disclosure">Virtual AI News Anchor</span>
        <span className="ai-disclosure">AI Generated Presenter</span>
      </div>

      {isBreaking ? <div className="ai-breaking-strap">BREAKING NEWS</div> : null}

      <div className="ai-lower-third-pro">
        <div className="ai-lower-third-pro__topline">LIVE NEWS BY AI</div>
        <div className="ai-lower-third-pro__headline">
          {item?.normalized_title || (language === "ar" ? "غرفة الأخبار تتابع المصادر المعتمدة لحظة بلحظة" : "News desk is actively monitoring trusted sources")}
        </div>
        <div className="ai-lower-third-pro__meta">
          <span>{item?.source_display || item?.source_name || "News Desk"}</span>
          <span>{formatTime(item?.published_at || new Date().toISOString(), language)}</span>
          <span>{language === "ar" ? "ثقة" : "Trust"} {item?.trust_score || 0}/100</span>
          <span>{presenterSettings.gender === "male" ? (language === "ar" ? "مذيع" : "Male anchor") : (language === "ar" ? "مذيعة" : "Female anchor")}</span>
        </div>
      </div>
    </div>
  );
}

function InternalQueueItem({ item, onAction, language }) {
  return (
    <article className="ai-internal-item">
      <div className="ai-internal-item__head">
        <h4>{item.normalized_title}</h4>
        <span style={{ color: tone(item.verification_status) }}>{item.verification_status}</span>
      </div>
      <div className="ai-internal-item__meta">
        <span>{item.source_display || item.source_name}</span>
        <span>{formatTime(item.published_at, language)}</span>
        <span>{language === "ar" ? "ثقة" : "Trust"} {item.trust_score}/100</span>
      </div>
      <p>{item.short_anchor_text}</p>
      <div className="ai-internal-item__actions">
        <button type="button" onClick={() => onAction("read_now", item)}>Read now</button>
        <button type="button" onClick={() => onAction("push_to_ticker", item)}>Push ticker</button>
        <button type="button" onClick={() => onAction("hold", item)}>Hold</button>
      </div>
    </article>
  );
}

export default function LiveNewsAIPage({ language = "ar" }) {
  const isAr = language === "ar";
  const sourceRef = useRef(null);
  const synthRef = useRef(null);
  const voicesRef = useRef([]);
  const speechKeyRef = useRef("");
  const audioTagRef = useRef(null);
  const currentItemRef = useRef("");

  const [data, setData] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState("auto");
  const [audioState, setAudioState] = useState({ engine: "idle", message: "Audio idle", fallback: false });
  const [presenterSettings, setPresenterSettings] = useState({
    gender: "female",
    dialect: "msa",
    key: "female-desk",
    speechRate: 0.95,
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
      setMode(livePayload?.settings?.mode || "auto");
      setPresenterSettings((current) => ({ ...current, ...(livePayload?.settings?.presenter || {}) }));
      setConnected(true);
      setError("");
    } catch (requestError) {
      setConnected(false);
      setError(requestError.message || (isAr ? "تعذر تحميل البث الحي" : "Unable to load live broadcast"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();

    if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
      const fallbackTimer = window.setInterval(() => hydrate({ silent: true }), 12000);
      return () => window.clearInterval(fallbackTimer);
    }

    const eventSource = new window.EventSource("/api/news/live-stream");
    sourceRef.current = eventSource;

    const handleSnapshot = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (payload && typeof payload === "object") {
          setData(payload);
          setAutoPlay(Boolean(payload?.broadcast_status?.auto_play ?? true));
          setMuted(Boolean(payload?.broadcast_status?.muted ?? false));
          setMode(payload?.settings?.mode || "auto");
          setPresenterSettings((current) => ({ ...current, ...(payload?.settings?.presenter || {}) }));
          setConnected(true);
          setError("");
        }
      } catch {
        setConnected(false);
      }
    };

    const handleHealth = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (payload?.ok === false) setConnected(false);
      } catch {
        setConnected(false);
      }
    };

    eventSource.addEventListener("snapshot", handleSnapshot);
    eventSource.addEventListener("health", handleHealth);
    eventSource.onerror = () => setConnected(false);

    const adminTimer = window.setInterval(async () => {
      try {
        const payload = await callApi("/api/admin/queue");
        setAdmin(payload);
      } catch {
        setConnected(false);
      }
    }, 12000);

    return () => {
      window.clearInterval(adminTimer);
      eventSource.removeEventListener("snapshot", handleSnapshot);
      eventSource.removeEventListener("health", handleHealth);
      eventSource.close();
    };
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

  const current = data?.current_broadcast_with_assets || null;
  const ticker = useMemo(() => {
    const source = Array.isArray(data?.ticker) ? data.ticker : [];
    if (source.length > 0) return source;
    return [{ id: "fallback", source_name: "News Desk", ticker_text: "متابعة مستمرة للمصادر المعتمدة داخل غرفة الأخبار." }];
  }, [data?.ticker]);

  useEffect(() => {
    const nextId = current?.id || "";
    if (nextId && currentItemRef.current && currentItemRef.current !== nextId && current?.priority_action === "breaking_interrupt") {
      playBreakingTone();
    }
    currentItemRef.current = nextId;
  }, [current?.id, current?.priority_action]);

  useEffect(() => {
    let cancelled = false;
    const runSpeech = async () => {
      if (!current || !autoPlay || muted) {
        if (synthRef.current) synthRef.current.cancel();
        if (audioTagRef.current) {
          audioTagRef.current.pause();
          audioTagRef.current.src = "";
        }
        setIsSpeaking(false);
        setAudioState({ engine: "muted", message: isAr ? "الصوت مكتوم" : "Audio muted", fallback: false });
        return;
      }

      const speechKey = `${current.id}:${current.updated_at || current.published_at || ""}`;
      if (speechKeyRef.current === speechKey) return;

      speechKeyRef.current = speechKey;
      setIsSpeaking(false);

      const text = current.full_anchor_text || current.short_anchor_text || current.normalized_title;
      const providerEngine = current?.audio_asset?.engine || "browser-speech-synthesis";
      const audioUrl = current?.audio_asset?.audio_url || "";

      if (audioUrl) {
        try {
          const tag = audioTagRef.current || new window.Audio();
          audioTagRef.current = tag;
          tag.src = audioUrl;
          tag.preload = "auto";
          tag.onplay = () => {
            if (cancelled) return;
            setIsSpeaking(true);
            setAudioState({ engine: providerEngine, message: isAr ? "الصوت عبر المحرك الأساسي" : "Primary TTS engine", fallback: false });
          };
          tag.onended = () => {
            if (cancelled) return;
            setIsSpeaking(false);
          };
          tag.onerror = () => {
            if (cancelled) return;
            setAudioState({ engine: providerEngine, message: isAr ? "فشل المحرك الأساسي - جاري التبديل" : "Primary TTS failed, switching", fallback: true });
            throw new Error("provider_audio_failed");
          };
          await tag.play();
          return;
        } catch {
          if (cancelled) return;
        }
      }

      if (!synthRef.current || typeof window === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") {
        setAudioState({ engine: "unavailable", message: isAr ? "الصوت غير متاح على هذا المتصفح" : "Audio unavailable in this browser", fallback: true });
        return;
      }

      synthRef.current.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      const voice = pickArabicVoice(voicesRef.current, presenterSettings.gender);
      utterance.lang = isAr ? "ar-AE" : "en-GB";
      utterance.rate = Number(presenterSettings.speechRate || 0.95);
      utterance.pitch = presenterSettings.gender === "male" ? 0.8 : 1;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (cancelled) return;
        setIsSpeaking(true);
        setAudioState({ engine: "browser-speech-synthesis", message: isAr ? "وضع احتياطي صوتي" : "Browser fallback voice", fallback: true });
      };
      utterance.onend = () => {
        if (cancelled) return;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (cancelled) return;
        setIsSpeaking(false);
        setAudioState({ engine: "failed", message: isAr ? "تعذر تشغيل الصوت" : "Audio playback failed", fallback: true });
      };
      synthRef.current.speak(utterance);
    };

    runSpeech();
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.updated_at, autoPlay, muted, isAr, presenterSettings]);

  const queueItems = Array.isArray(data?.recent_items) ? data.recent_items : [];
  const internalQueue = Array.isArray(admin?.queue) ? admin.queue.slice(0, 10) : [];

  const syncSettings = async (patch) => {
    const nextPresenter = { ...presenterSettings, ...(patch.presenter || {}) };
    const body = {
      mode: patch.mode || mode,
      auto_play: typeof patch.auto_play === "boolean" ? patch.auto_play : autoPlay,
      muted: typeof patch.muted === "boolean" ? patch.muted : muted,
      presenter: nextPresenter,
    };

    const payload = await callApi("/api/broadcast/configure", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setData((currentData) => ({ ...currentData, ...payload }));
    setAutoPlay(Boolean(payload?.status?.auto_play ?? body.auto_play));
    setMuted(Boolean(payload?.status?.muted ?? body.muted));
    setMode(payload?.status?.mode || body.mode);
    setPresenterSettings((currentPresenter) => ({ ...currentPresenter, ...(payload?.settings?.presenter || nextPresenter) }));
  };

  const handleAction = async (action, item) => {
    const routes = {
      read_now: "/api/broadcast/push",
      push_to_ticker: "/api/broadcast/push",
      hold: `/api/admin/item/${item.id}/hold`,
    };
    const bodyMap = {
      read_now: { item_id: item.id, mode: "read_now" },
      push_to_ticker: { item_id: item.id, mode: "push_to_ticker" },
      hold: { editorial_note: "manual_hold" },
    };

    try {
      await callApi(routes[action], { method: "POST", body: JSON.stringify(bodyMap[action] || {}) });
      const [livePayload, adminPayload] = await Promise.all([
        callApi("/api/news/live"),
        callApi("/api/admin/queue"),
      ]);
      setData(livePayload);
      setAdmin(adminPayload);
      speechKeyRef.current = "";
    } catch (requestError) {
      setError(requestError.message || "action_failed");
    }
  };

  return (
    <div style={pageShell} className="ai-news-page--pro">
      <PageHero
        eyebrow="LIVE NEWS BY AI"
        title={isAr ? "منصة بث إخباري حي بالذكاء الاصطناعي" : "AI Live News Broadcast Platform"}
        description={isAr
          ? "نشرة مستمرة بمذيع افتراضي وصوت عربي مباشر، مع مصدر ووقت نشر واضحين لكل خبر، وشريط عاجل متصل بالتحديثات اللحظية."
          : "Continuous live bulletin with a virtual anchor, Arabic narration, clear source attribution, and a real-time breaking ticker."}
        right={
          <div style={{ ...panelStyle, padding: 16, borderRadius: 20 }}>
            <div className="ai-hero-chip">{connected ? "LIVE SIGNAL" : "RECONNECTING"}</div>
            <div className="ai-hero-note">{data?.transparency_notice || "AI summarization and AI presenter are always disclosed."}</div>
          </div>
        }
      />

      <section className="ai-broadcast-layout">
        <main className="ai-main-column">
          <section style={{ ...panelStyle, padding: 12 }}>
            <div className="ai-control-strip">
              <div className="ai-control-strip__left">
                <span className="ai-chip ai-chip--live">LIVE</span>
                <span className="ai-chip" style={{ color: tone(data?.broadcast_status?.state), borderColor: `${tone(data?.broadcast_status?.state)}55` }}>
                  {data?.broadcast_status?.state || "Updating"}
                </span>
                <span className="ai-chip">{audioState.engine}</span>
              </div>
              <div className="ai-control-strip__right">
                <button type="button" className="ai-btn" onClick={() => syncSettings({ muted: !muted })}>
                  {muted ? (isAr ? "تشغيل الصوت" : "Unmute") : (isAr ? "كتم" : "Mute")}
                </button>
                <button type="button" className="ai-btn ai-btn--ghost" onClick={() => syncSettings({ auto_play: !autoPlay })}>
                  {autoPlay ? "Auto On" : "Auto Off"}
                </button>
                <button type="button" className="ai-btn ai-btn--ghost" onClick={() => syncSettings({ mode: mode === "auto" ? "semi-auto" : "auto" })}>
                  {mode === "auto" ? "Mode: Auto" : "Mode: Semi-Auto"}
                </button>
              </div>
            </div>

            <div className="ai-broadcast-frame">
              <PresenterFrame
                item={current}
                isSpeaking={isSpeaking}
                presenterSettings={presenterSettings}
                language={language}
                broadcastState={data?.broadcast_status?.state}
                audioState={audioState}
              />
            </div>

            <div className="ai-pro-ticker">
              <div className="ai-pro-ticker__label">BREAKING</div>
              <div className="ai-pro-ticker__window">
                <div className="ai-pro-ticker__track">
                  {[...ticker, ...ticker].map((entry, index) => (
                    <span key={`${entry.id || index}-${index}`} className="ai-pro-ticker__item">
                      <strong>{entry.source_name || "News Desk"}</strong>
                      <span>{entry.ticker_text || entry.normalized_title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 18 }}>
            <div className="ai-section-head">
              <h3>{isAr ? "القصص الجاهزة للبث" : "On-air stories"}</h3>
              <span>{formatTime(data?.generated_at || new Date().toISOString(), language)}</span>
            </div>
            <div className="ai-story-list">
              {queueItems.slice(0, 10).map((item) => (
                <article key={item.id} className="ai-story-item">
                  <h4>{item.normalized_title}</h4>
                  <div className="ai-story-item__meta">
                    <span>{item.source_display || item.source_name}</span>
                    <span>{formatTime(item.published_at, language)}</span>
                    <span>{item.verification_status}</span>
                  </div>
                  <p>{item.trust_reason}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="ai-side-column">
          <section style={{ ...panelStyle, padding: 16 }}>
            <h3 className="ai-side-title">{isAr ? "حالة الـ Pipeline" : "Pipeline status"}</h3>
            <div className="ai-pipeline-grid">
              {Object.entries(data?.systems || {}).map(([key, value]) => (
                <div key={key} className="ai-pipeline-card">
                  <div>
                    <strong>{key}</strong>
                    <span style={{ color: tone(value.status) }}>{value.status}</span>
                  </div>
                  <p>{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...panelStyle, padding: 16 }}>
            <h3 className="ai-side-title">{isAr ? "إعدادات المذيع" : "Anchor profile"}</h3>
            <div className="ai-form-grid">
              <select value={presenterSettings.gender} onChange={(event) => syncSettings({ presenter: { gender: event.target.value, key: `${event.target.value}-desk` } })}>
                <option value="female">{isAr ? "مذيعة" : "Female"}</option>
                <option value="male">{isAr ? "مذيع" : "Male"}</option>
              </select>
              <select value={presenterSettings.dialect} onChange={(event) => syncSettings({ presenter: { dialect: event.target.value } })}>
                <option value="msa">{isAr ? "فصحى" : "MSA"}</option>
                <option value="gulf">{isAr ? "خليجي" : "Gulf"}</option>
                <option value="levant">{isAr ? "شامي" : "Levant"}</option>
              </select>
              <label>
                {isAr ? "سرعة الإلقاء" : "Speech rate"}
                <input
                  type="range"
                  min="0.85"
                  max="1.15"
                  step="0.01"
                  value={presenterSettings.speechRate || 0.95}
                  onChange={(event) => syncSettings({ presenter: { speechRate: Number(event.target.value) } })}
                />
              </label>
            </div>
          </section>

          <details className="ai-admin-drawer" open={showInternal} onToggle={(event) => setShowInternal(event.currentTarget.open)}>
            <summary>{isAr ? "لوحة الإدارة الداخلية" : "Internal operations panel"}</summary>
            <div className="ai-admin-drawer__body">
              {internalQueue.map((item) => (
                <InternalQueueItem key={item.id} item={item} onAction={handleAction} language={language} />
              ))}
            </div>
          </details>
        </aside>
      </section>

      {loading ? <div className="ai-page-state">{isAr ? "تحميل البث الحي..." : "Loading live broadcast..."}</div> : null}
      {error ? <div className="ai-page-state ai-page-state--error">{error}</div> : null}
    </div>
  );
}
