import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useReminderPref } from "@/hooks/useReminderPref";
import { ReminderDial } from "@/components/ReminderDial";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK = [2, 4, 5, 7, 10];

const ReminderSettings = () => {
  const { prefs, setRemindBefore } = useReminderPref();
  const [pendingValue, setPendingValue] = useState(prefs.remindBeforeMin);

  const save = () => {
    setRemindBefore(pendingValue);
    toast.success(`Waarschuwing op ${pendingValue} min vooraf opgeslagen`);
  };

  return (
    <div className="app-page-panel pb-32">
      <PageHeader title="Standaard waarschuwing" subtitle="Wanneer wil je gewaarschuwd worden?" />

      <div className="card-soft flex flex-col items-center px-6 py-6">
        <ReminderDial value={pendingValue} onChange={setPendingValue} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPendingValue(m)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-base",
              pendingValue === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary text-primary hover:bg-primary/5"
            )}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="card-soft mt-5 flex items-center gap-3 p-4">
        <span className="mint-icon-tile grid h-9 w-9 shrink-0 place-items-center rounded-full">
          <Bell className="h-4 w-4" />
        </span>
        <p className="text-[13px] text-foreground">
          Waarschuwing ingesteld op <strong>{pendingValue} min</strong> voor het einde van je parkeertijd.
        </p>
      </div>

      <button type="button" onClick={save} className="btn-pill-primary mt-5 w-full">
        <Check className="h-4 w-4" /> Vastzetten als standaard
      </button>

      <p className="mt-3 px-2 text-center text-[11px] italic text-muted-foreground">
        Deze instelling wordt onthouden op dit toestel én gesynced met je account.
      </p>
    </div>
  );
};

export default ReminderSettings;
