const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function normalizeOrigin(value) {
  if (!value) return "";
  try {
    const origin = new URL(value).origin;
    return origin.toLowerCase();
  } catch {
    return "";
  }
}

function getAllowedOrigins() {
  const configured = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);

  const vercelOrigin = process.env.VERCEL_URL
    ? normalizeOrigin(`https://${process.env.VERCEL_URL}`)
    : "";

  return [...new Set([...configured, ...DEFAULT_ALLOWED_ORIGINS, vercelOrigin].filter(Boolean))];
}

export function resolveRequestOrigin(req) {
  return normalizeOrigin(req?.headers?.origin);
}

export function applyApiHeaders(req, res, methods = "GET, OPTIONS") {
  const requestOrigin = resolveRequestOrigin(req);
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : null;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}

export function handlePreflight(req, res) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

export function rejectUnsupportedMethod(req, res, allowedMethod) {
  if (req.method !== allowedMethod) {
    res.status(405).json({ error: "Method not allowed" });
    return true;
  }
  return false;
}

export function withTimeout(ms = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

export function getInternalApiBase(req) {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const rawHost = String(req?.headers?.host || "localhost:3000").trim().toLowerCase();
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(rawHost) ? rawHost : "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}
