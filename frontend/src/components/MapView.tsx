import maplibregl, {
  type LngLatLike,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
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
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();

  // Keep the latest handler without re-creating the map on every render.
  useEffect(() => {
    clickHandler.current = onMapClick;
  }, [onMapClick]);

  /**
   * The style is fetched before the map is created rather than handed to
   * MapLibre as a URL. That makes "is the map available?" a definite answer —
   * the fallback appears only when the bundle genuinely is not installed —
   * instead of depending on a timer, which reports failure on a slow network
   * and success on a fast one.
   */
  useEffect(() => {
    let cancelled = false;
    fetch("/maps/style.json")
      .then((response) => {
        if (!response.ok) throw new Error(`style ${response.status}`);
        return response.json();
      })
      .then((json) => {
        if (!cancelled) setStyle(json as StyleSpecification);
      })
      .catch((err) => {
        console.warn("Map style unavailable:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!container.current || map.current || !style) return;

    let instance: MapLibreMap;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style,
        center,
        zoom,
        interactive,
        attributionControl: false,
        /**
         * Tiles and glyphs are fetched inside a Web Worker, which has no
         * document to resolve a root-relative URL against — `/maps/tiles/...`
         * throws "Failed to parse URL" there. Absolutising here, on the main
         * thread, lets the server keep emitting host-agnostic paths so the
         * deployment still works behind any hostname.
         */
        transformRequest: (url) => ({
          url: url.startsWith("/") ? new URL(url, window.location.origin).toString() : url,
        }),
      });
    } catch (err) {
      console.warn("Map could not be created:", err);
      setFailed(true);
      return;
    }

    /**
     * Individual errors never blank the map. A missing tile over empty desert,
     * a glyph range that failed once, a sprite icon a layer asks for — none of
     * those stop the rest of the map from being useful, and treating them as
     * fatal is why this previously showed nothing at all.
     */
    instance.on("error", (event) => {
      console.warn("Map:", event.error?.message ?? event);
    });

    if (interactive) {
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      // The tileset's own metadata already carries the OpenMapTiles and
      // OpenStreetMap credit, so adding it again here printed it twice.
      instance.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );
    }

    instance.on("click", (event) => {
      clickHandler.current?.({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    });

    map.current = instance;
    instance.on("load", () => setReady(true));

    return () => {
      setReady(false);
      instance.remove();
      map.current = null;
    };
    // Created once, as soon as the style is in hand; later prop changes are
    // applied by the effects below rather than by rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

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
  }, [markers, fitToMarkers, ready]);

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

  return (
    <div className={`${className} relative rounded-2xl overflow-hidden`}>
      <div ref={container} className="absolute inset-0" />
      {!style && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 dark:bg-slate-800">
          <span className="text-sm text-slate-400">{t("loading")}</span>
        </div>
      )}
    </div>
  );
}
