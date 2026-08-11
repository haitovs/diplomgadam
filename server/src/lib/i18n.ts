import { z } from "zod";
import { LANGS, type Lang, type Localized } from "../db/schema.js";

export const langSchema = z.enum(LANGS);

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/**
 * A translatable field. Every language is optional here; the requirement that
 * the store's primary language be present is enforced by
 * `assertPrimaryLanguage`, which knows what that language is.
 */
export const localizedSchema = z
  .object({
    tk: z.string().trim().max(4000).optional(),
    en: z.string().trim().max(4000).optional(),
    ru: z.string().trim().max(4000).optional(),
  })
  .strict();

/**
 * Resolves a translatable field for display: the requested language, else the
 * store's primary language, else any language that has content. Returning the
 * next best thing beats showing a visitor an empty name.
 */
export function pickLocalized(
  value: Localized | null | undefined,
  lang: Lang,
  primaryLang: Lang,
): string {
  if (!value) return "";
  const requested = value[lang]?.trim();
  if (requested) return requested;
  const primary = value[primaryLang]?.trim();
  if (primary) return primary;
  for (const l of LANGS) {
    const fallback = value[l]?.trim();
    if (fallback) return fallback;
  }
  return "";
}

/** True when the field has usable content in the given language. */
export function hasLang(value: Localized | null | undefined, lang: Lang): boolean {
  return Boolean(value?.[lang]?.trim());
}

/** Drops empty strings so a blank input never counts as a translation. */
export function normaliseLocalized(value: Localized | undefined): Localized {
  const out: Localized = {};
  if (!value) return out;
  for (const lang of LANGS) {
    const text = value[lang]?.trim();
    if (text) out[lang] = text;
  }
  return out;
}

/**
 * Which of the three languages a field is missing. Drives the completeness
 * indicator in the owner portal.
 */
export function missingLangs(value: Localized | null | undefined): Lang[] {
  return LANGS.filter((lang) => !hasLang(value, lang));
}
