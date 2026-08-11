import { Check } from "lucide-react";
import { useId, useState } from "react";
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

/** Three states, three shapes: written, primary-and-empty, simply empty. */
type Mark = "filled" | "primary" | "missing";

/**
 * The same small glyph appears in the language tab and again in the status
 * line under the field, so the two read as one signal rather than two.
 * Everything sits in a fixed 12px box, which keeps the tabs from twitching as
 * an owner types the first character into a translation.
 */
function LangMark({ mark }: { mark: Mark }) {
  return (
    <span aria-hidden="true" className="grid h-3 w-3 shrink-0 place-items-center">
      {mark === "filled" ? (
        <Check
          className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
          strokeWidth={3}
        />
      ) : mark === "primary" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-clay-500 dark:bg-clay-400" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full border border-sand-500 dark:border-sand-600" />
      )}
    </span>
  );
}

/**
 * One field, three languages. Only the store's primary language is required;
 * the tabs show at a glance which translations are still missing, which is the
 * whole point of letting owners fill them in gradually.
 *
 * The missing signal is deliberately warm rather than red — an untranslated
 * field is expected work-in-progress, not an error. Empty translations wear a
 * dashed edge and borrow the primary language's text as a ghost placeholder, so
 * the owner can read what they are translating without leaving the field. Every
 * state carries a shape as well as a colour — a check, a solid dot, a hollow
 * ring — and is repeated as words underneath, so it survives dark mode,
 * colour-blind vision and a screen reader alike.
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

  const fieldId = useId();
  const statusId = `${fieldId}-status`;

  const filled = (lang: Lang) => Boolean(value[lang]?.trim());
  const markFor = (lang: Lang): Mark =>
    filled(lang) ? "filled" : lang === primaryLang ? "primary" : "missing";

  const missingPrimary = !filled(primaryLang);
  const allFilled = LANGS.every((lang) => filled(lang));

  const current = value[active] ?? "";
  const isMissing = !filled(active);
  const nearLimit = current.length > maxLength * 0.7;
  const atLimit = current.length >= maxLength;

  /* An empty translation shows the primary text greyed back, so the owner is
     translating something in front of them rather than from memory. */
  const ghost =
    isMissing && active !== primaryLang ? value[primaryLang]?.trim() : undefined;
  const shownPlaceholder = placeholder ?? ghost;

  const update = (lang: Lang, text: string) => onChange({ ...value, [lang]: text });

  /* Status under the field. Missing beats complete beats "this is the primary
     language", so the line always answers the most useful question first. */
  const status: { text: string; className: string; mark?: Mark } | null = isMissing
    ? {
        text: t("translation_missing"),
        className: "text-clay-700 dark:text-clay-300",
        mark: markFor(active),
      }
    : allFilled
      ? {
          text: t("translation_complete"),
          className: "text-emerald-700 dark:text-emerald-400",
          mark: "filled",
        }
      : active === primaryLang
        ? {
            text: t("translation_primary"),
            className: "text-sand-600 dark:text-sand-400",
          }
        : null;

  const fieldClass = `${inputClass} ${isMissing ? "border-dashed" : ""}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold text-sand-800 dark:text-sand-200"
        >
          {label}
          {missingPrimary && (
            <span aria-hidden="true" className="ml-1 text-clay-600 dark:text-clay-400">
              *
            </span>
          )}
          {/* The visible label names the field; the language it is currently
              showing is only useful to someone who cannot see the tabs. */}
          <span className="sr-only"> — {LANG_LABELS[active]}</span>
        </label>

        {/* Segmented control: a sunken groove with one raised card in it. The
            inactive tabs carry a transparent border so nothing shifts a pixel
            when the raised one moves. */}
        <div
          role="group"
          aria-label={label}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] surface-sunken p-1"
        >
          {LANGS.map((lang) => {
            const isActive = active === lang;
            const mark = markFor(lang);
            const state =
              mark === "primary"
                ? t("translation_primary")
                : mark === "filled"
                  ? t("translation_complete")
                  : t("translation_missing");
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                aria-pressed={isActive}
                aria-label={`${LANG_LABELS[lang]} — ${state}`}
                title={`${LANG_LABELS[lang]} — ${state}`}
                className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold tracking-wide transition-all duration-200 ease-out-soft ${
                  isActive
                    ? "border-[var(--border-subtle)] bg-[var(--surface-card)] text-clay-700 shadow-soft dark:text-clay-300"
                    : "border-transparent text-sand-600 hover:bg-sand-200/70 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800/70 dark:hover:text-sand-100"
                }`}
              >
                <span>{LANG_SHORT[lang]}</span>
                <LangMark mark={mark} />
              </button>
            );
          })}
        </div>
      </div>

      {multiline ? (
        <textarea
          id={fieldId}
          value={current}
          onChange={(e) => update(active, e.target.value)}
          placeholder={shownPlaceholder}
          rows={rows}
          maxLength={maxLength}
          aria-describedby={statusId}
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={fieldId}
          type="text"
          value={current}
          onChange={(e) => update(active, e.target.value)}
          placeholder={shownPlaceholder}
          maxLength={maxLength}
          aria-describedby={statusId}
          className={fieldClass}
        />
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p id={statusId} className="min-w-0 text-xs text-sand-600 dark:text-sand-400">
          {status && (
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${status.className}`}
            >
              {status.mark && <LangMark mark={status.mark} />}
              {status.text}
            </span>
          )}
          {status && hint && <span aria-hidden="true"> · </span>}
          {hint}
        </p>
        {nearLimit && (
          <span
            className={`shrink-0 text-xs tabular-nums ${
              atLimit
                ? "font-semibold text-clay-700 dark:text-clay-300"
                : "text-sand-600 dark:text-sand-400"
            }`}
          >
            {current.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
