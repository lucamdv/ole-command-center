import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  Radio,
  Zap,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { HOURLY_THROUGHPUT, ALERTS } from "@/lib/mock/data";
import { formatInt, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operacao")({
  head: () => ({
    meta: [
      { title: "Operação · OLÉ COPILOT" },
      { name: "description", content: "Centro de monitoramento operacional em tempo real." },
    ],
  }),
  component: OperacaoPage,
});

const INITIAL_QUEUE = Array.from({ length: 9 }, (_, i) => ({
  id: `OLE-${String(2400060 + i).padStart(8, "0")}`,
  broker: ["Vértice", "Capital", "Aliança", "Núcleo", "Atlas"][i % 5] + " Seguros",
  step: ["Auditoria de Vigência", "Validação de Cobertura", "Reconciliação Financeira", "Análise de Endosso", "Verificação de Limite"][i % 5],
  startedAt: new Date(Date.now() - (i + 1) * 23_000).toISOString(),
  progress: Math.floor(20 + Math.random() * 70),
}));

function OperacaoPage() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [completed, setCompleted] = useState(8421);
  const [failed, setFailed] = useState(187);

  useEffect(() => {
    const i = setInterval(() => {
      setQueue((q) =>
        q.map((it) => {
          const next = it.progress + Math.random() * 8;
          if (next >= 100) {
            setCompleted((c) => c + 1);
            if (Math.random() > 0.92) setFailed((f) => f + 1);
            return { ...it, progress: Math.floor(5 + Math.random() * 25), startedAt: new Date().toISOString() };
          }
          return { ...it, progress: next };
        }),
      );
    }, 1400);
    return () => clearInterval(i);
  }, []);

  const criticalAlerts = ALERTS.filter((a) => a.severity === "critical" || a.severity === "high").slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-4 w-4 text-primary animate-pulse-dot" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">NOC · LIVE</span>
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight">Operação</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Painel operacional em tempo real. Cada execução, falha e fila visível ao milissegundo.
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile icon={Loader2} label="Em processamento" value={String(queue.length)} tone="info" spinning />
        <MetricTile icon={CheckCircle2} label="Concluídas" value={formatInt(completed)} tone="success" />
        <MetricTile icon={AlertOctagon} label="Falhas recentes" value={formatInt(failed)} tone="destructive" />
        <MetricTile icon={Clock} label="Tempo médio" value="284 ms" tone="default" />
      </div>

      {/* Live throughput */}
      <div className="rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Throughput em tempo real
            </div>
            <div className="text-[11px] text-muted-foreground">Execuções vs falhas · janela de 24h</div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Legend dot="var(--primary)" label="Processadas" />
            <Legend dot="var(--destructive)" label="Falhas" />
          </div>
        </div>
        <div className="h-[220px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_THROUGHPUT}>
              <defs>
                <linearGradient id="op-1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="processed" stroke="var(--primary)" strokeWidth={2} fill="url(#op-1)" isAnimationActive={false} />
              <Area type="monotone" dataKey="failed" stroke="var(--destructive)" strokeWidth={1.5} fill="transparent" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live queue */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="text-[13px] font-semibold">Fila Operacional · Ao Vivo</div>
            <div className="flex items-center gap-1.5 text-[11px] text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="font-mono">streaming</span>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {queue.map((q) => (
              <motion.div
                key={q.id}
                layout
                className="px-5 py-3 flex items-center gap-4 hover:bg-surface-2/40 transition"
              >
                <div className="h-7 w-7 rounded-md bg-info/15 grid place-items-center">
                  <Loader2 className="h-3.5 w-3.5 text-info animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[12px] text-foreground">{q.id}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{q.broker} · {q.step}</span>
                  </div>
                  <div className="h-1 rounded-full bg-background overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", q.progress > 75 ? "bg-success" : "bg-primary")}
                      style={{ width: `${q.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-mono text-foreground">{Math.round(q.progress)}%</div>
                  <div className="text-[10.5px] text-muted-foreground">{relativeTime(q.startedAt)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Critical alerts */}
        <div className="rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Alertas Críticos
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{criticalAlerts.length}</span>
          </div>
          <div className="divide-y divide-border/60 max-h-[440px] overflow-y-auto">
            {criticalAlerts.map((a) => (
              <div key={a.id} className="px-4 py-3 hover:bg-surface-2/40 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      a.severity === "critical" ? "bg-destructive shadow-[0_0_6px_var(--destructive)]" : "bg-warning",
                    )}
                  />
                  <span className="text-[12px] font-semibold text-foreground truncate">{a.title}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-mono text-foreground/80">{a.policyNumber}</span> · {a.broker}
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5">{relativeTime(a.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CPU strip */}
      <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Motor de Auditoria</div>
            <div className="text-[13px] font-semibold">v4.2.1 · 8 workers ativos</div>
          </div>
        </div>
        <Stat label="Vazão" value="4.2 / s" />
        <Stat label="Backlog" value="312" />
        <Stat label="P50" value="184 ms" />
        <Stat label="P95" value="412 ms" />
        <Stat label="P99" value="891 ms" />
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-success">
          <Zap className="h-3.5 w-3.5" /> Saudável
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
  spinning,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: "success" | "destructive" | "info" | "default";
  spinning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "h-7 w-7 rounded-md grid place-items-center",
            tone === "success" && "bg-success/15 text-success",
            tone === "destructive" && "bg-destructive/15 text-destructive",
            tone === "info" && "bg-info/15 text-info",
            tone === "default" && "bg-primary/15 text-primary",
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
        </div>
        <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-[22px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} /> {label}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[13px] font-mono text-foreground">{value}</div>
    </div>
  );
}
