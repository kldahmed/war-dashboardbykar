/**
 * useAgentIntelligence — hook that computes real-time AI agent metrics
 * from actual platform data (memory, patterns, forecasts, feedback).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { computeAgentScore } from "./agent/scoringAgent";
import { agentMemory } from "./agent/memoryAgent";
import { analyzePatterns } from "./agent/patternAgent";
import { generateForecastSupport } from "./agent/forecastAgent";
import { feedbackAgent } from "./agent/feedbackAgent";

const AGENT_STATES = [
  { id: "idle", ar: "خامل", en: "Idle", color: "#6b7280" },
  { id: "monitoring", ar: "يراقب", en: "Monitoring", color: "#38bdf8" },
  { id: "analyzing", ar: "يحلل", en: "Analyzing", color: "#a78bfa" },
  { id: "learning", ar: "يتغذى", en: "Learning", color: "#22c55e" },
  { id: "alert", ar: "رصد إشارة", en: "Alert", color: "#ef4444" },
  { id: "forecasting", ar: "يستشرف", en: "Forecasting", color: "#f59e0b" },
  { id: "updating", ar: "يحدّث البيانات", en: "Updating", color: "#06b6d4" },
];

const STATUS_MESSAGES = {
  idle: ["في وضع الاستعداد...", "أنتظر بيانات جديدة..."],
  monitoring: ["أرصد الإشارات الواردة...", "أراقب التغيرات الإقليمية..."],
  analyzing: ["أحلل الارتباطات...", "أبحث عن أنماط ناشئة...", "أعالج البيانات الجديدة..."],
  learning: ["أبني الذاكرة...", "أرصد إشارة جديدة...", "أتعلم من الأنماط..."],
  alert: ["رصدت ضغطًا إقليميًا متزايدًا...", "تم اكتشاف نمط ناشئ...", "إشارة عالية الأهمية..."],
  forecasting: ["أراجع التوقعات...", "الثقة ترتفع...", "أبني سيناريوهات..."],
  updating: ["أحدّث قاعدة المعرفة...", "أدمج البيانات الجديدة...", "أحسّن النماذج..."],
};

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function deriveAgentState(metrics) {
  if (!metrics) return "idle";
  const { signalDensity, forecastReadiness, learningLevel, confidence, activity } = metrics;
  // Alert if signal density is very high
  if (signalDensity > 75) return "alert";
  // Forecasting if readiness is high
  if (forecastReadiness > 60 && confidence > 50) return "forecasting";
  // Learning if learning level actively growing
  if (learningLevel > 30 && activity > 40) return "learning";
  // Analyzing if activity is moderate
  if (activity > 30) return "analyzing";
  // Monitoring if there's some data
  if (learningLevel > 10) return "monitoring";
  // Updating if items were recently added
  if (activity > 10) return "updating";
  return "idle";
}

export function useAgentIntelligence(refreshKey = 0) {
  const [metrics, setMetrics] = useState(null);
  const [agentState, setAgentState] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState([]);
  const prevTotalRef = useRef(0);
  const messageIndexRef = useRef({});

  const compute = useCallback(() => {
    try {
      const score = computeAgentScore();
      const depth = agentMemory.getMemoryDepth();
      const patterns = analyzePatterns();
      const forecast = generateForecastSupport();
      const feedback = feedbackAgent.getStats();

      const totalItems = depth.totalMemoryItems || 0;
      const sourceDiversity = depth.sourceDiversity || 0;
      const activePatterns = depth.activePatterns || 0;
      const repeatedSignals = depth.repeatedSignals || 0;
      const linkedEvents = depth.linkedEvents || 0;

      // Real metrics computed from actual data
      const learningLevel = score.score;
      const confidence = clamp(
        forecast.confidenceTrend
          ? forecast.confidenceTrend.recentAvg || forecast.confidenceTrend.allAvg || 0
          : (totalItems > 0 ? Math.min(20 + Math.log2(totalItems + 1) * 8, 85) : 0)
      );
      const activity = clamp(
        Math.min(100, (patterns.recentItemCount || 0) * 4 + (sourceDiversity > 3 ? 15 : 0))
      );
      const signalDensity = clamp(
        Math.min(100, repeatedSignals * 6 + (forecast.strongestSignals?.length || 0) * 5)
      );
      const forecastReadiness = clamp(forecast.forecastReadiness || 0);
      const patternStrength = clamp(patterns.patternStrength || 0);

      const newMetrics = {
        learningLevel,
        confidence,
        activity,
        signalDensity,
        forecastReadiness,
        patternStrength,
        // Raw data for panels
        totalProcessed: depth.totalIngested || totalItems,
        activePatternsCount: activePatterns,
        linkedEventsCount: linkedEvents,
        sourceDiversity,
        topEntities: depth.topEntities || [],
        topSignals: depth.topSignals || [],
        strongestSignals: forecast.strongestSignals || [],
        regionalPressure: patterns.regionalPressure || [],
        clusters: patterns.clusters || [],
        confidenceTrend: forecast.confidenceTrend || null,
        acceleration: forecast.acceleration || null,
        feedbackAccuracy: feedback.overallAccuracy,
        feedbackResolved: feedback.resolved || 0,
        feedbackConfirmed: feedback.confirmed || 0,
        geopolitical: patterns.geopolitical || null,
        sports: patterns.sports || null,
        market: patterns.market || null,
        lastFeedAt: depth.lastFeedAt,
        maturityLabel: score.label,
        maturityLabelEn: score.labelEn,
        maturityColor: score.color,
      };

      setMetrics(newMetrics);

      const state = deriveAgentState(newMetrics);
      setAgentState(state);

      // Rotate status messages
      const msgs = STATUS_MESSAGES[state] || STATUS_MESSAGES.idle;
      const idx = messageIndexRef.current[state] || 0;
      setStatusMessage(msgs[idx % msgs.length]);
      messageIndexRef.current[state] = idx + 1;

      // Track history for trend
      setHistory((prev) => {
        const entry = { t: Date.now(), state, learningLevel, confidence, activity };
        const next = [...prev, entry];
        return next.length > 60 ? next.slice(-60) : next;
      });

      // Track total for detecting new ingestion
      if (totalItems > prevTotalRef.current && prevTotalRef.current > 0) {
        setAgentState("learning");
        setStatusMessage("أرصد إشارة جديدة...");
      }
      prevTotalRef.current = totalItems;
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const syncAndCompute = async () => {
      await agentMemory.syncFromServer();
      compute();
    };

    syncAndCompute();
    const iv = setInterval(syncAndCompute, 4000);
    return () => clearInterval(iv);
  }, [compute, refreshKey]);

  const stateInfo = AGENT_STATES.find((s) => s.id === agentState) || AGENT_STATES[0];

  return {
    metrics,
    agentState,
    stateInfo,
    statusMessage,
    history,
    AGENT_STATES,
  };
}
