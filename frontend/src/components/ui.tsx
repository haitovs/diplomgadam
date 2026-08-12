import { Loader2, WifiOff } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/* Shared primitives. Pages compose these rather than repeating utility
   strings, so a change to the design language happens in one file. */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  // clay-600 with white text measures 5.83:1.
  primary:
    "bg-clay-600 text-white shadow-soft hover:bg-clay-700 active:bg-clay-800 disabled:bg-clay-300 disabled:text-white/80",
  secondary:
    "bg-[var(--surface-card)] text-sand-800 border border-[var(--border-subtle)] hover:bg-sand-100 hover:border-sand-400 dark:text-sand-100 dark:hover:bg-sand-800",
  ghost:
    "text-sand-700 hover:bg-sand-200/70 dark:text-sand-300 dark:hover:bg-sand-800/70",
  danger:
    "bg-red-700 text-white shadow-soft hover:bg-red-800 active:bg-red-900 disabled:bg-red-300",
  success:
    "bg-emerald-700 text-white shadow-soft hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-emerald-300",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3.5 text-base gap-2.5 rounded-xl",
};

export function Button({
  variant = "primary",
  loading = false,
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-80 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3.5 py-2.5 text-sm text-sand-900 placeholder:text-sand-500 transition-colors duration-200 hover:border-sand-400 focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 outline-none disabled:opacity-60 dark:text-sand-100";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-sand-800 dark:text-sand-200">
        {label}
        {required && <span className="ml-1 text-clay-600 dark:text-clay-400">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-sand-600 dark:text-sand-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${inputClass} resize-y ${props.className ?? ""}`} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`${interactive ? "panel-interactive" : "panel"} p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
  rule = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Adds the short accent rule used on editorial section headings. */
  rule?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2
          className={`font-display text-xl font-semibold text-sand-900 dark:text-sand-50 ${rule ? "rule-accent" : ""}`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-sand-600 dark:text-sand-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-display-sm font-semibold text-sand-900 sm:text-display-md dark:text-sand-50">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sand-600 dark:text-sand-400">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const TONES: Record<Tone, string> = {
  neutral:
    "bg-sand-200/80 text-sand-700 border-sand-300 dark:bg-sand-800 dark:text-sand-300 dark:border-sand-700",
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  warning:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  danger:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  info: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  accent:
    "bg-clay-50 text-clay-700 border-clay-200 dark:bg-clay-500/10 dark:text-clay-300 dark:border-clay-500/30",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-start gap-3 text-left"
    >
      <span
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-clay-600" : "bg-sand-400 dark:bg-sand-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      {(label || hint) && (
        <span>
          {label && (
            <span className="block text-sm font-medium text-sand-800 dark:text-sand-200">
              {label}
            </span>
          )}
          {hint && (
            <span className="block text-xs text-sand-600 dark:text-sand-500">{hint}</span>
          )}
        </span>
      )}
    </button>
  );
}

export function CheckboxPill({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-out-soft active:scale-95 ${
        checked
          ? "border-clay-600 bg-clay-600 text-white shadow-soft"
          : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-700 hover:border-clay-300 hover:text-clay-700 dark:text-sand-300 dark:hover:text-clay-300"
      }`}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`grid place-items-center py-16 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-clay-500" />
    </div>
  );
}

/** Blocked-out placeholder used while content loads, instead of a bare spinner. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-sand-200 dark:bg-sand-800 ${className}`}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-panel border border-dashed border-sand-300 bg-sand-100/50 px-6 py-16 text-center dark:border-sand-700 dark:bg-sand-900/40">
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-sand-200 text-sand-500 dark:bg-sand-800">
          {icon}
        </div>
      )}
      <p className="font-display text-lg font-semibold text-sand-900 dark:text-sand-100">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-sand-600 dark:text-sand-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Shown when a request failed, as opposed to succeeding with nothing in it.
 *
 * These two cases look identical on screen unless they are deliberately kept
 * apart, and this page got it wrong: a failed request fell through to "nothing
 * found, try clearing some filters", which tells the visitor the platform is
 * empty and suggests a remedy for a problem they do not have. A page that
 * cannot reach the server should say so and offer to try again.
 */
export function LoadFailed({
  title,
  description,
  onRetry,
  retryLabel,
}: {
  title: string;
  description?: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <EmptyState
      icon={<WifiOff className="h-6 w-6" />}
      title={title}
      description={description}
      action={
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      }
    />
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </p>
  );
}
