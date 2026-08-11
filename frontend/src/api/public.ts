import type { Lang } from "../i18n/translations";
import type {
  CategorySummary,
  FilterOptions,
  Insights,
  PublicStoreDetail,
  PublicStoreList,
} from "../types/api";
import { get } from "./client";

export interface StoreQuery {
  lang: Lang;
  search?: string;
  category?: string;
  neighborhood?: string;
  priceTier?: string;
  amenities?: string[];
  openNow?: boolean;
  sort?: "name" | "newest" | "popular";
  page?: number;
  perPage?: number;
}

/** Drops empty values so they don't show up as blank query parameters. */
function toParams(query: StoreQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    lang: query.lang,
    sort: query.sort ?? "name",
    page: query.page ?? 1,
    perPage: query.perPage ?? 12,
  };
  if (query.search) params.search = query.search;
  if (query.category) params.category = query.category;
  if (query.neighborhood) params.neighborhood = query.neighborhood;
  if (query.priceTier) params.priceTier = query.priceTier;
  if (query.amenities?.length) params.amenities = query.amenities.join(",");
  if (query.openNow) params.openNow = "true";
  return params;
}

export const publicApi = {
  listStores: (query: StoreQuery) =>
    get<PublicStoreList>("/public/stores", toParams(query)),

  getStore: (slug: string, lang: Lang) =>
    get<{ store: PublicStoreDetail }>(`/public/stores/${slug}`, { lang }).then(
      (r) => r.store,
    ),

  categories: (lang: Lang) =>
    get<{ categories: CategorySummary[] }>("/public/categories", { lang }).then(
      (r) => r.categories,
    ),

  filters: () => get<FilterOptions>("/public/filters"),

  insights: (lang: Lang) => get<Insights>("/public/insights", { lang }),
};
