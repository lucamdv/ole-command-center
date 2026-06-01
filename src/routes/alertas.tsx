import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { ALERTS, type Severity, type AlertStatus } from "@/lib/mock/data";
import { formatBRL, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas · OLÉ COPILOT" },
      { name: "description", content: "Centro de operações de segurança: incidentes operacionais por severidade." },
    ],
  }),
  component: AlertasPage,
});

const SEV_BORDER: Record<Severity, string> = {
  critical: "border-l-destructive shadow-[inset_4px_0_0_var(--destructive),0_0_30px_-15px_var(--destructive)]",
  high: "border-l-warning shadow-[inset_4px_0_0_var(--warning)]",
  medium: "border-l-info shadow-[inset_4px_0_0_var(--info)]",
  low: "border-l-muted-foreground shadow-[inset_4px_0_0_var(--muted-foreground)]",
};
const SEV_TEXT: Record<Severity, string> = {
  critical: "text-destructive",
  high: "text-warning",
  medium: "text-info",
  low: "text-muted-foreground",
};

function AlertasPage() {
  const [sev, setSev] = useState<Severity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");

  const filtered = useMemo(
    () =>
      ALERTS.filter((a) => (sev === "all" || a.severity === sev) && (status === "all" || a.status === status)),
    [sev, status],
  );

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of ALERTS) c[a.severity]++;
    return c;
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-warning">SOC · INCIDENT VIEW</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight">Alertas</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Cada alerta é um incidente operacional. {filtered.length} de {ALERTS.length} visíveis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-surface text-[12.5px] hover:bg-surface-2 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </button>
        </div>
      </div>

      {/* Severity tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
          <button
            key={s}
            onClick={() => setSev(sev === s ? "all" : s)}
            className={cn(
              "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
              sev === s ? "border-primary/60 shadow-glow" : "border-border",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-[10.5px] uppercase tracking-wider font-semibold", SEV_TEXT[s])}>{s}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${s === "critical" ? "destructive" : s === "high" ? "warning" : s === "medium" ? "info" : "muted-foreground"}`)} />
            </div>
            <div className="text-[24px] font-semibold tabular-nums">{counts[s]}</div>
            <div className="text-[11px] text-muted-foreground">incidentes registrados</div>
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted-foreground">Status:</span>
        {(["all", "open", "investigating", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11.5px] font-medium border transition",
              status === s ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "all" ? "Todos" : s === "open" ? "Abertos" : s === "investigating" ? "Em análise" : "Resolvidos"}
          </button>
        ))}
      </div>

      {/* Incident list */}
      <div className="space-y-2">
        {filtered.slice(0, 40).map((a) => (
          <Link
            key={a.id}
            to="/apolices"
            className={cn(
              "block rounded-xl border border-border bg-surface hover:bg-surface-2/60 transition pl-4 pr-4 py-3 border-l-4",
              SEV_BORDER[a.severity],
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded", `${SEV_TEXT[a.severity]} bg-${a.severity === "critical" ? "destructive" : a.severity === "high" ? "warning" : a.severity === "medium" ? "info" : "muted"}/10`)}>
                    {a.severity}
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">{a.title}</span>
                  <span
                    className={cn(
                      "text-[10px] uppercase font-mono px-1.5 py-0.5 rounded",
                      a.status === "open" && "bg-destructive/10 text-destructive",
                      a.status === "investigating" && "bg-warning/10 text-warning",
                      a.status === "resolved" && "bg-success/10 text-success",
                    )}
                  >
                    {a.status}
                  </span>
                </div>
                <div className="text-[11.5px] text-muted-foreground">{a.description}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                  <span className="font-mono text-foreground/80">{a.policyNumber}</span>
                  <span>·</span>
                  <span>{a.broker}</span>
                  <span>·</span>
                  <span>{a.product}</span>
                  <span>·</span>
                  <span>Impacto <span className="font-mono text-foreground">{formatBRL(a.impact)}</span></span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-muted-foreground">{relativeTime(a.createdAt)}</div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 inline-block mt-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
