// Weddings happen in Tashkent (UTC+5, no DST). Day boundaries are computed
// in that zone explicitly so "today" and "tomorrow" stay right even when
// the server itself runs in UTC.
export const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

/** UTC instant of local midnight `dayOffset` days from today, Tashkent time. */
export function localMidnight(now: Date, dayOffset = 0) {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
  );
  return new Date(midnightLocal - TZ_OFFSET_MS);
}

/** "YYYY-MM-DD" of an instant in Tashkent time. */
export function localDateKey(date: Date) {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}
