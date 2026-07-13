import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initPromise: Promise<typeof globalThis.google> | null = null;

export function loadGoogleMaps(): Promise<typeof globalThis.google> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Public endpoint — apikey header is enough (verify_jwt=false on the function).
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/maps-config`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      initPromise = null;
      throw new Error("Kon kaart niet laden");
    }
    const data = await res.json();
    if (!data?.apiKey) {
      initPromise = null;
      throw new Error("Kaart-sleutel ontbreekt");
    }

    setOptions({ key: data.apiKey as string, v: "weekly" });
    await importLibrary("maps");
    await importLibrary("marker");
    return globalThis.google;
  })();

  return initPromise;
}
