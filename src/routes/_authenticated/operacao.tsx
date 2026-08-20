import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  FileText,
  Radio,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveContainer } from "@/components/charts/in-view-container";
import { useAuditHistory, useLatestAudit } from "@/hooks/use-audit";
import { useLatestPolicySync, usePolicies } from "@/hooks/use-policies";
import {
  errorTypeBreakdown,
  normalizeFinding,
  runSeries,
  severityOf,
} from "@/lib/audit/derive";
import { formatInt, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/operacao")({
  head: () => ({
    meta: [
      { title: "Operação · OLÉ COPILOT" },
      { name: "description", content: "Centro de monitoramento operacional em tempo real." },
    ],
  }),
  component: OperacaoPage,
});

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

function OperacaoPage() {
  const latestQ = useLatestAudit();
  const historyQ = useAuditHistory();
  const policiesQ = usePolicies();
  const syncQ = useLatestPolicySync();

  const latest = latestQ.data ?? null;
  const history = historyQ.data ?? [];
  const policies = policiesQ.data ?? [];
  const sync = syncQ.data ?? null;

  const isLoading =
    latestQ.isLoading || historyQ.isLoading || policiesQ.isLoading;

  const run = latest?.run;
  const findings = latest?.findings ?? [];
  const prev = history.find((h) => h.id !== run?.id) ?? null;

  const total = run?.total_processado ?? 0;
  const reprov = run?.reprovados ?? 0;
  const aprov = run?.aprovados ?? 0;
  const durationMs = run?.duration_ms ?? null;
  const statusGeral = (run?.status_geral ?? "").toUpperCase();

  const deltaReprov = prev ? reprov - prev.reprovados : 0;
  const series = runSeries(history);
  const breakdown = errorTypeBreakdown(findings);
  const maxBucket = breakdown[0]?.count ?? 1;

  const criticalFindings = findings
    .filter((f) => severityOf(f) === "erro")
    .slice(0, 8);

  const vazao =
    durationMs && durationMs > 0 ? (total / (durationMs / 1000)).toFixed(1) : null;
  const avgDurationMs =
    history.length > 0
      ? Math.round(
          history.reduce((s, h) => s + (h.duration_ms ?? 0), 0) /
            history.filter((h) => h.duration_ms).length || 0,
        )
      : null;

  const healthTone =
    statusGeral === "SUCESSO"
      ? "success"
      : statusGeral === "ALERTA"
        ? "warning"
        : statusGeral === "ERRO"
          ? "destructive"
          : "default";

  const noData = !isLoading && !run;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Radio
            className={cn(
              "h-4 w-4 animate-pulse-dot",
              healthTone === "success" && "text-success",
              healthTone === "warning" && "text-warning",
              healthTone === "destructive" && "text-destructive",
              healthTone === "default" && "text-primary",
            )}
          />
          <span
            className={cn(
              "text-[11px] font-mono uppercase tracking-[0.2em]",
              healthTone === "success" && "text-success",
              healthTone === "warning" && "text-warning",
              healthTone === "destructive" && "text-destructive",
              healthTone === "default" && "text-primary",
            )}
          >
            NOC · {statusGeral || "AGUARDANDO"}
          </span>
        </div>
        <h1 className="page-title">Operação</h1>
        <p className="page-subtitle mt-1.5">
          {run?.mensagem_geral ??
            "Painel operacional · dados da última execução do motor de auditoria."}
        </p>
      </div>

      {/* Empty state */}
      {noData && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-[14px] font-semibold mb-1">
            Nenhuma execução de auditoria ainda
          </div>
          <p className="text-[12px] text-muted-foreground">
            Dispare a primeira auditoria em{" "}
            <Link to="/alertas" className="text-primary underline-offset-2 hover:underline">
              Alertas
            </Link>{" "}
            para preencher este painel.
          </p>
        </div>
      )}

      {/* Top metrics */}
      <div className="bento">
        {isLoading ? (
          <>
            <Skeleton className="h-[88px] rounded-xl" />
            <Skeleton className="h-[88px] rounded-xl" />
            <Skeleton className="h-[88px] rounded-xl" />
            <Skeleton className="h-[88px] rounded-xl" />
          </>
        ) : (
          <>
            <MetricTile
              icon={FileText}
              label="Apólices na carteira"
              value={formatInt(policies.length)}
              tone="default"
              hint={sync?.finished_at ? `sync ${relativeTime(sync.finished_at)}` : undefined}
            />
            <MetricTile
              icon={Activity}
              label="Última auditoria"
              value={formatInt(total)}
              tone="info"
              hint={run ? `${formatInt(aprov)} aprovadas` : undefined}
            />
            <MetricTile
              icon={AlertOctagon}
              label="Reprovações"
              value={formatInt(reprov)}
              tone="destructive"
              delta={prev ? deltaReprov : undefined}
            />
            <MetricTile
              icon={Zap}
              label="Latência da run"
              value={formatDuration(durationMs)}
              tone="default"
              hint={vazao ? `${vazao} ap/s` : undefined}
            />
          </>
        )}
      </div>

      {/* Run history chart */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Histórico de execuções
            </div>
            <div className="text-[11px] text-muted-foreground">
              Aprovadas vs reprovadas · últimas {series.length} runs
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Legend dot="var(--success)" label="Aprovadas" />
            <Legend dot="var(--destructive)" label="Reprovadas" />
          </div>
        </div>
        <div className="h-[170px] sm:h-[240px] p-2">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : series.length === 0 ? (
            <div className="h-full grid place-items-center text-[12px] text-muted-foreground">
              Sem histórico para exibir.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="op-approved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="op-rejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { date?: string } | undefined;
                    return p?.date ? new Date(p.date).toLocaleString("pt-BR") : "";
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="Aprovadas"
                  stroke="var(--success)"
                  strokeWidth={2}
                  fill="url(#op-approved)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name="Reprovadas"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  fill="url(#op-rejected)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Error type breakdown */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-semibold">Inconsistências por tipo</div>
            <div className="text-[11px] text-muted-foreground">
              {run?.created_at ? `última run · ${relativeTime(run.created_at)}` : "—"}
            </div>
          </div>
          <div className="divide-y divide-border/60 max-h-[440px] overflow-y-auto">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : breakdown.length === 0 ? (
              <div className="px-5 py-10 text-center text-[12px] text-muted-foreground">
                Nenhuma inconsistência na última execução.
              </div>
            ) : (
              breakdown.map((b) => {
                const pct = (b.count / maxBucket) * 100;
                return (
                  <div key={b.tipo} className="px-5 py-3 hover:bg-surface-2/40 transition">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertOctagon className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span className="text-[12.5px] font-medium text-foreground truncate">
                          {b.tipo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                        <span className="text-muted-foreground">{b.apolices} ap.</span>
                        <span className="text-foreground tabular-nums">{b.count}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-background overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Critical findings */}
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Findings críticos
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {criticalFindings.length}
            </span>
          </div>
          <div className="divide-y divide-border/60 max-h-[440px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : criticalFindings.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                Sem findings críticos.
              </div>
            ) : (
              criticalFindings.map((f) => {
                const norm = normalizeFinding(f);
                return (
                  <Link
                    key={f.id}
                    to="/apolices/$id"
                    params={{ id: f.apolice }}
                    className="block px-4 py-3 hover:bg-surface-2/40 transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-destructive shadow-[0_0_6px_var(--destructive)]" />
                      <span className="text-[12px] font-semibold text-foreground truncate">
                        {f.tipo_erro}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground/80">
                        …{f.apolice.slice(-10)}
                      </span>
                      {norm.endosso && (
                        <span className="font-mono"> · end. {norm.endosso.slice(-6)}</span>
                      )}
                    </div>
                    {norm.motivo && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {norm.motivo}
                      </div>
                    )}
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {relativeTime(f.created_at)}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Motor strip */}
      <div className="panel p-5 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Motor de Auditoria
            </div>
            <div className="text-[13px] font-semibold">MOTOR OLÉ · n8n callback</div>
          </div>
        </div>
        <Stat label="Vazão" value={vazao ? `${vazao} ap/s` : "—"} />
        <Stat label="Carteira" value={formatInt(policies.length)} />
        <Stat label="Duração última run" value={formatDuration(durationMs)} />
        <Stat label="Duração média" value={formatDuration(avgDurationMs)} />
        <Stat
          label="Última sync"
          value={sync?.finished_at ? relativeTime(sync.finished_at) : "—"}
        />
        <div
          className={cn(
            "ml-auto flex items-center gap-1.5 text-[11px]",
            healthTone === "success" && "text-success",
            healthTone === "warning" && "text-warning",
            healthTone === "destructive" && "text-destructive",
            healthTone === "default" && "text-muted-foreground",
          )}
        >
          {healthTone === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertOctagon className="h-3.5 w-3.5" />
          )}
          {statusGeral || "Aguardando"}
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
  hint,
  delta,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: "success" | "destructive" | "info" | "default";
  hint?: string;
  delta?: number;
}) {
  return (
    <div className="panel p-4">
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
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-[18px] sm:text-[22px] font-semibold tabular-nums">{value}</div>
      {(hint || delta !== undefined) && (
        <div className="text-[10.5px] text-muted-foreground mt-1 flex items-center gap-1.5">
          {delta !== undefined && delta !== 0 && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-mono",
                delta > 0 ? "text-destructive" : "text-success",
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
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
