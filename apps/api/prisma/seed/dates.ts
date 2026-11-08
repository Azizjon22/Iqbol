/** `days` from today at `hour` o'clock, local time. */
export function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysAgo(days: number, hour = 18) {
  return daysFromNow(-days, hour);
}
