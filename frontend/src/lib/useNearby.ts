import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicStoreSummary } from "../types/api";

export type LocationState = "idle" | "locating" | "granted" | "denied";

export interface Coords {
  lat: number;
  lng: number;
}

const STORAGE_KEY = "tagam-location-consent";

/**
 * Great-circle distance in metres.
 *
 * Ashgabat is small enough that a flat approximation would do, but haversine
 * costs nothing here and does not drift if the platform ever covers more than
 * one city.
 */
function distanceMetres(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A brisk urban walk, ~80 m per minute. */
export const walkingMinutes = (metres: number) => Math.max(1, Math.round(metres / 80));

/**
 * The visitor's position, asked for only when they choose to share it.
 *
 * Consent is remembered so a returning visitor is not asked again, and a
 * refusal is respected rather than re-prompted on every visit. Everything the
 * page shows still works without it — the location only reorders and annotates.
 */
export function useNearby(stores: PublicStoreSummary[] | undefined) {
  const [state, setState] = useState<LocationState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("denied");
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setState("granted");
        localStorage.setItem(STORAGE_KEY, "granted");
      },
      () => {
        setState("denied");
        localStorage.removeItem(STORAGE_KEY);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // Re-locate automatically only for someone who has already agreed once.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "granted") request();
  }, [request]);

  const nearby = useMemo(() => {
    if (!stores) return [];
    const located = stores.filter((s) => s.coordinates);

    if (!coords) return located.map((store) => ({ store, metres: null as number | null }));

    return located
      .map((store) => ({
        store,
        metres: distanceMetres(coords, store.coordinates!),
      }))
      .sort((a, b) => a.metres - b.metres);
  }, [stores, coords]);

  return { state, coords, request, nearby };
}

/** Formats a distance the way a person would say it. */
export function formatDistance(
  metres: number,
  labels: { m: string; km: string },
): string {
  if (metres < 950) return `${Math.round(metres / 10) * 10} ${labels.m}`;
  return `${(metres / 1000).toFixed(metres < 9500 ? 1 : 0)} ${labels.km}`;
}

const VIEW_KEY = "tagam-map-view";

export interface MapView {
  lng: number;
  lat: number;
  zoom: number;
}

/**
 * Remembers where the map was left.
 *
 * Returning to the map and being thrown back to the whole city loses whatever
 * the visitor had framed. Stored in this browser only, and discarded if it is
 * ever unreadable rather than being allowed to break the map.
 */
export function loadMapView(): MapView | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapView>;
    if (
      typeof parsed.lng !== "number" ||
      typeof parsed.lat !== "number" ||
      typeof parsed.zoom !== "number"
    ) {
      return null;
    }
    return { lng: parsed.lng, lat: parsed.lat, zoom: parsed.zoom };
  } catch {
    return null;
  }
}

export function saveMapView(view: MapView): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // A full or disabled storage is not worth interrupting the map for.
  }
}

/**
 * A directions link for whichever map app the visitor has.
 *
 * Apple devices get an Apple Maps URL and everything else a Google Maps one.
 * Both open the native app when it is installed and fall back to the website
 * when it is not, which a bare geo: URI does not do reliably on desktop.
 */
export function directionsUrl(lat: number, lng: number, label?: string): string {
  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

  if (isApple) {
    const query = label ? `&q=${encodeURIComponent(label)}` : "";
    return `https://maps.apple.com/?daddr=${lat},${lng}${query}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
