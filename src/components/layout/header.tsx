import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Command, LogOut, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useNotifications } from "@/hooks/use-notifications";
import { getInitials, useProfile } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  const [syncing, setSyncing] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const { items, unread, markAllRead, markRead, remove, clearAll } = useNotifications();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sair");
    }
  }

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

  // mark all as read shortly after opening
  useEffect(() => {
    if (!openNotif || unread === 0) return;
    const t = setTimeout(() => markAllRead(), 800);
    return () => clearTimeout(t);
  }, [openNotif, unread, markAllRead]);

  return (
    <header className="shrink-0 min-h-14 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-3 sm:px-5 gap-2 sm:gap-3 sticky top-0 z-30">
      <MobileNav />

      <button
        onClick={onOpenPalette}
        className="hidden sm:flex group items-center gap-2.5 flex-1 max-w-md h-9 px-3 rounded-lg bg-surface-2/70 border border-border hover:border-primary/40 hover:bg-surface transition text-left min-w-0"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        <span className="text-[12.5px] text-muted-foreground/80 truncate">
          Pesquisar apólice, endosso, corretor ou erro
        </span>
        <kbd className="ml-auto hidden md:flex items-center gap-1 text-[10.5px] text-muted-foreground/70 font-mono px-1.5 py-0.5 rounded border border-border bg-background shrink-0">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <button
        onClick={onOpenPalette}
        className="sm:hidden h-10 w-10 shrink-0 grid place-items-center rounded-md border border-border bg-surface/60 text-muted-foreground hover:bg-surface-2 transition"
        aria-label="Pesquisar"
      >
        <Search className="h-4.5 w-4.5" />
      </button>

      <div className="flex-1" />

      <div className="hidden lg:flex items-center gap-2 pr-3 mr-1 border-r border-border shrink-0">
        <RefreshCw className={cn("h-3.5 w-3.5 text-primary/70", syncing && "animate-spin")} />
        <span className="caption">Sync</span>
        <span className="text-[11px] font-mono tabular-nums text-foreground">{relativeTime(lastSync)}</span>
      </div>

      <ThemeToggle />


      <div className="relative">
        <button
          onClick={() => setOpenNotif((v) => !v)}
          className="relative h-9 w-9 grid place-items-center rounded-md border border-border bg-surface/60 hover:bg-surface-2 transition"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-destructive text-[9.5px] font-semibold text-destructive-foreground shadow-[0_0_8px_var(--destructive)] tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {openNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenNotif(false)} />
            <div className="fixed sm:absolute left-2 right-2 sm:left-auto top-[calc(3.5rem+env(safe-area-inset-top))] sm:top-11 sm:right-0 z-50 w-auto sm:w-[380px] rounded-xl border border-border bg-surface shadow-elevated overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-semibold">Notificações</div>
                  {unread > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                      {unread} novas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={markAllRead}
                    disabled={unread === 0}
                    className="flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground disabled:opacity-40 px-1.5 py-1 rounded hover:bg-surface-2 transition"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Marcar lidas
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={items.length === 0}
                    className="flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-destructive disabled:opacity-40 px-1.5 py-1 rounded hover:bg-surface-2 transition"
                    title="Limpar tudo"
                  >
                    <Trash2 className="h-3 w-3" />
                    Limpar
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <div className="text-[12px] text-muted-foreground">Sem notificações</div>
                  </div>
                ) : (
                  items.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => markRead(a.id)}
                      className={cn(
                        "group/notif relative px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-surface-2/60 transition cursor-pointer",
                        !a.read && "bg-primary/[0.04]",
                      )}
                    >
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
                        <div className="flex-1 min-w-0 pr-6">
                          <div className={cn("text-[12.5px] leading-snug", a.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                            {a.text}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground mt-0.5">{a.time}</div>
                        </div>
                        {!a.read && (
                          <span className="absolute right-9 top-3 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(a.id);
                          }}
                          className="absolute right-2 top-2 h-6 w-6 grid place-items-center rounded opacity-0 group-hover/notif:opacity-100 hover:bg-surface-2 text-muted-foreground hover:text-destructive transition"
                          aria-label="Dispensar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-background/40 text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  {items.length} {items.length === 1 ? "evento" : "eventos"} no histórico
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
        <div className="hidden lg:flex flex-col items-end leading-tight min-w-0">
          <span className="text-[12px] font-medium text-foreground">{profile.nome}</span>
          <span className="text-[10px] text-muted-foreground">Operações · Admin</span>
        </div>
        <div
          className="h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-[11px] font-semibold text-primary-foreground"
          title={profile.nome}
        >
          {getInitials(profile.nome) || "OL"}
        </div>
        <button
          onClick={handleSignOut}
          className="h-9 w-9 grid place-items-center rounded-md border border-border bg-surface/60 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

    </header>
  );
}
