import { describe, expect, it } from "vitest";
import {
  formatPhone,
  formatPrice,
  formatPriceInput,
  parsePrice,
  pickLocalized,
} from "./format";

describe("price formatting", () => {
  it("renders whole manat without decimals", () => {
    expect(formatPrice(4500, "en")).toBe("45");
  });

  it("renders part-manat prices with two decimals", () => {
    expect(formatPrice(4550, "en")).toBe("45.50");
    expect(formatPrice(4599, "en")).toBe("45.99");
  });

  it("handles zero and small amounts", () => {
    expect(formatPrice(0, "en")).toBe("0");
    expect(formatPrice(5, "en")).toBe("0.05");
  });
});

describe("price parsing", () => {
  it("converts manat input to integer tenge", () => {
    expect(parsePrice("45")).toBe(4500);
    expect(parsePrice("45.5")).toBe(4550);
    expect(parsePrice("45.99")).toBe(4599);
  });

  it("accepts a comma as the decimal separator, as typed in Russian", () => {
    expect(parsePrice("45,50")).toBe(4550);
    expect(parsePrice("45,5")).toBe(4550);
  });

  it("accepts spaced thousands and both grouped conventions", () => {
    expect(parsePrice("1 200")).toBe(120000);
    expect(parsePrice("1,234.56")).toBe(123456);
    expect(parsePrice("1.234,56")).toBe(123456);
  });

  it("treats a lone separator as decimal rather than guessing at grouping", () => {
    // "1,234" is ambiguous; reading it as 1.234 gives three decimals, which is
    // rejected. Better a visible error than a price wrong by a thousand.
    expect(parsePrice("1,234")).toBeNull();
    expect(parsePrice("45.999")).toBeNull();
  });

  it("rejects anything that is not a price", () => {
    for (const input of ["", "abc", "-5", "45.5.5", "12abc", "."]) {
      expect(parsePrice(input)).toBeNull();
    }
  });

  it("round-trips the input formatter without drift", () => {
    // formatPriceInput is what the menu editor puts in the field, so this pair
    // must be exactly reversible at every magnitude.
    for (const tenge of [1, 5, 99, 100, 4550, 123456, 98765432]) {
      expect(parsePrice(formatPriceInput(tenge))).toBe(tenge);
    }
  });

  it("formats an input field without grouping separators", () => {
    expect(formatPriceInput(4500)).toBe("45");
    expect(formatPriceInput(4550)).toBe("45.50");
    expect(formatPriceInput(98765432)).toBe("987654.32");
  });
});

describe("phone formatting", () => {
  it("groups a Turkmen number for readability", () => {
    expect(formatPhone("+99365123456")).toBe("+993 65 123456");
  });

  it("leaves other formats alone", () => {
    expect(formatPhone("+905551234567")).toBe("+905551234567");
    expect(formatPhone(null)).toBe("");
  });
});

describe("localised fields", () => {
  it("prefers the requested language, then the primary", () => {
    expect(pickLocalized({ tk: "Salam", en: "Hello" }, "en", "tk")).toBe("Hello");
    expect(pickLocalized({ tk: "Salam" }, "en", "tk")).toBe("Salam");
  });

  it("never renders a blank when any language has content", () => {
    expect(pickLocalized({ ru: "Привет" }, "en", "tk")).toBe("Привет");
  });

  it("returns an empty string when nothing is set", () => {
    expect(pickLocalized({}, "en", "tk")).toBe("");
    expect(pickLocalized(undefined, "en", "tk")).toBe("");
  });
});
