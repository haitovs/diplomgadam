import { describe, expect, it } from "vitest";
import {
  hasLang,
  missingLangs,
  normaliseLocalized,
  pickLocalized,
} from "./i18n.js";
import { normalisePhone, phoneSchema } from "./phone.js";
import { slugify, uniqueSlug } from "./slug.js";

describe("phone normalisation", () => {
  it("accepts the same number written several ways", () => {
    for (const input of [
      "65123456",
      "65 12 34 56",
      "865123456",
      "+993 65 123456",
      "993 65 123456",
      "+99365123456",
    ]) {
      expect(normalisePhone(input)).toBe("+99365123456");
    }
  });

  it("keeps a foreign country code as entered", () => {
    expect(normalisePhone("+90 555 1234567")).toBe("+905551234567");
  });

  it("rejects numbers that are too short to be real", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });

  it("accepts a valid Turkmen mobile number", () => {
    const result = phoneSchema.safeParse("65123456");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+99365123456");
  });
});

describe("slugify", () => {
  it("transliterates Turkmen letters instead of dropping them", () => {
    expect(slugify("Şasoltan Restoran")).toBe("sasoltan-restoran");
    expect(slugify("Çaýhana")).toBe("cayhana");
    expect(slugify("Türkmen Öýi")).toBe("turkmen-oyi");
  });

  it("transliterates Cyrillic", () => {
    expect(slugify("Чайхана")).toBe("chayhana");
  });

  it("collapses punctuation and trims separators", () => {
    expect(slugify("  Kafe -- 'Aşgabat'!  ")).toBe("kafe-asgabat");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it("appends a counter when the slug is taken", async () => {
    const taken = new Set(["kafe", "kafe-2"]);
    const slug = await uniqueSlug("Kafe", async (c) => taken.has(c));
    expect(slug).toBe("kafe-3");
  });

  it("falls back to a usable slug when the name has no ASCII equivalent", async () => {
    const slug = await uniqueSlug("♥♥♥", async () => false);
    expect(slug).toBe("store");
  });
});

describe("localised fields", () => {
  it("prefers the requested language", () => {
    expect(pickLocalized({ tk: "Salam", en: "Hello" }, "en", "tk")).toBe("Hello");
  });

  it("falls back to the primary language", () => {
    expect(pickLocalized({ tk: "Salam" }, "en", "tk")).toBe("Salam");
  });

  it("falls back to any language rather than showing nothing", () => {
    expect(pickLocalized({ ru: "Привет" }, "en", "tk")).toBe("Привет");
  });

  it("treats whitespace as absent", () => {
    expect(pickLocalized({ en: "   ", tk: "Salam" }, "en", "tk")).toBe("Salam");
    expect(hasLang({ en: "  " }, "en")).toBe(false);
  });

  it("returns an empty string when nothing is filled in", () => {
    expect(pickLocalized({}, "en", "tk")).toBe("");
    expect(pickLocalized(null, "en", "tk")).toBe("");
  });

  it("drops empty strings when normalising", () => {
    expect(normaliseLocalized({ tk: "Bar", en: "  ", ru: "" })).toEqual({
      tk: "Bar",
    });
  });

  it("reports which languages are missing", () => {
    expect(missingLangs({ tk: "Bar" })).toEqual(["en", "ru"]);
    expect(missingLangs({ tk: "a", en: "b", ru: "c" })).toEqual([]);
  });
});
