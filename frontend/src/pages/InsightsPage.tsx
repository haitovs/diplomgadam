import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  Compass,
  MapPin,
  Navigation,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import { Badge, Button, Card, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { formatPrice } from "../lib/format";
import {
  formatDistance,
  greetingKey,
  useNearby,
  walkingMinutes,
} from "../lib/useNearby";

/**
 * A page about the visitor's situation rather than the platform's totals.
 *
 * It answers "where should I eat, right now, from where I am" first and only
 * then widens out to the city. Everything works without location permission;
 * granting it reorders and annotates rather than unlocking the page.
 */
export default function InsightsPage() {
  const { t, lang } = useLanguage();

  const insights = useQuery({
    queryKey: ["insights", lang],
    queryFn: () => publicApi.insights(lang),
  });

  // The whole city fits in one page of results, and the nearby ordering needs
  // every coordinate rather than a slice of them.
  const stores = useQuery({
    queryKey: ["insights-stores", lang],
    queryFn: () => publicApi.listStores({ lang, perPage: 60, sort: "name" }),
  });

  const { state, coords, request, nearby } = useNearby(stores.data?.stores);

  if (insights.isLoading || stores.isLoading) return <Spinner />;
  if (!insights.data) return <EmptyState title={t("error_generic")} />;

  const data = insights.data;
  const allStores = stores.data?.stores ?? [];

  if (data.totals.stores === 0) {
    return (
      <>
        <h1 className="mb-6 font-display text-display-md font-semibold text-sand-900 dark:text-sand-50">
          {t("insights_near_title")}
        </h1>
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={t("insights_empty")}
          description={t("home_empty_platform_hint")}
        />
      </>
    );
  }

  const openStores = allStores.filter((s) => s.openNow);
  const located = state === "granted" && coords !== null;

  // Twenty minutes on foot is an honest definition of "nearby" in a city.
  const NEARBY_RADIUS_M = 1600;
  const nearbyOpen = located
    ? nearby.filter(
        (n) => n.metres !== null && n.metres <= NEARBY_RADIUS_M && n.store.openNow,
      )
    : [];

  const closest = located ? nearby.filter((n) => n.store.openNow).slice(0, 5) : [];
  const feature = closest[0];

  const distanceLabels = { m: t("insights_m"), km: t("insights_km") };
  const maxCuisine = Math.max(1, ...data.byCategory.map((c) => c.count));
  const priceTotal = data.byPriceTier.reduce((sum, p) => sum + p.count, 0);
  const neighbourhoodPeak = data.byNeighborhood[0]?.count || 1;

  /** Ordinal ramp: light for cheap, dark for expensive. */
  const PRICE_FILL = ["bg-clay-200", "bg-clay-300", "bg-clay-500", "bg-clay-700"];

  return (
    <div className="space-y-10">
      {/* ── Hero: the answer to "right now, from here" ──────────────────── */}
      <section className="relative overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-gradient-to-br from-clay-50 via-sand-100 to-sand-200 dark:from-sand-900 dark:via-sand-900 dark:to-sand-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-clay-200/50 blur-3xl dark:bg-clay-900/20"
        />

        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr,1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay-700 dark:text-clay-400">
              {t(`insights_greeting_${greetingKey()}` as TranslationKey)}
            </p>
            <h1 className="mt-3 font-display text-display-md font-semibold leading-[1.05] text-sand-900 sm:text-display-lg dark:text-sand-50">
              {t("insights_near_title")}
            </h1>
            <p className="mt-3 max-w-md text-sand-700 dark:text-sand-300">
              {t("insights_near_subtitle")}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-8">
              <div>
                <p className="font-display text-display-lg font-semibold leading-none text-clay-700 tabular-nums dark:text-clay-300">
                  {located ? nearbyOpen.length : openStores.length}
                </p>
                <p className="mt-2 text-sm font-medium text-sand-700 dark:text-sand-300">
                  {located ? t("insights_open_near") : t("insights_open_city")}
                </p>
              </div>
              <div>
                <p className="font-display text-display-sm font-semibold leading-none text-sand-900 tabular-nums dark:text-sand-100">
                  {data.totals.stores}
                </p>
                <p className="mt-2 text-sm text-sand-600 dark:text-sand-400">
                  {t("insights_total_stores")}
                </p>
              </div>
            </div>

            {/* Location is offered, never demanded. */}
            <div className="mt-7">
              {state === "idle" && (
                <>
                  <Button icon={<Navigation className="h-4 w-4" />} onClick={request}>
                    {t("insights_enable_location")}
                  </Button>
                  <p className="mt-2 text-xs text-sand-600 dark:text-sand-500">
                    {t("insights_location_hint")}
                  </p>
                </>
              )}
              {state === "locating" && (
                <p className="flex items-center gap-2 text-sm text-sand-600 dark:text-sand-400">
                  <Navigation className="h-4 w-4 animate-pulse" />
                  {t("insights_locating")}
                </p>
              )}
              {state === "denied" && (
                <p className="text-sm text-sand-600 dark:text-sand-400">
                  {t("insights_location_denied")}
                </p>
              )}
            </div>
          </div>

          {/* The single most useful answer: the nearest place that is open. */}
          {feature && feature.metres !== null && (
            <Link
              to={`/restaurants/${feature.store.slug}`}
              className="group relative flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-panel border border-[var(--border-subtle)] shadow-lifted transition-transform duration-300 ease-out-soft hover:-translate-y-1"
            >
              <div className="photo-frame absolute inset-0">
                {feature.store.cover ? (
                  <picture>
                    <source srcSet={feature.store.cover.url} type="image/webp" />
                    <img
                      src={feature.store.cover.urlJpeg}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-105"
                    />
                  </picture>
                ) : (
                  <div className="grid h-full w-full place-items-center bg-sand-200 dark:bg-sand-800">
                    <UtensilsCrossed className="h-8 w-8 text-sand-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              </div>

              <div className="relative space-y-2 p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Navigation className="h-3 w-3" />
                  {t("insights_nearest")}
                </span>
                <h2 className="font-display text-2xl font-semibold text-white">
                  {feature.store.name}
                </h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
                  <span className="font-semibold tabular-nums">
                    {formatDistance(feature.metres, distanceLabels)}
                  </span>
                  <span>
                    {walkingMinutes(feature.metres)} {t("insights_min")}{" "}
                    {t("insights_walk")}
                  </span>
                  <span className="opacity-70">{feature.store.priceTier}</span>
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ── Closest to you ──────────────────────────────────────────────── */}
      {located && closest.length > 1 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="rule-accent font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
              {t("insights_nearest")}
            </h2>
            <Link
              to="/map"
              className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 hover:underline dark:text-clay-300"
            >
              {t("insights_view_all")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ol className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
            {closest.slice(1).map((entry, index) => (
              <li key={entry.store.id}>
                <Link
                  to={`/restaurants/${entry.store.slug}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-sand-100 dark:hover:bg-sand-800/60"
                >
                  <span className="w-5 shrink-0 text-center font-display text-lg font-semibold text-sand-400 tabular-nums">
                    {index + 2}
                  </span>
                  {entry.store.cover ? (
                    <img
                      src={entry.store.cover.thumbUrlJpeg}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-card object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-card bg-sand-200 dark:bg-sand-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sand-900 dark:text-sand-100">
                      {entry.store.name}
                    </p>
                    <p className="truncate text-xs text-sand-600 dark:text-sand-500">
                      {entry.store.neighborhood ?? entry.store.address}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                      {entry.metres !== null &&
                        formatDistance(entry.metres, distanceLabels)}
                    </p>
                    <p className="text-xs text-sand-600 dark:text-sand-500">
                      {entry.metres !== null && walkingMinutes(entry.metres)}{" "}
                      {t("insights_min")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Cuisines, as tiles weighted by how much choice there is ─────── */}
      <section>
        <h2 className="rule-accent mb-5 font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
          {t("insights_explore_cuisine")}
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.byCategory
            .filter((c) => c.count > 0)
            .map((category, index) => {
              // One hue in four steps by share, so weight reads from the tint
              // and is confirmed by the number printed on it.
              const share = category.count / maxCuisine;
              const tint =
                share > 0.75
                  ? "bg-clay-200 dark:bg-clay-900/50"
                  : share > 0.5
                    ? "bg-clay-100 dark:bg-clay-900/35"
                    : share > 0.25
                      ? "bg-clay-50 dark:bg-clay-900/25"
                      : "bg-sand-100 dark:bg-sand-800/60";

              return (
                <Link
                  key={category.slug}
                  to={`/?category=${category.slug}`}
                  className={`group flex flex-col justify-between rounded-panel border border-[var(--border-subtle)] p-4 transition-all duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lifted ${tint} ${
                    index === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {category.icon}
                  </span>
                  <div className="mt-8">
                    <p className="font-display text-3xl font-semibold leading-none text-sand-900 tabular-nums dark:text-sand-50">
                      {category.count}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-sand-700 dark:text-sand-300">
                      {category.name}
                    </p>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* ── City view: price spread and neighbourhoods ──────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
            {t("insights_price_spread")}
          </h2>

          {priceTotal > 0 && (
            <>
              {/* Parts of a whole, so one bar rather than four. */}
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {data.byPriceTier.map((tier, index) => (
                  <div
                    key={tier.priceTier}
                    className={`${PRICE_FILL[index] ?? "bg-clay-700"} transition-all duration-700 ease-out-soft`}
                    style={{ width: `${(tier.count / priceTotal) * 100}%` }}
                  />
                ))}
              </div>

              {/* Labelled beneath the bar, so no text ever sits on a tint. */}
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.byPriceTier.map((tier, index) => (
                  <li key={tier.priceTier} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRICE_FILL[index] ?? "bg-clay-700"}`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-sand-900 dark:text-sand-100">
                      {tier.priceTier}
                    </span>
                    <span className="ml-auto text-sm tabular-nums text-sand-600 dark:text-sand-400">
                      {tier.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.menuPrices.avgMinor > 0 && (
            <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm text-sand-600 dark:text-sand-400">
              {t("insights_avg_price")}:{" "}
              <span className="font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                {formatPrice(data.menuPrices.avgMinor, lang)} TMT
              </span>
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-5 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
            {t("insights_by_neighborhood")}
          </h2>
          <ul className="space-y-2.5">
            {data.byNeighborhood.slice(0, 7).map((row) => (
              <li key={row.neighborhood}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-sand-700 dark:text-sand-300">
                    {row.neighborhood}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                    {row.count}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800">
                  <div
                    className="h-full rounded-full bg-clay-600 transition-[width] duration-700 ease-out-soft dark:bg-clay-400"
                    style={{
                      width: `${Math.max((row.count / neighbourhoodPeak) * 100, 4)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* ── Discovery tails ─────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {data.mostViewed.length > 0 && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
              <Compass className="h-4 w-4 text-clay-600 dark:text-clay-400" />
              {t("insights_most_viewed")}
            </h2>
            <ol className="divide-y divide-[var(--border-subtle)]">
              {data.mostViewed.slice(0, 5).map((store, index) => (
                <li key={store.slug}>
                  <Link
                    to={`/restaurants/${store.slug}`}
                    className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-clay-700 dark:hover:text-clay-300"
                  >
                    <span className="w-4 shrink-0 font-display font-semibold tabular-nums text-sand-400">
                      {index + 1}
                    </span>
                    <span className="truncate font-medium text-sand-900 dark:text-sand-100">
                      {store.name}
                    </span>
                    <span className="ml-auto shrink-0 tabular-nums text-sand-500">
                      {store.views}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
            <Clock className="h-4 w-4 text-clay-600 dark:text-clay-400" />
            {t("insights_newest")}
          </h2>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {data.newest.slice(0, 5).map((store) => (
              <li key={store.slug}>
                <Link
                  to={`/restaurants/${store.slug}`}
                  className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-clay-700 dark:hover:text-clay-300"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-sand-400" />
                  <span className="truncate font-medium text-sand-900 dark:text-sand-100">
                    {store.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Badge tone="accent">
              {data.totals.menuItems} {t("insights_menu_items")}
            </Badge>
            {data.totals.withDelivery > 0 && (
              <Badge>
                {data.totals.withDelivery} {t("insights_with_delivery")}
              </Badge>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
