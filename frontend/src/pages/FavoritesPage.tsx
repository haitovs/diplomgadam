import { useQueries } from "@tanstack/react-query";
import { Heart, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import StoreCard, { StoreCardSkeleton } from "../components/StoreCard";
import { Badge, Button, PageHeader } from "../components/ui";
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
    <div>
      <PageHeader
        title={t("favorites_title")}
        // The hint carries the empty state below; repeating it in the header
        // would say the same thing twice on the same screen.
        description={slugs.length > 0 ? t("favorites_empty_hint") : undefined}
        action={
          !loading && stores.length > 0 ? (
            <Badge tone="accent" className="tabular-nums">
              {stores.length} {t("nav_favorites")}
            </Badge>
          ) : undefined
        }
      />

      {slugs.length === 0 ? (
        <FavoritesEmpty />
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slugs.slice(0, 6).map((slug) => (
            <StoreCardSkeleton key={slug} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <FavoritesEmpty />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * An empty shelf is the first thing many people see here, so it is composed
 * rather than apologised for: the same warm gradient as the home hero, the
 * heart drawn at the size the card control uses, and one obvious way onward.
 */
function FavoritesEmpty() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-gradient-to-br from-clay-50 via-sand-100 to-sand-200 px-6 py-14 text-center sm:px-10 sm:py-20 dark:from-sand-900 dark:via-sand-900 dark:to-sand-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-clay-200/40 blur-3xl dark:bg-clay-900/20"
      />

      <div className="relative mx-auto max-w-md">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--surface-card)] shadow-soft">
          <Heart
            className="h-7 w-7 text-clay-600 dark:text-clay-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>

        <h2 className="mt-6 font-display text-display-sm font-semibold leading-tight text-sand-900 dark:text-sand-50">
          {t("favorites_empty")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-sand-700 dark:text-sand-300">
          {t("favorites_empty_hint")}
        </p>

        <Link to="/" className="mt-7 inline-block">
          <Button size="lg" icon={<Search className="h-4 w-4" />}>
            {t("nav_discover")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
