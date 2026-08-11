import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Utensils } from "lucide-react";
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

/** Map frame heights, kept in one place so the skeleton cannot drift from it. */
const MAP_HEIGHT =
  "h-[52vh] min-h-[340px] sm:h-[58vh] lg:h-[calc(100vh-12rem)] lg:min-h-[560px]";
/** The index column is laid out to exactly match the map on wide screens. */
const COLUMN_HEIGHT = "lg:h-[calc(100vh-12rem)] lg:min-h-[560px]";

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
          icon={<MapPin className="h-6 w-6" />}
          title={t("home_no_results")}
          description={t("home_empty_platform_hint")}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          {/* The map leads. It takes the widest column and the tallest frame the
              viewport allows; everything else on the page is an index to it. */}
          {/* Radius matches the one MapView applies to its own canvas, so the
              frame clips the map cleanly instead of leaving a pale crescent. */}
          <div
            className={`photo-frame rounded-2xl border border-[var(--border-subtle)] shadow-lifted ${MAP_HEIGHT}`}
          >
            <MapView
              className="h-full w-full"
              markers={markers}
              fitToMarkers
              center={ASHGABAT_CENTER}
            />
          </div>

          <div
            className={`flex flex-col gap-5 lg:sticky lg:top-24 ${COLUMN_HEIGHT}`}
          >
            {selectedStore ? (
              <SelectedStorePreview store={selectedStore} />
            ) : (
              <div className="rounded-panel border border-dashed border-sand-300 bg-sand-100/60 px-5 py-8 text-center dark:border-sand-700 dark:bg-sand-900/40">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-clay-50 text-clay-700 dark:bg-clay-500/10 dark:text-clay-300">
                  <Navigation className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-sand-600 dark:text-sand-400">
                  {t("map_subtitle")}
                </p>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-soft">
              <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <h2 className="font-display text-sm font-semibold tracking-wide text-sand-900 dark:text-sand-100">
                  {t("nav_discover")}
                </h2>
                <span className="text-xs font-semibold tabular-nums text-sand-600 dark:text-sand-400">
                  {located.length}
                </span>
              </div>

              <ul className="max-h-[20rem] flex-1 divide-y divide-[var(--border-subtle)] overflow-y-auto lg:max-h-none">
                {located.map((store) => {
                  const active = selected === store.id;
                  return (
                    <li key={store.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(store.id)}
                        aria-pressed={active}
                        className={`relative flex w-full items-center gap-3 py-3 pl-5 pr-4 text-left transition-colors duration-200 ease-out-soft ${
                          active
                            ? "bg-clay-50 dark:bg-clay-500/10"
                            : "hover:bg-sand-100 dark:hover:bg-sand-800/60"
                        }`}
                      >
                        {/* Selection is carried by three signals, not just a
                            tint: an accent rail, a ring on the thumbnail and a
                            pin glyph beside the price. */}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 w-1 transition-colors duration-200 ${
                            active ? "bg-clay-600 dark:bg-clay-400" : "bg-transparent"
                          }`}
                        />
                        <Thumb
                          store={store}
                          className={`h-12 w-12 rounded-card transition-shadow duration-200 ${
                            active ? "ring-2 ring-clay-500" : ""
                          }`}
                        />
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
                          <span className="mt-0.5 block truncate text-xs text-sand-600 dark:text-sand-500">
                            {store.neighborhood ?? store.address}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {active && (
                            <MapPin
                              className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              active
                                ? "text-clay-700 dark:text-clay-300"
                                : "text-sand-500 dark:text-sand-600"
                            }`}
                          >
                            {store.priceTier}
                          </span>
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

/**
 * The pin's counterpart. Built like the detail hero — photograph, scrim, name
 * set over it — so choosing a marker reads as a real preview rather than a
 * tooltip in a panel.
 */
function SelectedStorePreview({ store }: { store: PublicStoreSummary }) {
  const { t } = useLanguage();

  const status = store.temporarilyClosed
    ? { label: t("temporarily_closed"), className: "bg-red-700 text-white" }
    : store.openingSoon
      ? { label: t("opening_soon"), className: "bg-clay-600 text-white" }
      : store.openNow
        ? { label: t("open_now"), className: "bg-emerald-700 text-white" }
        : { label: t("closed_now"), className: "bg-sand-900/85 text-sand-100" };

  return (
    <article className="shrink-0 overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-lifted">
      <div className="photo-frame aspect-[16/10] w-full">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </picture>
        ) : (
          <div className="grid h-full w-full place-items-center text-sand-400 dark:text-sand-600">
            <Utensils className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm ${status.className}`}
        >
          {status.label}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <h2 className="clamp-2 font-display text-xl font-semibold leading-tight text-white drop-shadow-sm">
            {store.name}
          </h2>
          <span className="shrink-0 pb-0.5 text-sm font-semibold tabular-nums text-white/90">
            {store.priceTier}
          </span>
        </div>
      </div>

      <div className="space-y-3.5 p-5">
        <p className="flex items-start gap-1.5 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="clamp-2">{store.address}</span>
        </p>

        {store.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {store.categories.slice(0, 3).map((category) => (
              <span
                key={category.slug}
                className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-sand-700 dark:bg-sand-800 dark:text-sand-300"
              >
                {category.icon} {category.name}
              </span>
            ))}
          </div>
        )}

        <Link to={`/restaurants/${store.slug}`} className="block">
          <Button className="w-full">{t("action_view")}</Button>
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
        className={`photo-frame grid shrink-0 place-items-center text-sand-400 dark:text-sand-600 ${className}`}
      >
        <Utensils className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
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

/** Mirrors the two-column shape so the page does not reflow when data lands. */
function MapPageSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <Skeleton className={`rounded-2xl ${MAP_HEIGHT}`} />
      <div className={`flex flex-col gap-5 ${COLUMN_HEIGHT}`}>
        <Skeleton className="h-64 shrink-0 rounded-panel" />
        <div className="min-h-0 flex-1 space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
