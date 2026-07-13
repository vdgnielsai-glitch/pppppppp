import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SHOPGO_SPOTS as FALLBACK_SPOTS,
  type ShopGoSpot,
} from "@/data/shopgo-spots";

type SpotsResponse = {
  spots: ShopGoSpot[];
  count: number;
  updated_at: string;
  disclaimer: string;
};

const fetchSpots = async (): Promise<SpotsResponse> => {
  const { data, error } = await supabase.functions.invoke("shopgo-spots", {
    body: {},
  });
  if (error || !data || !Array.isArray(data.spots)) {
    throw error ?? new Error("Geen Shop&Go-data ontvangen");
  }
  return data as SpotsResponse;
};

/**
 * Stale-while-revalidate Shop&Go list.
 * - Always returns instant data (server result, then bundled fallback if offline).
 * - Refreshes every 10 min and on window-focus.
 * - Never crashes the UI.
 */
export const useShopGoSpots = () => {
  const query = useQuery({
    queryKey: ["shopgo-spots"],
    queryFn: fetchSpots,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });

  const spots = query.data?.spots ?? FALLBACK_SPOTS;
  return {
    spots,
    isFromServer: !!query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    updatedAt: query.data?.updated_at,
  };
};
