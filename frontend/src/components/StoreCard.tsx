import { motion } from "framer-motion";
import { Heart, MapPin, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useFavorites } from "../store/useFavorites";
import type { PublicStoreSummary } from "../types/api";
import { Badge } from "./ui";

export default function StoreCard({ store }: { store: PublicStoreSummary }) {
  const { t } = useLanguage();
  const favorites = useFavorites();
  const isFavorite = favorites.slugs.includes(store.slug);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-panel overflow-hidden flex flex-col group"
    >
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </picture>
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300 dark:text-slate-600">
            <Utensils className="w-10 h-10" />
          </div>
        )}

        <button
          type="button"
          onClick={() => favorites.toggle(store.slug)}
          aria-label={isFavorite ? t("favorite_remove") : t("favorite_add")}
          className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur shadow-sm transition hover:scale-110"
        >
          <Heart
            className={`w-4 h-4 transition ${
              isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-500 dark:text-slate-300"
            }`}
          />
        </button>

        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
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

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
            <Link
              to={`/restaurants/${store.slug}`}
              className="after:absolute after:inset-0 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
            >
              {store.name}
            </Link>
          </h3>
          <span className="shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {store.priceTier}
          </span>
        </div>

        {store.description && (
          <p className="clamp-2 text-sm text-slate-500 dark:text-slate-400">
            {store.description}
          </p>
        )}

        {store.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {store.categories.slice(0, 3).map((category) => (
              <span
                key={category.slug}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                {category.icon} {category.name}
              </span>
            ))}
          </div>
        )}

        {(store.neighborhood || store.address) && (
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{store.neighborhood ?? store.address}</span>
          </p>
        )}
      </div>
    </motion.article>
  );
}
