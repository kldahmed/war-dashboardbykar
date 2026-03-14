import React, { useEffect, useState } from "react";

const isValidYouTubeId = (id) => /^[a-zA-Z0-9_-]{11}$/.test(id || "");

export default function App() {
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loadN, setLoadN] = useState(false);
  const [loadV, setLoadV] = useState(false);
  const [errN, setErrN] = useState("");
  const [errV, setErrV] = useState("");
  const [updated, setUpdated] = useState("");
  const [tab, setTab] = useState("news");
  const [cat, setCat] = useState("all");

  const fetchNews = async (category = "all") => {
    try {
      setLoadN(true);
      setErrN("");

      const res = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("NEWS_API_FAILED");

      const data = await res.json();
      setNews(Array.isArray(data.news) ? data.news : []);
      setUpdated(data.updated || "");
    } catch (error) {
      setErrN("تعذر تحميل الأخبار");
      setNews([]);
    } finally {
      setLoadN(false);
    }
  };

  const fetchVideos = async (category = "all") => {
    try {
      setLoadV(true);
      setErrV("");

      const res = await fetch(`/api/videos?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("VIDEOS_API_FAILED");

      const data = await res.json();
      setVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (error) {
      setErrV("تعذر تحميل الفيديوهات");
      setVideos([]);
    } finally {
      setLoadV(false);
    }
  };

  useEffect(() => {
    fetchNews(cat);
    fetchVideos(cat);
  }, [cat]);

  return (
    <div style={{ background: "#050505", color: "#eee", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>WAR UPDATE</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setTab("news")}>الأخبار</button>
        <button onClick={() => setTab("videos")}>الفيديوهات</button>
        <button onClick={() => setCat("all")}>الكل</button>
        <button onClick={() => setCat("regional")}>إقليمي</button>
      </div>

      {tab === "news" && (
        <div>
          <h2>الأخبار</h2>
          <div style={{ color: "#999", marginBottom: "10px" }}>
            {updated ? `آخر تحديث: ${updated}` : ""}
          </div>

          {loadN && <div>جاري تحميل الأخبار...</div>}
          {errN && !loadN && <div style={{ color: "tomato" }}>{errN}</div>}

          {!loadN && !errN && news.length === 0 && <div>لا توجد أخبار</div>}

          <div style={{ display: "grid", gap: "12px" }}>
            {news.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: "12px",
                  padding: "14px",
                  background: "#0b0b0b"
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{item.title}</div>
                <div style={{ color: "#bbb", marginBottom: "8px" }}>{item.summary}</div>
                <div style={{ fontSize: "12px", color: "#777" }}>
                  {item.source} — {item.urgency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "videos" && (
        <div>
          <h2>الفيديوهات</h2>

          {loadV && <div>جاري تحميل الفيديوهات...</div>}
          {errV && !loadV && <div style={{ color: "tomato" }}>{errV}</div>}

          {!loadV && !errV && videos.length === 0 && <div>لا توجد فيديوهات</div>}

          <div style={{ display: "grid", gap: "16px" }}>
            {videos.map((video) => {
              const safeId = isValidYouTubeId(video.youtubeId) ? video.youtubeId : "";
              return (
                <div
                  key={video.id}
                  style={{
                    border: "1px solid #333",
                    borderRadius: "12px",
                    padding: "14px",
                    background: "#0b0b0b"
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{video.title}</div>
                  <div style={{ color: "#999", marginBottom: "12px" }}>{video.channel}</div>

                  {safeId ? (
                    <iframe
                      title={video.title}
                      width="100%"
                      height="315"
                      src={`https://www.youtube-nocookie.com/embed/${safeId}`}
                      style={{ border: "none", borderRadius: "10px" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div style={{ color: "tomato" }}>رابط الفيديو غير صالح</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
