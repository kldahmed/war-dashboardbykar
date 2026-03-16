import React, { useMemo, useState } from "react";

const LIVE_CHANNELS = [
  {
    id: "aljazeera-mubasher",
    name: "الجزيرة مباشر",
    country: "Qatar",
    type: "news",
    source: "Youtube",
    youtubeId: "UCiGm_E4ZwYSHV3bcW1pnSeQ",
    externalUrl: "https://www.aljazeera.net/live/",
    language: "ar"
  },
  {
    id: "skynews-arabia",
    name: "سكاي نيوز عربية",
    country: "UAE",
    type: "news",
    source: "Youtube",
    youtubeId: "UCpKJ7Gnp4toNj0j1KstsH_g",
    externalUrl: "https://www.skynewsarabia.com/",
    language: "ar"
  },
  {
    id: "bbc-world",
    name: "BBC World News",
    country: "International",
    type: "news",
    source: "Youtube",
    youtubeId: "UC16niRr50-MSBwiO3YDb3RA",
    externalUrl: "https://www.bbc.com/news/av/10462520",
    language: "en"
  },
  {
    id: "france24-ar",
    name: "فرانس 24 بالعربي",
    country: "International",
    type: "news",
    source: "Youtube",
    youtubeId: "UCuO7XX7r7564CuvQmOR-g9g",
    externalUrl: "https://www.france24.com/ar/live",
    language: "ar"
  }
];

function getEmbedUrl(channel) {
  if (channel.youtubeId) {
    // Prefer YouTube Live embed by channel if id looks like a channel ID
    if (channel.youtubeId.startsWith("UC")) {
      return `https://www.youtube.com/embed/live_stream?channel=${channel.youtubeId}&autoplay=1`;
    }
    // Otherwise treat as a video id
    return `https://www.youtube.com/embed/${channel.youtubeId}?autoplay=1`;
  }
  return channel.externalUrl;
}

export default function LiveChannelsPanel() {
  const [selected, setSelected] = useState(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(new Set());

  const channels = useMemo(
    () => LIVE_CHANNELS.filter((c) => !unavailable.has(c.id)),
    [unavailable]
  );

  const openChannel = (channel) => {
    setSelected(channel);
    setEmbedFailed(false);
  };

  const closeModal = () => {
    setSelected(null);
    setEmbedFailed(false);
  };

  const handleEmbedError = () => {
    if (!selected) return;
    setEmbedFailed(true);
    setUnavailable((prev) => new Set(prev).add(selected.id));
  };

  const openExternal = (url) => {
    window.open(url, "_blank", "noopener");
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
      <h2 style={{ textAlign: "center", fontSize: "1.7rem", marginBottom: "18px" }}>البث المباشر</h2>
      {channels.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#cbd5e1" }}>
          لا توجد قنوات مباشرة متاحة حالياً
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px"
          }}
        >
          {channels.map((channel) => (
            <div
              key={channel.id}
              style={{
                background: "#0f172a",
                border: "2px solid #38bdf8",
                borderRadius: "12px",
                padding: "18px",
                cursor: "pointer",
                boxShadow: "0 2px 12px #0004",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "180px"
              }}
              onClick={() => openChannel(channel)}
            >
              <div>
                <div style={{ fontWeight: "700", fontSize: "1.1rem", marginBottom: "8px" }}>{channel.name}</div>
                <div style={{ fontSize: "0.95rem", color: "#94a3b8", marginBottom: "6px" }}>
                  البلد: {channel.country}
                </div>
                <div style={{ fontSize: "0.95rem", color: "#94a3b8" }}>
                  اللغة: {channel.language === "ar" ? "العربية" : "English"}
                </div>
              </div>
              <div style={{ marginTop: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "12px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(56,189,248,0.15)",
                    color: "#38bdf8"
                  }}
                >
                  {channel.source}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(243,211,138,0.18)",
                    color: "#f3d38a"
                  }}
                >
                  {channel.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "16px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "24px",
              position: "relative"
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "#e74c3c",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: "12px", color: "#e2e8f0" }}>{selected.name}</h3>
            <p style={{ color: "#cbd5e1", marginBottom: "18px" }}>
              اضغط على الزر أدناه لفتح الرابط إذا لم يتم تحميل المقطع المدمج.
            </p>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: "18px" }}>
              <iframe
                title={selected.name}
                src={getEmbedUrl(selected)}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onError={handleEmbedError}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.12)"
                }}
              />
            </div>
            {embedFailed && (
              <div style={{ color: "#fbbf24", marginBottom: "16px" }}>
                لم نتمكن من تحميل بث الفيديو مباشرةً. يمكنك فتح القناة في علامة تبويب جديدة.
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => openExternal(selected.externalUrl)}
                style={{
                  background: "#38bdf8",
                  color: "#0f172a",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                فتح في علامة تبويب جديدة
              </button>
              {embedFailed && (
                <button
                  onClick={() => closeModal()}
                  style={{
                    background: "#6b7280",
                    color: "#f8fafc",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 18px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  العودة
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
