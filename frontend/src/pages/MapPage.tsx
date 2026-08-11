import { useQuery } from "@tanstack/react-query";
import { MapPin, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import MapView, { ASHGABAT_CENTER, type MapMarker } from "../components/MapView";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { PublicStoreSummary } from "../types/api";

export default function MapPage() {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["map-stores", lang],
    queryFn: () => publicApi.listStores({ lang, perPage: 60, sort: "name" }),
  });

  const located = useMemo(
    () => (data?.stores ?? []).filter((store) => store.coordinates !== null),
    [data],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      located.map((store) => ({
        id: store.id,
        lng: store.coordinates!.lng,
        lat: store.coordinates!.lat,
        label: store.name,
        active: selected === store.id,
        onClick: () => setSelected(store.id),
      })),
    [located, selected],
  );

  const selectedStore = located.find((store) => store.id === selected);

  return (
    <div>
      <PageHeader
        title={t("map_title")}
        description={t("map_subtitle")}
        action={
          located.length > 0 ? (
            <Badge tone="accent" className="tabular-nums">
              {located.length} {t("home_results")}
            </Badge>
          ) : undefined
        }
      />

      {isLoading ? (
        <MapPageSkeleton />
      ) : isError ? (
        <ErrorNote message={t("error_network")} />
      ) : located.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7" />}
          title={t("home_no_results")}
          description={t("home_empty_platform_hint")}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          {/* The map leads: it gets the full column and the tallest frame the
              viewport allows, with the list acting as an index beside it. */}
          <div className="overflow-hidden rounded-panel border border-[var(--border-subtle)] shadow-soft">
            <MapView
              className="h-[52vh] min-h-[340px] sm:h-[58vh] lg:h-[calc(100vh-13rem)] lg:min-h-[520px]"
              markers={markers}
              fitToMarkers
              center={ASHGABAT_CENTER}
            />
          </div>

          <div className="space-y-4 lg:sticky lg:top-24">
            {selectedStore ? (
              <SelectedStorePreview store={selectedStore} />
            ) : (
              <div className="rounded-panel border border-dashed border-sand-300 px-5 py-7 text-center dark:border-sand-700">
                <MapPin
                  className="mx-auto mb-3 h-5 w-5 text-clay-600 dark:text-clay-400"
                  aria-hidden="true"
                />
                <p className="mx-auto max-w-[16rem] text-sm text-sand-600 dark:text-sand-400">
                  {t("map_subtitle")}
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-soft">
              <p className="border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-sand-600 dark:text-sand-400">
                {t("nav_discover")}
              </p>
              <ul className="max-h-[38vh] divide-y divide-[var(--border-subtle)] overflow-y-auto lg:max-h-[42vh]">
                {located.map((store) => {
                  const active = selected === store.id;
                  return (
                    <li key={store.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(store.id)}
                        aria-pressed={active}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out-soft ${
                          active
                            ? "bg-clay-50 dark:bg-clay-500/10"
                            : "hover:bg-sand-100 dark:hover:bg-sand-800/60"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-9 w-0.5 shrink-0 rounded-full transition-colors duration-200 ${
                            active ? "bg-clay-600 dark:bg-clay-400" : "bg-transparent"
                          }`}
                        />
                        <Thumb store={store} className="h-11 w-11 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm font-semibold ${
                              active
                                ? "text-clay-700 dark:text-clay-300"
                                : "text-sand-900 dark:text-sand-100"
                            }`}
                          >
                            {store.name}
                          </span>
                          <span className="block truncate text-xs text-sand-600 dark:text-sand-500">
                            {store.neighborhood ?? store.address}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-xs font-semibold tabular-nums ${
                            active
                              ? "text-clay-700 dark:text-clay-300"
                              : "text-sand-500 dark:text-sand-600"
                          }`}
                        >
                          {store.priceTier}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The pin's counterpart: a proper preview, not a name and an address. */
function SelectedStorePreview({ store }: { store: PublicStoreSummary }) {
  const { t } = useLanguage();

  return (
    <article className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-lifted">
      <div className="photo-frame aspect-[16/10] w-full">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt={store.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </picture>
        ) : (
          <div className="grid h-full w-full place-items-center text-sand-400 dark:text-sand-700">
            <Utensils className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          {store.temporarilyClosed ? (
            <Badge tone="danger">{t("temporarily_closed")}</Badge>
          ) : store.openingSoon ? (
            <Badge tone="info">{t("opening_soon")}</Badge>
          ) : (
            <Badge tone={store.openNow ? "success" : "neutral"}>
              {store.openNow ? t("open_now") : t("closed_now")}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold leading-tight text-sand-900 dark:text-sand-50">
            <Link
              to={`/restaurants/${store.slug}`}
              className="transition-colors duration-200 hover:text-clay-600 dark:hover:text-clay-400"
            >
              {store.name}
            </Link>
          </h2>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-sand-600 dark:text-sand-400">
            {store.priceTier}
          </span>
        </div>

        <p className="flex items-start gap-1.5 text-sm text-sand-600 dark:text-sand-400">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="clamp-2">{store.address}</span>
        </p>

        {store.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {store.categories.slice(0, 3).map((category) => (
              <span
                key={category.slug}
                className="surface-sunken rounded-full px-2.5 py-0.5 text-xs font-medium text-sand-700 dark:text-sand-300"
              >
                {category.icon} {category.name}
              </span>
            ))}
          </div>
        )}

        <Link to={`/restaurants/${store.slug}`} className="block">
          <Button variant="secondary" size="sm" className="w-full">
            {t("action_view")}
          </Button>
        </Link>
      </div>
    </article>
  );
}

function Thumb({
  store,
  className = "",
}: {
  store: PublicStoreSummary;
  className?: string;
}) {
  if (!store.cover) {
    return (
      <span
        className={`photo-frame grid shrink-0 place-items-center text-sand-400 dark:text-sand-700 ${className}`}
      >
        <Utensils className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={`photo-frame block shrink-0 ${className}`}>
      <img
        src={store.cover.thumbUrlJpeg}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function MapPageSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <Skeleton className="h-[52vh] min-h-[340px] rounded-panel sm:h-[58vh] lg:h-[calc(100vh-13rem)] lg:min-h-[520px]" />
      <div className="space-y-4">
        <Skeleton className="h-56 rounded-panel" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
