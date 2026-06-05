import { useEffect, useState } from "react";
import { Bell, Command, RefreshCw, Search } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { RECENT_ACTIVITIES } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  const [syncing, setSyncing] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  useEffect(() => {
    const i = setInterval(() => {
      setSyncing(true);
      setTimeout(() => {
        setLastSync(new Date().toISOString());
        setSyncing(false);
      }, 1100);
    }, 28_000);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/70 backdrop-blur-xl flex items-center px-5 gap-4 sticky top-0 z-30">
      <button
        onClick={onOpenPalette}
        className="group flex items-center gap-2.5 flex-1 max-w-xl h-9 px-3 rounded-lg bg-surface border border-border hover:border-primary/40 hover:bg-surface-2 transition text-left"
      >
        <Search className="h-4 w-4 text-muted-foreground/70" />
        <span className="text-[13px] text-muted-foreground/80 truncate">
          Pesquisar apólice, endosso, corretor, cobertura ou erro
        </span>
        <kbd className="ml-auto hidden sm:flex items-center gap-1 text-[10.5px] text-muted-foreground/70 font-mono px-1.5 py-0.5 rounded border border-border bg-background">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="hidden lg:flex items-center gap-2 px-2.5 h-8 rounded-md border border-border bg-surface/60">
        <RefreshCw className={cn("h-3.5 w-3.5 text-info", syncing && "animate-spin")} />
        <span className="text-[11px] text-muted-foreground">Sync</span>
        <span className="text-[11px] font-mono text-foreground">{relativeTime(lastSync)}</span>
      </div>

      <ThemeToggle />

      <div className="relative">
        <button
          onClick={() => setOpenNotif((v) => !v)}
          className="relative h-9 w-9 grid place-items-center rounded-md border border-border bg-surface/60 hover:bg-surface-2 transition"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
        </button>
        {openNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenNotif(false)} />
            <div className="absolute right-0 top-11 z-50 w-[360px] rounded-xl border border-border bg-surface shadow-elevated overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="text-[13px] font-semibold">Atividades recentes</div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {RECENT_ACTIVITIES.length} eventos
                </div>
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {RECENT_ACTIVITIES.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-surface-2/60 transition">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                          a.severity === "critical" && "bg-destructive shadow-[0_0_6px_var(--destructive)]",
                          a.severity === "high" && "bg-warning",
                          a.severity === "info" && "bg-info",
                          a.severity === "low" && "bg-muted-foreground",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-foreground leading-snug">{a.text}</div>
                        <div className="text-[10.5px] text-muted-foreground mt-0.5">{a.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-[12px] font-medium text-foreground">Luca Monteiro</span>
        <span className="text-[10px] text-muted-foreground">Operações · Admin</span>
      </div>
      <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-info grid place-items-center text-[11px] font-semibold text-primary-foreground ring-2 ring-background" title="Luca Monteiro">
        LM
      </div>
    </header>
  );
}
