import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";
import { ResponsiveContainer } from "@/components/charts/in-view-container";
import { Activity, AlertOctagon, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { HOURLY_THROUGHPUT } from "@/lib/mock/data";
import { formatInt, formatPct } from "@/lib/format";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { cn } from "@/lib/utils";

const QUEUE_ITEMS = [
  { id: "OLE-02400048", broker: "Vértice Seguros", step: "Auditoria de Vigência", progress: 78 },
  { id: "OLE-02400049", broker: "Capital Seguros", step: "Validação de Cobertura", progress: 42 },
  { id: "OLE-02400050", broker: "Aliança Corretora", step: "Reconciliação Financeira", progress: 91 },
  { id: "OLE-02400051", broker: "Núcleo Corretora", step: "Análise de Endosso", progress: 24 },
];

const HEALTH_PCT = 98.6;
const ERROR_RATIO = [
  { name: "Conformes", value: 86, color: "var(--success)" },
  { name: "Não conformes", value: 14, color: "var(--destructive)" },
];

export function PulsoOperacional() {
  const health = useAnimatedCounter(HEALTH_PCT);
  const [queue, setQueue] = useState(QUEUE_ITEMS);

  useEffect(() => {
    const i = setInterval(() => {
      setQueue((q) =>
        q.map((it) => ({
          ...it,
          progress: it.progress >= 98 ? Math.floor(20 + Math.random() * 30) : Math.min(100, it.progress + Math.random() * 7),
        })),
      );
    }, 4000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") clearInterval(i);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-linear-to-r from-surface to-surface-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center">
              <Activity className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface animate-pulse-dot" />
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight">Pulso Operacional</div>
            <div className="text-[11px] text-muted-foreground">Saúde da operação em tempo real · atualizado a cada 30s</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" /> LIVE
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
        {/* Health gauge */}
        <div className="bg-surface p-5 lg:row-span-2">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Saúde da Operação</div>
          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
              {health.toFixed(1)}
            </span>
            <span className="text-[16px] text-muted-foreground">%</span>
          </div>

          <div className="relative h-[180px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ERROR_RATIO}
                  innerRadius={62}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {ERROR_RATIO.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <CheckCircle2 className="h-5 w-5 text-success mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Conformidade</div>
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            {ERROR_RATIO.map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                <span className="text-muted-foreground">{e.name}</span>
                <span className="ml-auto font-mono text-foreground">{formatPct(e.value, 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Volume processado · 24h</div>
            <div className="flex items-center gap-1.5 text-[11px] text-success">
              <TrendingUp className="h-3 w-3" />
              <span className="font-mono">+12.4%</span>
            </div>
          </div>
          <div className="text-[20px] sm:text-[24px] font-semibold tabular-nums leading-tight">{formatInt(12847)}</div>
          <div className="text-[11px] text-muted-foreground mb-3">execuções no ciclo atual</div>

          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_THROUGHPUT}>
                <defs>
                  <linearGradient id="pulse-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3, strokeWidth: 1 }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="processed"
                  stroke="var(--primary)"
                  strokeWidth={1.75}
                  fill="url(#pulse-area)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="var(--destructive)"
                  strokeWidth={1.25}
                  fill="transparent"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Fila Operacional</div>
              <div className="text-[13px] font-semibold mt-0.5">{queue.length} apólices em processamento</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-info bg-info/10 px-2 py-1 rounded-md border border-info/20">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="font-mono">throughput 4.2/s</span>
            </div>
          </div>

          <div className="space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="rounded-lg border border-border/60 bg-surface-2/40 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[12px] text-foreground">{q.id}</span>
                    <span className="text-[11px] text-muted-foreground truncate">· {q.broker}</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-muted-foreground">{Math.round(q.progress)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-background overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        q.progress > 90 ? "bg-success" : q.progress > 50 ? "bg-primary" : "bg-info",
                      )}
                      style={{ width: `${q.progress}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">{q.step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <Footer label="Latência P95" value="412 ms" />
        <Footer label="Erros / min" value="1.8" icon={<AlertOctagon className="h-3.5 w-3.5 text-destructive" />} />
        <Footer label="Uptime 30d" value="99.98%" tone="success" />
      </div>
    </div>
  );
}

function Footer({ label, value, tone, icon }: { label: string; value: string; tone?: "success"; icon?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[13px] font-mono font-semibold flex items-center gap-1.5", tone === "success" && "text-success")}>
        {icon}
        {value}
      </span>
    </div>
  );
}
