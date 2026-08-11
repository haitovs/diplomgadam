import { ChevronLeft, ChevronRight, MapPin, UtensilsCrossed } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDistance, walkingMinutes } from "../lib/useNearby";
import type { PublicStoreSummary } from "../types/api";

export interface RailEntry {
  store: PublicStoreSummary;
  /** Straight-line distance, when the visitor has shared a location. */
  metres?: number | null;
}

/**
 * A horizontally scrolling row of restaurants.
 *
 * Discovery sites present this shape rather than a chart because a diner
 * chooses with their eyes: a photograph, a price, and how far away it is
 * answers "shall I go?" in a way a bar chart never does. Each rail is one
 * editorial idea — open now, near you, new — so scanning down the page is
 * scanning a set of suggestions.
 */
export default function StoreRail({
  title,
  subtitle,
  entries,
  seeAllTo,
  accessory,
  minEntries,
}: {
  title: string;
  subtitle?: string;
  entries: RailEntry[];
  seeAllTo?: string;
  accessory?: ReactNode;
  /** Below this, a rail reads as broken rather than curated. */
  minEntries?: number;
}) {
  const { t } = useLanguage();
  const track = useRef<HTMLDivElement>(null);

  // A row holding one or two cards looks like a bug, not an editorial choice,
  // so a thin rail is omitted entirely rather than rendered half empty.
  if (entries.length < (minEntries ?? 3)) return null;

  const scroll = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    // Roughly one card plus its gap, so a click advances by a whole tile.
    el.scrollBy({ left: direction * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-sand-600 dark:text-sand-400">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {accessory}
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="text-sm font-semibold text-clay-700 hover:underline dark:text-clay-300"
            >
              {t("rail_show_all")}
            </Link>
          )}
          {/* Hidden on touch, where swiping is the natural gesture. */}
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={t("rail_scroll_left")}
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-600 transition-colors hover:border-clay-300 hover:text-clay-700 dark:text-sand-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={t("rail_scroll_right")}
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-600 transition-colors hover:border-clay-300 hover:text-clay-700 dark:text-sand-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Negative margins let the rail bleed to the screen edge on mobile, so
          a partially visible card signals that it scrolls. */}
      <div
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {entries.map(({ store, metres }) => (
          <RailCard key={store.id} store={store} metres={metres ?? null} />
        ))}
      </div>
    </section>
  );
}

function RailCard({
  store,
  metres,
}: {
  store: PublicStoreSummary;
  metres: number | null;
}) {
  const { t } = useLanguage();
  const distanceLabels = { m: t("insights_m"), km: t("insights_km") };

  const facts = [
    store.categories[0]?.name,
    store.priceTier,
    store.neighborhood,
  ].filter(Boolean);

  return (
    <article className="group relative w-[16rem] shrink-0 snap-start sm:w-[17.5rem]">
      <div className="photo-frame mb-3 aspect-[16/10] overflow-hidden rounded-panel">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
            />
          </picture>
        ) : (
          <div className="grid h-full w-full place-items-center bg-sand-200 text-sand-400 dark:bg-sand-800">
            <UtensilsCrossed className="h-7 w-7" strokeWidth={1.5} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />

        {/* Distance is the single most decisive fact when it is known. */}
        {metres !== null && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-sand-900 backdrop-blur-sm">
            <MapPin className="h-3 w-3" />
            {formatDistance(metres, distanceLabels)} · {walkingMinutes(metres)}{" "}
            {t("insights_min")}
          </span>
        )}

        {store.temporarilyClosed ? (
          <span className="absolute right-3 top-3 rounded-full bg-red-700 px-2 py-1 text-[11px] font-semibold text-white">
            {t("temporarily_closed")}
          </span>
        ) : store.openNow ? (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white">
            {t("open_now")}
          </span>
        ) : null}
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug text-sand-900 dark:text-sand-50">
        <Link
          to={`/restaurants/${store.slug}`}
          className="transition-colors after:absolute after:inset-0 hover:text-clay-700 dark:hover:text-clay-300"
        >
          {store.name}
        </Link>
      </h3>

      <p className="mt-1 truncate text-sm text-sand-600 dark:text-sand-400">
        {facts.join(" · ")}
      </p>
    </article>
  );
}
