import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_SHORT, type Lang } from "../i18n/translations";
import type { Localized } from "../types/api";

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

  const update = (lang: Lang, text: string) =>
    onChange({ ...value, [lang]: text });

  const inputClass =
    "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
          {missingPrimary && <span className="ml-1 text-rose-500">*</span>}
        </label>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActive(lang)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                active === lang
                  ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title={
                lang === primaryLang
                  ? t("translation_primary")
                  : filled(lang)
                    ? undefined
                    : t("translation_missing")
              }
            >
              {LANG_SHORT[lang]}
              {filled(lang) ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : lang === primaryLang ? (
                <AlertCircle className="w-3 h-3 text-rose-500" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-dashed border-slate-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {multiline ? (
        <textarea
          value={value[active] ?? ""}
          onChange={(e) => update(active, e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value[active] ?? ""}
          onChange={(e) => update(active, e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={inputClass}
        />
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {active === primaryLang ? (
          <span>
            {t("translation_primary")}
            {hint ? ` · ${hint}` : ""}
          </span>
        ) : filled(active) ? (
          hint
        ) : (
          <span className="text-amber-600 dark:text-amber-400">
            {t("translation_missing")}
          </span>
        )}
      </p>
    </div>
  );
}
