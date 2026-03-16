import React, { useEffect, useMemo, useRef, useState } from "react";
import XPostCard from "./XPostCard";

export default function XNewsFeed() {
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [updated, setUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortMode, setSortMode] = useState("latest");
  const intervalRef = useRef(null);

  const fetchPosts = () => {
    setLoading(true);
    setError("");

    fetch("/api/x-feed")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setUpdated(data.updated || "");
        if (data.error) setError(data.error);
      })
      .catch(() => {
        setPosts([]);
        setAccounts([]);
        setError("تعذر تحميل نبض X");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchPosts, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sourceButtons = useMemo(() => {
    return [
      { key: "all", label: "الكل" },
      ...accounts.map((acc) => ({
        key: acc.account,
        label: acc.account
      }))
    ];
  }, [accounts]);

  const displayedPosts = useMemo(() => {
    let filtered =
      sourceFilter === "all"
        ? [...posts]
        : posts.filter((p) => p.account === sourceFilter);

    if (sortMode === "latest") {
      filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
    } else if (sortMode === "importance") {
      const rank = { high: 3, medium: 2, low: 1 };
      filtered.sort((a, b) => (rank[b.urgency] || 0) - (rank[a.urgency] || 0));
    }

    return filtered;
  }, [posts, sourceFilter, sortMode]);

  return (
    <section
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "grid",
        gap: "20px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap"
        }}
      >
        <div>
          <div
            style={{
              color: "#f8fafc",
              fontSize: "32px",
              fontWeight: 900
            }}
          >
            نبض X
          </div>

          <div
            style={{
              color: "#94a3b8",
              marginTop: "6px",
              fontSize: "14px",
              lineHeight: 1.8
            }}
          >
            تحديثات فورية من الحسابات الإماراتية والعالمية الموثوقة، مع عرض عربي منظم داخل الموقع
          </div>

          <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "8px" }}>
            آخر تحديث: {updated ? new Date(updated).toLocaleString("ar") : "غير متوفر"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end"
          }}
        >
          <button
            onClick={() => setSortMode("latest")}
            style={{
              background: sortMode === "latest" ? "#38bdf8" : "#1f2937",
              color: sortMode === "latest" ? "#fff" : "#93c5fd",
              border: "none",
              borderRadius: "999px",
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            الأحدث
          </button>

          <button
            onClick={() => setSortMode("importance")}
            style={{
              background: sortMode === "importance" ? "#38bdf8" : "#1f2937",
              color: sortMode === "importance" ? "#fff" : "#93c5fd",
              border: "none",
              borderRadius: "999px",
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            الأهم
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        {sourceButtons.map((src) => (
          <button
            key={src.key}
            onClick={() => setSourceFilter(src.key)}
            style={{
              background: sourceFilter === src.key ? "#38bdf8" : "#1f2937",
              color: sourceFilter === src.key ? "#fff" : "#93c5fd",
              border: "none",
              borderRadius: "999px",
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            {src.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: "#38bdf8", textAlign: "center", padding: "20px" }}>
          جاري تحديث نبض X...
        </div>
      )}

      {error && (
        <div style={{ color: "#ef4444", textAlign: "center", padding: "20px" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px"
        }}
      >
        {displayedPosts.map((post) => (
          <XPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
