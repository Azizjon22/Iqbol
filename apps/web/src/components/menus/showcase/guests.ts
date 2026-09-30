export const GUESTS_MIN = 50;
export const GUESTS_MAX = 1000;
export const GUESTS_STEP = 10;
export const GUESTS_DEFAULT = 300;
export const GUEST_PRESETS = [100, 200, 300, 500];

export function clampGuests(n: number) {
  if (!Number.isFinite(n)) return GUESTS_DEFAULT;
  return Math.min(GUESTS_MAX, Math.max(GUESTS_MIN, Math.round(n / GUESTS_STEP) * GUESTS_STEP));
}

/** `?guests=` travels from the menu list into a menu page's calculator. */
export function parseGuestsParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? clampGuests(Number(raw)) : GUESTS_DEFAULT;
}
