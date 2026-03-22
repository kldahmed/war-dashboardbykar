import { DEADLINE_CONFIG } from "../config/deadlineConfig";

function normalize(v) {
  return String(v || "").toLowerCase();
}

function pickTimestamp(row) {
  const candidate = row?.announcementAt || row?.deadlineStart || row?.firstDetected || row?.latestUpdate || row?.timestamp || row?.time || row?.publishedAt || row?.createdAt;
  const date = new Date(candidate || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveDeadlineStartFromPayload(payload, config = DEADLINE_CONFIG) {
  const keywords = Array.isArray(config.discoveryKeywords) ? config.discoveryKeywords : [];
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const rows = events
    .map((event) => {
      const title = normalize(event?.title || "");
      const summary = normalize(event?.summary || event?.description || "");
      const hay = `${title} ${summary}`;
      const matched = keywords.some((keyword) => hay.includes(normalize(keyword)));
      if (!matched) return null;
      const ts = pickTimestamp(event);
      if (!ts) return null;
      return { ts, event };
    })
    .filter(Boolean)
    .sort((a, b) => b.ts.getTime() - a.ts.getTime());

  return rows[0]?.ts || null;
}

export async function resolveDeadlineStart(config = DEADLINE_CONFIG) {
  const fallback = new Date(config.fallbackStartIso);
  const fallbackSafe = Number.isNaN(fallback.getTime()) ? new Date() : fallback;

  try {
    const response = await fetch("/api/global-events", { headers: { Accept: "application/json" } });
    if (!response.ok) return { startAt: fallbackSafe, source: "fallback" };
    const payload = await response.json();
    const discovered = resolveDeadlineStartFromPayload(payload, config);
    if (discovered) {
      return { startAt: discovered, source: "global-events" };
    }
  } catch {
    // ignore and fallback
  }

  return { startAt: fallbackSafe, source: "fallback" };
}

export function getDeadlineState(startAt, config = DEADLINE_CONFIG, now = Date.now()) {
  const startMs = new Date(startAt).getTime();
  const durationMs = Number(config.durationHours || 48) * 60 * 60 * 1000;
  const endMs = startMs + durationMs;
  const remainingMs = Math.max(0, endMs - now);
  const expired = remainingMs <= 0;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired,
    remainingMs,
    endAt: new Date(endMs),
    parts: { days, hours, minutes, seconds },
  };
}
