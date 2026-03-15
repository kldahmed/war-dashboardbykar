// Shared helpers/constants for App and components
export const bg0 = "#060708";
export const bg1 = "#0b0d10";
export const bg2 = "#11151a";
export const bg3 = "#161b22";
export const line = "#27303a";
export const lineSoft = "#1b222b";
export const gold = "#c89b3c";
export const goldL = "#f3d38a";
export const goldSoft = "rgba(200,155,60,.16)";
export const green = "#22c55e";
export const red = "#ff6b57";
export const orange = "#f59e0b";
export const blue = "#38bdf8";
export const text = "#e8edf2";
export const textSoft = "#a8b3c2";
export const textDim = "#6b7280";
export const URGENCY_MAP = {
  high: { label: "عاجل", color: "#e74c3c" },
  medium: { label: "متوسط", color: "#f39c12" },
  low: { label: "منخفض", color: "#27ae60" }
};
export function formatDisplayTime(dateValue) {
  try {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "وقت غير متوفر";
    return new Intl.DateTimeFormat("ar-AE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Dubai"
    }).format(d);
  } catch {
    return "وقت غير متوفر";
  }
}
export function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(id || "").trim());
}
export function getWarRiskLevel(news, tensionData) {
  // ...existing code from App.jsx...
}
export function extractEventLocations(news) {
  // ...existing code from App.jsx...
}
export function cleanSourceName(source) {
  // ...existing code from App.jsx...
}
export function getUrgencyScore(level) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}
