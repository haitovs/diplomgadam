import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import RestaurantCard from "../components/RestaurantCard";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useFavorites } from "../store/useFavorites";
import { fetchRestaurants } from "../api/restaurants";
import { useLanguage } from "../i18n/LanguageContext";

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants
  });

  const favorites = (data ?? []).filter((restaurant) => ids.includes(restaurant.id));

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("fav_saved")}</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t("fav_title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("fav_desc")}
        </p>
      </div>

      {isLoading && <LoadingState label={t("fav_loading")} />}
      {isError && <ErrorState message={t("fav_error")} action={refetch} />}

      {!isLoading && !isError && (
        <>
          {favorites.length === 0 ? (
            <div className="glass-panel p-8 text-center space-y-3">
              <p className="text-slate-600 dark:text-slate-300 font-medium">{t("fav_empty")}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("fav_empty_hint")}</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold"
              >
                {t("fav_browse")}
              </Link>
            </div>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
