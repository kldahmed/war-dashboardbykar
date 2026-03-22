/**
 * Weather API endpoint — fetches real meteorological data from Open-Meteo (free, no API key).
 * Returns current conditions + 7-day daily forecast for major geopolitically relevant cities.
 */

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const CITIES = [
  // ── UAE (all 7 emirates) ──────────────────────────────────────────────────
  { id: "abu-dhabi",      nameAr: "أبوظبي",      nameEn: "Abu Dhabi",      lat: 24.4539,  lon: 54.3773,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "dubai",          nameAr: "دبي",          nameEn: "Dubai",          lat: 25.2048,  lon: 55.2708,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "sharjah",        nameAr: "الشارقة",      nameEn: "Sharjah",        lat: 25.3462,  lon: 55.4272,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "ajman",          nameAr: "عجمان",         nameEn: "Ajman",          lat: 25.4052,  lon: 55.5136,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "ras-al-khaimah", nameAr: "رأس الخيمة",   nameEn: "Ras Al Khaimah", lat: 25.7895,  lon: 55.9432,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "fujairah",       nameAr: "الفجيرة",      nameEn: "Fujairah",       lat: 25.1288,  lon: 56.3265,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  { id: "umm-al-quwain",  nameAr: "أم القيوين",   nameEn: "Umm Al Quwain",  lat: 25.5647,  lon: 55.5559,  flag: "🇦🇪", timezone: "Asia/Dubai" },
  // ── Regional capitals ────────────────────────────────────────────────────
  { id: "riyadh",     nameAr: "الرياض",     nameEn: "Riyadh",        lat: 24.6877,  lon: 46.7219,  flag: "🇸🇦", timezone: "Asia/Riyadh" },
  { id: "cairo",      nameAr: "القاهرة",    nameEn: "Cairo",         lat: 30.0444,  lon: 31.2357,  flag: "🇪🇬", timezone: "Africa/Cairo" },
  { id: "baghdad",    nameAr: "بغداد",      nameEn: "Baghdad",       lat: 33.3152,  lon: 44.3661,  flag: "🇮🇶", timezone: "Asia/Baghdad" },
  { id: "tehran",     nameAr: "طهران",      nameEn: "Tehran",        lat: 35.6892,  lon: 51.3890,  flag: "🇮🇷", timezone: "Asia/Tehran" },
  { id: "beirut",     nameAr: "بيروت",      nameEn: "Beirut",        lat: 33.8938,  lon: 35.5018,  flag: "🇱🇧", timezone: "Asia/Beirut" },
  { id: "ankara",     nameAr: "أنقرة",      nameEn: "Ankara",        lat: 39.9208,  lon: 32.8541,  flag: "🇹🇷", timezone: "Europe/Istanbul" },
  { id: "jerusalem",  nameAr: "القدس",      nameEn: "Jerusalem",     lat: 31.7683,  lon: 35.2137,  flag: "🕌",  timezone: "Asia/Jerusalem" },
  { id: "damascus",   nameAr: "دمشق",       nameEn: "Damascus",      lat: 33.5102,  lon: 36.2913,  flag: "🇸🇾", timezone: "Asia/Damascus" },
  { id: "amman",      nameAr: "عمّان",       nameEn: "Amman",         lat: 31.9539,  lon: 35.9106,  flag: "🇯🇴", timezone: "Asia/Amman" },
  { id: "moscow",     nameAr: "موسكو",      nameEn: "Moscow",        lat: 55.7558,  lon: 37.6173,  flag: "🇷🇺", timezone: "Europe/Moscow" },
  { id: "washington", nameAr: "واشنطن",     nameEn: "Washington D.C.", lat: 38.9072, lon: -77.0369, flag: "🇺🇸", timezone: "America/New_York" },
  { id: "london",     nameAr: "لندن",       nameEn: "London",        lat: 51.5074,  lon: -0.1278,  flag: "🇬🇧", timezone: "Europe/London" },
  { id: "beijing",    nameAr: "بكين",       nameEn: "Beijing",       lat: 39.9042,  lon: 116.4074, flag: "🇨🇳", timezone: "Asia/Shanghai" },
  { id: "kyiv",       nameAr: "كييف",       nameEn: "Kyiv",          lat: 50.4501,  lon: 30.5234,  flag: "🇺🇦", timezone: "Europe/Kiev" },
];

// WMO weather code → { descAr, descEn, icon, severity }
function decodeWeatherCode(code) {
  const n = Number(code);
  const map = [
    [0,  "صافٍ",                   "Clear sky",               "☀️",  "normal"],
    [1,  "صافٍ في معظمه",           "Mainly clear",            "🌤️", "normal"],
    [2,  "غائم جزئياً",             "Partly cloudy",           "⛅",  "normal"],
    [3,  "غائم",                    "Overcast",                "☁️",  "normal"],
    [45, "ضباب",                    "Fog",                     "🌫️", "watch"],
    [48, "ضباب جليدي",              "Rime fog",                "🌫️", "watch"],
    [51, "رذاذ خفيف",               "Light drizzle",           "🌦️", "normal"],
    [53, "رذاذ متوسط",              "Moderate drizzle",        "🌦️", "normal"],
    [55, "رذاذ كثيف",               "Dense drizzle",           "🌧️", "normal"],
    [61, "مطر خفيف",                "Slight rain",             "🌧️", "normal"],
    [63, "مطر معتدل",               "Moderate rain",           "🌧️", "watch"],
    [65, "مطر غزير",                "Heavy rain",              "🌧️", "alert"],
    [71, "ثلج خفيف",                "Slight snow",             "🌨️", "watch"],
    [73, "ثلج معتدل",               "Moderate snow",           "🌨️", "watch"],
    [75, "ثلج كثيف",                "Heavy snow",              "❄️",  "alert"],
    [77, "حبيبات ثلج",              "Snow grains",             "🌨️", "normal"],
    [80, "زخات مطر خفيفة",          "Slight rain showers",     "🌦️", "normal"],
    [81, "زخات مطر معتدلة",         "Moderate rain showers",   "🌦️", "watch"],
    [82, "زخات مطر عنيفة",          "Violent rain showers",    "⛈️",  "alert"],
    [85, "زخات ثلج خفيفة",          "Slight snow showers",     "🌨️", "watch"],
    [86, "زخات ثلج كثيفة",          "Heavy snow showers",      "🌨️", "alert"],
    [95, "عاصفة رعدية",             "Thunderstorm",            "⛈️",  "alert"],
    [96, "عاصفة رعدية مع برَد",     "Thunderstorm + hail",     "⛈️",  "extreme"],
    [99, "عاصفة رعدية مع برَد كبير","Thunderstorm + heavy hail","⛈️", "extreme"],
  ];
  const entry = map.slice().reverse().find(([code]) => n >= code);
  return entry
    ? { descAr: entry[1], descEn: entry[2], icon: entry[3], severity: entry[4] }
    : { descAr: "غير معروف", descEn: "Unknown", icon: "🌡️", severity: "normal" };
}

function windDirectionLabel(deg) {
  const dirs = ["شمال","شمال شرق","شرق","جنوب شرق","جنوب","جنوب غرب","غرب","شمال غرب"];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

function buildAlerts(cities) {
  const alerts = [];
  for (const city of cities) {
    const c = city.current;
    if (!c) continue;
    if (c.temperature_2m >= 46)
      alerts.push({ cityAr: city.nameAr, cityEn: city.nameEn, flag: city.flag, msgAr: `موجة حرارة شديدة: ${c.temperature_2m.toFixed(1)}°م`, msgEn: `Extreme heat wave: ${c.temperature_2m.toFixed(1)}°C`, severity: "extreme" });
    else if (c.temperature_2m <= -10)
      alerts.push({ cityAr: city.nameAr, cityEn: city.nameEn, flag: city.flag, msgAr: `برد قارص: ${c.temperature_2m.toFixed(1)}°م`, msgEn: `Severe frost: ${c.temperature_2m.toFixed(1)}°C`, severity: "extreme" });
    else if (c.wind_speed_10m >= 55)
      alerts.push({ cityAr: city.nameAr, cityEn: city.nameEn, flag: city.flag, msgAr: `رياح عاتية: ${c.wind_speed_10m.toFixed(0)} كم/س`, msgEn: `Strong gale winds: ${c.wind_speed_10m.toFixed(0)} km/h`, severity: "alert" });
    const wc = decodeWeatherCode(c.weather_code);
    if (wc.severity === "extreme" || wc.severity === "alert")
      alerts.push({ cityAr: city.nameAr, cityEn: city.nameEn, flag: city.flag, msgAr: wc.descAr, msgEn: wc.descEn, severity: wc.severity });
  }
  return alerts;
}

// In-memory cache
let _cache = null;
let _cacheTime = 0;

async function fetchCityWeather(city) {
  const params = new URLSearchParams({
    latitude: city.lat,
    longitude: city.lon,
    timezone: city.timezone,
    forecast_days: 7,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "uv_index",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "uv_index_max",
      "wind_speed_10m_max",
    ].join(","),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();

  const cur = data.current || {};
  const daily = data.daily || {};
  const wc = decodeWeatherCode(cur.weather_code);

  const forecastDays = (daily.time || []).map((date, i) => ({
    date,
    weatherCode: daily.weather_code?.[i],
    ...decodeWeatherCode(daily.weather_code?.[i]),
    tempMax: daily.temperature_2m_max?.[i],
    tempMin: daily.temperature_2m_min?.[i],
    precipSum: daily.precipitation_sum?.[i],
    precipProb: daily.precipitation_probability_max?.[i],
    uvMax: daily.uv_index_max?.[i],
    windMax: daily.wind_speed_10m_max?.[i],
  }));

  return {
    ...city,
    current: {
      temperature_2m: cur.temperature_2m,
      apparent_temperature: cur.apparent_temperature,
      relative_humidity_2m: cur.relative_humidity_2m,
      precipitation: cur.precipitation,
      weather_code: cur.weather_code,
      wind_speed_10m: cur.wind_speed_10m,
      wind_direction_10m: cur.wind_direction_10m,
      uv_index: cur.uv_index,
      windDirLabel: windDirectionLabel(cur.wind_direction_10m || 0),
      ...wc,
    },
    forecast: forecastDays,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchAllCities() {
  const results = await Promise.allSettled(CITIES.map(fetchCityWeather));
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL) {
      return res.status(200).json(_cache);
    }

    const cities = await fetchAllCities();
    const payload = {
      cities,
      alerts: buildAlerts(cities),
      fetchedAt: new Date().toISOString(),
      source: "Open-Meteo (WMO standard data)",
    };

    _cache = payload;
    _cacheTime = now;

    return res.status(200).json(payload);
  } catch (err) {
    const msg = String(err?.message || "Weather fetch failed");
    return res.status(500).json({ error: msg, cities: [], alerts: [] });
  }
}
