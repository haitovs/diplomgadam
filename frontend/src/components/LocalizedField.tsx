import { Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_LABELS, LANG_SHORT, type Lang } from "../i18n/translations";
import type { Localized } from "../types/api";
import { inputClass } from "./ui";

interface LocalizedFieldProps {
  label: string;
  value: Localized;
  onChange: (next: Localized) => void;
  primaryLang: Lang;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
}

/**
 * One field, three languages. Only the store's primary language is required;
 * the tabs show at a glance which translations are still missing, which is the
 * whole point of letting owners fill them in gradually.
 *
 * The missing-translation signal is deliberately warm rather than red: an
 * untranslated field is normal, expected work-in-progress, not an error. Each
 * state carries a shape as well as a colour — a check, a solid dot, a hollow
 * ring — so the signal survives both dark mode and colour-blind vision, and the
 * same information is repeated as text under the field.
 */
export default function LocalizedField({
  label,
  value,
  onChange,
  primaryLang,
  multiline = false,
  placeholder,
  hint,
  rows = 4,
  maxLength = 2000,
}: LocalizedFieldProps) {
  const { t } = useLanguage();
  const [active, setActive] = useState<Lang>(primaryLang);

  const filled = (lang: Lang) => Boolean(value[lang]?.trim());
  const missingPrimary = !filled(primaryLang);
  const allFilled = LANGS.every((lang) => filled(lang));

  const current = value[active] ?? "";
  const nearLimit = current.length > maxLength * 0.7;

  const update = (lang: Lang, text: string) =>
    onChange({ ...value, [lang]: text });

  /* Status under the field. Missing beats complete beats "this is the primary
     language", so the line always answers the most useful question first. */
  const status = !filled(active)
    ? {
        text: t("translation_missing"),
        className: "text-clay-700 dark:text-clay-300",
        check: false,
      }
    : allFilled
      ? {
          text: t("translation_complete"),
          className: "text-emerald-700 dark:text-emerald-400",
          check: true,
        }
      : active === primaryLang
        ? {
            text: t("translation_primary"),
            className: "text-sand-600 dark:text-sand-500",
            check: false,
          }
        : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <label
          htmlFor={undefined}
          className="text-sm font-semibold text-sand-800 dark:text-sand-200"
        >
          {label}
          {missingPrimary && (
            <span
              aria-hidden="true"
              className="ml-1 text-clay-600 dark:text-clay-400"
            >
              *
            </span>
          )}
        </label>

        {/* Segmented control: a sunken groove with one raised card in it. */}
        <div
          role="group"
          aria-label={label}
          className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--border-subtle)] surface-sunken p-1"
        >
          {LANGS.map((lang) => {
            const isActive = active === lang;
            const isFilled = filled(lang);
            const isPrimary = lang === primaryLang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                aria-pressed={isActive}
                title={`${LANG_LABELS[lang]} — ${
                  isPrimary
                    ? t("translation_primary")
                    : isFilled
                      ? t("translation_complete")
                      : t("translation_missing")
                }`}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all duration-200 ease-out-soft ${
                  isActive
                    ? "bg-[var(--surface-card)] text-clay-700 shadow-soft dark:text-clay-300"
                    : "text-sand-600 hover:bg-sand-200/70 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800/70 dark:hover:text-sand-100"
                }`}
              >
                <span className="tracking-wide">{LANG_SHORT[lang]}</span>
                {isFilled ? (
                  <Check
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : isPrimary ? (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-clay-600 dark:bg-clay-400"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full border border-sand-500 dark:border-sand-600"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {multiline ? (
        <textarea
          value={current}
          onChange={(e) => update(active, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          aria-label={`${label} — ${LANG_LABELS[active]}`}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={current}
          onChange={(e) => update(active, e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={`${label} — ${LANG_LABELS[active]}`}
          className={inputClass}
        />
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-xs text-sand-600 dark:text-sand-500">
          {status && (
            <span className={`inline-flex items-center gap-1 ${status.className}`}>
              {status.check && <Check aria-hidden="true" className="h-3 w-3" />}
              {status.text}
            </span>
          )}
          {status && hint && <span aria-hidden="true"> · </span>}
          {hint}
        </p>
        {nearLimit && (
          <span
            className={`shrink-0 text-xs tabular-nums ${
              current.length >= maxLength
                ? "font-semibold text-clay-700 dark:text-clay-300"
                : "text-sand-600 dark:text-sand-500"
            }`}
          >
            {current.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
