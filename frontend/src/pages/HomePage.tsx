import HeroBanner from "../components/HeroBanner";
import FiltersPanel from "../components/FiltersPanel";
import RestaurantCard from "../components/RestaurantCard";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useRestaurants } from "../hooks/useRestaurants";
import { useLanguage } from "../i18n/LanguageContext";

export default function HomePage() {
  const { filtered, isLoading, isError, refetch } = useRestaurants();
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <HeroBanner />
      <FiltersPanel />

      {isLoading && <LoadingState label={t("home_loading")} />}
      {isError && <ErrorState message={t("home_error")} action={refetch} />}

      {!isLoading && !isError && (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
          {!filtered.length && (
            <div className="glass-panel p-10 text-center text-slate-500">
              {t("home_empty")}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
