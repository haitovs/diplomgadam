import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Maximize2,
  MapPin,
  Navigation2,
  Minimize2,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import { directionsUrl, loadMapView, saveMapView } from "../lib/useNearby";
import MapView, { ASHGABAT_CENTER, type MapMarker } from "../components/MapView";
import { Button, LoadFailed, Select, Spinner, inputClass } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * The map sits in the page like any other view, and expands to the whole
 * viewport only when asked. Filling the screen by default takes the choice
 * away from someone who wanted to glance at the map and carry on reading;
 * offering it as a control leaves both options open. Escape returns.
 */
const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"];

export default function MapPage() {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);

  // Restored once, on mount: after that the visitor's panning owns the view.
  const [initialView] = useState(() => loadMapView());

  // Escape is what people reach for to leave a fullscreen view, and the page
  // behind must not scroll while the map covers it.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["map-stores", lang],
    queryFn: () => publicApi.listStores({ lang, perPage: 60, sort: "name" }),
  });

  const cuisines = useQuery({
    queryKey: ["public-categories", lang],
    queryFn: () => publicApi.categories(lang),
  });

  const located = useMemo(
    () => (data?.stores ?? []).filter((store) => store.coordinates !== null),
    [data],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(lang);
    return located.filter((store) => {
      if (openOnly && !store.openNow) return false;
      if (price && store.priceTier !== price) return false;
      if (cuisine && !store.categories.some((c) => c.slug === cuisine)) return false;
      if (!term) return true;
      return (
        store.name.toLocaleLowerCase(lang).includes(term) ||
        (store.neighborhood ?? "").toLocaleLowerCase(lang).includes(term)
      );
    });
  }, [located, search, openOnly, price, cuisine, lang]);

  const markers: MapMarker[] = useMemo(
    () =>
      visible.map((store) => ({
        id: store.id,
        lng: store.coordinates!.lng,
        lat: store.coordinates!.lat,
        label: store.name,
        active: selected === store.id,
        onClick: () => setSelected(store.id),
      })),
    [visible, selected],
  );

  const selectedStore = visible.find((store) => store.id === selected);

  if (isLoading) return <Spinner className="min-h-[60vh]" />;

  // Without this the map still draws, with an empty sidebar and no pins, which
  // reads as "there are no restaurants" rather than "we could not load them".
  if (isError) {
    return (
      <LoadFailed
        title={t("error_network")}
        description={t("home_load_failed_hint")}
        onRetry={() => refetch()}
        retryLabel={t("action_retry")}
      />
    );
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={
        fullscreen
          ? "fixed inset-0 z-50 overflow-hidden bg-[var(--surface-page)]"
          : "relative h-[calc(100vh-14rem)] min-h-[30rem] w-full overflow-hidden rounded-panel border border-[var(--border-subtle)] shadow-soft"
      }
    >
      <MapView
        className="h-full w-full !rounded-none"
        markers={markers}
        fitToMarkers={!selected && !initialView}
        center={
          selectedStore
            ? [selectedStore.coordinates!.lng, selectedStore.coordinates!.lat]
            : initialView
              ? [initialView.lng, initialView.lat]
              : ASHGABAT_CENTER
        }
        zoom={selectedStore ? 16 : (initialView?.zoom ?? 12)}
        onViewChange={saveMapView}
      />

      {/* Sidebar floats over the map so the map keeps the full width beneath. */}
      <AnimatePresence>
        {listOpen && (
          <motion.aside
            initial={{ x: -32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-4 left-4 z-10 flex w-[21rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-deep backdrop-blur-xl max-sm:inset-x-3 max-sm:top-auto max-sm:h-[45%] max-sm:w-auto"
          >
            <div className="space-y-3 border-b border-[var(--border-subtle)] p-4">
              <div className="flex items-center justify-between gap-2">
                <h1 className="font-display text-xl font-semibold text-sand-900 dark:text-sand-50">
                  {t("map_title")}
                </h1>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  aria-label={t("action_close")}
                  className="grid h-7 w-7 place-items-center rounded-full text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-800 dark:hover:bg-sand-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sand-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("filter_search_placeholder")}
                  aria-label={t("action_search")}
                  className={`${inputClass} py-2 pl-9 text-sm`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PRICE_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPrice((p) => (p === tier ? null : tier))}
                    aria-pressed={price === tier}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ease-out-soft active:scale-95 ${
                      price === tier
                        ? "border-clay-600 bg-clay-600 text-white"
                        : "border-[var(--border-subtle)] text-sand-700 hover:border-clay-300 dark:text-sand-300"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              {/* Cuisine is a select rather than chips: there are sixteen of
                  them and a panel this narrow cannot show them as pills. */}
              <Select
                value={cuisine ?? ""}
                onChange={(e) => setCuisine(e.target.value || null)}
                className="py-2 text-sm"
                aria-label={t("filter_category")}
              >
                <option value="">{t("filter_category")}</option>
                {(cuisines.data ?? [])
                  .filter((c) => (c.storeCount ?? 0) > 0)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.icon} {c.name}
                    </option>
                  ))}
              </Select>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setOpenOnly((v) => !v)}
                  aria-pressed={openOnly}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ease-out-soft active:scale-95 ${
                    openOnly
                      ? "border-clay-600 bg-clay-600 text-white"
                      : "border-[var(--border-subtle)] text-sand-700 hover:border-clay-300 dark:text-sand-300"
                  }`}
                >
                  {t("filter_open_now")}
                </button>
                <span className="text-xs tabular-nums text-sand-600 dark:text-sand-400">
                  {visible.length} / {located.length}
                </span>
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false}>
                {visible.map((store, index) => (
                  <motion.li
                    key={store.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    // Staggered only for the first handful; beyond that the
                    // delay would be felt as sluggishness rather than polish.
                    transition={{
                      duration: 0.2,
                      delay: Math.min(index, 8) * 0.02,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(store.id)}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors ${
                        selected === store.id
                          ? "border-clay-600 bg-clay-50 dark:bg-clay-500/10"
                          : "border-transparent hover:bg-sand-100 dark:hover:bg-sand-800/60"
                      }`}
                    >
                      {store.cover ? (
                        <img
                          src={store.cover.thumbUrlJpeg}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sand-200 dark:bg-sand-800">
                          <UtensilsCrossed className="h-4 w-4 text-sand-400" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-sand-900 dark:text-sand-100">
                          {store.name}
                        </span>
                        <span className="block truncate text-xs text-sand-600 dark:text-sand-500">
                          {store.neighborhood ?? store.address}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-sand-500">
                        {store.priceTier}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>

              {visible.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-sand-600 dark:text-sand-400">
                  {t("home_no_results")}
                </li>
              )}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        aria-pressed={fullscreen}
        aria-label={fullscreen ? t("map_exit_fullscreen") : t("map_fullscreen")}
        className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-700 shadow-soft backdrop-blur transition-colors hover:text-clay-700 dark:text-sand-200"
      >
        {fullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>

      {/* Re-open control, once the panel is dismissed. */}
      {!listOpen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-4 top-4 z-10"
        >
          <Button
            size="sm"
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            onClick={() => setListOpen(true)}
          >
            {visible.length}
          </Button>
        </motion.div>
      )}

      {/* Preview of the selected restaurant, anchored bottom-right. */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            key={selectedStore.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-4 right-4 z-10 w-[19rem] max-w-[calc(100%-2rem)] overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-deep max-sm:bottom-3 max-sm:right-3"
          >
            <div className="photo-frame relative aspect-[16/9]">
              {selectedStore.cover ? (
                <picture>
                  <source srcSet={selectedStore.cover.url} type="image/webp" />
                  <img
                    src={selectedStore.cover.urlJpeg}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </picture>
              ) : (
                <div className="grid h-full w-full place-items-center bg-sand-200 dark:bg-sand-800">
                  <UtensilsCrossed className="h-7 w-7 text-sand-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t("action_close")}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sand-700 shadow-soft backdrop-blur transition-transform hover:scale-110"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${
                  selectedStore.openNow ? "bg-emerald-700" : "bg-sand-900/80"
                }`}
              >
                {selectedStore.openNow ? t("open_now") : t("closed_now")}
              </span>
            </div>

            <div className="space-y-2 p-4">
              <h2 className="font-display text-lg font-semibold leading-snug text-sand-900 dark:text-sand-50">
                {selectedStore.name}
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-sand-600 dark:text-sand-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedStore.address}</span>
              </p>
              <div className="flex gap-2 pt-1">
                <Link to={`/restaurants/${selectedStore.slug}`} className="flex-1">
                  <Button size="sm" className="w-full">
                    {t("action_view")}
                  </Button>
                </Link>
                <a
                  href={directionsUrl(
                    selectedStore.coordinates!.lat,
                    selectedStore.coordinates!.lng,
                    selectedStore.name,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1"
                >
                  <Button size="sm" variant="secondary" className="w-full"
                    icon={<Navigation2 className="h-3.5 w-3.5" />}>
                    {t("detail_directions")}
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
