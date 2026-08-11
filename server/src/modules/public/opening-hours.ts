/**
 * Turkmenistan observes UTC+5 all year and does not use daylight saving, so a
 * fixed offset is correct here and avoids depending on the container's zoneinfo
 * database being present.
 */
export const ASHGABAT_UTC_OFFSET_MINUTES = 5 * 60;

export interface HourInterval {
  weekday: number;
  isClosed: boolean;
  opens: string | null;
  closes: string | null;
}

export interface SpecialHour {
  date: string;
  isClosed: boolean;
  opens: string | null;
  closes: string | null;
}

export interface LocalNow {
  /** 0 = Monday through 6 = Sunday. */
  weekday: number;
  /** Minutes since local midnight. */
  minutes: number;
  /** YYYY-MM-DD in local time. */
  date: string;
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function localNow(now: Date = new Date()): LocalNow {
  const shifted = new Date(
    now.getTime() + ASHGABAT_UTC_OFFSET_MINUTES * 60 * 1000,
  );
  // getUTC* on the shifted instant yields local wall-clock values.
  const jsDay = shifted.getUTCDay(); // 0 = Sunday
  return {
    weekday: (jsDay + 6) % 7, // shift so Monday is 0
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    date: shifted.toISOString().slice(0, 10),
  };
}

const previousWeekday = (weekday: number) => (weekday + 6) % 7;

function intervalCoversNow(
  opens: string,
  closes: string,
  minutes: number,
  fromYesterday: boolean,
): boolean {
  const start = toMinutes(opens);
  const end = toMinutes(closes);

  if (end > start) {
    // Ordinary same-day interval; yesterday's cannot still be running.
    return !fromYesterday && minutes >= start && minutes < end;
  }

  // Runs past midnight: open late today, or still open from yesterday.
  return fromYesterday ? minutes < end : minutes >= start;
}

/**
 * Whether a store is open at this moment. A special-hours entry for today
 * replaces the weekly pattern entirely; a store marked temporarily closed is
 * never open regardless of its hours.
 */
export function isOpenNow(
  hours: HourInterval[],
  specialHours: SpecialHour[],
  temporarilyClosed: boolean,
  now: LocalNow = localNow(),
): boolean {
  if (temporarilyClosed) return false;

  const todaySpecial = specialHours.filter((s) => s.date === now.date);
  if (todaySpecial.length > 0) {
    return todaySpecial.some(
      (s) =>
        !s.isClosed &&
        s.opens !== null &&
        s.closes !== null &&
        intervalCoversNow(s.opens, s.closes, now.minutes, false),
    );
  }

  const openToday = hours.some(
    (h) =>
      h.weekday === now.weekday &&
      !h.isClosed &&
      h.opens !== null &&
      h.closes !== null &&
      intervalCoversNow(h.opens, h.closes, now.minutes, false),
  );
  if (openToday) return true;

  const yesterday = previousWeekday(now.weekday);
  return hours.some(
    (h) =>
      h.weekday === yesterday &&
      !h.isClosed &&
      h.opens !== null &&
      h.closes !== null &&
      intervalCoversNow(h.opens, h.closes, now.minutes, true),
  );
}
