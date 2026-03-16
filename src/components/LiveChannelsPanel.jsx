import React, { useMemo, useState } from "react";

const CHANNELS = [
  {
    id: "aljazeera-live",
    name: "الجزيرة مباشر",
    country: "Qatar",
    language: "العربية",
    type: "external",
    source: "Al Jazeera",
    youtubeId: "",
    externalUrl: "https://www.youtube.com/@aljazeeraarabic/live"
  },
  {
    id: "skynewsarabia-live",
    name: "سكاي نيوز عربية",
    country: "UAE",
    language: "العربية",
    type: "external",
    source: "Sky News Arabia",
    youtubeId: "",
    externalUrl: "https://www.youtube.com/@skynewsarabia/live"
  },
  {
    id: "france24-ar-live",
    name: "فرانس 24 بالعربي",
    country: "International",
    language: "العربية",
    type: "external",
    source: "France 24",
    youtubeId: "",
    externalUrl: "https://www.youtube.com/@FRANCE24Arabic/live"
  },
  {
    id: "bbc-world-live",
    name: "BBC World News",
    country: "International",
    language: "English",
    type: "external",
    source: "BBC",
    youtubeId: "",
    externalUrl: "https://www.youtube.com/@BBCNews/live"
  },
  {
    id: "dw-live",
    name: "DW News",
    country: "International",
    language: "English",
    type: "external",
    source: "DW",
    youtubeId: "",
    externalUrl: "https://www.youtube.com/@dwnews/live"
  }
];

function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id || "").trim());
}

function getEmbedUrl(channel) {
  if (channel?.type === "embed" && isValidYouTubeId(channel?.youtubeId)) {
    return `https://www.youtube-nocookie.com/embed/${channel.youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  }
  return "";
}

export default function LiveChannelsPanel() {
  const channels = useMemo(() => {
    return CHANNELS.filter(
      (ch) =>
        ["UAE", "Qatar", "International"].includes(ch.country) &&
        ch.country !== "Saudi Arabia"
    );
  }, []);

  const [selectedId, setSelectedId] = useState(channels[0]?.id || "");
  const selected =
    channels.find((ch) => ch.id === selectedId) || channels[0] || null;

  if (!channels.length) {
    return (
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: "16px",
          padding: "24px",
          textAlign: "center",
          color: "#cbd5e1"
        }}
      >
        لا توجد قنوات مباشرة متاحة حاليًا
      </div>
    );
  }

  const embedUrl = getEmbedUrl(selected);
  const isExternal = !embedUrl && !!selected?.externalUrl;

  return (
    <div
      className="live-layout"
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.5fr 380px",
        gap: "20px",
        alignItems: "start"
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg,#0b1730,#0a1222)",
          border: "1px solid rgba(56,189,248,.18)",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,.25)"
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "1px solid rgba(255,255,255,.06)",
            flexWrap: "wrap"
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 12px #ef4444",
              display: "inline-block"
            }}
          />
          <span style={{ color: "#ef4444", fontWeight: 800, fontSize: "12px" }}>
            LIVE
          </span>
          <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: "18px" }}>
            {selected?.name}
          </span>
          <span style={{ color: "#94a3b8", marginRight: "auto", fontSize: "13px" }}>
            البلد: {selected?.country} • اللغة: {selected?.language}
          </span>
        </div>

        <div style={{ position: "relative", background: "#000", minHeight: "420px" }}>
          {embedUrl ? (
            <iframe
              title={selected?.name || "Live stream"}
              src={embedUrl}
              style={{
                width: "100%",
                height: "420px",
                border: "none",
                display: "block"
              }}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
          ) : isExternal ? (
            <div
              style={{
                minHeight: "420px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "30px",
                textAlign: "center",
                gap: "16px",
                background: "linear-gradient(180deg,#06101f,#02060d)"
              }}
            >
              <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "24px" }}>
                {selected?.name}
              </div>

              <div style={{ color: "#94a3b8", fontSize: "15px", lineHeight: 1.9 }}>
                هذه القناة تفتح خارج الموقع لضمان عمل البث بشكل صحيح
              </div>

              <a
                href={selected.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "10px",
                  padding: "12px 22px",
                  fontWeight: 800,
                  fontSize: "15px"
                }}
              >
                فتح البث المباشر
              </a>
            </div>
          ) : (
            <div
              style={{
                minHeight: "420px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#94a3b8"
              }}
            >
              لا يوجد بث متاح لهذه القناة حاليًا
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,.06)"
          }}
        >
          <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
            المصدر: {selected?.source}
          </div>

          {selected?.externalUrl && (
            <a
              href={selected.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "rgba(59,130,246,.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56,189,248,.25)",
                textDecoration: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              مشاهدة خارجية
            </a>
          )}
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(180deg,#0b1730,#0a1222)",
          border: "1px solid rgba(56,189,248,.18)",
          borderRadius: "18px",
          padding: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,.25)"
        }}
      >
        <div
          style={{
            color: "#f8fafc",
            fontWeight: 900,
            fontSize: "22px",
            marginBottom: "14px"
          }}
        >
          القنوات المباشرة
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {channels.map((channel) => {
            const active = selected?.id === channel.id;

            return (
              <button
                key={channel.id}
                onClick={() => setSelectedId(channel.id)}
                style={{
                  textAlign: "right",
                  width: "100%",
                  background: active ? "rgba(56,189,248,.12)" : "rgba(255,255,255,.03)",
                  border: active
                    ? "1px solid rgba(56,189,248,.45)"
                    : "1px solid rgba(255,255,255,.08)",
                  borderRadius: "14px",
                  padding: "14px",
                  cursor: "pointer",
                  color: "#e2e8f0"
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "16px",
                    marginBottom: "6px"
                  }}
                >
                  {channel.name}
                </div>

                <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.8 }}>
                  البلد: {channel.country}
                  <br />
                  اللغة: {channel.language}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
