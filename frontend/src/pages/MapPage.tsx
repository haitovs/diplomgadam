import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import MapView, { ASHGABAT_CENTER, type MapMarker } from "../components/MapView";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";

export default function MapPage() {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["map-stores", lang],
    queryFn: () => publicApi.listStores({ lang, perPage: 60, sort: "name" }),
  });

  const located = useMemo(
    () => (data?.stores ?? []).filter((store) => store.coordinates !== null),
    [data],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      located.map((store) => ({
        id: store.id,
        lng: store.coordinates!.lng,
        lat: store.coordinates!.lat,
        label: store.name,
        active: selected === store.id,
        onClick: () => setSelected(store.id),
      })),
    [located, selected],
  );

  const selectedStore = located.find((store) => store.id === selected);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {t("map_title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("map_subtitle")}
        </p>
      </header>

      {located.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title={t("home_no_results")}
          description={t("home_empty_platform_hint")}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
          <MapView
            className="h-[60vh] min-h-[380px]"
            markers={markers}
            fitToMarkers
            center={ASHGABAT_CENTER}
          />

          <div className="space-y-3">
            {selectedStore ? (
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    <Link
                      to={`/restaurants/${selectedStore.slug}`}
                      className="hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {selectedStore.name}
                    </Link>
                  </h2>
                  <Badge tone={selectedStore.openNow ? "success" : "neutral"}>
                    {selectedStore.openNow ? t("open_now") : t("closed_now")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedStore.address}
                </p>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {located.length} {t("home_results")}
                </p>
              </Card>
            )}

            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {located.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelected(store.id)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                    selected === store.id
                      ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-brand-300"
                  }`}
                >
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {store.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {store.neighborhood ?? store.address}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
