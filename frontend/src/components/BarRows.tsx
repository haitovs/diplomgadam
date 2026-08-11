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
 * and costs no extra JavaScript on a slow connection. Values are direct-labelled
 * and right-aligned into a single tabular column, so identity and magnitude are
 * never carried by colour alone and the eye can compare figures straight down
 * the edge. The track is a hairline rule under the label rather than a bar
 * beside it, which is what lets long Turkmen and Russian names have the full
 * width of the card.
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
      <p className="rounded-card border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-sand-600 dark:border-sand-700 dark:text-sand-400">
        {emptyLabel}
      </p>
    );
  }

  const peak = max ?? Math.max(...rows.map((row) => row.value));

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const pct = peak > 0 ? (row.value / peak) * 100 : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="flex min-w-0 items-baseline gap-1.5 text-sand-700 dark:text-sand-300">
                {row.prefix && (
                  <span aria-hidden="true" className="shrink-0">
                    {row.prefix}
                  </span>
                )}
                <span className="truncate" title={row.label}>
                  {row.label}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-sand-900 dark:text-sand-50">
                {formatValue(row.value)}
              </span>
            </div>
            {/* Track is recessive; the fill carries the magnitude. The figure
                above already states it, so this is decoration to a reader. */}
            <div
              aria-hidden="true"
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800"
            >
              {/* A minimum width keeps the smallest counts from vanishing into
                  the track, without inflating their share of it. */}
              <div
                className="h-full min-w-1.5 rounded-full bg-clay-600 transition-[width] duration-700 ease-out-soft dark:bg-clay-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A single headline figure. Set in the display face, because a number is the
 * one piece of type on these pages that is worth looking at.
 */
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
    <div className="panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p
          className="truncate text-xs font-semibold uppercase tracking-wider text-sand-600 dark:text-sand-400"
          title={label}
        >
          {label}
        </p>
        {icon && (
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay-50 text-clay-600 dark:bg-clay-500/10 dark:text-clay-400"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-sand-900 sm:text-display-sm dark:text-sand-50">
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed text-sand-600 dark:text-sand-400">
          {hint}
        </p>
      )}
    </div>
  );
}
