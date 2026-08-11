import type { Lang } from "../i18n/translations";
import type { Localized } from "../types/api";

const LOCALES: Record<Lang, string> = {
  tk: "tk-TM",
  en: "en-GB",
  ru: "ru-RU",
};

/**
 * Prices are stored as integer tenge (100 to the manat). Formatting divides
 * only at the point of display, so no arithmetic ever happens on a float.
 */
export function formatPrice(priceMinor: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}

/** Parses "45", "45.5" or "45,50" into integer tenge. */
export function parsePrice(input: string): number | null {
  const normalised = input.replace(",", ".").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}

export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Groups +99365123456 into +993 65 123456 for display. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const match = /^\+993(\d{2})(\d{6})$/.exec(phone);
  if (match) return `+993 ${match[1]} ${match[2]}`;
  return phone;
}

/**
 * Resolves a translatable field on the client, used by the owner portal and
 * admin panel which receive the raw multilingual record. Public pages get
 * fields already resolved by the server.
 */
export function pickLocalized(
  value: Localized | null | undefined,
  lang: Lang,
  primaryLang: Lang = "tk",
): string {
  if (!value) return "";
  return (
    value[lang]?.trim() ||
    value[primaryLang]?.trim() ||
    value.tk?.trim() ||
    value.en?.trim() ||
    value.ru?.trim() ||
    ""
  );
}

export const socialUrl = {
  instagram: (handle: string) => `https://instagram.com/${handle}`,
  tiktok: (handle: string) => `https://tiktok.com/@${handle}`,
  telegram: (handle: string) => `https://t.me/${handle}`,
  whatsapp: (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`,
};
