import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import RestaurantCard from "../components/RestaurantCard";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useFavorites } from "../store/useFavorites";
import { fetchRestaurants } from "../api/restaurants";

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants
  });

  const favorites = (data ?? []).filter((restaurant) => ids.includes(restaurant.id));

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Saklanan</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Siziň halanlaryňyz</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gözden geçireniňizde saklanan restoranlara çalt giriş. Bu sanawy marşrutlarda ulanyň ýa-da dostlaryňyz bilen paýlaşyň.
        </p>
      </div>

      {isLoading && <LoadingState label="Saklanan ýerler ýüklenýär..." />}
      {isError && <ErrorState message="Halanlary ýükläp bolmady." action={refetch} />}

      {!isLoading && !isError && (
        <>
          {favorites.length === 0 ? (
            <div className="glass-panel p-8 text-center space-y-3">
              <p className="text-slate-600 dark:text-slate-300 font-medium">Entek halananlar ýok.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Islendik restorany bu ýerde saklamak üçin ýürek nyşanyna basyň.</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold"
              >
                Restoranlary gözden geçiriň
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
