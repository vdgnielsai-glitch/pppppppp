import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, MapPin, Bell, ChevronRight, Loader2, Star } from "lucide-react";
import { useDataSource } from "@/hooks/useDataSource";
import { useReminderPref } from "@/hooks/useReminderPref";
import { useParkoLive, nearestZone, type ParkoZone } from "@/hooks/useParkoLive";
import { distKm, driveMin, formatDist, navigateTo, zoneStatus } from "@/lib/parko";
import { SHOPGO_DURATION_SEC, formatMMSS, getTimerState } from "@/lib/format";
import { ensureNotificationPermission, scheduleSessionAlarms } from "@/lib/notifications";
import { NearbyMap } from "@/components/NearbyMap";
import { AppHeader } from "@/components/AppHeader";
import { StartTimerSheet } from "@/components/StartTimerSheet";
import { cn } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const { activeSession, startSession, cars } = useDataSource();
  const { prefs } = useReminderPref();
  const { data: parko, loading: parkoLoading } = useParkoLive();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("Locatie ophalen…");
  const [, setTick] = useState(0);
  const [starting, setStarting] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Tick for live timer
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  // Geolocation
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setAddress("Locatie niet beschikbaar");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress("Kortrijk centrum");
      },
      () => setAddress("Kortrijk centrum"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  }, []);

  // Sort zones by distance
  const sortedZones = useMemo(() => {
    const zones = parko?.zones ?? [];
    if (!coords) {
      return zones
        .filter((z) => z.freeBays > 0)
        .sort((a, b) => b.freeBays - a.freeBays)
        .map((z) => ({ z, d: 0 }));
    }
    return zones
      .filter((z) => z.freeBays > 0)
      .map((z) => ({ z, d: distKm(coords, z) }))
      .sort((a, b) => a.d - b.d);
  }, [parko, coords]);

  const recommended = sortedZones[0];
  const others = sortedZones.slice(1, 8);

  const openStart = () => {
    if (!recommended || starting || activeSession) return;
    setShowStartSheet(true);
  };

  const confirmStart = async (remindBeforeMin: number) => {
    if (!recommended) return;
    setStarting(true);
    try {
      const wantsReminder = remindBeforeMin > 0;
      const granted = wantsReminder ? await ensureNotificationPermission() : false;
      if (wantsReminder && !granted) {
        toast.warning("Meldingen staan uit", {
          description: "Zonder meldingen krijg je geen alarm bij vergrendeld scherm.",
        });
      }
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + SHOPGO_DURATION_SEC * 1000);
      const matchedZone =
        coords && parko ? nearestZone(parko.zones, coords.lat, coords.lng, 0.15) : null;
      const sessionAddress = matchedZone?.name ?? recommended.z.name ?? address;
      const defaultCar = cars.find((c) => c.is_default) ?? cars[0];
      const session = await startSession({
        car_id: defaultCar?.id ?? null,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        address: sessionAddress,
        spot_id: matchedZone ? `parko:${matchedZone.id}` : null,
      });
      if (granted && wantsReminder) {
        await scheduleSessionAlarms({
          sessionId: session.id,
          endsAt,
          remindBeforeMin,
          locationLabel: sessionAddress?.split(",")[0]?.trim(),
        });
      }
      setShowStartSheet(false);
      navigate(`/session/${session.id}`);
    } catch (e: any) {
      toast.error("Kon sessie niet starten", { description: e?.message });
    } finally {
      setStarting(false);
    }
  };

  const remainingSec = activeSession
    ? Math.floor((new Date(activeSession.ends_at).getTime() - Date.now()) / 1000)
    : 0;
  const timerState = getTimerState(remainingSec);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-deep">
      {/* Fullscreen map */}
      <div className="absolute inset-0">
        <NearbyMap
          userCoords={coords}
          zones={parko?.zones ?? []}
          recommendedZoneId={recommended?.z.id ?? null}
          onZoneTap={(z) => navigate(`/locatie/${encodeURIComponent(z.id)}`)}
          height="100%"
          showFilters={false}
        />
      </div>

      {/* Floating header */}
      <AppHeader floating />

      {/* Search bar + chip */}
      <div className="pt-safe absolute left-0 right-0 z-20 px-3" style={{ top: "calc(env(safe-area-inset-top) + 44px)" }}>
        <div className="mx-auto max-w-md space-y-1.5">
          <Link
            to="/zones"
            className="flex h-10 w-full items-center gap-2 rounded-full bg-white/95 px-4 text-sm text-slate-500 shadow-elevated ring-1 ring-black/5 backdrop-blur transition-base hover:text-slate-900"
            aria-label="Zoek een parkeerplek"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.5} />
            <span className="text-[13px] font-medium">Waar wil je parkeren?</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-elevated ring-1 ring-black/5 backdrop-blur">
            <MapPin className="h-3 w-3 text-primary" />
            {address}
          </div>
        </div>
      </div>

      {/* Active-session sticky banner */}
      {activeSession && (
        <Link
          to={`/session/${activeSession.id}`}
          className={cn(
            "absolute left-3 right-3 z-30 flex items-center justify-between rounded-2xl px-4 py-3 text-white shadow-elevated transition-base",
            timerState === "danger" || timerState === "expired"
              ? "bg-destructive animate-pulse-danger"
              : timerState === "warning-5"
              ? "bg-warning"
              : "bg-deep"
          )}
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 320px)" }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              ⏱ Sessie actief
            </div>
            <div className="font-display text-[22px] leading-none">
              nog {formatMMSS(remainingSec)}
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "pb-safe absolute left-0 right-0 bottom-[64px] z-20 mx-auto max-w-md rounded-t-[28px] bg-card text-card-foreground shadow-sheet transition-[max-height] duration-300",
          sheetExpanded ? "max-h-[62vh]" : "max-h-[34vh]"
        )}
      >
        {/* Drag handle */}
        <button
          type="button"
          onClick={() => setSheetExpanded((v) => !v)}
          aria-label={sheetExpanded ? "Inklappen" : "Uitklappen"}
          className="mx-auto block w-full pt-3 pb-1"
        >
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </button>

        <div className="overflow-y-auto px-4 pb-3" style={{ maxHeight: sheetExpanded ? "55vh" : "28vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between pt-1 pb-3">
            <h2 className="text-[18px] font-bold leading-tight text-foreground">
              Vrije plekken in de buurt
            </h2>
            <span className="pill pill-free">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
              Live
            </span>
          </div>

          {parkoLoading && !parko ? (
            <div className="card-soft flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Laden…
            </div>
          ) : !recommended ? (
            <div className="card-soft p-4 text-sm">
              <div className="font-bold text-destructive">Geen vrije plek nu</div>
              <div className="text-muted-foreground">Probeer over 30 seconden opnieuw.</div>
            </div>
          ) : (
            <>
              {/* Horizontale carousel met alle vrije plekken */}
              <div className="-mx-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-3 px-4">
                  {sortedZones.slice(0, 10).map(({ z, d }, idx) => (
                    <SpotCarouselCard
                      key={z.id}
                      zone={z}
                      distanceKm={coords ? d : null}
                      isBest={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* CTA — start sessie op aanbevolen plek */}
              <button
                type="button"
                onClick={openStart}
                disabled={starting || !!activeSession}
                className="btn-pill-primary mt-4 w-full"
              >
                {starting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : activeSession ? (
                  "Sessie loopt al"
                ) : (
                  <>Start 30 min op {recommended.z.name}</>
                )}
              </button>

              {/* Reminder row */}
              <Link
                to="/instellingen/waarschuwing"
                className="mt-3 flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-[13px] hover:bg-muted/80"
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Waarschuwing: <strong>{prefs.remindBeforeMin} min</strong> voor einde
                </span>
                <span className="text-xs font-semibold text-primary">Wijzigen ›</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <StartTimerSheet
        open={showStartSheet}
        onClose={() => (starting ? null : setShowStartSheet(false))}
        onConfirm={confirmStart}
        starting={starting}
      />
    </div>
  );
};

type SpotCarouselCardProps = {
  zone: ParkoZone;
  distanceKm: number | null;
  isBest?: boolean;
};

const SpotCarouselCard = forwardRef<HTMLAnchorElement, SpotCarouselCardProps>(
  ({ zone, distanceKm, isBest }, ref) => {
    const status = zoneStatus(zone);
    const pct = zone.totalBays > 0 ? Math.round((zone.freeBays / zone.totalBays) * 100) : 0;
    const barColor =
      status === "free" ? "bg-success" :
      status === "warn" ? "bg-warning" :
      status === "full" ? "bg-destructive" : "bg-muted-foreground/30";
    return (
      <Link
        ref={ref}
        to={`/locatie/${encodeURIComponent(zone.id)}`}
        className={cn(
          "block w-[240px] shrink-0 rounded-2xl bg-card p-4 text-card-foreground shadow-card transition-base active:scale-[0.99]",
          isBest && "ring-2 ring-primary/40 shadow-glow-mint"
        )}
      >
        {isBest && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Star className="h-3 w-3 fill-current" /> Beste
          </div>
        )}
        <div className="mb-1 truncate text-[15px] font-bold leading-tight">{zone.name}</div>
        <div className="text-[12px] text-muted-foreground">
          <strong className="text-foreground">{zone.freeBays} vrij</strong> / {zone.totalBays} totaal
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
        </div>
        {distanceKm !== null && (
          <div className="mt-2 text-[11px] font-semibold text-foreground">
            🚗 {driveMin(distanceKm)} min · {formatDist(distanceKm)}
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            navigateTo(zone);
          }}
          className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 text-[13px] font-bold text-primary-foreground shadow-glow-mint active:scale-[0.98]"
        >
          Navigeer →
        </button>
      </Link>
    );
  }
);
SpotCarouselCard.displayName = "SpotCarouselCard";

export default Home;
