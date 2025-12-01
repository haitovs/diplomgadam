import { Link } from "react-router-dom";
import type { Restaurant } from "../types/restaurant";
import FavoriteToggle from "./FavoriteToggle";
import RatingBadge from "./RatingBadge";
import DietaryTags from "./DietaryTags";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <article className="glass-panel overflow-hidden flex flex-col">
      <div className="relative">
        <img src={restaurant.heroImage} alt={restaurant.name} className="h-48 w-full object-cover" loading="lazy" />
        <div className="absolute top-3 right-3">
          <FavoriteToggle id={restaurant.id} />
        </div>
        <div className="absolute bottom-3 left-3">
          <RatingBadge rating={restaurant.rating} reviews={restaurant.reviewCount} />
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{restaurant.name}</h3>
          <span className="text-sm font-medium text-slate-500">{restaurant.priceTier}</span>
        </div>
        <p className="text-sm text-slate-500">{restaurant.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span>{restaurant.location.neighborhood}</span>
          <span>•</span>
          <span>{restaurant.cuisines.slice(0, 2).join(", ")}</span>
        </div>
        <DietaryTags tags={restaurant.dietary} />
        <Link
          to={`/restaurants/${restaurant.id}`}
          className="mt-auto inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-medium py-2.5"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
