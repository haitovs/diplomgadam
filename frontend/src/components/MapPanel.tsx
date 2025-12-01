import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Restaurant } from "../types/restaurant";
import { Icon } from "leaflet";

const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41]
});

interface MapPanelProps {
  restaurants: Restaurant[];
}

export default function MapPanel({ restaurants }: MapPanelProps) {
  const center: [number, number] = restaurants.length
    ? [restaurants[0].location.coordinates.lat, restaurants[0].location.coordinates.lng]
    : [41.7151, 44.793];

  return (
    <section className="glass-panel p-0 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Spatial view</h2>
        <p className="text-sm text-slate-500">All pins are static demo data aligned with Gadam City map grid.</p>
      </div>
      <MapContainer center={center} zoom={13} style={{ height: 360, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            position={[restaurant.location.coordinates.lat, restaurant.location.coordinates.lng]}
            icon={markerIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{restaurant.name}</p>
                <p className="text-slate-500">{restaurant.cuisines.join(", ")}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
