import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ParkoBay = {
  id: string;
  lat: number;
  lng: number;
  state: "free" | "occupied" | "unknown";
};
export type ParkoZone = {
  id: string;
  name: string;
  municipality: string;
  lat: number;
  lng: number;
  totalBays: number;
  freeBays: number;
  occupiedBays: number;
  unknownBays: number;
  bays: ParkoBay[];
};
export type ParkoPayload = {
  fetchedAt: string;
  zones: ParkoZone[];
  totalFree: number;
  totalBays: number;
};

const REFRESH_MS = 30_000;

/**
 * Live Parko Shop&Go availability via our edge proxy.
 * Auto-refreshes every 30s while mounted.
 */
export const useParkoLive = () => {
  const [data, setData] = useState<ParkoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data: payload, error: err } = await supabase.functions.invoke(
          "parko-shopgo-states"
        );
        if (!active) return;
        if (err) throw err;
        if ((payload as { error?: string })?.error) throw new Error((payload as { error: string }).error);
        setData(payload as ParkoPayload);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Kon live data niet laden");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return { data, loading, error };
};

/** Find the nearest Parko zone within `maxKm` of the given coordinates. */
export const nearestZone = (
  zones: ParkoZone[],
  lat: number,
  lng: number,
  maxKm = 0.15
): ParkoZone | null => {
  let best: { z: ParkoZone; d: number } | null = null;
  for (const z of zones) {
    const dLat = (z.lat - lat) * 111;
    const dLng = (z.lng - lng) * 70;
    const d = Math.hypot(dLat, dLng);
    if (d <= maxKm && (!best || d < best.d)) best = { z, d };
  }
  return best?.z ?? null;
};
