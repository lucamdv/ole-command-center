import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Clock, Cpu, Database, Zap } from "lucide-react";
import { formatDateTime, formatInt, formatPct, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Item {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "success" | "info" | "warning" | "default";
}

export function StatusBar() {
  const [now, setNow] = useState(new Date().toISOString());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date().toISOString()), 30_000);
    return () => clearInterval(i);
  }, []);

  const items: Item[] = [
    { icon: Activity, label: "Status Operacional", value: "Operacional", tone: "success" },
    { icon: Database, label: "Última sincronização", value: relativeTime(now), tone: "info" },
    { icon: Zap, label: "Execuções hoje", value: formatInt(12847), tone: "default" },
    { icon: Clock, label: "Tempo médio", value: "284 ms", tone: "default" },
    { icon: CheckCircle2, label: "Taxa de sucesso", value: formatPct(98.6), tone: "success" },
    { icon: Cpu, label: "Alertas ativos", value: formatInt(46), tone: "warning" },
  ];

  return (
    <div className="panel bg-surface/60 backdrop-blur grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 lg:divide-x divide-border overflow-hidden">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="flex items-center gap-3 px-4 py-3 min-w-0">
            <div
              className={cn(
                "h-8 w-8 grid place-items-center rounded-lg shrink-0",
                it.tone === "success" && "bg-success/10 text-success",
                it.tone === "info" && "bg-info/10 text-info",
                it.tone === "warning" && "bg-warning/10 text-warning",
                (!it.tone || it.tone === "default") && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 truncate">
                {it.label}
              </div>
              <div className="text-[13px] font-semibold tabular-nums text-foreground truncate">{it.value}</div>
            </div>
          </div>
        );
      })}
      <div className="hidden lg:block absolute" />
      <div className="sr-only">{formatDateTime(now)}</div>
    </div>
  );
}
