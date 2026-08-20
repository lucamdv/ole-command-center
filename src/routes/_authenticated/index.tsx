import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Activity, CheckCircle2, Copy, FileDown, List, TrendingUp, XCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveContainer } from "@/components/charts/in-view-container";
import { toast } from "sonner";
import { KpiCard } from "@/components/kpi/kpi-card";
import { formatDuracaoHoras } from "@/lib/audit/resolution-filter";
import { RunAuditButton } from "@/components/audit/run-audit-button";
import { NextRunCountdown } from "@/components/automation/next-run-countdown";

import { AuditEmptyState } from "@/components/audit/empty-state";
import { FindingsListDialog } from "@/components/audit/findings-list-dialog";
import { Button } from "@/components/ui/button";
import { useAuditHistory, useLatestAudit } from "@/hooks/use-audit";
import {
  buildHeatmap,
  bucketByMonth,
  countBySeverity,
  deriveKpis,
  errorTypeBreakdown,
  groupByApolice,
  groupByEndosso,
  runSeries,
  severityOf,
} from "@/lib/audit/derive";
import type { AuditFindingRow, LatestAudit } from "@/lib/audit/types";
import { formatDateTime, formatInt, formatPct, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-settings";
import { useOperationKpis } from "@/hooks/use-operation-kpis";
import { useKpiTargets } from "@/hooks/use-kpi-targets";
import { statusMax } from "@/lib/kpis/derive";

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">{title}</h2>
      {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}


export const Route = createFileRoute("/_authenticated/")({
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
        <div className="bento">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        latestAt={latest?.run?.created_at ?? null}
        status={latest?.run?.status_geral ?? null}
        latest={latest ?? null}
        history={history}
      />

      {!latest ? (
        <AuditEmptyState />
      ) : (
        <Dashboard latest={latest} history={history} />
      )}
    </div>
  );
}

function PageHeader({
  latestAt,
  status,
  latest,
  history,
}: {
  latestAt: string | null;
  status: string | null;
  latest: LatestAudit | null;
  history: ReturnType<typeof useAuditHistory>["data"] extends infer T ? Exclude<T, undefined> : never;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const { profile } = useProfile();
  const firstName = (profile.nome || "").split(/\s+/)[0] || "Operador";
  return (
    <div className="relative overflow-hidden panel px-5 py-5">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">OLÉ COPILOT</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Cockpit Executivo</span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase px-2 py-0.5 rounded border bg-success/10 text-success border-success/30">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
              Sistema Operacional
            </span>
            {status && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase px-2 py-0.5 rounded border",
                  status === "SUCESSO"
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-warning/10 text-warning border-warning/30",
                )}
              >
                <Activity className="h-3 w-3" /> {status}
              </span>
            )}
          </div>
          <h1 className="page-title">
            {greeting}, {firstName}. <span className="text-muted-foreground">Aqui está sua operação.</span>
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1 max-w-2xl">
            {latestAt
              ? `Última auditoria executada ${relativeTime(latestAt)} · ${formatDateTime(latestAt)}.`
              : "Dispare a primeira auditoria para alimentar o cockpit."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {latest && (
            <>
              <FindingsListDialog
                latest={latest}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <List className="h-4 w-4" /> Ver achados
                  </Button>
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  const { exportAuditPdf } = await import("@/lib/audit/export-pdf");
                  exportAuditPdf(latest, history);
                }}
              >
                <FileDown className="h-4 w-4" /> Exportar PDF
              </Button>
            </>
          )}
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <NextRunCountdown job="audit" />
            <RunAuditButton />
          </div>

        </div>
      </div>
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
  const { data: ops } = useOperationKpis();
  const { targets } = useKpiTargets();
  const daily = ops?.daily ?? {
    runAt: null,
    novas: 0,
    criticasAbertas: 0,
    resolvidas: 0,
    mediaMovel: 0,
    desvioPct: 0,
  };
  const resolution = ops?.resolutionTime;
  if (!k) return null;

  const series = runSeries(history);
  const sparkRejected = series.map((s) => s.rejected);
  const sparkTotal = series.map((s) => s.total);

  const breakdown = errorTypeBreakdown(latest.findings);
  const grouped = groupByApolice(latest.findings);
  const heatmap = buildHeatmap(latest, history, 12);
  const sev = countBySeverity(latest.findings);
  const endossos = groupByEndosso(latest.findings);
  const months = bucketByMonth(latest.findings);

  const PIE_COLORS = [
    "var(--destructive)",
    "var(--warning)",
    "var(--info)",
    "var(--primary)",
    "var(--success)",
  ];

  return (
    <div className="space-y-6">
      {/* Banner consolidado estilo Notion */}
      <ConsolidatedBanner latest={latest} sev={sev} grouped={grouped.length} />

      {/* === Estado da execução === */}
      <SectionTitle
        title="Estado da execução"
        subtitle="Resultado consolidado da última auditoria"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Conformidade da Carteira" value={k.approvedRate} suffix="%" delta={Number(k.deltaApproved.toFixed(1))} spark={series.map((s) => 100 - s.risk)} tone="success" hint="Taxa de aprovação" />
        <KpiCard label="Saúde Operacional" value={Math.max(0, 100 - k.operationalRisk)} suffix="pts" spark={series.map((s) => 100 - s.risk)} tone="info" hint="Score executivo (100 - risco)" />
        <KpiCard label="Apólices Auditadas" value={k.audited} format={formatInt} spark={sparkTotal} tone="default" hint={`${history.length} run(s) registradas`} />
        <KpiCard label="Apólices em Risco" value={k.affectedPolicies} format={formatInt} delta={Number(k.deltaRejected.toFixed(1))} spark={sparkRejected} tone="destructive" hint={`${k.rejected} reprovação(ões)`} />
        <KpiCard label="Regras Críticas Acionadas" value={k.uniqueErrorTypes} format={formatInt} spark={sparkRejected} tone="warning" hint={k.topErrorType ? `Top: ${k.topErrorType}` : "—"} />
        <KpiCard label="Velocidade Operacional" value={latest.run.duration_ms ? Number((latest.run.duration_ms / 1000).toFixed(1)) : 0} suffix="s" spark={sparkTotal} tone="info" hint="Duração da última run" />
      </div>

      {/* === KPIs diários (cadência 5.1) === */}
      <SectionTitle
        title="KPIs diários"
        subtitle="Inconsistências detectadas, criticidade e tempo de resposta do motor"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Inconsistências detectadas"
          value={daily.novas}
          format={formatInt}
          tone="warning"
          hint={`Média móvel: ${daily.mediaMovel.toLocaleString("pt-BR")} / run`}
          target={`meta ≤ ${targets.picoDesvioPct}% acima da média`}
          status={statusMax(Math.max(0, daily.desvioPct), targets.picoDesvioPct)}
        />
        <KpiCard
          label="Ocorrências críticas"
          value={daily.criticasAbertas}
          format={formatInt}
          tone="destructive"
          hint="Achados de nível ERRO em aberto"
          target={`meta ≤ ${formatInt(targets.criticasAbertasMax)}`}
          status={statusMax(daily.criticasAbertas, targets.criticasAbertasMax)}
        />
        <KpiCard
          label="Inconsistências resolvidas"
          value={daily.resolvidas}
          format={formatInt}
          tone="success"
          hint={`${formatInt(ops?.resolvidasManuais ?? 0)} manuais · ${formatInt(ops?.resolvidasAuto ?? 0)} automáticas`}
        />
        <KpiCard
          label="Tempo médio de resolução"
          value={resolution?.mediaHoras ?? 0}
          format={(v) => formatDuracaoHoras(Number(v))}
          tone="info"
          hint={
            resolution && resolution.totalResolvidas > 0
              ? `${formatInt(resolution.totalResolvidas)} resolução(ões) · mediana ${formatDuracaoHoras(resolution.medianaHoras)}`
              : "Marque achados como resolvidos para alimentar"
          }
        />
        <KpiCard
          label="Desvio vs. média móvel"
          value={daily.desvioPct}
          suffix="%"
          tone={daily.desvioPct > 0 ? "warning" : "success"}
          hint="Variação do volume de achados"
        />
        <KpiCard
          label="Tempo de resposta"
          value={latest.run.duration_ms ? Number((latest.run.duration_ms / 1000).toFixed(1)) : 0}
          suffix="s"
          tone="info"
          hint={daily.runAt ? `Run de ${relativeTime(daily.runAt)}` : "Duração da última run"}
        />
      </div>


      {/* Severidade split + linha secundária */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SeveritySplit sev={sev} />
        <div className="panel bg-surface/60 grid grid-cols-2 md:grid-cols-4 lg:col-span-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          <MiniStat label="Risco Operacional" value={`${k.operationalRisk.toFixed(1)}%`} tone="warning" />
          <MiniStat label="Regras Acionadas" value={formatInt(k.uniqueErrorTypes)} tone="info" />
          <MiniStat label="Apólices Afetadas" value={formatInt(k.affectedPolicies)} tone="destructive" />
          <MiniStat label="Última Run" value={relativeTime(latest.run.created_at)} />
        </div>
      </div>




      {/* Pulso real: tendência + distribuição */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-linear-to-r from-surface to-surface-2">
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
              <span className="text-[20px] sm:text-[24px] font-semibold tabular-nums leading-tight">{history.length}</span>
              <span className="text-[12px] text-muted-foreground">execuções registradas</span>
            </div>
            <div className="h-[170px] sm:h-[200px]">
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
              <span className="text-[20px] sm:text-[24px] font-semibold tabular-nums leading-tight">{breakdown.length}</span>
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
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-linear-to-r from-surface to-surface-2">
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
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
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
              <div key={g.apolice} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-surface-2/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-[12px] text-foreground break-all leading-snug">{g.apolice}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(g.apolice);
                          toast.success("Apólice copiada");
                        } catch {
                          toast.error("Falha ao copiar");
                        }
                      }}
                      className="opacity-50 hover:opacity-100 shrink-0 mt-0.5"
                      title="Copiar número"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground truncate mt-1" title={g.tipos.join(" · ")}>
                    {g.tipos.join(" · ")}
                  </div>
                </div>
                <ApoliceSevBadge findings={g.findings} />

              </div>
            ))}
            {grouped.length === 0 && (
              <div className="text-center py-8 text-[12px] text-success">
                Nenhuma apólice com inconsistência nesta auditoria.
              </div>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="text-[13px] font-semibold">Ranking de Regras Acionadas</div>
              <div className="text-[11px] text-muted-foreground">Por número de ocorrências</div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-[190px] sm:h-[260px]">
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

      {/* Breakdown Severidade × Tipo */}
      <BreakdownTable findings={latest.findings} totalFindings={latest.findings.length} />

      {/* Endossos + Janela de vigência */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <EndossosCard endossos={endossos} />
        <MonthlyWindowCard months={months} />
      </div>

      {/* Histórico detalhado de runs */}
      <RunHistoryTable history={history} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "info" | "warning" | "destructive";
}) {
  return (
    <div className="px-4 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 truncate">{label}</div>
      <div
        className={cn(
          "text-[15px] font-semibold tabular-nums truncate mt-0.5",
          tone === "success" && "text-success",
          tone === "info" && "text-info",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
          !tone && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ConsolidatedBanner({
  latest,
  sev,
  grouped,
}: {
  latest: LatestAudit;
  sev: { erros: number; alertas: number; infos: number };
  grouped: number;
}) {
  return (
    <div className="panel px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-elevated">
      <div className="flex items-center gap-2">
        <span className="text-[18px]">📊</span>
        <div>
          <div className="text-[13px] font-semibold tracking-tight">Relatório Consolidado de Auditoria</div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {formatDateTime(latest.run.data_auditoria ?? latest.run.created_at)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        <BannerChip icon={<CheckCircle2 className="h-3 w-3" />} tone="success">
          {formatInt(latest.run.aprovados)} OK
        </BannerChip>
        <BannerChip icon={<AlertTriangle className="h-3 w-3" />} tone="warning">
          {formatInt(latest.run.reprovados)} Intervenções
        </BannerChip>
        <BannerChip icon={<XCircle className="h-3 w-3" />} tone="destructive">
          {formatInt(sev.erros)} erros
        </BannerChip>
        <BannerChip icon={<AlertTriangle className="h-3 w-3" />} tone="warning">
          {formatInt(sev.alertas)} alertas
        </BannerChip>
        <BannerChip tone="info">🔍 {formatInt(grouped)} apólices</BannerChip>
        <BannerChip tone="default">📋 {formatInt(latest.findings.length)} achados</BannerChip>
      </div>
    </div>
  );
}

function BannerChip({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone: "success" | "warning" | "destructive" | "info" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono border",
        tone === "success" && "bg-success/10 text-success border-success/30",
        tone === "warning" && "bg-warning/10 text-warning border-warning/30",
        tone === "destructive" && "bg-destructive/10 text-destructive border-destructive/30",
        tone === "info" && "bg-info/10 text-info border-info/30",
        tone === "default" && "bg-muted/40 text-muted-foreground border-border",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function SeveritySplit({ sev }: { sev: { erros: number; alertas: number; infos: number } }) {
  const total = sev.erros + sev.alertas + sev.infos;
  const pe = total ? (sev.erros / total) * 100 : 0;
  const pa = total ? (sev.alertas / total) * 100 : 0;
  const pi = total ? (sev.infos / total) * 100 : 0;
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">Severidade</span>
        <span className="text-[11px] font-mono text-muted-foreground">{formatInt(total)} achados</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/40">
        {pe > 0 && <div style={{ width: `${pe}%` }} className="bg-destructive" />}
        {pa > 0 && <div style={{ width: `${pa}%` }} className="bg-warning" />}
        {pi > 0 && <div style={{ width: `${pi}%` }} className="bg-info" />}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
        <SevLeg color="bg-destructive" label="Erros" value={sev.erros} />
        <SevLeg color="bg-warning" label="Alertas" value={sev.alertas} />
        <SevLeg color="bg-info" label="Info" value={sev.infos} />
      </div>
    </div>
  );
}

function SevLeg({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-mono text-foreground ml-auto">{formatInt(value)}</span>
    </div>
  );
}

function ApoliceSevBadge({ findings }: { findings: AuditFindingRow[] }) {
  const s = countBySeverity(findings);
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      {s.erros > 0 && (
        <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
          🔴 {s.erros} erros
        </span>
      )}
      {s.alertas > 0 && (
        <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/30">
          ⚠️ {s.alertas} alertas
        </span>
      )}
    </div>
  );
}

function BreakdownTable({ findings, totalFindings }: { findings: AuditFindingRow[]; totalFindings: number }) {
  const rows = (() => {
    const map = new Map<string, { count: number; apolices: Set<string>; sev: "erro" | "alerta" | "info" }>();
    for (const f of findings) {
      const key = f.tipo_erro;
      const cur = map.get(key) ?? { count: 0, apolices: new Set<string>(), sev: severityOf(f) };
      cur.count++;
      cur.apolices.add(f.apolice);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([tipo, v]) => ({ tipo, count: v.count, apolices: v.apolices.size, sev: v.sev }))
      .sort((a, b) => b.count - a.count);
  })();

  if (rows.length === 0) return null;

  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold tracking-tight">Breakdown Severidade × Tipo</div>
          <div className="text-[11px] text-muted-foreground">{rows.length} regras acionadas · {formatInt(totalFindings)} achados totais</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table text-[12px]">
          <thead className="bg-surface-2/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Tipo de erro</th>
              <th className="text-left px-3 py-2.5 font-medium w-20">Severidade</th>
              <th className="text-right px-3 py-2.5 font-medium w-24">Ocorrências</th>
              <th className="text-right px-3 py-2.5 font-medium w-24">Apólices</th>
              <th className="text-left px-3 py-2.5 font-medium w-[220px]">% do total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const pct = totalFindings ? (r.count / totalFindings) * 100 : 0;
              const color = r.sev === "erro" ? "bg-destructive" : r.sev === "alerta" ? "bg-warning" : "bg-info";
              return (
                <tr key={r.tipo} className="hover:bg-surface-2/40">
                  <td className="px-4 py-2.5 text-foreground">{r.tipo}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase px-1.5 py-0.5 rounded",
                        r.sev === "erro" && "bg-destructive/10 text-destructive",
                        r.sev === "alerta" && "bg-warning/10 text-warning",
                        r.sev === "info" && "bg-info/10 text-info",
                      )}
                    >
                      {r.sev}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatInt(r.count)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatInt(r.apolices)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground w-12 text-right">{formatPct(pct, 1)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndossosCard({ endossos }: { endossos: ReturnType<typeof groupByEndosso> }) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="text-[13px] font-semibold">Endossos mais problemáticos</div>
        <div className="text-[11px] text-muted-foreground">Top 8 endossos por número de achados</div>
      </div>
      {endossos.length === 0 ? (
        <div className="text-center py-8 text-[12px] text-muted-foreground">Sem dados de endossos.</div>
      ) : (
        <div className="space-y-1.5">
          {endossos.slice(0, 8).map((e) => (
            <div key={e.endosso} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-surface-2/40">
              <div className="font-mono text-[12px] text-foreground w-20 shrink-0">{e.endosso}</div>
              <div className="flex-1 text-[11px] text-muted-foreground font-mono">
                {e.apolices} apólice{e.apolices > 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {e.erros > 0 && (
                  <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{e.erros}E</span>
                )}
                {e.alertas > 0 && (
                  <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning">{e.alertas}A</span>
                )}
                <span className="text-[11px] font-mono font-semibold text-foreground ml-1 tabular-nums">{e.total}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthlyWindowCard({ months }: { months: ReturnType<typeof bucketByMonth> }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="text-[13px] font-semibold">Janela de Vigência mais afetada</div>
        <div className="text-[11px] text-muted-foreground">Distribuição dos achados por mês de início</div>
      </div>
      {months.length === 0 ? (
        <div className="text-center py-8 text-[12px] text-muted-foreground">Sem datas de vigência nos achados.</div>
      ) : (
        <div className="space-y-1.5">
          {months.map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <div className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">{m.label}</div>
              <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                <div
                  className="h-full bg-warning/70 flex items-center justify-end pr-1.5 text-[10px] font-mono text-warning-foreground"
                  style={{ width: `${(m.count / max) * 100}%` }}
                >
                  {m.count >= 3 ? m.count : ""}
                </div>
              </div>
              <span className="text-[11px] font-mono tabular-nums w-10 text-right text-foreground">{m.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunHistoryTable({ history }: { history: ReturnType<typeof useAuditHistory>["data"] extends infer T ? Exclude<T, undefined> : never }) {
  if (history.length === 0) return null;
  const rows = history.slice(0, 10);
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="text-[14px] font-semibold tracking-tight">Histórico de Auditorias</div>
        <div className="text-[11px] text-muted-foreground">Últimas {rows.length} execuções</div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table text-[12px]">
          <thead className="bg-surface-2/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Data</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 font-medium">Origem</th>

              <th className="text-right px-3 py-2.5 font-medium">Total</th>
              <th className="text-right px-3 py-2.5 font-medium">OK</th>
              <th className="text-right px-3 py-2.5 font-medium">Intervenções</th>
              <th className="text-right px-3 py-2.5 font-medium">Conformidade</th>
              <th className="text-right px-3 py-2.5 font-medium">Duração</th>
              <th className="text-right px-3 py-2.5 font-medium">Δ vs anterior</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((h, idx) => {
              const prev = rows[idx + 1];
              const conf = h.total_processado ? (h.aprovados / h.total_processado) * 100 : 0;
              const prevConf = prev?.total_processado ? (prev.aprovados / prev.total_processado) * 100 : conf;
              const delta = conf - prevConf;
              const dur = h.duration_ms != null ? `${(h.duration_ms / 1000).toFixed(1)}s` : "—";
              return (
                <tr key={h.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted-foreground">
                    {formatDateTime(h.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded",
                        h.status_geral === "SUCESSO"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning",
                      )}
                    >
                      {h.status_geral}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
                        h.origem === "auto"
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-surface-2 text-muted-foreground border-border",
                      )}
                      title={h.origem === "auto" ? "Disparada pelo agendamento" : "Disparada manualmente"}
                    >
                      {h.origem === "auto" ? "Automática" : "Manual"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatInt(h.total_processado)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-success">{formatInt(h.aprovados)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-destructive">{formatInt(h.reprovados)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatPct(conf, 1)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{dur}</td>
                  <td className={cn(
                    "px-3 py-2.5 text-right font-mono tabular-nums",
                    !prev && "text-muted-foreground/40",
                    prev && delta > 0 && "text-success",
                    prev && delta < 0 && "text-destructive",
                    prev && delta === 0 && "text-muted-foreground",
                  )}>
                    {prev ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
