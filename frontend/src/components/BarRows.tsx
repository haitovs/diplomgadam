import type { ReactNode } from "react";

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  prefix?: ReactNode;
}

/**
 * Horizontal bar rows for single-series magnitude — counts by cuisine, by
 * neighbourhood, by price tier.
 *
 * Built in plain HTML rather than a charting library: every dataset here is one
 * series of counts with long labels, so a labelled row reads better than a plot
 * and costs no extra JavaScript on a slow connection. Values are direct-labelled,
 * so identity and magnitude are never carried by colour alone, and the markup is
 * already a list a screen reader can walk.
 *
 * The fill uses one hue from the clay ramp, stepped per mode: clay-600 on the
 * cream surface (5.45:1) and clay-400 on dark (6.36:1), both above the 3:1
 * floor for graphical objects.
 */
export default function BarRows({
  data,
  emptyLabel,
  formatValue = (value: number) => String(value),
  max,
}: {
  data: BarDatum[];
  emptyLabel: string;
  formatValue?: (value: number) => string;
  max?: number;
}) {
  const rows = data.filter((row) => row.value > 0);

  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-sand-600 dark:text-sand-500">{emptyLabel}</p>
    );
  }

  const peak = max ?? Math.max(...rows.map((row) => row.value));

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = peak > 0 ? Math.max((row.value / peak) * 100, 2) : 0;
        return (
          <li key={row.key} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-sand-600 dark:text-sand-300">
                {row.prefix} {row.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-sand-900 dark:text-white">
                {formatValue(row.value)}
              </span>
            </div>
            {/* Track is recessive; the fill carries the magnitude. */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800">
              <div
                className="h-full rounded-full bg-clay-600 transition-[width] duration-700 ease-out-soft dark:bg-clay-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-sand-600 dark:text-sand-500">
          {label}
        </p>
        {icon && <span className="text-sand-500 dark:text-sand-600">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-sand-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-sand-600 dark:text-sand-500">{hint}</p>
      )}
    </div>
  );
}
