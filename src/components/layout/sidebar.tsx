import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  GitBranch,
  LayoutDashboard,
  Settings,
  Sparkles,
  Radio,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/operacao", label: "Operação", icon: Radio },
  { to: "/apolices", label: "Apólices", icon: FileText },
  { to: "/endossos", label: "Endossos", icon: GitBranch },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/intelligence", label: "Oléver", icon: Sparkles },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Activity className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/15" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-foreground">OLÉ COPILOT</div>
            <div className="text-[10.5px] text-muted-foreground tracking-wide uppercase">Centro de Comando</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground/60">
          Operação
        </div>
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all",
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
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent/40 transition cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-info grid place-items-center text-[11px] font-semibold text-primary-foreground">
            LM
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-foreground truncate">Luca Monteiro</div>
            <div className="text-[10.5px] text-muted-foreground truncate">Operações · Admin</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-success/10 border border-success/20">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-pulse-dot" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <div className="text-[11px] font-medium text-success">Sistema Operacional</div>
          <div className="ml-auto text-[10px] font-mono text-success/70">99.98%</div>
        </div>
      </div>
    </aside>
  );
}
