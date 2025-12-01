import HeroBanner from "../components/HeroBanner";
import FiltersPanel from "../components/FiltersPanel";
import RestaurantCard from "../components/RestaurantCard";
import MapPanel from "../components/MapPanel";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useRestaurants } from "../hooks/useRestaurants";

export default function HomePage() {
  const { filtered, isLoading, isError, refetch } = useRestaurants();

  return (
    <div className="space-y-8">
      <HeroBanner />
      <FiltersPanel />

      {isLoading && <LoadingState label="Syncing curated catalogue..." />}
      {isError && <ErrorState message="Unable to load restaurants." action={refetch} />}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
            {!filtered.length && (
              <div className="glass-panel p-10 text-center text-slate-500">
                Adjust filters to reveal more dining experiences.
              </div>
            )}
          </section>

          <MapPanel restaurants={filtered} />
        </>
      )}
    </div>
  );
}
