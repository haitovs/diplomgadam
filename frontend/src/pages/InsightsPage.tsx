import { useQuery } from "@tanstack/react-query";
import { Eye, Truck, Utensils, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import BarRows from "../components/BarRows";
import {
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";
import { formatDate, formatPrice } from "../lib/format";

const LOCALES: Record<Lang, string> = { tk: "tk-TM", en: "en-GB", ru: "ru-RU" };

export default function InsightsPage() {
  const { t, lang } = useLanguage();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["insights", lang],
    queryFn: () => publicApi.insights(lang),
  });

  const count = (value: number) =>
    new Intl.NumberFormat(LOCALES[lang]).format(value);

  if (isLoading) return <InsightsSkeleton />;
  if (isError) return <ErrorNote message={t("error_network")} />;
  if (!data) return <EmptyState title={t("error_generic")} />;

  const hasData = data.totals.stores > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("insights_title")} description={t("insights_subtitle")} />

      {!hasData ? (
        <EmptyState
          icon={<Utensils className="h-6 w-6" />}
          title={t("insights_empty")}
          description={t("home_empty_platform_hint")}
        />
      ) : (
        <>
          {/* Headline figures. Set in the display face and given room, so four
              small numbers still read as a considered opening spread. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("insights_total_stores")}
              value={count(data.totals.stores)}
              icon={<Utensils className="h-4 w-4" />}
            />
            <StatTile
              label={t("insights_menu_items")}
              value={count(data.totals.menuItems)}
              icon={<UtensilsCrossed className="h-4 w-4" />}
              hint={
                data.menuPrices.avgMinor > 0
                  ? `${t("insights_avg_price")} · ${formatPrice(data.menuPrices.avgMinor, lang)} TMT`
                  : undefined
              }
            />
            <StatTile
              label={t("insights_total_views")}
              value={count(data.totals.totalViews)}
              icon={<Eye className="h-4 w-4" />}
            />
            <StatTile
              label={t("insights_with_delivery")}
              value={count(data.totals.withDelivery)}
              icon={<Truck className="h-4 w-4" />}
              // The share of the catalogue that delivers says more than the
              // bare count, and needs no wording of its own.
              hint={`${Math.round((data.totals.withDelivery / data.totals.stores) * 100)}%`}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="flex h-full flex-col">
              <SectionTitle title={t("insights_by_category")} rule />
              <BarRows
                emptyLabel={t("insights_empty")}
                formatValue={count}
                data={data.byCategory.map((row) => ({
                  key: row.slug,
                  label: row.name,
                  value: row.count,
                  prefix: row.icon,
                }))}
              />
            </Card>

            <Card className="flex h-full flex-col">
              <SectionTitle title={t("insights_by_neighborhood")} rule />
              <BarRows
                emptyLabel={t("insights_empty")}
                formatValue={count}
                data={data.byNeighborhood.map((row) => ({
                  key: row.neighborhood,
                  label: row.neighborhood,
                  value: row.count,
                }))}
              />
            </Card>

            <Card className="flex h-full flex-col">
              <SectionTitle title={t("insights_by_price")} rule />
              <BarRows
                emptyLabel={t("insights_empty")}
                formatValue={count}
                data={data.byPriceTier.map((row) => ({
                  key: row.priceTier,
                  label: row.priceTier,
                  value: row.count,
                }))}
              />
            </Card>

            <Card className="flex h-full flex-col">
              <SectionTitle title={t("insights_most_viewed")} rule />
              <BarRows
                emptyLabel={t("insights_empty")}
                formatValue={count}
                data={data.mostViewed.map((row, index) => ({
                  key: row.slug,
                  label: row.name,
                  value: row.views,
                  // A ranking is the point of this chart, so number the rows
                  // rather than leaving the order implicit.
                  prefix: (
                    <span className="mr-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-clay-50 text-[11px] font-bold tabular-nums text-clay-700 dark:bg-clay-500/10 dark:text-clay-300">
                      {index + 1}
                    </span>
                  ),
                }))}
              />
            </Card>
          </div>

          {data.newest.length > 0 && (
            <Card>
              <SectionTitle title={t("insights_newest")} rule />
              {/* A dotted leader to the date, as on a printed menu. */}
              <ul className="divide-y divide-[var(--border-subtle)]">
                {data.newest.map((store) => (
                  <li key={store.slug}>
                    <Link
                      to={`/restaurants/${store.slug}`}
                      className="-mx-2 flex items-baseline gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors duration-200 hover:bg-sand-100 dark:hover:bg-sand-800/60"
                    >
                      <span className="min-w-0 truncate font-medium text-sand-900 dark:text-sand-100">
                        {store.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className="hidden h-px flex-1 border-b border-dotted border-sand-300 sm:block dark:border-sand-700"
                      />
                      <span className="ml-auto shrink-0 tabular-nums text-sand-600 dark:text-sand-400 sm:ml-0">
                        {formatDate(store.createdAt, lang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A headline figure. Deliberately local to this page: the shared tile is a
 * dashboard shape, and here the number wants the display face and the accent
 * mark that the rest of the editorial layout uses.
 */
function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="panel flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-clay-50 text-clay-700 dark:bg-clay-500/10 dark:text-clay-300">
          {icon}
        </span>
        <p className="text-xs font-bold uppercase leading-tight tracking-[0.12em] text-sand-600 dark:text-sand-400">
          {label}
        </p>
      </div>
      <p className="font-display text-display-sm font-semibold tabular-nums text-sand-900 dark:text-sand-50">
        {value}
      </p>
      {hint && (
        <p className="mt-auto truncate text-xs text-sand-600 dark:text-sand-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Holds the page's shape while the figures load. */
function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-7 space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-panel" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-panel" />
        ))}
      </div>
    </div>
  );
}
