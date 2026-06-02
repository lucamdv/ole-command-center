import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertOctagon, Clock, Database, FileWarning, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/kpi/kpi-card";
import { RunAuditButton } from "@/components/audit/run-audit-button";
import { AuditEmptyState } from "@/components/audit/empty-state";
import { useAuditHistory, useLatestAudit } from "@/hooks/use-audit";
import {
  buildHeatmap,
  deriveKpis,
  errorTypeBreakdown,
  groupByApolice,
  runSeries,
  shortApolice,
} from "@/lib/audit/derive";
import { formatDateTime, formatInt, formatPct, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · OLÉ COPILOT" },
      {
        name: "description",
        content:
          "Centro de comando operacional alimentado pela última auditoria de emissão do motor OLÉ.",
      },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const { data: latest, isLoading } = useLatestAudit();
  const { data: history = [] } = useAuditHistory();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded bg-surface animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader latestAt={latest?.run?.created_at ?? null} status={latest?.run?.status_geral ?? null} />

      {!latest ? (
        <AuditEmptyState />
      ) : (
        <Dashboard latest={latest} history={history} />
      )}
    </div>
  );
}

function PageHeader({ latestAt, status }: { latestAt: string | null; status: string | null }) {
  return (
    <div className="flex items-start justify-between gap-6 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">OLÉ COPILOT</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Visão Geral</span>
          {status && (
            <span
              className={cn(
                "ml-2 inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase px-2 py-0.5 rounded border",
                status === "SUCESSO"
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
              {status}
            </span>
          )}
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Centro de Comando OLÉ</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1 max-w-2xl">
          {latestAt
            ? `Dados consolidados da auditoria executada ${relativeTime(latestAt)} (${formatDateTime(latestAt)}).`
            : "Dispare a primeira auditoria para alimentar a plataforma."}
        </p>
      </div>
      <RunAuditButton />
    </div>
  );
}

function Dashboard({
  latest,
  history,
}: {
  latest: NonNullable<ReturnType<typeof useLatestAudit>["data"]>;
  history: ReturnType<typeof useAuditHistory>["data"] extends infer T ? Exclude<T, undefined> : never;
}) {
  const k = deriveKpis({ latest, history });
  if (!k) return null;

  const series = runSeries(history);
  const sparkApproved = series.map((s) => s.approved);
  const sparkRejected = series.map((s) => s.rejected);
  const sparkRisk = series.map((s) => s.risk);
  const sparkTotal = series.map((s) => s.total);

  const breakdown = errorTypeBreakdown(latest.findings);
  const grouped = groupByApolice(latest.findings);
  const heatmap = buildHeatmap(latest, history, 12);

  const PIE_COLORS = [
    "var(--destructive)",
    "var(--warning)",
    "var(--info)",
    "var(--primary)",
    "var(--success)",
  ];

  return (
    <div className="space-y-6">
      {/* Status bar real */}
      <div className="rounded-xl border border-border bg-surface/60 backdrop-blur grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 lg:divide-x divide-border overflow-hidden">
        <StatusItem icon={ShieldCheck} label="Conformidade" value={formatPct(k.approvedRate, 1)} tone="success" />
        <StatusItem icon={Database} label="Processadas" value={formatInt(k.audited)} />
        <StatusItem icon={AlertOctagon} label="Inconsistências" value={formatInt(k.activeAlerts)} tone="warning" />
        <StatusItem icon={FileWarning} label="Apólices afetadas" value={formatInt(k.affectedPolicies)} tone="destructive" />
        <StatusItem icon={Zap} label="Regras acionadas" value={formatInt(k.uniqueErrorTypes)} tone="info" />
        <StatusItem icon={Clock} label="Última run" value={relativeTime(latest.run.created_at)} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard label="Apólices Auditadas" value={k.audited} format={formatInt} spark={sparkTotal} tone="default" hint={`${history.length} run(s) registradas`} />
        <KpiCard label="Conformes" value={k.approved} format={formatInt} delta={Number(k.deltaApproved.toFixed(1))} spark={sparkApproved} tone="success" hint={`${k.approvedRate.toFixed(1)}% do total`} />
        <KpiCard label="Não Conformes" value={k.rejected} format={formatInt} delta={Number(k.deltaRejected.toFixed(1))} spark={sparkRejected} tone="destructive" hint="Reprovações automatizadas" />
        <KpiCard label="Achados Ativos" value={k.activeAlerts} format={formatInt} delta={Number(k.deltaAlerts.toFixed(1))} spark={sparkRejected} tone="warning" hint="Inconsistências detectadas" />
        <KpiCard label="Risco Operacional" value={k.operationalRisk} suffix="%" delta={Number(k.deltaRisk.toFixed(1))} spark={sparkRisk} tone="warning" hint="Reprovados / Total" />
        <KpiCard label="Apólices Afetadas" value={k.affectedPolicies} format={formatInt} spark={sparkRejected} tone="destructive" hint="Únicas com falha" />
        <KpiCard label="Regras Acionadas" value={k.uniqueErrorTypes} format={formatInt} tone="info" hint={k.topErrorType ? `Top: ${k.topErrorType}` : "—"} />
        <KpiCard label="Conformidade" value={k.approvedRate} suffix="%" delta={Number(k.deltaApproved.toFixed(1))} spark={series.map((s) => 100 - s.risk)} tone="success" hint="Taxa de aprovação" />
      </div>

      {/* Pulso real: tendência + distribuição */}
      <div className="rounded-2xl border border-border bg-surface/80 backdrop-blur overflow-hidden shadow-elevated">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-surface to-surface-2">
          <div>
            <div className="text-[14px] font-semibold tracking-tight">Pulso Operacional</div>
            <div className="text-[11px] text-muted-foreground">Evolução das auditorias e distribuição de erros por tipo</div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" /> DADOS REAIS
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
          <div className="bg-surface p-5 lg:col-span-2">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Histórico de Runs</div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[24px] font-semibold tabular-nums leading-tight">{history.length}</span>
              <span className="text-[12px] text-muted-foreground">execuções registradas</span>
            </div>
            <div className="h-[200px]">
              {series.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="run-area-a" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="run-area-r" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                    <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="approved" stroke="var(--success)" strokeWidth={1.75} fill="url(#run-area-a)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="rejected" stroke="var(--destructive)" strokeWidth={1.75} fill="url(#run-area-r)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-[12px] text-muted-foreground">
                  Histórico aparecerá após múltiplas auditorias.
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface p-5">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Distribuição por Erro</div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[24px] font-semibold tabular-nums leading-tight">{breakdown.length}</span>
              <span className="text-[12px] text-muted-foreground">tipos</span>
            </div>
            <div className="h-[160px]">
              {breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="count" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                      {breakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-[12px] text-success">Sem erros nesta run.</div>
              )}
            </div>
            <div className="space-y-1 mt-2 max-h-[100px] overflow-y-auto">
              {breakdown.map((b, i) => (
                <div key={b.tipo} className="flex items-center gap-2 text-[11.5px]">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground truncate flex-1">{b.tipo}</span>
                  <span className="font-mono text-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap real */}
      {heatmap.rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/80 backdrop-blur shadow-elevated overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-surface to-surface-2">
            <div>
              <div className="text-[14px] font-semibold tracking-tight">Matriz de Risco Operacional</div>
              <div className="text-[11px] text-muted-foreground">Incidência de cada regra ao longo das últimas {heatmap.runs.length} auditorias</div>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex items-center gap-1 mb-2 pl-[220px]">
                {heatmap.runs.map((r, i) => (
                  <div key={r.id} className="flex-1 text-center text-[10px] font-mono text-muted-foreground/70">
                    R{i + 1}
                  </div>
                ))}
              </div>
              {(() => {
                const max = Math.max(1, ...heatmap.rows.flatMap((r) => r.cells));
                return heatmap.rows.map((row) => (
                  <div key={row.tipo} className="flex items-center gap-1 mb-1">
                    <div className="w-[220px] pr-3 text-[12px] text-muted-foreground truncate" title={row.tipo}>
                      {row.tipo}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      {row.cells.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 h-7 rounded-[5px] transition"
                          style={{
                            background:
                              v === 0
                                ? "color-mix(in oklab, var(--muted) 50%, transparent)"
                                : `color-mix(in oklab, var(--destructive) ${20 + (v / max) * 70}%, transparent)`,
                          }}
                          title={`${row.tipo} · R${i + 1} · ${v}`}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Top apólices afetadas */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold">Apólices com mais inconsistências</div>
              <div className="text-[11px] text-muted-foreground">Top 8 desta auditoria</div>
            </div>
            <Link to="/apolices" className="text-[11px] text-primary hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {grouped.slice(0, 8).map((g) => (
              <div key={g.apolice} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-surface-2/40">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] text-foreground truncate">{shortApolice(g.apolice)}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{g.tipos.join(" · ")}</div>
                </div>
                <div className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
                  {g.total} erro{g.total > 1 ? "s" : ""}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <div className="text-center py-8 text-[12px] text-success">
                Nenhuma apólice com inconsistência nesta auditoria.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold">Ranking de Regras Acionadas</div>
              <div className="text-[11px] text-muted-foreground">Por número de ocorrências</div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-[260px]">
            {breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis type="category" dataKey="tipo" stroke="var(--muted-foreground)" fontSize={10} width={160} />
                  <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                  <Bar dataKey="count" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-[12px] text-success">Sem regras acionadas nesta run.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  tone?: "success" | "info" | "warning" | "destructive";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-w-0">
      <div
        className={cn(
          "h-8 w-8 grid place-items-center rounded-lg shrink-0",
          tone === "success" && "bg-success/10 text-success",
          tone === "info" && "bg-info/10 text-info",
          tone === "warning" && "bg-warning/10 text-warning",
          tone === "destructive" && "bg-destructive/10 text-destructive",
          !tone && "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 truncate">{label}</div>
        <div className="text-[13px] font-semibold tabular-nums text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
