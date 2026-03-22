export const DEADLINE_CONFIG = {
  id: "trump-hormuz-deadline",
  titleAr: "المهلة الزمنية الحالية",
  subtitleAr: "العد التنازلي للمهلة المعلنة (48 ساعة) متزامن مع وقت الإعلان المرجعي.",
  // Fallback reference timestamp (single source of truth, easy to edit)
  fallbackStartIso: "2026-03-22T08:00:00Z",
  durationHours: 48,
  // Keywords used to discover reliable timestamp from live sources
  discoveryKeywords: ["trump", "ترامب", "hormuz", "هرمز", "مهلة", "deadline"],
};
