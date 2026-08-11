import { describe, expect, it } from "vitest";
import { isOpenNow, localNow, type HourInterval } from "./opening-hours.js";

/** Monday 0, ... Sunday 6. Helper for readable fixtures. */
const open = (weekday: number, opens: string, closes: string): HourInterval => ({
  weekday,
  isClosed: false,
  opens,
  closes,
});

const closed = (weekday: number): HourInterval => ({
  weekday,
  isClosed: true,
  opens: null,
  closes: null,
});

const at = (weekday: number, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return { weekday, minutes: h * 60 + m, date: "2026-08-11" };
};

describe("localNow", () => {
  it("converts UTC to Ashgabat wall-clock time", () => {
    // 2026-08-11T05:30:00Z is 10:30 in Ashgabat (UTC+5), a Tuesday.
    const now = localNow(new Date("2026-08-11T05:30:00Z"));
    expect(now.minutes).toBe(10 * 60 + 30);
    expect(now.weekday).toBe(1); // Tuesday
    expect(now.date).toBe("2026-08-11");
  });

  it("rolls the date forward when UTC is still the previous day", () => {
    // 2026-08-11T20:00:00Z is 01:00 on the 12th in Ashgabat.
    const now = localNow(new Date("2026-08-11T20:00:00Z"));
    expect(now.date).toBe("2026-08-12");
    expect(now.weekday).toBe(2); // Wednesday
    expect(now.minutes).toBe(60);
  });
});

describe("isOpenNow", () => {
  const week = [open(0, "09:00", "22:00"), open(1, "09:00", "22:00")];

  it("is open inside the interval", () => {
    expect(isOpenNow(week, [], false, at(0, "12:00"))).toBe(true);
  });

  it("is closed before opening and after closing", () => {
    expect(isOpenNow(week, [], false, at(0, "08:59"))).toBe(false);
    expect(isOpenNow(week, [], false, at(0, "22:00"))).toBe(false);
  });

  it("is closed on a day with no configured hours", () => {
    expect(isOpenNow(week, [], false, at(5, "12:00"))).toBe(false);
  });

  it("is closed on a day explicitly marked closed", () => {
    expect(isOpenNow([...week, closed(2)], [], false, at(2, "12:00"))).toBe(false);
  });

  describe("split days", () => {
    const split = [open(4, "09:00", "14:00"), open(4, "17:00", "23:00")];

    it("is open during the first interval", () => {
      expect(isOpenNow(split, [], false, at(4, "10:00"))).toBe(true);
    });

    it("is closed during the gap", () => {
      expect(isOpenNow(split, [], false, at(4, "15:30"))).toBe(false);
    });

    it("is open during the second interval", () => {
      expect(isOpenNow(split, [], false, at(4, "18:00"))).toBe(true);
    });
  });

  describe("past midnight", () => {
    // Friday 18:00 until 02:00 on Saturday.
    const overnight = [open(4, "18:00", "02:00")];

    it("is open late on the same day", () => {
      expect(isOpenNow(overnight, [], false, at(4, "23:30"))).toBe(true);
    });

    it("is still open after midnight, on the following day", () => {
      expect(isOpenNow(overnight, [], false, at(5, "01:00"))).toBe(true);
    });

    it("is closed once the spill-over has ended", () => {
      expect(isOpenNow(overnight, [], false, at(5, "02:00"))).toBe(false);
      expect(isOpenNow(overnight, [], false, at(5, "09:00"))).toBe(false);
    });

    it("does not report open earlier on the starting day", () => {
      expect(isOpenNow(overnight, [], false, at(4, "10:00"))).toBe(false);
    });
  });

  describe("special hours", () => {
    it("replace the weekly pattern for that date", () => {
      const special = [
        { date: "2026-08-11", isClosed: true, opens: null, closes: null },
      ];
      // Normally open at midday on this weekday.
      expect(isOpenNow(week, [], false, at(0, "12:00"))).toBe(true);
      expect(isOpenNow(week, special, false, at(0, "12:00"))).toBe(false);
    });

    it("can open a day that is normally closed", () => {
      const special = [
        { date: "2026-08-11", isClosed: false, opens: "10:00", closes: "16:00" },
      ];
      expect(isOpenNow(week, special, false, at(5, "12:00"))).toBe(true);
      expect(isOpenNow(week, special, false, at(5, "17:00"))).toBe(false);
    });

    it("ignores entries for other dates", () => {
      const special = [
        { date: "2026-12-31", isClosed: true, opens: null, closes: null },
      ];
      expect(isOpenNow(week, special, false, at(0, "12:00"))).toBe(true);
    });
  });

  it("is never open while temporarily closed", () => {
    expect(isOpenNow(week, [], true, at(0, "12:00"))).toBe(false);
  });
});
