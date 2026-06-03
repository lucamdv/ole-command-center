import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Radio,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSystemStatus } from "@/lib/audit.functions";

const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/operacao", label: "Operação", icon: Radio },
  { to: "/apolices", label: "Apólices", icon: FileText },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/intelligence", label: "Oléver", icon: Sparkles },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchStatus = useServerFn(getSystemStatus);
  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const state = status?.state ?? "operational";
  const tone =
    state === "operational" ? "success" : state === "degraded" ? "warning" : "destructive";
  const label =
    state === "operational"
      ? "Sistema Operacional"
      : state === "degraded"
        ? "Sistema Degradado"
        : "Sistema Instável";
  const metric =
    status?.approvalRate != null
      ? `${status.approvalRate.toFixed(status.approvalRate >= 99.95 ? 2 : 1)}%`
      : "—";

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
        <div
          title={
            status?.approvalRate != null
              ? `Taxa de aprovação da última auditoria: ${status.approvalRate.toFixed(2)}%`
              : "Sem auditorias registradas"
          }
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md border",
            tone === "success" && "bg-success/10 border-success/20",
            tone === "warning" && "bg-warning/10 border-warning/20",
            tone === "destructive" && "bg-destructive/10 border-destructive/20",
          )}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulse-dot",
                tone === "success" && "bg-success",
                tone === "warning" && "bg-warning",
                tone === "destructive" && "bg-destructive",
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                tone === "success" && "bg-success",
                tone === "warning" && "bg-warning",
                tone === "destructive" && "bg-destructive",
              )}
            />
          </span>
          <div
            className={cn(
              "text-[11px] font-medium",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "ml-auto text-[10px] font-mono",
              tone === "success" && "text-success/70",
              tone === "warning" && "text-warning/70",
              tone === "destructive" && "text-destructive/70",
            )}
          >
            {metric}
          </div>
        </div>
      </div>
    </aside>
  );
}
