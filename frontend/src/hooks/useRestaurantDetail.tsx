import { useQuery } from "@tanstack/react-query";
import { fetchRestaurant } from "../api/restaurants";

export function useRestaurantDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => {
      if (!id) throw new Error("Missing restaurant id");
      return fetchRestaurant(id);
    },
    enabled: Boolean(id)
  });
}
