import React, { useEffect, useMemo, useState } from "react";
import { DEADLINE_CONFIG } from "../config/deadlineConfig";
import { getDeadlineState, resolveDeadlineStart } from "../lib/deadlineUtils";

function pad(n) {
  return String(n).padStart(2, "0");
}

function TimeCell({ label, value, danger }) {
  return (
    <div
      style={{
        minWidth: 74,
        padding: "10px 10px",
        borderRadius: 12,
        border: `1px solid ${danger ? "rgba(248,113,113,0.45)" : "rgba(251,146,60,0.4)"}`,
        background: danger ? "rgba(127,29,29,0.28)" : "rgba(120,53,15,0.24)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 27, fontWeight: 900, color: danger ? "#fda4af" : "#fdba74", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#fecdd3", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function DeadlineCountdownCard({ language = "ar" }) {
  const isAr = language === "ar";
  const [clockNow, setClockNow] = useState(Date.now());
  const [startMeta, setStartMeta] = useState({ startAt: new Date(DEADLINE_CONFIG.fallbackStartIso), source: "fallback" });

  useEffect(() => {
    let mounted = true;
    resolveDeadlineStart(DEADLINE_CONFIG).then((meta) => {
      if (mounted) setStartMeta(meta);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const deadlineState = useMemo(() => getDeadlineState(startMeta.startAt, DEADLINE_CONFIG, clockNow), [startMeta.startAt, clockNow]);
  const { days, hours, minutes, seconds } = deadlineState.parts;
  const nearEnd = deadlineState.remainingMs > 0 && deadlineState.remainingMs <= 6 * 60 * 60 * 1000;

  const title = DEADLINE_CONFIG.titleAr;
  const subtitle = DEADLINE_CONFIG.subtitleAr;

  return (
    <section
      style={{
        marginBottom: 16,
        borderRadius: 16,
        padding: "16px 18px",
        border: `1px solid ${deadlineState.expired ? "rgba(148,163,184,0.45)" : "rgba(248,113,113,0.55)"}`,
        background: deadlineState.expired
          ? "linear-gradient(140deg, rgba(30,41,59,0.82), rgba(15,23,42,0.88))"
          : "linear-gradient(140deg, rgba(127,29,29,0.34), rgba(69,10,10,0.62))",
        boxShadow: deadlineState.expired ? "0 12px 28px rgba(2,6,23,0.38)" : "0 0 0 1px rgba(248,113,113,0.18), 0 14px 36px rgba(127,29,29,0.36)",
        animation: deadlineState.expired ? "none" : "deadlinePulse 1.8s ease-in-out infinite",
      }}
    >
      <style>
        {`@keyframes deadlinePulse {
          0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.24), 0 14px 36px rgba(127,29,29,0.32); }
          50% { box-shadow: 0 0 0 6px rgba(248,113,113,0.06), 0 18px 40px rgba(127,29,29,0.42); }
          100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.24), 0 14px 36px rgba(127,29,29,0.32); }
        }`}
      </style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ color: deadlineState.expired ? "#cbd5e1" : "#fecaca", fontSize: 12, fontWeight: 900, letterSpacing: "0.05em" }}>
            {title}
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 11, color: "#fca5a5" }}>
          {isAr ? "مرجع الوقت:" : "Reference:"} {startMeta.source === "global-events" ? (isAr ? "مصدر مباشر" : "Live source") : (isAr ? "قيمة احتياطية" : "Fallback")}
        </div>
      </div>

      {deadlineState.expired ? (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(15,23,42,0.56)",
            color: "#e2e8f0",
            fontSize: 24,
            fontWeight: 900,
            textAlign: "center",
            padding: "16px 12px",
          }}
        >
          {isAr ? "انقضت المهلة الزمنية" : "Deadline elapsed"}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {days > 0 ? <TimeCell label={isAr ? "يوم" : "Days"} value={pad(days)} danger={nearEnd} /> : null}
          <TimeCell label={isAr ? "ساعة" : "Hours"} value={pad(hours)} danger={nearEnd} />
          <TimeCell label={isAr ? "دقيقة" : "Minutes"} value={pad(minutes)} danger={nearEnd} />
          <TimeCell label={isAr ? "ثانية" : "Seconds"} value={pad(seconds)} danger={nearEnd} />
        </div>
      )}
    </section>
  );
}
