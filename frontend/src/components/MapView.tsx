import maplibregl, { type LngLatLike, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

/** Central Ashgabat, used when nothing else determines the view. */
export const ASHGABAT_CENTER: [number, number] = [58.3833, 37.95];

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}

interface MapViewProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  /** Fit the viewport to all markers once they load. */
  fitToMarkers?: boolean;
  /** Report clicks on the map itself, used by the location picker. */
  onMapClick?: (coords: { lng: number; lat: number }) => void;
  interactive?: boolean;
}

/**
 * MapLibre bound to the tiles this server hosts. The style, glyphs and sprites
 * are all same-origin, so the map renders with no outbound internet access.
 */
export default function MapView({
  markers = [],
  center = ASHGABAT_CENTER,
  zoom = 12,
  className = "h-[420px]",
  fitToMarkers = false,
  onMapClick,
  interactive = true,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const clickHandler = useRef(onMapClick);
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();

  // Keep the latest handler without re-creating the map on every render.
  useEffect(() => {
    clickHandler.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!container.current || map.current) return;

    let instance: MapLibreMap;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: "/maps/style.json",
        center,
        zoom,
        interactive,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }

    instance.on("error", (event) => {
      // A missing tile is normal for empty areas; only a failed style means
      // the map genuinely cannot render.
      if (event.error && "status" in event.error) return;
      setFailed(true);
    });

    if (interactive) {
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      instance.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        }),
        "bottom-right",
      );
    }

    instance.on("click", (event) => {
      clickHandler.current?.({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
    // The map is created once; subsequent prop changes are applied by the
    // effects below rather than by rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    for (const marker of markerRefs.current) marker.remove();
    markerRefs.current = [];

    for (const marker of markers) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = [
        "grid place-items-center rounded-full border-2 border-white shadow-lg transition-transform",
        marker.active
          ? "w-9 h-9 bg-brand-600 scale-110"
          : "w-7 h-7 bg-brand-500 hover:scale-110",
      ].join(" ");
      el.setAttribute("aria-label", marker.label ?? "");
      el.innerHTML =
        '<span style="display:block;width:8px;height:8px;border-radius:9999px;background:white"></span>';
      if (marker.onClick) el.addEventListener("click", marker.onClick);

      const instanceMarker = new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat] as LngLatLike)
        .addTo(instance);

      if (marker.label) {
        instanceMarker.setPopup(
          new maplibregl.Popup({ offset: 18, closeButton: false }).setText(
            marker.label,
          ),
        );
      }

      markerRefs.current.push(instanceMarker);
    }

    if (fitToMarkers && markers.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const marker of markers) bounds.extend([marker.lng, marker.lat]);
      instance.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 });
    }
  }, [markers, fitToMarkers]);

  useEffect(() => {
    map.current?.easeTo({ center, zoom, duration: 600 });
  }, [center, zoom]);

  if (failed) {
    return (
      <div
        className={`${className} grid place-items-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400`}
      >
        {t("map_unavailable")}
      </div>
    );
  }

  return <div ref={container} className={`${className} rounded-2xl overflow-hidden`} />;
}
