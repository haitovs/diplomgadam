import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Restaurant } from "../types/restaurant";
import FavoriteToggle from "./FavoriteToggle";
import RatingBadge from "./RatingBadge";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <motion.article
      className="glass-panel overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-brand-500/10 dark:hover:shadow-brand-400/10 transition-all duration-300"
      whileHover={{ y: -4, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="relative overflow-hidden">
        <img
          src={restaurant.heroImage}
          alt={`Photo of ${restaurant.name}`}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <FavoriteToggle id={restaurant.id} />
        </div>
        <div className="absolute bottom-3 left-3">
          <RatingBadge rating={restaurant.rating} reviews={restaurant.reviewCount} />
        </div>
        {/* Cuisine badges on image */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {restaurant.cuisines.slice(0, 2).map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{restaurant.name}</h3>
          <span className="text-xs font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
            {restaurant.priceTier}
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug clamp-2">{restaurant.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1">
            📍 {restaurant.location.neighborhood}
          </span>
        </div>
        {restaurant.dietary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.dietary.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link
          to={`/restaurants/${restaurant.id}`}
          className="mt-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-brand-600 dark:to-brand-500 text-white text-sm font-semibold py-2.5 hover:shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-brand-500/30 transition-all duration-200 hover:scale-[1.02]"
        >
          View profile →
        </Link>
      </div>
    </motion.article>
  );
}
