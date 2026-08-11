import { Heart, MapPin, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useFavorites } from "../store/useFavorites";
import type { PublicStoreSummary } from "../types/api";

export default function StoreCard({ store }: { store: PublicStoreSummary }) {
  const { t } = useLanguage();
  const favorites = useFavorites();
  const isFavorite = favorites.slugs.includes(store.slug);

  const status = store.temporarilyClosed
    ? { label: t("temporarily_closed"), className: "bg-red-700 text-white" }
    : store.openingSoon
      ? { label: t("opening_soon"), className: "bg-clay-600 text-white" }
      : store.openNow
        ? { label: t("open_now"), className: "bg-emerald-700 text-white" }
        : { label: t("closed_now"), className: "bg-sand-900/80 text-sand-100" };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-soft transition-all duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lifted">
      <div className="photo-frame aspect-[4/3] w-full">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
            />
          </picture>
        ) : (
          <div className="grid h-full w-full place-items-center bg-sand-200 text-sand-400 dark:bg-sand-800 dark:text-sand-600">
            <UtensilsCrossed className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {/* A soft scrim so the status pill stays legible on a bright photo. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm ${status.className}`}
        >
          {status.label}
        </span>

        <button
          type="button"
          onClick={() => favorites.toggle(store.slug)}
          aria-label={isFavorite ? t("favorite_remove") : t("favorite_add")}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-soft backdrop-blur transition-transform duration-200 ease-out-soft hover:scale-110 active:scale-95 dark:bg-sand-900/85"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite
                ? "fill-clay-600 text-clay-600"
                : "text-sand-600 dark:text-sand-300"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-sand-900 dark:text-sand-50">
            <Link
              to={`/restaurants/${store.slug}`}
              className="transition-colors after:absolute after:inset-0 hover:text-clay-700 dark:hover:text-clay-300"
            >
              {store.name}
            </Link>
          </h3>
          <span className="shrink-0 pt-0.5 text-sm font-semibold text-sand-500">
            {store.priceTier}
          </span>
        </div>

        {store.description && (
          <p className="clamp-2 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
            {store.description}
          </p>
        )}

        {store.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {store.categories.slice(0, 2).map((category) => (
              <span
                key={category.slug}
                className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-sand-700 dark:bg-sand-800 dark:text-sand-300"
              >
                {category.icon} {category.name}
              </span>
            ))}
            {store.categories.length > 2 && (
              <span className="rounded-full px-1.5 py-1 text-xs font-medium text-sand-500">
                +{store.categories.length - 2}
              </span>
            )}
          </div>
        )}

        {(store.neighborhood || store.address) && (
          <p className="mt-auto flex items-center gap-1.5 border-t border-[var(--border-subtle)] pt-3 text-xs text-sand-600 dark:text-sand-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{store.neighborhood ?? store.address}</span>
          </p>
        )}
      </div>
    </article>
  );
}

/** Matches the card's shape so the grid does not jump when results arrive. */
export function StoreCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <div className="aspect-[4/3] w-full animate-pulse bg-sand-200 dark:bg-sand-800" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-sand-200 dark:bg-sand-800" />
        <div className="h-3.5 w-full animate-pulse rounded bg-sand-200 dark:bg-sand-800" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-sand-200 dark:bg-sand-800" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-sand-200 dark:bg-sand-800" />
      </div>
    </div>
  );
}
