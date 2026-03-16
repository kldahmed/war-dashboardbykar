import React, { useMemo, useState } from "react";

const CHANNELS = [
  {
    id: "aljazeera-ar",
    name: "الجزيرة مباشر",
    country: "Qatar",
    language: "العربية",
    source: "Al Jazeera Arabic",
    mode: "embed",
    youtubeId: "bNyUyrR0PHo",
    externalUrl: "https://www.youtube.com/watch?v=bNyUyrR0PHo"
  },
  {
    id: "skynewsarabia",
    name: "سكاي نيوز عربية",
    country: "UAE",
    language: "العربية",
    source: "Sky News Arabia",
    mode: "embed",
    youtubeId: "U--OjmpjF5o",
    externalUrl: "https://www.youtube.com/watch?v=U--OjmpjF5o"
  },
  {
    id: "france24-ar",
    name: "فرانس 24 بالعربي",
    country: "International",
    language: "العربية",
    source: "France 24 Arabic",
    mode: "embed",
    youtubeId: "3ursYA8HMeo",
    externalUrl: "https://www.youtube.com/watch?v=3ursYA8HMeo"
  },
  {
    id: "dw-news",
    name: "DW News",
    country: "International",
    language: "English",
    source: "DW",
    mode: "embed",
    youtubeId: "LuKwFajn37U",
    externalUrl: "https://www.youtube.com/watch?v=LuKwFajn37U"
  },
  {
    id: "bbc-news",
    name: "BBC News",
    country: "International",
    language: "English",
    source: "BBC",
    mode: "embed",
    youtubeId: "pToB3kRV30Q",
    externalUrl: "https://www.youtube.com/watch?v=pToB3kRV30Q"
  },
  {
    id: "aljazeera-mubasher-24",
    name: "الجزيرة مباشر 24",
    country: "Qatar",
    language: "العربية",
    source: "Al Jazeera Mubasher",
    mode: "external",
    externalUrl: "https://www.youtube.com/watch?v=8D5QY5gw_Xk"
  },
  {
    id: "aljazeera-en",
    name: "Al Jazeera English",
    country: "International",
    language: "English",
    source: "Al Jazeera English",
    mode: "external",
    externalUrl: "https://www.youtube.com/watch?v=gCNeDWCI0vo"
  },
  {
    id: "euronews",
    name: "Euronews",
    country: "International",
    language: "English",
    source: "Euronews",
    mode: "external",
    externalUrl: "https://www.youtube.com/@euronews/live"
  },
  {
    id: "bloomberg",
    name: "Bloomberg Live",
    country: "International",
    language: "English",
    source: "Bloomberg",
    mode: "external",
    externalUrl: "https://www.youtube.com/@BloombergTV/live"
  },
  {
    id: "trt-world",
    name: "TRT World",
    country: "International",
    language: "English",
    source: "TRT World",
    mode: "external",
    externalUrl: "https://www.youtube.com/@trtworld/live"
  }
];

function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id || "").trim());
}

function getEmbedUrl(channel) {
  if (channel?.mode === "embed" && isValidYouTubeId(channel?.youtubeId)) {
    return `https://www.youtube-nocookie.com/embed/${channel.youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  }
  return "";
}

function CountryBadge({ country }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        color: "#cbd5e1",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700"
      }}
    >
      {country}
    </span>
  );
}

export default function LiveChannelsPanel() {
  const channels = useMemo(
    () =>
      CHANNELS.filter((ch) =>
        ["UAE", "Qatar", "International"].includes(ch.country)
      ),
    []
  );

  const [selectedId, setSelectedId] = useState(channels[0]?.id || "");

  const selected =
    channels.find((ch) => ch.id === selectedId) || channels[0] || null;

  const embedUrl = getEmbedUrl(selected);
  const canEmbed = !!embedUrl;

  if (!channels.length) {
    return (
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          background: "linear-gradient(180deg,#0b1730,#0a1222)",
          border: "1px solid rgba(56,189,248,.18)",
          borderRadius: "18px",
          padding: "24px",
          color: "#e2e8f0",
          textAlign: "center"
        }}
      >
        لا توجد قنوات مباشرة متاحة حاليًا
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 980px) {
          .live-grid-panel {
            grid-template-columns: 1fr !important;
          }
          .live-player-box {
            min-height: 320px !important;
          }
        }
      `}</style>

      <div
        className="live-grid-panel"
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "20px",
          alignItems: "start"
        }}
      >
        <aside
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
              marginBottom: "16px"
            }}
          >
            القنوات المباشرة
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {channels.map((channel) => {
              const active = channel.id === selected?.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedId(channel.id)}
                  style={{
                    width: "100%",
                    textAlign: "right",
                    cursor: "pointer",
                    background: active
                      ? "rgba(56,189,248,.12)"
                      : "rgba(255,255,255,.03)",
                    border: active
                      ? "1px solid rgba(56,189,248,.45)"
                      : "1px solid rgba(255,255,255,.08)",
                    borderRadius: "14px",
                    padding: "14px",
                    color: "#e2e8f0"
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "18px",
                      marginBottom: "8px"
                    }}
                  >
                    {channel.name}
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.8
                    }}
                  >
                    البلد: {channel.country}
                    <br />
                    اللغة: {channel.language}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section
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
              flexWrap: "wrap",
              borderBottom: "1px solid rgba(255,255,255,.06)"
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 10px #ef4444",
                display: "inline-block"
              }}
            />
            <span style={{ color: "#ef4444", fontWeight: 900, fontSize: "12px" }}>
              LIVE
            </span>
            <span style={{ color: "#f8fafc", fontWeight: 900, fontSize: "24px" }}>
              {selected?.name}
            </span>
            <div style={{ marginRight: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <CountryBadge country={selected?.country} />
              <CountryBadge country={selected?.language} />
            </div>
          </div>

          <div
            className="live-player-box"
            style={{
              background: "#000",
              minHeight: "520px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {canEmbed ? (
              <iframe
                key={selected.id}
                title={selected.name}
                src={embedUrl}
                width="100%"
                height="520"
                style={{
                  border: "none",
                  display: "block",
                  background: "#000"
                }}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  minHeight: "520px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "30px",
                  textAlign: "center",
                  gap: "18px",
                  background: "linear-gradient(180deg,#06101f,#02060d)"
                }}
              >
                <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: "32px" }}>
                  {selected?.name}
                </div>

                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "16px",
                    lineHeight: 1.9,
                    maxWidth: "680px"
                  }}
                >
                  هذه القناة لا تدعم التضمين داخل الموقع بشكل موثوق الآن،
                  لذلك وفرنا لك تشغيلًا خارجيًا مباشرًا من الصفحة الرسمية بدل
                  ترك شاشة سوداء أو رسالة خطأ.
                </div>

                <a
                  href={selected?.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "12px",
                    padding: "14px 26px",
                    fontWeight: 900,
                    fontSize: "16px"
                  }}
                >
                  فتح البث المباشر
                </a>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "14px 18px",
              borderTop: "1px solid rgba(255,255,255,.06)",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
              المصدر: {selected?.source}
            </div>

            <a
              href={selected?.externalUrl}
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
          </div>
        </section>
      </div>
    </>
  );
}
