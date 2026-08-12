import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/brand-mark";
import { useCurrentRole } from "@/hooks/use-current-role";
import { ADMIN_NAV, NAV, isNavActive } from "./nav-items";
import { SystemStatusPill, UserChip } from "./system-status-pill";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: roleInfo } = useCurrentRole();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="md:hidden h-10 w-10 shrink-0 grid place-items-center rounded-md border border-border bg-surface/60 text-muted-foreground hover:bg-surface-2 transition"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 flex flex-col bg-sidebar">
        <div className="px-5 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))] pb-4 border-b border-sidebar-border">
          <BrandMark height={32} />
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Centro de Comando
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
            Operação
          </div>
          {NAV.map((item) => {
            const active = isNavActive(pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 min-h-11 px-3 rounded-lg text-[14px] font-medium transition",
                  "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                  active && "bg-sidebar-accent text-foreground",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {roleInfo?.isAdmin && (
            <>
              <div className="px-2 pt-4 pb-1 text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
                Administração
              </div>
              {ADMIN_NAV.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 min-h-11 px-3 rounded-lg text-[14px] font-medium transition",
                      "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                      active && "bg-sidebar-accent text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <UserChip />
          <SystemStatusPill />
        </div>
      </SheetContent>
    </Sheet>
  );
}
