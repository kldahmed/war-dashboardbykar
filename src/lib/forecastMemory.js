/**
 * Forecast Memory — localStorage-backed accuracy tracking.
 * Records forecast outputs and tracks pattern reliability over time.
 * Used by the strategic forecast engine to improve confidence weights.
 */

const MEMORY_KEY = "kar_forecast_memory_v1";
const MAX_RECORDS = 200;

function readMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMemory(data) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * Record a new forecast snapshot for a given forecast id.
 * Called every time a forecast is generated.
 */
export function recordForecast(forecastId, { probability, confidence, signalCount }) {
  const memory = readMemory();
  if (!memory[forecastId]) {
    memory[forecastId] = { records: [], successCount: 0, failCount: 0, successRate: null };
  }

  const record = {
    ts:          Date.now(),
    probability,
    confidence,
    signalCount,
    outcome:     null, // set by markOutcome
  };

  memory[forecastId].records.push(record);

  // Keep circular buffer
  if (memory[forecastId].records.length > MAX_RECORDS) {
    memory[forecastId].records = memory[forecastId].records.slice(-MAX_RECORDS);
  }

  writeMemory(memory);
}

/**
 * Mark the outcome of a forecast as success or failure.
 * Called externally when evidence confirms or contradicts a prediction.
 *
 * @param {string} forecastId
 * @param {"success"|"failure"} outcome
 */
export function markOutcome(forecastId, outcome) {
  const memory = readMemory();
  if (!memory[forecastId]) return;

  // Find most recent unresolved record
  const records = memory[forecastId].records;
  const unresolved = records.filter(r => r.outcome === null);
  if (unresolved.length) {
    unresolved[unresolved.length - 1].outcome = outcome;
  }

  if (outcome === "success") memory[forecastId].successCount++;
  else memory[forecastId].failCount++;

  const total = memory[forecastId].successCount + memory[forecastId].failCount;
  memory[forecastId].successRate = total > 0
    ? memory[forecastId].successCount / total
    : null;

  writeMemory(memory);
}

/**
 * Get memory stats for a forecast id.
 * Returns successRate (0-1 or null), record count, and last probability.
 */
export function getForecastMemory(forecastId) {
  const memory = readMemory();
  const entry = memory[forecastId];
  if (!entry) return { successRate: null, count: 0, lastProbability: null };

  const last = entry.records[entry.records.length - 1];
  return {
    successRate:     entry.successRate,
    successCount:    entry.successCount || 0,
    failCount:       entry.failCount || 0,
    count:           entry.records.length,
    lastProbability: last ? last.probability : null,
    lastSignalCount: last ? last.signalCount : null,
  };
}

/**
 * Get aggregate memory stats across all forecasts.
 * Used for displaying memory health in the UI.
 */
export function getMemoryStats() {
  const memory = readMemory();
  const ids = Object.keys(memory);
  if (!ids.length) return { total: 0, resolved: 0, overallSuccessRate: null, patterns: [] };

  let totalSuccess = 0, totalFail = 0;
  const patterns = ids.map(id => {
    const e = memory[id];
    totalSuccess += e.successCount || 0;
    totalFail    += e.failCount || 0;
    return {
      id,
      successRate: e.successRate,
      count:       e.records.length,
      reliability: e.successRate !== null
        ? (e.successRate >= 0.7 ? "عالية" : e.successRate >= 0.5 ? "متوسطة" : "منخفضة")
        : "غير مُقيّم",
    };
  });

  const total = totalSuccess + totalFail;
  return {
    total:               ids.length,
    resolved:            total,
    overallSuccessRate:  total > 0 ? totalSuccess / total : null,
    patterns,
  };
}

/** Clear all forecast memory (for reset/debug). */
export function clearForecastMemory() {
  localStorage.removeItem(MEMORY_KEY);
}
