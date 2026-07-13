import { Link } from "react-router-dom";
import {
  Bell, Car as CarIcon, History as HistoryIcon, Info, Languages, Moon,
  Sparkles, User as UserIcon, ChevronRight, Lock, Shield, Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { tap as hapticTap } from "@/lib/haptics";
import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";

type IconType = typeof Bell;

const IconTile = ({ Icon }: { Icon: IconType }) => (
  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
    <Icon className="h-[18px] w-[18px]" />
  </span>
);

type NavRowProps = {
  to?: string;
  onClick?: () => void;
  icon: IconType;
  label: string;
  value?: string;
  locked?: boolean;
};

const NavRow = ({ to, onClick, icon: Icon, label, value, locked }: NavRowProps) => {
  const inner = (
    <>
      <IconTile Icon={Icon} />
      <span className="flex-1 text-[16px] font-semibold text-card-foreground">{label}</span>
      {value && (
        <span className="text-[14px] font-medium text-card-muted">{value}</span>
      )}
      {locked ? (
        <Lock className="h-4 w-4 text-card-muted" />
      ) : (
        <ChevronRight className="h-4 w-4 text-card-muted" />
      )}
    </>
  );
  const cls = "flex min-h-[60px] w-full items-center gap-3 px-4 py-3 transition-colors active:bg-muted/50";
  const tap = () => hapticTap();
  if (to) {
    return (
      <Link to={to} onClick={tap} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => { tap(); onClick?.(); }} className={cls}>
      {inner}
    </button>
  );
};

type ToggleRowProps = {
  icon: IconType;
  label: string;
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  trailingLabel?: string;
};

const ToggleRow = ({ icon: Icon, label, checked, disabled, locked, trailingLabel }: ToggleRowProps) => (
  <div className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3">
    <IconTile Icon={Icon} />
    <span className="flex-1 text-[16px] font-semibold text-card-foreground">{label}</span>
    {trailingLabel && (
      <span className="text-[13px] font-medium text-card-muted">{trailingLabel}</span>
    )}
    {locked && <Lock className="h-4 w-4 text-card-muted" />}
    <Switch checked={checked} disabled={disabled} aria-label={label} />
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-6 px-2 text-[12px] font-bold uppercase tracking-wider text-foreground/80">
    {children}
  </h2>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="card-soft overflow-hidden divide-y divide-border/40">
    {children}
  </div>
);

const Settings = () => {
  const { user } = useAuth();
  const { premium } = usePremium();

  return (
    <div className="-mx-4 min-h-[calc(100dvh-9rem)] bg-background px-4 pb-8">
      <PageHeader title="Instellingen" hideBack />

      <SectionTitle>Parkeren</SectionTitle>
      <Card>
        <NavRow to="/instellingen/waarschuwing" icon={Bell} label="Waarschuwingstijd" value="5 min" />
        <NavRow to="/auto" icon={CarIcon} label="Mijn voertuigen" />
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <NavRow
          to="/profiel"
          icon={UserIcon}
          label={user ? "Profiel & account" : "Inloggen / Registreren"}
        />
        <NavRow to="/historiek" icon={HistoryIcon} label="Historiek" locked={!premium} />
      </Card>

      <SectionTitle>App</SectionTitle>
      <Card>
        <ToggleRow icon={Languages} label="Taal" checked={false} disabled trailingLabel="NL" />
        <ToggleRow icon={Moon} label="Donkere modus" checked={false} disabled locked />
        <ToggleRow icon={Smartphone} label="Notificaties" checked={true} />
      </Card>

      {!premium && (
        <Link
          to="/premium"
          onClick={() => hapticTap()}
          className="mt-5 flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-glow-mint active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">Premium</div>
              <div className="font-display text-[18px] leading-tight">Upgrade naar Premium</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      <SectionTitle>Info</SectionTitle>
      <Card>
        <NavRow icon={Info} label="Over Shop&Go" value={`v${APP_VERSION}`} />
        <NavRow icon={Shield} label="Privacybeleid" />
      </Card>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Shop&Go · v{APP_VERSION} · {APP_BUILD_DATE}
      </p>
    </div>
  );
};

export default Settings;
