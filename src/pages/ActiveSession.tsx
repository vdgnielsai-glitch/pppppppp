import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Circle, MapPin, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDataSource, type Session } from "@/hooks/useDataSource";
import { useReminderPref } from "@/hooks/useReminderPref";
import { formatMMSS, SHOPGO_DURATION_SEC } from "@/lib/format";
import { cancelSessionAlarms, ensureNotificationPermission, showOngoingTimerNotification } from "@/lib/notifications";

const NAVY = "#1A1D2E";
const GREEN = "#00C896";
const ORANGE = "#FFA500";
const RED = "#FF4757";
const LIGHT = "#9CA3AF";

type RingState = "ok" | "warn" | "danger";

const ActiveSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSession, endSession: endIt } = useDataSource();
  const { prefs } = useReminderPref();
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const announcedRef = useRef<Set<RingState | "expired">>(new Set());

  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = await getSession(id);
      if (!s) {
        toast.error("Sessie niet gevonden");
        navigate("/", { replace: true });
        return;
      }
      setSession(s);
      setLoading(false);
      // Start de "altijd zichtbare" widget-notificatie zodra de sessie geladen is.
      try {
        const ok = await ensureNotificationPermission();
        if (ok) {
          await showOngoingTimerNotification({
            sessionId: s.id,
            endsAt: new Date(s.ends_at),
            locationLabel: s.address ?? undefined,
          });
        }
      } catch {
        /* stil falen — notificatie is best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = session
    ? Math.max(0, Math.floor((new Date(session.ends_at).getTime() - now) / 1000))
    : 0;
  const remainingMin = remainingSec / 60;
  const expired = !!session && new Date(session.ends_at).getTime() <= now;

  // Ring state mapping per spec.
  const ringState: RingState = remainingMin > 10 ? "ok" : remainingMin >= 5 ? "warn" : "danger";
  const ringColor = ringState === "ok" ? GREEN : ringState === "warn" ? ORANGE : RED;

  // Toast announcements at thresholds.
  useEffect(() => {
    if (!session || session.ended_at) return;
    const announce = (key: RingState | "expired", msg: string) => {
      if (announcedRef.current.has(key)) return;
      announcedRef.current.add(key);
      toast.warning(msg);
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    };
    if (expired) announce("expired", "Tijd is om!");
    else if (ringState === "danger") announce("danger", "Minder dan 5 minuten — vertrek nu");
    else if (ringState === "warn") announce("warn", "Nog 10 minuten te gaan");
  }, [ringState, expired, session]);

  const stop = async () => {
    if (!session) return;
    try {
      await cancelSessionAlarms(session.id);
      await endIt(session.id);
      toast.success("Sessie beëindigd");
      navigate("/");
    } catch (e: any) {
      toast.error("Kon sessie niet beëindigen", { description: e?.message });
    }
  };

  const showOnMap = () => {
    if (!session?.lat || !session?.lng) return toast.error("Geen locatie opgeslagen");
    const url = `https://www.google.com/maps/search/?api=1&query=${session.lat},${session.lng}`;
    window.open(url, "_blank");
  };

  // Geometry — thicker stroke per spec.
  const STROKE = 14;
  const VIEW = 300;
  const radius = (VIEW - STROKE) / 2 - 4; // padding
  const circumference = 2 * Math.PI * radius;
  const total = SHOPGO_DURATION_SEC;
  const elapsed = Math.min(total, total - remainingSec);
  const progress = total > 0 ? elapsed / total : 0;
  const dashOffset = circumference * (1 - progress);

  // Warning-info card: minutes until reminder fires.
  // Reminder fires at (ends_at - remindBeforeMin). Show countdown to that moment.
  const reminderInMin = useMemo(() => {
    if (!session || prefs.remindBeforeMin <= 0) return null;
    const reminderAt = new Date(session.ends_at).getTime() - prefs.remindBeforeMin * 60_000;
    const diffMin = Math.ceil((reminderAt - now) / 60_000);
    return diffMin;
  }, [session, prefs.remindBeforeMin, now]);

  if (loading || !session) {
    return (
      <div
        className="fixed inset-0 z-40 grid place-items-center"
        style={{ backgroundColor: NAVY }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: GREEN, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const startTime = new Date(session.started_at).toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const locationTitle = session.address?.split(",")[0]?.trim() || "Huidige locatie";
  const locationSub =
    session.address && session.address.includes(",")
      ? session.address.split(",").slice(1).join(",").trim()
      : null;

  return (
    <>
      {/* Ambient gradient backdrop — full viewport, boven AppLayout's bg-background dankzij position:fixed + z-0 op eigen stacking context. */}
      <div
        className={`fixed inset-0 pointer-events-none ambient-backdrop ${
          ringState === "danger" ? "ambient-status-danger" : ringState === "warn" ? "ambient-status-warn" : "ambient-status-ok"
        }`}
        style={{ zIndex: 0 }}
        aria-hidden
      />

      {/* Break out of the AppLayout container so the page truly fills width. */}
      <div
        className="relative -mx-4 -mt-4 min-h-[calc(100dvh-4rem)] pb-28 text-white"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: LIGHT }}
              >
                Actieve sessie
              </div>
              <h1 className="mt-1 text-[22px] font-bold leading-tight text-white">
                {locationTitle}
              </h1>
              {locationSub && (
                <div className="text-xs" style={{ color: LIGHT }}>
                  {locationSub}
                </div>
              )}
            </div>
            <div className="text-right leading-tight">
              <div
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: LIGHT }}
              >
                Start
              </div>
              <div className="text-xl font-bold text-white tabular-nums">{startTime}</div>
            </div>
          </div>

          {session.car && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15">
              <Circle
                className="h-2.5 w-2.5"
                style={{ color: session.car.color_hex }}
                fill="currentColor"
                strokeWidth={0}
              />
              <span className="font-semibold text-white">{session.car.name}</span>
              {session.car.plate && (
                <>
                  <span className="text-white/50">·</span>
                  <span className="text-white/90">{session.car.plate}</span>
                </>
              )}
            </div>
          )}
        </header>

        <div className="space-y-5 px-5">
          {/* === Hero glass card met countdown ring === */}
          <div
            className={`glass-float animate-glass-in rounded-[24px] p-6 ${
              remainingMin < 5 || expired ? "animate-breathe-danger" : remainingMin < 10 ? "animate-breathe" : ""
            }`}
          >
          <div className="relative mx-auto aspect-square w-full max-w-[280px]">

            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 -rotate-90">
              {/* Track */}
              <circle
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={STROKE}
              />
              {/* Progress */}
              <circle
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transition: "stroke-dashoffset 1s linear, stroke 0.4s ease",
                  filter:
                    ringState === "ok"
                      ? `drop-shadow(0 0 10px ${GREEN}66)`
                      : ringState === "danger"
                      ? `drop-shadow(0 0 10px ${RED}88)`
                      : `drop-shadow(0 0 8px ${ORANGE}66)`,
                }}
                className={ringState === "danger" || expired ? "animate-pulse-danger" : ""}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div
                  className={`font-bold tabular-nums leading-none text-white ${
                    ringState === "danger" || expired ? "animate-pulse-danger" : ""
                  }`}
                  style={{ fontSize: "clamp(64px, 18vw, 96px)", letterSpacing: "-0.03em" }}
                >
                  {formatMMSS(remainingSec)}
                </div>
                <div
                  className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: LIGHT }}
                >
                  {expired ? "Verlopen" : "Resterend"}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: LIGHT }}>
                  van 30:00
                </div>
              </div>
            </div>
          </div>
          </div>
          {/* /hero glass card */}

          {/* === Warning info card === */}
          {prefs.remindBeforeMin > 0 && reminderInMin !== null && (
            <div
              className="glass-light rounded-2xl px-4 py-3 animate-glass-in"
              style={{ color: NAVY }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: `${GREEN}26`, color: GREEN }}
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="text-[14px] font-semibold leading-tight">
                  {reminderInMin > 0 ? (
                    <>🔔 Waarschuwing over <strong>{reminderInMin} min</strong></>
                  ) : (
                    <>🔔 Waarschuwing actief</>
                  )}
                  <div className="mt-0.5 text-[12px] font-normal" style={{ color: "#4B5563" }}>
                    {prefs.remindBeforeMin} min voor het einde
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === Show parked location === */}
          <button
            type="button"
            onClick={showOnMap}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-[14px] font-semibold text-white ring-1 ring-white/10 transition-base hover:bg-white/10 active:scale-[0.99]"
          >
            <MapPin className="h-4 w-4" style={{ color: GREEN }} />
            Toon geparkeerde locatie op kaart
          </button>

          {/* === End-session button === */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 bg-transparent text-sm font-bold uppercase tracking-wider transition-base active:scale-[0.99]"
                style={{ borderColor: RED, color: RED }}
              >
                <Trash2 className="h-5 w-5" />
                Sessie beëindigen
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sessie beëindigen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dit stopt de timer en bewaart de sessie in je geschiedenis.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction onClick={stop}>Beëindig</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
};

export default ActiveSession;
