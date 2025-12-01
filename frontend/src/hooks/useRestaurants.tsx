import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurants } from "../api/restaurants";
import { useFilters } from "../store/useFilters";
import type { Restaurant } from "../types/restaurant";

const matchesSearch = (restaurant: Restaurant, search: string) => {
  if (!search) return true;
  const haystack = `${restaurant.name} ${restaurant.description} ${restaurant.cuisines.join(" ")} ${restaurant.tags.join(" ")}`.toLowerCase();
  return haystack.includes(search.toLowerCase());
};

const matchesList = (restaurant: Restaurant, key: keyof Restaurant, values: string[]) => {
  if (!values.length) return true;
  const set = new Set((restaurant[key] as string[]) ?? []);
  return values.every((value) => set.has(value));
};

export function useRestaurants() {
  const filters = useFilters();
  const query = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants
  });

  const filtered = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter((restaurant) => {
      const matchesCuisine =
        !filters.cuisines.length || filters.cuisines.some((cuisine) => restaurant.cuisines.includes(cuisine));
      const matchesDietary = matchesList(restaurant, "dietary", filters.dietary);
      const matchesPrice = !filters.price.length || filters.price.includes(restaurant.priceTier);
      const matchesRating = restaurant.rating >= filters.rating;
      return matchesSearch(restaurant, filters.search) && matchesCuisine && matchesDietary && matchesPrice && matchesRating;
    });
  }, [
    query.data,
    filters.search,
    filters.cuisines,
    filters.dietary,
    filters.price,
    filters.rating
  ]);

  return {
    ...query,
    filtered
  };
}
