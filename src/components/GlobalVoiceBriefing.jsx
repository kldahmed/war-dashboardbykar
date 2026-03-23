/**
 * GlobalVoiceBriefing.jsx
 *
 * "الموجز الصوتي العالمي" — Global AI News Voice System
 *
 * A floating command-center widget that:
 * - Generates AI briefings from top signals every hour
 * - Converts briefings to voice via Web Speech API
 * - Shows segment-by-segment progress with visual timeline
 * - Supports play/pause/stop, volume, speed controls
 * - Auto-refreshes briefing hourly
 * - Displays live waveform animation during playback
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { generateBriefing, refreshBriefing, getQuickSummary } from "../lib/briefingEngine";
import { getEngineStats, subscribeEvents } from "../lib/globalEventsEngine";
import { useI18n } from "../i18n/I18nProvider";

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#080c14",
  surface: "#0c1220",
  surfaceAlt: "#101828",
  border: "rgba(243,211,138,0.15)",
  gold: "#f3d38a",
  blue: "#38bdf8",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a78bfa",
  muted: "#475569",
  text: "#e2e8f0",
  dim: "#1e293b",
};

const SPEEDS = [
  { value: 0.75, label: "0.75×" },
  { value: 0.9, label: "0.9×" },
  { value: 1.0, label: "1×" },
  { value: 1.15, label: "1.15×" },
  { value: 1.3, label: "1.3×" },
];

// ── Keyframe styles (injected once) ────────────────────────────────────────────
const KEYFRAMES = `
@keyframes gvbPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes gvbWave {
  0%   { height: 4px; }
  50%  { height: 18px; }
  100% { height: 4px; }
}
@keyframes gvbGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(243,211,138,0.3); }
  50%      { box-shadow: 0 0 24px rgba(243,211,138,0.6), 0 0 48px rgba(243,211,138,0.15); }
}
@keyframes gvbRing {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes gvbSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gvbFab {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
`;

// ── Waveform Visualizer ────────────────────────────────────────────────────────
function WaveformBars({ isPlaying, color = C.gold }) {
  const bars = 16;
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", gap: 2,
      height: 24, padding: "0 4px",
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color,
          opacity: isPlaying ? 0.8 : 0.2,
          height: isPlaying ? undefined : 4,
          animation: isPlaying
            ? `gvbWave ${0.4 + Math.random() * 0.6}s ease-in-out ${i * 0.05}s infinite alternate`
            : "none",
          transition: "height 0.3s, opacity 0.3s",
          minHeight: 3,
        }} />
      ))}
    </div>
  );
}

// ── Segment Progress Pip ───────────────────────────────────────────────────────
function SegmentPip({ segment, isCurrent, isCompleted }) {
  const bg = isCurrent ? C.gold : isCompleted ? C.green : C.dim;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 8px", borderRadius: 8,
      background: isCurrent ? `${C.gold}12` : "transparent",
      border: isCurrent ? `1px solid ${C.gold}30` : "1px solid transparent",
      transition: "all 0.3s",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: bg,
        boxShadow: isCurrent ? `0 0 8px ${C.gold}60` : "none",
        animation: isCurrent ? "gvbPulse 1.5s infinite" : "none",
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10, fontWeight: isCurrent ? 800 : 500,
        color: isCurrent ? C.gold : isCompleted ? C.green : C.muted,
      }}>
        {segment.icon} {segment.label}
      </span>
    </div>
  );
}

// ── Stats Mini-Bar ─────────────────────────────────────────────────────────────
function StatsMiniBar({ stats }) {
  if (!stats || !stats.total) return null;
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap",
      padding: "6px 0",
      borderTop: `1px solid ${C.border}`,
      marginTop: 8,
    }}>
      <MiniStat label="أحداث" value={stats.total} color={C.blue} />
      <MiniStat label="حرج" value={stats.urgent} color={C.red} />
      <MiniStat label="مرتفع" value={stats.high} color={C.amber} />
      <MiniStat label="خطورة" value={`${stats.avgSeverity}%`} color={C.purple} />
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <span style={{ fontSize: 10, color: C.muted }}>
      <span style={{ color, fontWeight: 800, fontSize: 12 }}>{value}</span> {label}
    </span>
  );
}

function summarizeAlertText(alert, language) {
  const title = String(alert?.title || "").trim();
  if (!title) return "";
  if (language === "ar") {
    return `تنبيه فوري: ${title}`;
  }
  return `Priority alert: ${title}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GlobalVoiceBriefing({ headlines = [], priorityAlert = null }) {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [speed, setSpeed] = useState(1.0);
  const [currentSegIdx, setCurrentSegIdx] = useState(-1);
  const [briefing, setBriefing] = useState(null);
  const [supported, setSupported] = useState(true);
  const [quickSummary, setQuickSummary] = useState("");
  const [progress, setProgress] = useState(0);

  const synthRef = useRef(null);
  const voiceRef = useRef(null);
  const styleRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const utterancesRef = useRef([]);
  const announcedAlertRef = useRef("");

  // Inject keyframes once
  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement("style");
      el.textContent = KEYFRAMES;
      document.head.appendChild(el);
      styleRef.current = el;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false);
      return;
    }
    synthRef.current = window.speechSynthesis;

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      // Prefer Arabic voice
      voiceRef.current =
        voices.find(v => v.lang === "ar-SA") ||
        voices.find(v => v.lang === "ar-AE") ||
        voices.find(v => v.lang.startsWith("ar")) ||
        voices.find(v => v.default) ||
        voices[0] ||
        null;
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // Generate briefing on mount & subscribe to events for quick summary
  useEffect(() => {
    const b = generateBriefing(headlines);
    setBriefing(b);
    setQuickSummary(getQuickSummary());

    const unsub = subscribeEvents(() => {
      setQuickSummary(getQuickSummary());
    });

    // Auto-refresh briefing every hour
    refreshIntervalRef.current = setInterval(() => {
      const fresh = refreshBriefing(headlines);
      setBriefing(fresh);
      setQuickSummary(getQuickSummary());
    }, 60 * 60 * 1000);

    return () => {
      unsub();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [headlines]);

  // Regenerate briefing when headlines change substantially
  useEffect(() => {
    if (headlines.length > 0 && !isPlaying) {
      const fresh = generateBriefing(headlines);
      setBriefing(fresh);
    }
  }, [headlines.length]);

  // ── Playback Controls ──────────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    utterancesRef.current = [];
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSegIdx(-1);
    setProgress(0);
  }, []);

  const play = useCallback(() => {
    if (!synthRef.current || !briefing?.segments?.length) return;
    synthRef.current.cancel();
    utterancesRef.current = [];

    const segments = briefing.segments;
    const totalSegments = segments.length;

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSegIdx(0);
    setProgress(0);

    segments.forEach((seg, i) => {
      const utt = new SpeechSynthesisUtterance(seg.text);
      utt.lang = language === "ar" ? "ar-AE" : "en-US";
      utt.volume = isMuted ? 0 : volume;
      utt.rate = speed;
      utt.pitch = 1.0;
      if (voiceRef.current) utt.voice = voiceRef.current;

      utt.onstart = () => {
        setCurrentSegIdx(i);
        setProgress(Math.round((i / totalSegments) * 100));
      };

      utt.onend = () => {
        if (i === totalSegments - 1) {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSegIdx(-1);
          setProgress(100);
        }
      };

      utt.onerror = () => {
        if (i === totalSegments - 1) {
          setIsPlaying(false);
          setCurrentSegIdx(-1);
        }
      };

      utterancesRef.current.push(utt);
      synthRef.current.speak(utt);
    });
  }, [briefing, language, isMuted, volume, speed]);

  const togglePause = useCallback(() => {
    if (!synthRef.current) return;
    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    } else {
      synthRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handleRefresh = useCallback(() => {
    stop();
    const fresh = refreshBriefing(headlines);
    setBriefing(fresh);
    setQuickSummary(getQuickSummary());
  }, [headlines, stop]);

  const handleVolumeChange = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  useEffect(() => {
    if (!priorityAlert?.id) return;
    if (!synthRef.current || !supported) return;
    if (announcedAlertRef.current === priorityAlert.id) return;

    announcedAlertRef.current = priorityAlert.id;

    const alertText = summarizeAlertText(priorityAlert, language);
    if (!alertText) return;

    const utterance = new SpeechSynthesisUtterance(alertText);
    utterance.lang = language === "ar" ? "ar-AE" : "en-US";
    utterance.volume = isMuted ? 0 : Math.max(0.45, volume * 0.9);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (voiceRef.current) utterance.voice = voiceRef.current;
    synthRef.current.speak(utterance);
  }, [priorityAlert, language, supported, isMuted, volume]);

  // Current segment info
  const currentSeg = briefing?.segments?.[currentSegIdx] || null;

  if (!supported) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: 24,
      zIndex: 10000,
      fontFamily: "inherit",
      direction: "rtl",
    }}>
      {/* ── Expanded Panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{
          marginBottom: 10,
          background: `linear-gradient(170deg, ${C.bg}, ${C.surfaceAlt})`,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          width: 340,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(243,211,138,0.08)",
          animation: "gvbSlideUp 0.25s ease-out",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 18px 12px",
            borderBottom: `1px solid ${C.border}`,
            background: "rgba(243,211,138,0.03)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 18 }}>🎙️</span>
              <span style={{
                fontWeight: 900, fontSize: 14, color: C.gold,
                letterSpacing: "0.02em",
              }}>
                الموجز الصوتي العالمي
              </span>
              {isPlaying && (
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: C.red, marginInlineStart: "auto",
                  animation: "gvbPulse 1s infinite",
                  boxShadow: `0 0 6px ${C.red}60`,
                }} />
              )}
            </div>
            <p style={{
              color: C.muted, fontSize: 10, margin: 0,
              lineHeight: 1.5,
            }}>
              ملخص ذكي تلقائي للأحداث العالمية — يُولّد كل ساعة بواسطة محرك الذكاء الاصطناعي
            </p>
          </div>

          {/* Quick Summary Ticker */}
          {quickSummary && !isPlaying && (
            <div style={{
              padding: "8px 18px",
              background: "rgba(56,189,248,0.04)",
              borderBottom: `1px solid rgba(255,255,255,0.03)`,
              fontSize: 11, color: C.blue, lineHeight: 1.5,
            }}>
              📡 {quickSummary}
            </div>
          )}

          {priorityAlert?.id ? (
            <div style={{
              padding: "8px 18px",
              background: "rgba(239,68,68,0.09)",
              borderBottom: "1px solid rgba(239,68,68,0.16)",
              color: "#fecaca",
              fontSize: 11,
              lineHeight: 1.5,
            }}>
              🚨 {summarizeAlertText(priorityAlert, language)}
            </div>
          ) : null}

          {/* Waveform + Current Segment */}
          {isPlaying && (
            <div style={{
              padding: "12px 18px",
              background: "rgba(243,211,138,0.03)",
              borderBottom: `1px solid rgba(255,255,255,0.04)`,
            }}>
              <WaveformBars isPlaying={isPlaying && !isPaused} />

              {/* Progress bar */}
              <div style={{
                width: "100%", height: 3, borderRadius: 2,
                background: C.dim, marginTop: 8, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: `linear-gradient(90deg, ${C.gold}, ${C.amber})`,
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }} />
              </div>

              {/* Current segment text */}
              {currentSeg && (
                <div style={{
                  marginTop: 10, padding: "8px 10px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 10,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 12 }}>{currentSeg.icon}</span>
                    <span style={{
                      color: C.gold, fontSize: 10, fontWeight: 800,
                    }}>
                      {currentSeg.label}
                    </span>
                    <span style={{
                      color: C.muted, fontSize: 10,
                      marginInlineStart: "auto",
                    }}>
                      {currentSegIdx + 1}/{briefing?.segments?.length || 0}
                    </span>
                  </div>
                  <p style={{
                    color: "#94a3b8", fontSize: 11, lineHeight: 1.65,
                    margin: 0, maxHeight: 64, overflow: "hidden",
                  }}>
                    {currentSeg.text.slice(0, 200)}{currentSeg.text.length > 200 ? "…" : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Segment Timeline */}
          {briefing?.segments?.length > 0 && (
            <div style={{
              padding: "10px 18px",
              borderBottom: `1px solid rgba(255,255,255,0.03)`,
            }}>
              <div style={{
                color: C.muted, fontSize: 10, fontWeight: 700,
                marginBottom: 6, letterSpacing: ".04em",
              }}>
                أقسام الموجز ({briefing.segments.length})
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                {briefing.segments.map((seg, i) => (
                  <SegmentPip
                    key={seg.id}
                    segment={seg}
                    isCurrent={i === currentSegIdx}
                    isCompleted={currentSegIdx > i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ padding: "12px 18px" }}>
            {/* Play / Pause / Stop row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {!isPlaying ? (
                <button onClick={play} style={{
                  flex: 1,
                  background: `linear-gradient(135deg, ${C.gold}, #e6c060)`,
                  color: "#0f172a",
                  border: "none", borderRadius: 10, padding: "10px 16px",
                  fontWeight: 900, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: `0 4px 16px ${C.gold}30`,
                  transition: "transform 0.15s",
                }}>
                  ▶ تشغيل الموجز
                </button>
              ) : (
                <>
                  <button onClick={togglePause} style={{
                    flex: 1,
                    background: isPaused ? `${C.amber}18` : `${C.blue}18`,
                    color: isPaused ? C.amber : C.blue,
                    border: `1px solid ${isPaused ? `${C.amber}40` : `${C.blue}40`}`,
                    borderRadius: 10, padding: "10px 12px",
                    fontWeight: 800, fontSize: 12, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    {isPaused ? "▶ استئناف" : "⏸ إيقاف مؤقت"}
                  </button>
                  <button onClick={stop} style={{
                    background: `${C.red}18`,
                    color: C.red,
                    border: `1px solid ${C.red}40`,
                    borderRadius: 10, padding: "10px 14px",
                    fontWeight: 800, fontSize: 12, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    ⏹
                  </button>
                </>
              )}
              <button onClick={() => setIsMuted(m => !m)} style={{
                background: isMuted ? `${C.red}15` : "rgba(255,255,255,0.05)",
                color: isMuted ? C.red : C.muted,
                border: `1px solid ${isMuted ? `${C.red}30` : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, padding: "10px 12px",
                fontSize: 14, cursor: "pointer",
              }} title={isMuted ? "إلغاء الكتم" : "كتم"}>
                {isMuted ? "🔇" : "🔊"}
              </button>
            </div>

            {/* Volume Slider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 8,
            }}>
              <span style={{ color: C.muted, fontSize: 10, minWidth: 30 }}>🔊</span>
              <input
                type="range" min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  flex: 1, accentColor: C.gold,
                  cursor: "pointer", height: 4,
                }}
              />
              <span style={{
                color: C.muted, fontSize: 10, minWidth: 28,
                textAlign: "left",
              }}>
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Speed Control */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: 10,
            }}>
              <span style={{ color: C.muted, fontSize: 10 }}>⚡ السرعة:</span>
              <div style={{ display: "flex", gap: 3 }}>
                {SPEEDS.map(s => (
                  <button key={s.value} onClick={() => setSpeed(s.value)} style={{
                    background: speed === s.value ? `${C.gold}20` : "rgba(255,255,255,0.03)",
                    color: speed === s.value ? C.gold : C.muted,
                    border: `1px solid ${speed === s.value ? `${C.gold}40` : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 6, padding: "3px 8px",
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh Button */}
            <button onClick={handleRefresh} style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              color: C.muted, border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "7px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}>
              🔄 تحديث الموجز الآن
            </button>
          </div>

          {/* Footer Stats */}
          <div style={{
            padding: "8px 18px 12px",
            borderTop: `1px solid rgba(255,255,255,0.03)`,
          }}>
            <StatsMiniBar stats={briefing?.stats} />
            <div style={{
              color: C.muted, fontSize: 9, marginTop: 4,
              textAlign: "center",
            }}>
              محرك الذكاء الاصطناعي · نبض العالم
            </div>
          </div>
        </div>
      )}

      {/* ── FAB (Floating Action Button) ────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        {/* Pulse ring when playing */}
        {isPlaying && (
          <div style={{
            position: "absolute", inset: -6,
            borderRadius: "50%",
            border: `2px solid ${C.gold}60`,
            animation: "gvbRing 2s ease-out infinite",
            pointerEvents: "none",
          }} />
        )}

        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            width: 56, height: 56,
            borderRadius: "50%",
            background: isPlaying
              ? `linear-gradient(135deg, ${C.red}, #b91c1c)`
              : `linear-gradient(135deg, #1a2a4a, ${C.bg})`,
            border: `2px solid ${isPlaying ? C.red : C.gold}50`,
            color: C.gold,
            fontSize: 24,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isPlaying
              ? `0 4px 20px ${C.red}40, 0 0 40px ${C.red}15`
              : `0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${C.gold}10`,
            transition: "all 0.3s",
            animation: isPlaying ? "gvbFab 2s ease-in-out infinite" : "none",
            position: "relative",
          }}
          title="الموجز الصوتي العالمي"
        >
          {isPlaying ? "🔴" : "🎙️"}

          {/* Event count badge */}
          {!isOpen && briefing?.eventCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: C.red,
              color: "#fff",
              fontSize: 9, fontWeight: 900,
              width: 20, height: 20,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${C.bg}`,
              boxShadow: `0 2px 6px ${C.red}40`,
            }}>
              {briefing.eventCount > 99 ? "99+" : briefing.eventCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
