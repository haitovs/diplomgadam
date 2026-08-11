import maplibregl, {
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

/** Central Ashgabat, used when nothing else determines the view. */
export const ASHGABAT_CENTER: [number, number] = [58.3833, 37.95];

const SOURCE_ID = "tagam-stores";
const HALO_LAYER = "tagam-store-halo";
const DOT_LAYER = "tagam-store-dot";

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
  const markerHandlers = useRef(new Map<string, () => void>());
  const clickHandler = useRef(onMapClick);
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();

  // Keep the latest handlers without re-creating the map on every render.
  useEffect(() => {
    clickHandler.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    markerHandlers.current = new Map(
      markers.filter((m) => m.onClick).map((m) => [m.id, m.onClick!]),
    );
  }, [markers]);

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

  /**
   * Points are drawn as a GeoJSON layer inside the map rather than as DOM
   * markers.
   *
   * A `maplibregl.Marker` is an absolutely positioned element that the library
   * repositions in response to move events, so with a few dozen of them the
   * points visibly trail the map while it is being panned. A circle layer is
   * rendered by the same WebGL frame as the tiles, so the points are locked to
   * the map at any pan speed.
   */
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: markers.map((marker) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [marker.lng, marker.lat] },
        properties: {
          id: marker.id,
          label: marker.label ?? "",
          active: marker.active ? 1 : 0,
        },
      })),
    };

    const source = instance.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      instance.addSource(SOURCE_ID, { type: "geojson", data });

      // A white ring under the dot keeps it readable over dark photography
      // and over the pale streets alike.
      instance.addLayer({
        id: HALO_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", ["==", ["get", "active"], 1], 11, 8.5],
          "circle-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      instance.addLayer({
        id: DOT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", ["==", ["get", "active"], 1], 7.5, 5.5],
          // clay-700 when selected, clay-500 otherwise.
          "circle-color": [
            "case",
            ["==", ["get", "active"], 1],
            "#8A3618",
            "#C85C2A",
          ],
          "circle-stroke-width": ["case", ["==", ["get", "active"], 1], 2, 0],
          "circle-stroke-color": "#ffffff",
        },
      });

      instance.on("mouseenter", DOT_LAYER, () => {
        instance.getCanvas().style.cursor = "pointer";
      });
      instance.on("mouseleave", DOT_LAYER, () => {
        instance.getCanvas().style.cursor = "";
      });
      instance.on("click", DOT_LAYER, (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (id) markerHandlers.current.get(id)?.();
      });
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
        className={`${className} grid place-items-center rounded-2xl border border-dashed border-sand-300 dark:border-sand-700 text-sm text-sand-600 dark:text-sand-500`}
      >
        {t("map_unavailable")}
      </div>
    );
  }

  return (
    <div className={`${className} relative rounded-2xl overflow-hidden`}>
      <div ref={container} className="absolute inset-0" />
      {!style && (
        <div className="absolute inset-0 grid place-items-center bg-sand-100 dark:bg-sand-800">
          <span className="text-sm text-sand-500">{t("loading")}</span>
        </div>
      )}
    </div>
  );
}
