import { get } from "./client";
import { Restaurant, InsightMetric, CuisineDemand } from "../types/restaurant";

export async function fetchRestaurants() {
  return get<Restaurant[]>("/restaurants");
}

export async function fetchRestaurant(id: string) {
  return get<Restaurant>(`/restaurants/${id}`);
}

export async function fetchInsightMetrics() {
  return get<InsightMetric[]>("/insights/metrics");
}

export async function fetchCuisineDemand() {
  return get<CuisineDemand[]>("/insights/cuisine-demand");
}
