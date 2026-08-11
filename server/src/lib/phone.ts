import { z } from "zod";

const TURKMENISTAN_CC = "993";

/**
 * Normalises a Turkmen phone number to `+993XXXXXXXX` so the same number typed
 * as "65 12 34 56", "865123456" or "+993 65 123456" resolves to one account.
 * Numbers that already carry another country code are kept as entered.
 */
export function normalisePhone(input: string): string {
  const raw = input.trim();
  const hadPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (hadPlus) return `+${digits}`;

  // Local trunk prefix, as dialled inside the country.
  if (digits.startsWith("8") && digits.length === 9) digits = digits.slice(1);

  if (digits.startsWith(TURKMENISTAN_CC) && digits.length === 11) {
    return `+${digits}`;
  }

  // Bare national number (8 digits, e.g. 65123456).
  if (digits.length === 8) return `+${TURKMENISTAN_CC}${digits}`;

  return `+${digits}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Phone number is too short")
  .max(24, "Phone number is too long")
  .transform(normalisePhone)
  .refine((v) => /^\+\d{8,17}$/.test(v), "Enter a valid phone number");

/** Optional phone field that treats an empty string as "not provided". */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform((v) => (v === "" ? null : normalisePhone(v)))
  .refine((v) => v === null || /^\+\d{8,17}$/.test(v), "Enter a valid phone number")
  .nullable()
  .optional();
