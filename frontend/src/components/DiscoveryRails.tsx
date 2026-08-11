import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation } from "lucide-react";
import { publicApi } from "../api/public";
import { useLanguage } from "../i18n/LanguageContext";
import { useNearby } from "../lib/useNearby";
import type { PublicStoreSummary } from "../types/api";
import StoreRail, { type RailEntry } from "./StoreRail";
import { Button } from "./ui";

/**
 * The curated half of the discover page: a location line and a couple of
 * suggestion rails, shown above the searchable grid.
 *
 * These lived on a separate "For you" page, which showed the same restaurants
 * as this one in a different arrangement. One page that opens with suggestions
 * and continues into a full, filterable list is what discovery sites do, and
 * it removes a choice the visitor had no reason to make.
 *
 * Rendered only on the unfiltered view: once somebody has typed a search or
 * chosen a cuisine they have told us what they want, and suggestions above
 * their results become noise.
 */
export default function DiscoveryRails({
  stores,
}: {
  stores: PublicStoreSummary[];
}) {
  const { t, lang } = useLanguage();
  const { state, coords, request, nearby } = useNearby(stores);

  const categories = useQuery({
    queryKey: ["public-categories", lang],
    queryFn: () => publicApi.categories(lang),
  });

  const located = state === "granted" && coords !== null;
  const distanceOf = new Map(nearby.map((n) => [n.store.id, n.metres]));

  const entry = (store: PublicStoreSummary): RailEntry => ({
    store,
    metres: located ? (distanceOf.get(store.id) ?? null) : null,
  });

  const openNow = stores.filter((s) => s.openNow && !s.temporarilyClosed);

  const openRail = located
    ? nearby
        .filter((n) => n.store.openNow && !n.store.temporarilyClosed)
        .map((n) => ({ store: n.store, metres: n.metres }))
    : // Without a distance to rank by, lead with the listings that have most
      // to look at; a photographed listing is the best available proxy.
      [...openNow]
        .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)))
        .map(entry);

  /** The contrast to the rail above: places beyond an easy walk. */
  const worthTheTrip = located
    ? nearby
        .filter((n) => n.metres !== null && n.metres > 1200)
        .map((n) => ({ store: n.store, metres: n.metres }))
        .slice(0, 12)
    : [];

  const topCuisine = (categories.data ?? [])
    .filter((c) => (c.storeCount ?? 0) >= 4)
    .slice(0, 1)
    .map((category) => ({
      category,
      entries: stores
        .filter((s) => s.categories.some((c) => c.slug === category.slug))
        .map(entry),
    }))[0];

  const neighbourhood = located ? nearby[0]?.store.neighborhood : null;

  return (
    <div className="space-y-10">
      {/* Where we think you are, and how much is open from there. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 font-medium text-sand-800 dark:text-sand-200">
          <MapPin className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
          {located && neighbourhood
            ? `${t("nearby_you_are_in")} ${neighbourhood}`
            : "Aşgabat"}
        </span>

        <span className="text-sand-700 dark:text-sand-300">
          <span className="font-semibold tabular-nums text-sand-900 dark:text-sand-100">
            {openRail.length}
          </span>{" "}
          {t("rail_open_now").toLocaleLowerCase(lang)}
        </span>

        {state === "idle" && (
          <Button
            size="sm"
            icon={<Navigation className="h-3.5 w-3.5" />}
            onClick={request}
          >
            {t("nearby_enable")}
          </Button>
        )}
        {state === "locating" && (
          <span className="inline-flex items-center gap-1.5 text-sand-600 dark:text-sand-400">
            <Navigation className="h-3.5 w-3.5 animate-pulse" />
            {t("nearby_locating")}
          </span>
        )}
        {state === "granted" && (
          <button
            type="button"
            onClick={request}
            className="text-sand-600 underline-offset-2 hover:underline dark:text-sand-400"
          >
            {t("nearby_not_right")}
          </button>
        )}
      </div>

      <StoreRail
        title={t("rail_open_now")}
        subtitle={located ? t("nearby_subtitle") : undefined}
        entries={openRail.slice(0, 12)}
      />

      <StoreRail title={t("rail_worth_trip")} entries={worthTheTrip} />

      {topCuisine && (
        <StoreRail
          title={`${topCuisine.category.icon ?? ""} ${topCuisine.category.name}`.trim()}
          entries={topCuisine.entries.slice(0, 12)}
          seeAllTo={`/?category=${topCuisine.category.slug}`}
        />
      )}
    </div>
  );
}
