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
export function distanceMetres(a: Coords, b: Coords): number {
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

/** Time-of-day greeting, in Ashgabat's own clock. */
export function greetingKey(): "morning" | "afternoon" | "evening" | "night" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Ashgabat",
    }).format(new Date()),
  );

  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}
