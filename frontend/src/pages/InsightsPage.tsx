import { useQuery } from "@tanstack/react-query";
import { Compass, MapPin, Navigation, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import StoreRail, { type RailEntry } from "../components/StoreRail";
import { Button, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { greetingKey, useNearby } from "../lib/useNearby";
import type { PublicStoreSummary } from "../types/api";

/**
 * A curated discovery page, not a statistics dashboard.
 *
 * There is deliberately no "popular" or "trending" rail. Ranking by view count
 * on a platform this young would dress up single-digit noise as a
 * recommendation, which is the same reason the product has no star ratings.
 *
 * The earlier version answered "how many restaurants are there per cuisine",
 * which is a question the operator has and a diner does not. Every established
 * discovery site instead puts photographs, distance and whether a place is
 * open in front of you, arranged as a handful of editorial rails. That is what
 * this is: each rail is one suggestion — open now, near you, new — and the
 * numbers appear only where they help someone choose.
 */
export default function InsightsPage() {
  const { t, lang } = useLanguage();

  const stores = useQuery({
    queryKey: ["foryou-stores", lang],
    queryFn: () => publicApi.listStores({ lang, perPage: 60, sort: "name" }),
  });

  const categories = useQuery({
    queryKey: ["public-categories", lang],
    queryFn: () => publicApi.categories(lang),
  });

  const { state, coords, request, nearby } = useNearby(stores.data?.stores);

  if (stores.isLoading) return <Spinner />;

  const all = stores.data?.stores ?? [];

  if (all.length === 0) {
    return (
      <>
        <h1 className="mb-6 font-display text-display-md font-semibold text-sand-900 dark:text-sand-50">
          {t("insights_near_title")}
        </h1>
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={t("home_empty_platform")}
          description={t("home_empty_platform_hint")}
        />
      </>
    );
  }

  const located = state === "granted" && coords !== null;
  const distanceOf = new Map(
    nearby.map((entry) => [entry.store.id, entry.metres]),
  );

  const entry = (store: PublicStoreSummary): RailEntry => ({
    store,
    metres: located ? distanceOf.get(store.id) ?? null : null,
  });

  const openNow = all.filter((s) => s.openNow && !s.temporarilyClosed);

  // With a location, "open now" is worth reordering by how far away it is —
  // the nearest open place is the one you can actually act on.
  const openRail = located
    ? nearby
        .filter((n) => n.store.openNow && !n.store.temporarilyClosed)
        .map((n) => ({ store: n.store, metres: n.metres }))
    : // Without a location there is no distance to rank by, so lead with the
      // places that offer the most to look at: a filled-in listing with a
      // photographed menu is the best available proxy for somewhere worth going.
      [...openNow]
        .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)))
        .map(entry);

  /**
   * Deliberately not a "near you" rail. With a location the open rail is
   * already ordered by distance, so a second nearest-first rail repeated the
   * same restaurants in the same order. This one contrasts with it instead:
   * places worth a journey — the most visited that are not already within a
   * short walk.
   */
  const WORTH_THE_TRIP_M = 1200;
  const worthTheTrip = located
    ? nearby
        .filter((n) => n.metres !== null && n.metres > WORTH_THE_TRIP_M)
        .map((n) => ({ store: n.store, metres: n.metres }))
        .sort((a, b) => b.store.views - a.store.views)
        .slice(0, 12)
    : [];

  const newest = [...all]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 12)
    .map(entry);

  // Two cuisine rails, chosen by how much choice each actually offers, so the
  // page reflects the city rather than a fixed editorial guess.
  const cuisineRails = (categories.data ?? [])
    .filter((c) => (c.storeCount ?? 0) >= 3)
    .slice(0, 2)
    .map((category) => ({
      category,
      entries: all
        .filter((s) => s.categories.some((c) => c.slug === category.slug))
        .map(entry),
    }))
    .filter((rail) => rail.entries.length > 0);

  const neighbourhood = located ? nearby[0]?.store.neighborhood : null;

  return (
    <div className="space-y-12">
      {/* ── A compact banner, not a hero: the rails are the page ────────── */}
      <section className="relative overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-gradient-to-br from-clay-50 via-sand-100 to-sand-200 px-6 py-8 sm:px-9 sm:py-10 dark:from-sand-900 dark:via-sand-900 dark:to-sand-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-clay-200/50 blur-3xl dark:bg-clay-900/20"
        />

        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-clay-700 dark:text-clay-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t(`insights_greeting_${greetingKey()}` as TranslationKey)}
          </p>

          <h1 className="mt-3 max-w-2xl font-display text-display-md font-semibold leading-[1.05] text-sand-900 sm:text-display-lg dark:text-sand-50">
            {t("insights_near_title")}
          </h1>

          {/* One honest line of state, in the manner of a location bar: where
              we think you are, how much is open, and a way to correct it. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 font-medium text-sand-800 dark:text-sand-200">
              <MapPin className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
              {located && neighbourhood
                ? `${t("foryou_you_are_in")} ${neighbourhood}`
                : "Aşgabat"}
            </span>

            <span className="text-sand-700 dark:text-sand-300">
              <span className="font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                {openRail.length}
              </span>{" "}
              {t("rail_open_now").toLocaleLowerCase(lang)} ·{" "}
              <span className="font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                {all.length}
              </span>{" "}
              {t("foryou_places")}
            </span>

            {state === "idle" && (
              <Button
                size="sm"
                icon={<Navigation className="h-3.5 w-3.5" />}
                onClick={request}
              >
                {t("insights_enable_location")}
              </Button>
            )}
            {state === "locating" && (
              <span className="inline-flex items-center gap-1.5 text-sand-600 dark:text-sand-400">
                <Navigation className="h-3.5 w-3.5 animate-pulse" />
                {t("insights_locating")}
              </span>
            )}
            {state === "granted" && (
              <button
                type="button"
                onClick={request}
                className="text-sand-600 underline-offset-2 hover:underline dark:text-sand-400"
              >
                {t("foryou_not_right")}
              </button>
            )}
            {state === "denied" && (
              <span className="text-sand-600 dark:text-sand-400">
                {t("insights_location_denied")}
              </span>
            )}
          </div>
        </div>
      </section>

      {openRail.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={t("foryou_nothing_open")}
          description={t("foryou_nothing_open_hint")}
          action={
            <Link to="/">
              <Button variant="secondary">{t("nav_discover")}</Button>
            </Link>
          }
        />
      ) : (
        <StoreRail
          title={t("rail_open_now")}
          subtitle={located ? t("insights_near_subtitle") : undefined}
          entries={openRail.slice(0, 12)}
          seeAllTo="/?openNow=true"
        />
      )}

      {worthTheTrip.length > 0 && (
        <StoreRail
          title={t("rail_worth_trip")}
          entries={worthTheTrip}
          seeAllTo="/map"
        />
      )}

      {cuisineRails.map(({ category, entries }) => (
        <StoreRail
          key={category.slug}
          title={`${category.icon ?? ""} ${category.name}`.trim()}
          entries={entries.slice(0, 12)}
          seeAllTo={`/?category=${category.slug}`}
        />
      ))}

      {newest.length > 0 && (
        <StoreRail title={t("rail_new")} entries={newest} seeAllTo="/" />
      )}

      {/* Cuisines as a quiet closing strip: navigation, not analysis. */}
      {(categories.data ?? []).some((c) => (c.storeCount ?? 0) > 0) && (
        <section className="space-y-4 border-t border-[var(--border-subtle)] pt-8">
          <h2 className="font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
            {t("rail_all_cuisine")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(categories.data ?? [])
              .filter((c) => (c.storeCount ?? 0) > 0)
              .map((category) => (
                <Link
                  key={category.slug}
                  to={`/?category=${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3.5 py-2 text-sm font-medium text-sand-800 transition-all duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-clay-300 hover:text-clay-700 dark:text-sand-200 dark:hover:text-clay-300"
                >
                  <span aria-hidden>{category.icon}</span>
                  {category.name}
                  <span className="tabular-nums text-sand-500">
                    {category.storeCount}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
