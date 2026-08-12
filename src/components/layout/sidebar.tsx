import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/brand-mark";
import { useCurrentRole } from "@/hooks/use-current-role";
import { ADMIN_NAV, NAV, isNavActive } from "./nav-items";
import { SystemStatusPill, UserChip } from "./system-status-pill";

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: roleInfo } = useCurrentRole();

  return (
    <aside className="hidden md:flex w-[72px] xl:w-[248px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl transition-[width]">
      {/* Logo */}
      <div className="px-3 xl:px-5 pt-5 pb-5 border-b border-sidebar-border">
        <Link to="/" className="flex flex-col gap-1.5 group items-center xl:items-start">
          <BrandMark height={32} className="xl:h-9" />
          <div className="hidden xl:flex items-center gap-1.5 pl-0.5">
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Olé Copilot · Centro de Comando
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 xl:px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="hidden xl:block px-2 pb-2 text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
          Operação
        </div>
        {NAV.map((item) => {
          const active = isNavActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                "group flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all",
                "justify-center xl:justify-start px-2 xl:px-2.5 py-2 xl:py-1.5",
                "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                active && "bg-sidebar-accent text-foreground shadow-sm",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground",
                )}
              />
              <span className="hidden xl:inline truncate">{item.label}</span>
              {active && <span className="hidden xl:inline ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />}
            </Link>
          );
        })}

        {roleInfo?.isAdmin && (
          <>
            <div className="hidden xl:block px-2 pt-4 pb-2 text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
              Administração
            </div>
            <div className="xl:hidden my-2 mx-2 border-t border-sidebar-border" />
            {ADMIN_NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all",
                    "justify-center xl:justify-start px-2 xl:px-2.5 py-2 xl:py-1.5",
                    "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                    active && "bg-sidebar-accent text-foreground shadow-sm",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  <span className="hidden xl:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 xl:p-3 space-y-2">
        <div className="xl:hidden">
          <UserChip compact />
          <SystemStatusPill compact />
        </div>
        <div className="hidden xl:block space-y-2">
          <UserChip />
          <SystemStatusPill />
        </div>
      </div>
    </aside>
  );
}
