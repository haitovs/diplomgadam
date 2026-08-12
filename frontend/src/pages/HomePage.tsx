import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Store, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { publicApi, type StoreQuery } from "../api/public";
import DiscoveryRails from "../components/DiscoveryRails";
import StoreCard, { StoreCardSkeleton } from "../components/StoreCard";
import { Button, CheckboxPill, EmptyState, LoadFailed, Select } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"];

export default function HomePage() {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Omit<StoreQuery, "lang" | "search">>({
    sort: "name",
    page: 1,
    perPage: 24,
    amenities: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  const query: StoreQuery = { lang, search: search || undefined, ...filters };

  const stores = useQuery({
    queryKey: ["public-stores", query],
    queryFn: () => publicApi.listStores(query),
  });

  const categories = useQuery({
    queryKey: ["public-categories", lang],
    queryFn: () => publicApi.categories(lang),
  });

  const options = useQuery({
    queryKey: ["public-filters"],
    queryFn: () => publicApi.filters(),
  });

  const update = (patch: Partial<typeof filters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.neighborhood ? 1 : 0) +
    (filters.priceTier ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.amenities?.length ?? 0);

  const clearAll = () =>
    setFilters({ sort: filters.sort, page: 1, perPage: 24, amenities: [] });

  const total = stores.data?.total ?? 0;
  const isEmptyPlatform =
    stores.isSuccess && total === 0 && activeCount === 0 && !search;

  /** Cuisines shown as quick chips above the grid, most populated first. */
  const featuredCategories = (categories.data ?? [])
    .filter((c) => (c.storeCount ?? 0) > 0)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Hero. Editorial rather than a banner: a display heading, one line of
          supporting copy, and the search set into a raised card. */}
      <section className="relative overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-gradient-to-br from-clay-50 via-sand-100 to-sand-200 px-6 py-10 sm:px-10 sm:py-14 dark:from-sand-900 dark:via-sand-900 dark:to-sand-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-clay-200/40 blur-3xl dark:bg-clay-900/20"
        />
        <div className="relative max-w-2xl">
          <h1 className="font-display text-display-md font-semibold leading-[1.05] text-sand-900 sm:text-display-lg dark:text-sand-50">
            {t("home_title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-sand-700 sm:text-lg dark:text-sand-300">
            {t("home_subtitle")}
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filter_search_placeholder")}
                aria-label={t("action_search")}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] py-3.5 pl-11 pr-4 text-sm text-sand-900 shadow-soft outline-none transition-shadow placeholder:text-sand-500 focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 dark:text-sand-100"
              />
            </div>
            <Button
              size="lg"
              variant="secondary"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              {t("filter_active")}
              {activeCount > 0 && (
                <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-clay-600 px-1.5 text-[11px] text-white">
                  {activeCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Suggestions come first, but only until the visitor narrows things
          down; after that their own criteria are the better guide. */}
      {!search && activeCount === 0 && (stores.data?.stores.length ?? 0) > 0 && (
        <DiscoveryRails stores={stores.data!.stores} />
      )}

      {/* Cuisine shortcuts. Faster than opening the filter panel for the most
          common way people narrow a search. */}
      {featuredCategories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <CheckboxPill
            checked={!filters.category}
            onChange={() => update({ category: undefined })}
          >
            {t("filter_all")}
          </CheckboxPill>
          {featuredCategories.map((category) => (
            <CheckboxPill
              key={category.slug}
              checked={filters.category === category.slug}
              onChange={(on) => update({ category: on ? category.slug : undefined })}
            >
              <span className="whitespace-nowrap">
                {category.icon} {category.name}
              </span>
            </CheckboxPill>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="panel space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-sand-800 dark:text-sand-200">
                {t("filter_category")}
              </span>
              <Select
                value={filters.category ?? ""}
                onChange={(e) => update({ category: e.target.value || undefined })}
              >
                <option value="">{t("filter_all")}</option>
                {categories.data?.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.icon} {category.name} ({category.storeCount ?? 0})
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-sand-800 dark:text-sand-200">
                {t("filter_neighborhood")}
              </span>
              <Select
                value={filters.neighborhood ?? ""}
                onChange={(e) => update({ neighborhood: e.target.value || undefined })}
              >
                <option value="">{t("filter_all")}</option>
                {options.data?.neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-sand-800 dark:text-sand-200">
                {t("filter_price")}
              </span>
              <Select
                value={filters.priceTier ?? ""}
                onChange={(e) => update({ priceTier: e.target.value || undefined })}
              >
                <option value="">{t("filter_all")}</option>
                {PRICE_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="space-y-2.5">
            <span className="text-sm font-semibold text-sand-800 dark:text-sand-200">
              {t("filter_amenities")}
            </span>
            <div className="flex flex-wrap gap-2">
              <CheckboxPill
                checked={Boolean(filters.openNow)}
                onChange={(next) => update({ openNow: next || undefined })}
              >
                {t("filter_open_now")}
              </CheckboxPill>
              {options.data?.amenities.map((amenity) => (
                <CheckboxPill
                  key={amenity}
                  checked={filters.amenities?.includes(amenity) ?? false}
                  onChange={(next) =>
                    update({
                      amenities: next
                        ? [...(filters.amenities ?? []), amenity]
                        : (filters.amenities ?? []).filter((a) => a !== amenity),
                    })
                  }
                >
                  {t(`amenity_${amenity}` as TranslationKey)}
                </CheckboxPill>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={clearAll}
            >
              {t("filter_clear_all")}
            </Button>
          )}
        </div>
      )}

      {/* Result count and sort sit on one line above the grid. */}
      {!stores.isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <p className="text-sm text-sand-600 dark:text-sand-400">
            <span className="font-semibold text-sand-900 tabular-nums dark:text-sand-100">
              {total}
            </span>{" "}
            {t("home_results")}
          </p>
          <label className="flex items-center gap-2 text-sm text-sand-600 dark:text-sand-400">
            {t("sort_by")}
            <Select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as StoreQuery["sort"] })}
              className="w-auto py-1.5 text-xs"
            >
              <option value="name">{t("sort_name")}</option>
              <option value="newest">{t("sort_newest")}</option>
              <option value="popular">{t("sort_popular")}</option>
            </Select>
          </label>
        </div>
      )}

      {stores.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : stores.isError ? (
        // Before the count checks below, because a failed request also reports
        // a total of zero and would otherwise be shown as an empty platform.
        <LoadFailed
          title={t("error_network")}
          description={t("home_load_failed_hint")}
          onRetry={() => stores.refetch()}
          retryLabel={t("action_retry")}
        />
      ) : isEmptyPlatform ? (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title={t("home_empty_platform")}
          description={t("home_empty_platform_hint")}
          action={
            <Link to="/store/register">
              <Button size="lg">{t("store_signup_title")}</Button>
            </Link>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("home_no_results")}
          description={t("home_no_results_hint")}
          action={
            activeCount > 0 || search ? (
              <Button
                variant="secondary"
                onClick={() => {
                  clearAll();
                  setSearch("");
                }}
              >
                {t("filter_clear_all")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stores.data?.stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
