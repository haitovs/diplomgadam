import { useQueries } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import StoreCard from "../components/StoreCard";
import { Button, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import { useFavorites } from "../store/useFavorites";
import type { PublicStoreSummary } from "../types/api";

export default function FavoritesPage() {
  const { t, lang } = useLanguage();
  const slugs = useFavorites((state) => state.slugs);

  // Each favourite is fetched by slug; a listing that has since been removed or
  // suspended simply drops out rather than breaking the page.
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["public-store", slug, lang],
      queryFn: () => publicApi.getStore(slug, lang),
      retry: false,
    })),
  });

  const loading = results.some((result) => result.isLoading);

  const stores: PublicStoreSummary[] = results
    .map((result) => result.data)
    .filter(Boolean)
    .map((store) => ({
      id: store!.id,
      slug: store!.slug,
      name: store!.name,
      description: store!.description,
      address: store!.location.address,
      neighborhood: store!.location.neighborhood,
      city: store!.location.city,
      coordinates: store!.location.coordinates,
      priceTier: store!.priceTier,
      phone: store!.contact.phone,
      amenities: store!.amenities,
      service: {
        dineIn: store!.service.dineIn,
        takeaway: store!.service.takeaway,
        delivery: store!.service.delivery,
      },
      temporarilyClosed: store!.temporarilyClosed,
      openingSoon: store!.openingSoon,
      openNow: store!.openNow,
      cover: store!.cover,
      categories: store!.categories,
      views: store!.views,
      createdAt: "",
    }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {t("favorites_title")}
        </h1>
      </header>

      {slugs.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title={t("favorites_empty")}
          description={t("favorites_empty_hint")}
          action={
            <Link to="/">
              <Button variant="secondary">{t("nav_discover")}</Button>
            </Link>
          }
        />
      ) : loading ? (
        <Spinner />
      ) : stores.length === 0 ? (
        <EmptyState title={t("favorites_empty")} description={t("favorites_empty_hint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
