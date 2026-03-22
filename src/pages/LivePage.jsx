import React, { useEffect, useMemo, useState } from "react";
import { pageShell, panelStyle } from "./shared/pagePrimitives";

// ── helpers ────────────────────────────────────────────────────────────────

const FAVORITES_KEY = "kar-live-favorite-channels";
const VIEWS_KEY = "kar-live-channel-views";

const COUNTRY_PRIORITY = [
  "AE", "SA", "QA", "EG", "LB", "IQ", "JO", "KW", "BH", "OM", "MA", "DZ", "TN", "SY", "PS", "LY", "SD", "YE", "MR", "INT",
];

const GENRE_TABS = [
  { id: "all", labelAr: "كل الأنواع", labelEn: "All types", icon: "🧭" },
  { id: "news", labelAr: "إخباري", labelEn: "News", icon: "📰" },
  { id: "sports", labelAr: "رياضي", labelEn: "Sports", icon: "⚽" },
  { id: "general", labelAr: "عام", labelEn: "General", icon: "📺" },
  { id: "business", labelAr: "اقتصاد", labelEn: "Business", icon: "💹" },
  { id: "religion", labelAr: "ديني", labelEn: "Religion", icon: "🕌" },
];

function countryRank(code) {
  const idx = COUNTRY_PRIORITY.indexOf(code);
  return idx === -1 ? 999 : idx;
}

function getEmbedUrl(channel) {
  if (channel?.mode !== "embed" || !channel?.youtubeId) return "";
  return `https://www.youtube.com/embed/${channel.youtubeId}?autoplay=1&rel=0&modestbranding=1`;
}

function ChannelCard({ channel, active, onClick, language, isFavorite, onToggleFavorite }) {
  const isAr = language === "ar";
  const isEmbed = channel.mode === "embed" && Boolean(channel.youtubeId);
  return (
    <button
      type="button"
      onClick={() => onClick(channel)}
      style={{
        textAlign: "start",
        width: "100%",
        borderRadius: 14,
        border: active ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.08)",
        background: active
          ? "linear-gradient(135deg, rgba(5,46,22,0.75), rgba(6,78,59,0.4))"
          : "linear-gradient(140deg, rgba(15,23,42,0.78), rgba(30,41,59,0.58))",
        padding: "12px 12px",
        color: "#e2e8f0",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {channel.flag} {channel.name}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>{channel.country}</div>
        </div>
        <span
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            fontWeight: 700,
            fontSize: 10,
            background: isEmbed ? "rgba(34,197,94,0.18)" : "rgba(56,189,248,0.14)",
            color: isEmbed ? "#4ade80" : "#67e8f9",
            flexShrink: 0,
          }}
        >
          {isEmbed ? (isAr ? "داخل الصفحة" : "In-page") : (isAr ? "مصدر خارجي" : "External")}
        </span>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#64748b", fontSize: 11 }}>
          {channel.genre || (isAr ? "عام" : "General")}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          style={{
            borderRadius: 999,
            border: isFavorite ? "1px solid rgba(250,204,21,0.45)" : "1px solid rgba(255,255,255,0.12)",
            background: isFavorite ? "rgba(250,204,21,0.15)" : "rgba(15,23,42,0.4)",
            color: isFavorite ? "#facc15" : "#94a3b8",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            cursor: "pointer",
          }}
          aria-label={isFavorite ? (isAr ? "إزالة من المفضلة" : "Remove from favorites") : (isAr ? "إضافة إلى المفضلة" : "Add to favorites")}
          title={isFavorite ? (isAr ? "إزالة من المفضلة" : "Remove from favorites") : (isAr ? "إضافة إلى المفضلة" : "Add to favorites")}
        >
          {isFavorite ? "★" : "☆"} {isAr ? "مفضلة" : "Favorite"}
        </button>
      </div>
    </button>
  );
}

export default function LivePage({ language = "ar" }) {
  const isAr = language === "ar";
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [viewStats, setViewStats] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      const parsed = JSON.parse(raw || "[]");
      if (Array.isArray(parsed)) setFavorites(parsed.filter(Boolean));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(VIEWS_KEY);
      const parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object") setViewStats(parsed);
    } catch {
      setViewStats({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(viewStats));
  }, [viewStats]);

  const toggleFavorite = (channelId) => {
    setFavorites((prev) => (prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [channelId, ...prev]));
  };

  const getViews = (channelId) => Number(viewStats?.[channelId] || 0);

  const handleSelectChannel = (channel) => {
    if (!channel?.id) {
      setSelected(channel);
      return;
    }
    setSelected(channel);
    setViewStats((prev) => ({
      ...prev,
      [channel.id]: Number(prev?.[channel.id] || 0) + 1,
    }));
  };

  const loadChannels = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/live");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const items = Array.isArray(data?.channels) ? data.channels : [];
      setChannels(items);
      setLastUpdated(new Date().toISOString());
      setSelected((prev) => {
        if (prev && items.find((c) => c.id === prev.id)) return prev;
        return items.find((c) => c.mode === "embed" && c.youtubeId) || items[0] || null;
      });
    } catch {
      setError(isAr ? "تعذر تحميل القنوات حالياً" : "Unable to load channels now");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
    const timer = setInterval(loadChannels, 300000);
    return () => clearInterval(timer);
  }, [language]);

  const countries = useMemo(() => {
    const map = new Map();
    channels.forEach((ch) => {
      const key = ch.countryCode || "OTHER";
      if (!map.has(key)) {
        map.set(key, { code: key, name: ch.country || (isAr ? "غير مصنف" : "Other"), flag: ch.flag || "🌍", count: 0 });
      }
      const item = map.get(key);
      item.count += 1;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => {
      const rankDelta = countryRank(a.code) - countryRank(b.code);
      if (rankDelta !== 0) return rankDelta;
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "ar");
    });
  }, [channels, isAr]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return channels.filter((ch) => {
      const countryOk = countryFilter === "all" || ch.countryCode === countryFilter;
      if (!countryOk) return false;
      const genreOk = genreFilter === "all" || (ch.genre || "general") === genreFilter;
      if (!genreOk) return false;
      if (!q) return true;
      const hay = `${ch.name || ""} ${ch.country || ""} ${ch.title || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [channels, countryFilter, genreFilter, search]);

  const favoriteItems = useMemo(() => {
    const favSet = new Set(favorites);
    const q = String(search || "").trim().toLowerCase();
    return channels
      .filter((ch) => favSet.has(ch.id))
      .filter((ch) => (countryFilter === "all" ? true : ch.countryCode === countryFilter))
      .filter((ch) => (genreFilter === "all" ? true : (ch.genre || "general") === genreFilter))
      .filter((ch) => {
        if (!q) return true;
        const hay = `${ch.name || ""} ${ch.country || ""} ${ch.title || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const viewsDelta = getViews(b.id) - getViews(a.id);
        if (viewsDelta !== 0) return viewsDelta;
        const modeA = a.mode === "embed" ? 0 : 1;
        const modeB = b.mode === "embed" ? 0 : 1;
        if (modeA !== modeB) return modeA - modeB;
        const rankDelta = countryRank(a.countryCode) - countryRank(b.countryCode);
        if (rankDelta !== 0) return rankDelta;
        return a.name.localeCompare(b.name, "ar");
      });
  }, [channels, favorites, countryFilter, genreFilter, search, viewStats]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((ch) => {
      const key = ch.countryCode || "OTHER";
      if (!map.has(key)) {
        map.set(key, { country: ch.country || (isAr ? "غير مصنف" : "Other"), flag: ch.flag || "🌍", channels: [] });
      }
      map.get(key).channels.push(ch);
    });
    return Array.from(map.entries())
      .map(([code, info]) => ({ code, ...info }))
      .map((item) => ({
        ...item,
        channels: [...item.channels].sort((a, b) => {
          const favoriteA = favorites.includes(a.id) ? 0 : 1;
          const favoriteB = favorites.includes(b.id) ? 0 : 1;
          if (favoriteA !== favoriteB) return favoriteA - favoriteB;

          const viewsDelta = getViews(b.id) - getViews(a.id);
          if (viewsDelta !== 0) return viewsDelta;

          const modeA = a.mode === "embed" ? 0 : 1;
          const modeB = b.mode === "embed" ? 0 : 1;
          if (modeA !== modeB) return modeA - modeB;

          return (a.name || "").localeCompare(b.name || "", "ar");
        }),
      }))
      .sort((a, b) => {
        const rankDelta = countryRank(a.code) - countryRank(b.code);
        if (rankDelta !== 0) return rankDelta;
        if (a.channels.length !== b.channels.length) return b.channels.length - a.channels.length;
        return a.country.localeCompare(b.country, "ar");
      });
  }, [filtered, isAr, favorites, viewStats]);

  const summary = {
    title: isAr ? "مركز البث الحي للقنوات العربية" : "Arabic Live Channels Center",
    subtitle: isAr
      ? "أكبر تجميعة قنوات عربية ممكنة، مرتبة حسب الدول مع تشغيل مباشر عند توفره"
      : "A large Arabic channels directory grouped by country with in-page playback where available",
    all: isAr ? "كل الدول" : "All countries",
    allGenres: isAr ? "كل الأنواع" : "All types",
    search: isAr ? "ابحث عن قناة أو دولة..." : "Search channel or country...",
    loading: isAr ? "جارٍ تحميل القنوات..." : "Loading channels...",
    empty: isAr ? "لا توجد قنوات مطابقة للفلاتر الحالية" : "No channels match current filters",
    retry: isAr ? "إعادة المحاولة" : "Retry",
    watchExternal: isAr ? "المشاهدة من المصدر" : "Watch on source",
    pickChannel: isAr ? "اختر قناة للعرض" : "Select a channel",
    updated: isAr ? "آخر تحديث" : "Updated",
    favorites: isAr ? "قنواتي المفضلة" : "My favorites",
    noFavorites: isAr ? "لا توجد قنوات مفضلة بعد" : "No favorite channels yet",
    trending: isAr ? "الأكثر مشاهدة" : "Most watched",
  };

  const trendingChannels = useMemo(() => {
    return [...channels]
      .filter((ch) => getViews(ch.id) > 0)
      .sort((a, b) => {
        const viewsDelta = getViews(b.id) - getViews(a.id);
        if (viewsDelta !== 0) return viewsDelta;
        const favoriteA = favorites.includes(a.id) ? 0 : 1;
        const favoriteB = favorites.includes(b.id) ? 0 : 1;
        if (favoriteA !== favoriteB) return favoriteA - favoriteB;
        return a.name.localeCompare(b.name, "ar");
      })
      .slice(0, 8);
  }, [channels, favorites, viewStats]);

  return (
    <div style={pageShell}>
      <section style={{ ...panelStyle, padding: "20px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#22d3ee", fontWeight: 800, marginBottom: 6, letterSpacing: "0.08em" }}>
              LIVE DIRECTORY
            </div>
            <h1 style={{ margin: 0, color: "#f8fafc", fontSize: 28, lineHeight: 1.3 }}>{summary.title}</h1>
            <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 13 }}>{summary.subtitle}</p>
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {channels.length} {isAr ? "قناة" : "channels"} • {countries.length} {isAr ? "دولة" : "countries"}
            <div style={{ marginTop: 4 }}>{favorites.length} {isAr ? "في المفضلة" : "favorites"}</div>
            {trendingChannels.length > 0 ? (
              <div style={{ marginTop: 4 }}>{trendingChannels.length} {summary.trending}</div>
            ) : null}
            {lastUpdated ? (
              <div style={{ marginTop: 4 }}>
                {summary.updated}: {new Date(lastUpdated).toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, padding: "16px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={summary.search}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "10px 12px",
              background: "rgba(15,23,42,0.65)",
              color: "#f8fafc",
              fontSize: 13,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setCountryFilter("all")}
              style={{
                borderRadius: 999,
                border: countryFilter === "all" ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.12)",
                background: countryFilter === "all" ? "rgba(34,211,238,0.18)" : "rgba(15,23,42,0.55)",
                color: countryFilter === "all" ? "#22d3ee" : "#cbd5e1",
                fontWeight: 700,
                fontSize: 12,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              🌍 {summary.all}
            </button>
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => setCountryFilter(country.code)}
                style={{
                  borderRadius: 999,
                  border: countryFilter === country.code ? "1px solid #4ade80" : "1px solid rgba(255,255,255,0.12)",
                  background: countryFilter === country.code ? "rgba(74,222,128,0.18)" : "rgba(15,23,42,0.55)",
                  color: countryFilter === country.code ? "#4ade80" : "#cbd5e1",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {country.flag} {country.name} ({country.count})
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GENRE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGenreFilter(tab.id)}
                style={{
                  borderRadius: 999,
                  border: genreFilter === tab.id ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.12)",
                  background: genreFilter === tab.id ? "rgba(245,158,11,0.18)" : "rgba(15,23,42,0.55)",
                  color: genreFilter === tab.id ? "#fbbf24" : "#cbd5e1",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {tab.icon} {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>
        </div>
      </section>

      {favorites.length > 0 ? (
        <section style={{ ...panelStyle, padding: "14px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 17, color: "#f1f5f9" }}>⭐ {summary.favorites}</h2>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{favoriteItems.length} {isAr ? "قناة" : "channels"}</span>
          </div>

          {favoriteItems.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 12 }}>{summary.noFavorites}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {favoriteItems.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  active={selected?.id === channel.id}
                  onClick={handleSelectChannel}
                  language={language}
                  isFavorite={favorites.includes(channel.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section style={{ ...panelStyle, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontWeight: 800 }}>
          {selected?.name ? `${selected.flag} ${selected.name}` : summary.pickChannel}
        </div>

        {selected?.mode === "embed" && selected.youtubeId ? (
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe
              src={getEmbedUrl(selected)}
              title={selected.title || selected.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#000" }}
            />
          </div>
        ) : (
          <div style={{ padding: "34px 16px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
            <div style={{ marginBottom: 14 }}>
              {isAr ? "هذه القناة تعمل من المصدر الرسمي مباشرة" : "This channel is available on its official source"}
            </div>
            {selected?.externalUrl ? (
              <a
                href={selected.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  borderRadius: 10,
                  border: "1px solid rgba(34,211,238,0.35)",
                  background: "rgba(34,211,238,0.12)",
                  color: "#67e8f9",
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "8px 14px",
                }}
              >
                {summary.watchExternal}
              </a>
            ) : null}
          </div>
        )}
      </section>

      {loading ? (
        <section style={{ ...panelStyle, padding: "26px", textAlign: "center", color: "#67e8f9" }}>{summary.loading}</section>
      ) : null}

      {!loading && error ? (
        <section style={{ ...panelStyle, padding: "26px", textAlign: "center" }}>
          <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>
          <button
            type="button"
            onClick={loadChannels}
            style={{ borderRadius: 8, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#fecaca", padding: "7px 14px", cursor: "pointer" }}
          >
            {summary.retry}
          </button>
        </section>
      ) : null}

      {!loading && !error && grouped.length === 0 ? (
        <section style={{ ...panelStyle, padding: "26px", textAlign: "center", color: "#94a3b8" }}>{summary.empty}</section>
      ) : null}

      {!loading && !error && grouped.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          {grouped.map((group) => (
            <section key={group.code} style={{ ...panelStyle, padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#f1f5f9" }}>
                  {group.flag} {group.country}
                </h2>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{group.channels.length} {isAr ? "قناة" : "channels"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {group.channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    active={selected?.id === channel.id}
                    onClick={handleSelectChannel}
                    language={language}
                    isFavorite={favorites.includes(channel.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
