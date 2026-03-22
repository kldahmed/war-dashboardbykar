import { getInternalApiBase } from "./_api-utils";

const STREAM_INTERVAL_MS = 12000;

async function fetchLiveIntake(baseUrl) {
  const response = await fetch(`${baseUrl}/api/live-intake`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json();
}

function writeEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const baseUrl = getInternalApiBase(req);
  let lastFingerprint = "";
  let closed = false;

  const pushSnapshot = async () => {
    try {
      const payload = await fetchLiveIntake(baseUrl);
      const breaking = Array.isArray(payload?.breaking) ? payload.breaking.slice(0, 10) : [];
      const fingerprint = JSON.stringify(breaking.map((item) => [item.id, item.title, item.time]));
      if (fingerprint === lastFingerprint) return;
      lastFingerprint = fingerprint;
      writeEvent(res, "breaking", {
        updated: payload?.updated || new Date().toISOString(),
        breaking,
        stats: payload?.stats || null,
        featuredAlert: payload?.featuredAlert || null,
      });
    } catch (error) {
      writeEvent(res, "health", {
        ok: false,
        error: error?.message || "stream_fetch_failed",
        updated: new Date().toISOString(),
      });
    }
  };

  writeEvent(res, "health", { ok: true, connected: true, updated: new Date().toISOString() });
  await pushSnapshot();

  const interval = setInterval(() => {
    if (closed) return;
    pushSnapshot();
  }, STREAM_INTERVAL_MS);

  req.on?.("close", () => {
    closed = true;
    clearInterval(interval);
    res.end();
  });
}