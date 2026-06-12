import { CheckCircle2, Clock, AlertTriangle, Activity, ListChecks, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metrics {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  completionRate: number;
}

const items = [
  { key: "total", label: "Total no período", icon: ListChecks, accent: "text-foreground", bg: "bg-surface-2" },
  { key: "pending", label: "Pendentes", icon: Clock, accent: "text-muted-foreground", bg: "bg-surface-2" },
  { key: "inProgress", label: "Em andamento", icon: Activity, accent: "text-blue-500", bg: "bg-blue-500/5" },
  { key: "done", label: "Concluídas", icon: CheckCircle2, accent: "text-emerald-500", bg: "bg-emerald-500/5" },
  { key: "overdue", label: "Atrasadas", icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/5" },
  { key: "completionRate", label: "Taxa de conclusão", icon: TrendingUp, accent: "text-primary", bg: "bg-primary/5", suffix: "%" },
] as const;

export function KpiStrip({ metrics }: { metrics?: Metrics }) {
  const m = metrics ?? { total: 0, pending: 0, inProgress: 0, done: 0, overdue: 0, completionRate: 0 };
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {items.map((it) => {
        const Icon = it.icon;
        const value = m[it.key as keyof Metrics] ?? 0;
        return (
          <div key={it.key} className={cn("rounded-xl border border-border p-3.5 transition hover:border-primary/30", it.bg)}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{it.label}</span>
              <Icon className={cn("h-3.5 w-3.5", it.accent)} />
            </div>
            <div className={cn("text-[22px] font-semibold tabular-nums leading-none", it.accent)}>
              {value}
              {"suffix" in it && it.suffix ? <span className="text-[14px] opacity-70 ml-0.5">{it.suffix}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
