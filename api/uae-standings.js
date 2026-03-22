function applyApiHeaders(res, methods = "GET, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
/**
 * /api/uae-standings
 *
 * Fetches live UAE Pro League (ADNOC Pro League) standings.
 *
 * PRIMARY:   https://www.uaeproleague.ae/en/standings  (official site)
 * SECONDARY: 365scores web-service API
 * FALLBACK:  last good cached data, then emergency static table
 */

const FETCH_TIMEOUT = 8000;
const CACHE_TTL = 60 * 1000; // 60 seconds

// Competition ID for ADNOC PRO LEAGUE 2025/2026 on uaeproleague.ae
// If the season changes the page HTML will contain a new ID - we scrape it dynamically.
const FALLBACK_COMPETITION_ID = "5c8e6ba0-5728-11f0-9b1f-e3f62e1405e2";

// In-memory cache (persists across warm function invocations on Vercel)
let cache = null; // { standings, updatedAt, fetchedAt }

// Emergency static table — only used when BOTH live sources fail AND cache is empty.
// Based on official table as of 2026-03-17.  NEVER used if live data is available.
const EMERGENCY_FALLBACK = [
  { rank: 1,  team: "Shabab AlAhli",  played: 20, won: 15, drawn: 4, lost: 1,  goalsFor: 48, goalsAgainst: 7,  goalDifference: 41,  points: 49 },
  { rank: 2,  team: "Al Ain",         played: 19, won: 14, drawn: 5, lost: 0,  goalsFor: 40, goalsAgainst: 16, goalDifference: 24,  points: 47 },
  { rank: 3,  team: "Al Jazira",      played: 20, won: 11, drawn: 4, lost: 5,  goalsFor: 33, goalsAgainst: 18, goalDifference: 15,  points: 37 },
  { rank: 4,  team: "Al Wahda",       played: 19, won: 9,  drawn: 7, lost: 3,  goalsFor: 29, goalsAgainst: 16, goalDifference: 13,  points: 34 },
  { rank: 5,  team: "Al Wasl",        played: 19, won: 8,  drawn: 6, lost: 5,  goalsFor: 21, goalsAgainst: 20, goalDifference: 1,   points: 30 },
  { rank: 6,  team: "Al Nasr",        played: 19, won: 6,  drawn: 8, lost: 5,  goalsFor: 24, goalsAgainst: 24, goalDifference: 0,   points: 26 },
  { rank: 7,  team: "Ajman",          played: 19, won: 7,  drawn: 2, lost: 10, goalsFor: 19, goalsAgainst: 25, goalDifference: -6,  points: 23 },
  { rank: 8,  team: "Kalba",          played: 19, won: 5,  drawn: 5, lost: 9,  goalsFor: 20, goalsAgainst: 33, goalDifference: -13, points: 20 },
  { rank: 9,  team: "Khorfakkan",     played: 20, won: 5,  drawn: 5, lost: 10, goalsFor: 27, goalsAgainst: 36, goalDifference: -9,  points: 20 },
  { rank: 10, team: "Sharjah",        played: 19, won: 6,  drawn: 2, lost: 11, goalsFor: 27, goalsAgainst: 35, goalDifference: -8,  points: 20 },
  { rank: 11, team: "Bani Yas",       played: 19, won: 6,  drawn: 2, lost: 11, goalsFor: 19, goalsAgainst: 30, goalDifference: -11, points: 20 },
  { rank: 12, team: "Al Dhafra",      played: 19, won: 5,  drawn: 3, lost: 11, goalsFor: 25, goalsAgainst: 39, goalDifference: -14, points: 18 },
  { rank: 13, team: "Al Bataeh",      played: 19, won: 4,  drawn: 4, lost: 11, goalsFor: 18, goalsAgainst: 28, goalDifference: -10, points: 16 },
  { rank: 14, team: "Dibba",          played: 20, won: 3,  drawn: 5, lost: 12, goalsFor: 17, goalsAgainst: 40, goalDifference: -23, points: 14 }
];

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = (html || "").match(re);
  return m ? m[1].trim() : "";
}

function stripHtml(str) {
  return (str || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Parse the standings HTML returned by the uaeproleague AJAX endpoint.
 * Returns an array of row objects.
 */
function parseStandingsHtml(html) {
  if (!html) return [];

  // Each team row is inside an element with class "accordion-title-pl"
  const rowPattern =
    /accordion-title-pl[\s\S]*?(?=<div class="accordion-item">|$)/g;
  const rows = html.match(rowPattern) || [];
  const standings = [];

  for (const row of rows) {
    // Extract all <strong> and <span> text nodes in order
    const cells = [];
    const cellRe = /<(?:strong|span)>([^<]+)<\/(?:strong|span)>/g;
    let m;
    while ((m = cellRe.exec(row)) !== null) {
      cells.push(m[1].trim());
    }

    // Expected order: rank, team, played, won, drawn, lost, goalsAgainst, goalsFor, goalDifference, points
    if (cells.length < 10) continue;

    const rank        = parseInt(cells[0], 10);
    const team        = cells[1];
    const played      = parseInt(cells[2], 10);
    const won         = parseInt(cells[3], 10);
    const drawn       = parseInt(cells[4], 10);
    const lost        = parseInt(cells[5], 10);
    const goalsAgainst = parseInt(cells[6], 10);
    const goalsFor    = parseInt(cells[7], 10);
    const gdRaw       = cells[8].replace(/\s+/g, "");
    const goalDifference = parseInt(gdRaw, 10);
    const points      = parseInt(cells[9], 10);

    if (
      !Number.isNaN(rank) &&
      team &&
      !Number.isNaN(played) &&
      !Number.isNaN(points)
    ) {
      standings.push({
        rank,
        team,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points
      });
    }
  }

  return standings.sort((a, b) => a.rank - b.rank);
}

/**
 * Fetch live standings from the official UAE Pro League site.
 * Returns array of row objects, or throws on failure.
 */
async function fetchFromOfficialSite() {
  // Step 1: GET the standings page to get session cookie + CSRF token
  const pageRes = await fetchWithTimeout(
    "https://www.uaeproleague.ae/en/standings",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }
  );

  if (!pageRes.ok) throw new Error(`Page fetch failed: ${pageRes.status}`);

  const pageHtml = await pageRes.text();

  // Extract CSRF token
  const csrfMatch = pageHtml.match(
    /meta name="csrf-token" content="([^"]+)"/
  );
  if (!csrfMatch) throw new Error("CSRF token not found");
  const csrf = csrfMatch[1];

  // Extract session cookie
  const setCookie = pageRes.headers.get("set-cookie") || "";
  const sessionCookie = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  // Dynamically extract competition ID (ADNOC PRO LEAGUE option in feedback form)
  let competitionId = FALLBACK_COMPETITION_ID;
  const compMatch = pageHtml.match(
    /option value="([^"]+)"[^>]*>\s*ADNOC PRO LEAGUE\s*</
  );
  if (compMatch) {
    competitionId = compMatch[1];
  }

  // Step 2: GET the standings list (returns JSON with { html, playOff, ... })
  const listUrl = `https://www.uaeproleague.ae/en/standings/list?seasonCompetitionId=${encodeURIComponent(
    competitionId
  )}&teamId=`;

  const listRes = await fetchWithTimeout(listUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-CSRF-TOKEN": csrf,
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.uaeproleague.ae/en/standings",
      ...(sessionCookie ? { Cookie: sessionCookie } : {})
    }
  });

  if (!listRes.ok) throw new Error(`Standings list fetch failed: ${listRes.status}`);

  const data = await listRes.json();
  if (!data.html) throw new Error("Empty standings HTML in response");

  const standings = parseStandingsHtml(data.html);
  if (!standings.length) throw new Error("Parsed 0 rows from standings HTML");

  return standings;
}

/**
 * Secondary: fetch from 365scores webws API
 * Uses the web-service standings endpoint with UAE Pro League tournament ID.
 */
async function fetchFrom365Scores() {
  // 365scores tournament ID for UAE Pro League (ADNOC Pro League) - ID 549
  const url =
    "https://webws.365scores.com/web/standings/?appTypeId=5&langId=1&timezoneName=Asia/Dubai&userCountryId=155&tournamentIds=549";

  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json",
      Origin: "https://www.365scores.com",
      Referer: "https://www.365scores.com/"
    }
  });

  if (!res.ok) throw new Error(`365scores fetch failed: ${res.status}`);

  const data = await res.json();

  // The API returns: { competitions: [{ rows: [{ competitor: { name }, ... }, ...] }] }
  const comp =
    Array.isArray(data.competitions) && data.competitions[0];
  if (!comp) throw new Error("No competition data in 365scores response");

  const rows = comp.rows || [];
  if (!rows.length) throw new Error("Empty rows from 365scores");

  return rows.map((row, i) => ({
    rank:            row.position || i + 1,
    team:            row.competitor?.name || `Team ${i + 1}`,
    played:          row.played   || 0,
    won:             row.wins     || 0,
    drawn:           row.draws    || 0,
    lost:            row.losses   || 0,
    goalsFor:        row.goalsFor || 0,
    goalsAgainst:    row.goalsAgainst || 0,
    goalDifference:  row.goalsDiff || 0,
    points:          row.points   || 0
  }));
}

export default async function handler(req, res) {
  applyApiHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();

  // Serve cache if fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({
      standings: cache.standings,
      updatedAt: cache.updatedAt,
      source: cache.source
    });
  }

  let standings = null;
  let source = "official";

  // --- PRIMARY: official UAE Pro League site ---
  try {
    standings = await fetchFromOfficialSite();
    source = "official";
  } catch (primaryErr) {
    console.error("[uae-standings] Primary source failed:", primaryErr.message);

    // --- SECONDARY: 365scores ---
    try {
      standings = await fetchFrom365Scores();
      source = "365scores";
    } catch (secondaryErr) {
      console.error("[uae-standings] Secondary source failed:", secondaryErr.message);
    }
  }

  // Use cached data if both live sources failed
  if (!standings && cache) {
    return res.status(200).json({
      standings: cache.standings,
      updatedAt: cache.updatedAt,
      source: "cache"
    });
  }

  // Emergency static fallback
  if (!standings) {
    source = "emergency-fallback";
    standings = EMERGENCY_FALLBACK;
  }

  const updatedAt = new Date().toLocaleString("ar-AE", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  // Update cache
  cache = { standings, updatedAt, source, fetchedAt: now };

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
  return res.status(200).json({ standings, updatedAt, source });
}
