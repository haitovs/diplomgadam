import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import { Icon, latLngBounds } from "leaflet";
import { fetchRestaurants } from "../api/restaurants";
import { useLanguage } from "../i18n/LanguageContext";
import type { Restaurant } from "../types/restaurant";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { Search, Star, MapPin, Phone, Clock, Navigation, RotateCcw, ChevronDown, X } from "lucide-react";

const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const selectedIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  className: "hue-rotate-[200deg] brightness-125 saturate-150",
});

const ASHGABAT_CENTER: [number, number] = [37.95, 58.38];

function FlyToMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 0.8 });
    }
  }, [position, map]);
  return null;
}

function ResetViewButton() {
  const map = useMap();
  const { t } = useLanguage();
  return (
    <button
      onClick={() => map.flyTo(ASHGABAT_CENTER, 13, { duration: 0.8 })}
      className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      {t("map_reset_view")}
    </button>
  );
}

function FitBounds({ restaurants }: { restaurants: Restaurant[] }) {
  const map = useMap();
  useEffect(() => {
    if (restaurants.length > 1) {
      const bounds = latLngBounds(
        restaurants.map((r) => [r.location.coordinates.lat, r.location.coordinates.lng])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [restaurants, map]);
  return null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const { t } = useLanguage();
  const { data: restaurants, isLoading, isError, refetch } = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants,
  });

  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [tileStyle, setTileStyle] = useState<"street" | "satellite">("street");
  const listRef = useRef<HTMLDivElement>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently fail
      );
    }
  }, []);

  // Extract all unique cuisines
  const allCuisines = useMemo(() => {
    if (!restaurants) return [];
    const set = new Set<string>();
    restaurants.forEach((r) => r.cuisines.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [restaurants]);

  // Filter restaurants
  const filtered = useMemo(() => {
    if (!restaurants) return [];
    return restaurants.filter((r) => {
      const matchSearch =
        !search ||
        `${r.name} ${r.cuisines.join(" ")} ${r.location.neighborhood}`.toLowerCase().includes(search.toLowerCase());
      const matchCuisine = cuisineFilter === "all" || r.cuisines.includes(cuisineFilter);
      const matchPrice = priceFilter === "all" || r.priceTier === priceFilter;
      return matchSearch && matchCuisine && matchPrice;
    });
  }, [restaurants, search, cuisineFilter, priceFilter]);

  // Sort by distance if user location available
  const sortedFiltered = useMemo(() => {
    if (!userLocation) return filtered;
    return [...filtered].sort((a, b) => {
      const dA = getDistance(userLocation[0], userLocation[1], a.location.coordinates.lat, a.location.coordinates.lng);
      const dB = getDistance(userLocation[0], userLocation[1], b.location.coordinates.lat, b.location.coordinates.lng);
      return dA - dB;
    });
  }, [filtered, userLocation]);

  const selected = useMemo(() => restaurants?.find((r) => r.id === selectedId), [restaurants, selectedId]);

  function handleSelectRestaurant(r: Restaurant) {
    setSelectedId(r.id);
    setFlyTarget([r.location.coordinates.lat, r.location.coordinates.lng]);
    // Scroll list item into view
    setTimeout(() => {
      const el = document.getElementById(`map-list-${r.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function handleOpenDirections(r: Restaurant) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${r.location.coordinates.lat},${r.location.coordinates.lng}`;
    window.open(url, "_blank");
  }

  if (isLoading) return <LoadingState label={t("loading")} />;
  if (isError) return <ErrorState message={t("home_error")} action={refetch} />;

  const tileUrl =
    tileStyle === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution =
    tileStyle === "satellite"
      ? "&copy; Esri"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

  return (
    <div className="flex flex-col lg:flex-row gap-0 -mx-6 -mt-10 -mb-10" style={{ height: "calc(100vh - 73px)" }}>
      {/* Sidebar */}
      <div
        className={`${showSidebar ? "w-full lg:w-[420px]" : "w-0"} shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* Filters */}
        <div className="p-4 space-y-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("map_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 border border-transparent focus:border-brand-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 border border-transparent focus:border-brand-500"
              >
                <option value="all">{t("map_all_cuisines")}</option>
                {allCuisines.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative w-28">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 border border-transparent focus:border-brand-500"
              >
                <option value="all">{t("map_all_prices")}</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sortedFiltered.length} {t("map_restaurants_found")}
          </p>
        </div>

        {/* Restaurant list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {sortedFiltered.map((r) => {
            const dist = userLocation
              ? getDistance(userLocation[0], userLocation[1], r.location.coordinates.lat, r.location.coordinates.lng)
              : null;
            return (
              <div
                key={r.id}
                id={`map-list-${r.id}`}
                onClick={() => handleSelectRestaurant(r)}
                className={`flex gap-3 p-4 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors ${
                  selectedId === r.id
                    ? "bg-brand-50 dark:bg-brand-500/10 border-l-4 border-l-brand-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent"
                }`}
              >
                <img
                  src={r.heroImage}
                  alt={r.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{r.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.cuisines.join(" · ")}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{r.rating}</span>
                    </span>
                    <span className="text-xs text-slate-400">{r.priceTier}</span>
                    <span className="text-xs text-slate-400">{r.location.neighborhood}</span>
                    {dist !== null && (
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                        {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {/* Toggle sidebar on mobile */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden absolute top-3 left-3 z-[1000] px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
        >
          {showSidebar ? "✕" : "☰"}
        </button>

        {/* Tile style toggle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
          <button
            onClick={() => setTileStyle("street")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tileStyle === "street"
                ? "bg-brand-500 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {t("map_street")}
          </button>
          <button
            onClick={() => setTileStyle("satellite")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tileStyle === "satellite"
                ? "bg-brand-500 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {t("map_satellite")}
          </button>
        </div>

        <MapContainer center={ASHGABAT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <FlyToMarker position={flyTarget} />
          <ResetViewButton />
          {filtered.length > 1 && !flyTarget && <FitBounds restaurants={filtered} />}

          {/* User location */}
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.55, weight: 2 }}
            >
              <Popup>📍 You are here</Popup>
            </CircleMarker>
          )}

          {/* Restaurant markers */}
          {filtered.map((r) => (
            <Marker
              key={r.id}
              position={[r.location.coordinates.lat, r.location.coordinates.lng]}
              icon={selectedId === r.id ? selectedIcon : defaultIcon}
              eventHandlers={{
                click: () => handleSelectRestaurant(r),
              }}
            >
              <Popup>
                <div className="p-1">
                  <img src={r.heroImage} alt={r.name} className="w-full h-28 object-cover rounded-lg mb-2" />
                  <h3 className="font-bold text-base text-slate-900 mb-0.5">{r.name}</h3>
                  <p className="text-xs text-slate-500 mb-1.5">{r.cuisines.join(" · ")}</p>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-0.5 text-xs font-medium">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {r.rating}
                    </span>
                    <span className="text-xs text-slate-400">({r.reviewCount})</span>
                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{r.priceTier}</span>
                  </div>

                  <div className="space-y-1 mb-3 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{r.location.address}</span>
                    </div>
                    {r.contact.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        <a href={`tel:${r.contact.phone}`} className="text-brand-600 hover:underline">{r.contact.phone}</a>
                      </div>
                    )}
                    {r.schedule[0] && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{r.schedule[0].days}: {r.schedule[0].hours}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/restaurants/${r.id}`}
                      className="flex-1 text-center px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      {t("map_view_profile")}
                    </Link>
                    <button
                      onClick={() => handleOpenDirections(r)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      {t("map_directions")}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Selected restaurant detail card (bottom overlay) */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 items-start max-w-lg mx-auto">
            <img src={selected.heroImage} alt={selected.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selected.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selected.cuisines.join(" · ")}</p>
                </div>
                <button onClick={() => { setSelectedId(null); setFlyTarget(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex items-center gap-0.5 text-sm font-medium text-slate-900 dark:text-white">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {selected.rating}
                </span>
                <span className="text-xs text-slate-400">· {selected.priceTier} · {selected.location.neighborhood}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Link
                  to={`/restaurants/${selected.id}`}
                  className="px-4 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600"
                >
                  {t("map_view_profile")}
                </Link>
                <button
                  onClick={() => handleOpenDirections(selected)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  <Navigation className="w-3 h-3" />
                  {t("map_directions")}
                </button>
                {selected.contact.phone && (
                  <a
                    href={`tel:${selected.contact.phone}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
