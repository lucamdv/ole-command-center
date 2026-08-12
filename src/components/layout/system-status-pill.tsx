import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getSystemStatus } from "@/lib/audit.functions";
import { getInitials, useProfile } from "@/hooks/use-settings";
import { useCurrentRole } from "@/hooks/use-current-role";

export function SystemStatusPill({ compact = false }: { compact?: boolean }) {
  const fetchStatus = useServerFn(getSystemStatus);
  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const state = status?.state ?? "operational";
  const tone = state === "operational" ? "success" : state === "degraded" ? "warning" : "destructive";
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
    <div
      title={
        status?.approvalRate != null
          ? `Taxa de aprovação da última auditoria: ${status.approvalRate.toFixed(2)}%`
          : "Sem auditorias registradas"
      }
      className={cn(
        "flex items-center gap-2 rounded-md border",
        compact ? "justify-center px-1.5 py-2" : "px-2 py-1.5",
        tone === "success" && "bg-success/10 border-success/20",
        tone === "warning" && "bg-warning/10 border-warning/20",
        tone === "destructive" && "bg-destructive/10 border-destructive/20",
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
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
      {!compact && (
        <>
          <div
            className={cn(
              "text-[11px] font-medium truncate",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "ml-auto text-[10px] font-mono shrink-0",
              tone === "success" && "text-success/70",
              tone === "warning" && "text-warning/70",
              tone === "destructive" && "text-destructive/70",
            )}
          >
            {metric}
          </div>
        </>
      )}
    </div>
  );
}

export function UserChip({ compact = false }: { compact?: boolean }) {
  const { profile } = useProfile();
  const { data: roleInfo } = useCurrentRole();
  const roleLabel = roleInfo?.isAdmin ? "Admin" : roleInfo?.isManager ? "Manager" : "Usuário";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md hover:bg-sidebar-accent/40 transition",
        compact ? "justify-center px-1 py-2" : "px-2 py-2",
      )}
      title={`${profile.nome} · ${roleLabel}`}
    >
      <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-primary to-info grid place-items-center text-[11px] font-semibold text-primary-foreground">
        {getInitials(profile.nome) || "OL"}
      </div>
      {!compact && (
        <div className="leading-tight min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-foreground truncate" title={profile.nome}>
            {profile.nome}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">
            {profile.email} · {roleLabel}
          </div>
        </div>
      )}
    </div>
  );
}
