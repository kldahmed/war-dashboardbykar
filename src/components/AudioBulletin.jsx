import React, { useState, useRef, useEffect, useCallback } from "react";

export default function AudioBulletin({ headlines = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [supported, setSupported] = useState(true);
  const synthRef = useRef(null);
  const voiceRef = useRef(null);

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false);
      return;
    }
    synthRef.current = window.speechSynthesis;

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang.startsWith("ar")) ||
        voices.find((v) => v.default) ||
        voices[0] ||
        null;
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const stop = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    setIsPlaying(false);
    setCurrentIdx(-1);
  }, []);

  const play = useCallback(() => {
    if (!synthRef.current || !headlines.length) return;
    synthRef.current.cancel();

    const items = headlines.slice(0, 8);

    // Intro announcement
    const intro = new SpeechSynthesisUtterance("موجز الأخبار");
    intro.lang = "ar-AE";
    intro.volume = isMuted ? 0 : volume;
    intro.rate = 0.95;
    if (voiceRef.current) intro.voice = voiceRef.current;
    synthRef.current.speak(intro);
    setIsPlaying(true);
    setCurrentIdx(0);

    items.forEach((headline, i) => {
      const utt = new SpeechSynthesisUtterance(headline);
      utt.lang = "ar-AE";
      utt.volume = isMuted ? 0 : volume;
      utt.rate = 0.95;
      if (voiceRef.current) utt.voice = voiceRef.current;
      utt.onstart = () => setCurrentIdx(i);
      if (i === items.length - 1) {
        utt.onend = () => {
          setIsPlaying(false);
          setCurrentIdx(-1);
        };
      }
      synthRef.current.speak(utt);
    });
  }, [headlines, isMuted, volume]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  if (!supported) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 9999,
        fontFamily: "inherit",
        direction: "rtl",
      }}
    >
      {/* Expanded panel */}
      {isOpen && (
        <div
          style={{
            marginBottom: "10px",
            background: "#0f172a",
            border: "1px solid rgba(243,211,138,0.25)",
            borderRadius: "14px",
            padding: "16px",
            width: "240px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              paddingBottom: "10px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🎙️</span>
            <span
              style={{ fontWeight: 800, fontSize: "13px", color: "#f3d38a" }}
            >
              الموجز الصوتي
            </span>
            {isPlaying && (
              <span
                className="nr-live-dot"
                style={{ marginInlineStart: "auto" }}
              />
            )}
          </div>

          {/* Current headline */}
          {isPlaying && currentIdx >= 0 && headlines[currentIdx] && (
            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginBottom: "12px",
                lineHeight: 1.5,
                maxHeight: "48px",
                overflow: "hidden",
              }}
            >
              {headlines[currentIdx]}
            </div>
          )}

          {/* Volume */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#64748b" }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              style={{ flex: 1, accentColor: "#f3d38a", cursor: "pointer" }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "8px" }}>
            {!isPlaying ? (
              <button
                onClick={play}
                style={{
                  flex: 1,
                  background: "#f3d38a",
                  color: "#0f172a",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ▶ تشغيل الموجز
              </button>
            ) : (
              <button
                onClick={stop}
                style={{
                  flex: 1,
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ⏹ إيقاف
              </button>
            )}
            <button
              onClick={toggleMute}
              style={{
                background: isMuted ? "#ef444422" : "rgba(255,255,255,0.07)",
                color: isMuted ? "#ef4444" : "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "14px",
                cursor: "pointer",
              }}
              title={isMuted ? "إلغاء الكتم" : "كتم"}
            >
              {isMuted ? "🔇" : "🔉"}
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={isPlaying ? "nr-live-ring" : ""}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: isPlaying
            ? "linear-gradient(135deg,#ef4444,#c0392b)"
            : "linear-gradient(135deg,#1e3a5f,#0f172a)",
          border: `2px solid ${isPlaying ? "#ef4444" : "rgba(243,211,138,0.35)"}`,
          color: "#f3d38a",
          fontSize: "20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          transition: "background 0.3s",
        }}
        title="الموجز الصوتي"
      >
        🎙️
      </button>
    </div>
  );
}
