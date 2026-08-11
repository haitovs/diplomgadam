import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Store, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { publicApi, type StoreQuery } from "../api/public";
import StoreCard from "../components/StoreCard";
import {
  Button,
  CheckboxPill,
  EmptyState,
  Select,
  Spinner,
  inputClass,
} from "../components/ui";
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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {t("home_title")}
        </h1>
        <p className="max-w-2xl text-sm sm:text-base text-slate-500 dark:text-slate-400">
          {t("home_subtitle")}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filter_search_placeholder")}
            className={`${inputClass} pl-10`}
          />
        </div>

        <Button
          variant="secondary"
          icon={<SlidersHorizontal className="w-4 h-4" />}
          onClick={() => setShowFilters((v) => !v)}
        >
          {t("filter_active")}
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-[11px] text-white">
              {activeCount}
            </span>
          )}
        </Button>

        <Select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as StoreQuery["sort"] })}
          className="sm:w-44"
          aria-label={t("sort_by")}
        >
          <option value="name">{t("sort_name")}</option>
          <option value="newest">{t("sort_newest")}</option>
          <option value="popular">{t("sort_popular")}</option>
        </Select>
      </div>

      {showFilters && (
        <div className="glass-panel space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("filter_neighborhood")}
              </span>
              <Select
                value={filters.neighborhood ?? ""}
                onChange={(e) =>
                  update({ neighborhood: e.target.value || undefined })
                }
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
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
              icon={<X className="w-3.5 h-3.5" />}
              onClick={clearAll}
            >
              {t("filter_clear_all")}
            </Button>
          )}
        </div>
      )}

      {stores.isLoading ? (
        <Spinner />
      ) : isEmptyPlatform ? (
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title={t("home_empty_platform")}
          description={t("home_empty_platform_hint")}
          action={
            <Link to="/store/register">
              <Button>{t("store_signup_title")}</Button>
            </Link>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          title={t("home_no_results")}
          description={t("home_no_results_hint")}
          action={
            activeCount > 0 ? (
              <Button variant="secondary" onClick={clearAll}>
                {t("filter_clear_all")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} {t("home_results")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.data?.stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
