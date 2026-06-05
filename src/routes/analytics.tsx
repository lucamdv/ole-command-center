import { createFileRoute, Link } from "@tanstack/react-router";
import type React from "react";
import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuditHistory, useLatestAudit } from "@/hooks/use-audit";
import { usePolicies } from "@/hooks/use-policies";
import { useAnalyticsAggregates } from "@/hooks/use-analytics";
import {
  buildHeatmap,
  countBySeverity,
  deriveKpis,
  errorTypeBreakdown,
  groupByApolice,
  groupByEndosso,
  runSeries,
} from "@/lib/audit/derive";
import { exportAuditPdf } from "@/lib/audit/export-pdf";
import { exportChartsPdf } from "@/lib/analytics/export-charts";
import { formatBRL, formatCompact, formatInt, formatPct, formatUSD, relativeTime } from "@/lib/format";
import { REPASSE_RULES } from "@/lib/analytics/repasse-rules";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · OLÉ COPILOT" },
      {
        name: "description",
        content:
          "Inteligência estratégica sobre carteira, runs de auditoria, severidade e eficiência operacional.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const latestQ = useLatestAudit();
  const historyQ = useAuditHistory();
  const policiesQ = usePolicies();
  const aggregatesQ = useAnalyticsAggregates();

  const latest = latestQ.data ?? null;
  const history = historyQ.data ?? [];
  const policies = policiesQ.data ?? [];
  const aggregates = aggregatesQ.data ?? { findingsByVigencia: [], revenueByMonth: [], policyPremiums: [], issuancesByMonth: [], repasseByMonth: [] };

  const kpis = useMemo(() => deriveKpis({ latest, history }), [latest, history]);
  const findings = latest?.findings ?? [];
  const sev = useMemo(() => countBySeverity(findings), [findings]);
  const series = useMemo(() => runSeries(history).slice(-12), [history]);
  const errorTypes = useMemo(() => errorTypeBreakdown(findings).slice(0, 10), [findings]);
  const apoliceRank = useMemo(() => groupByApolice(findings).slice(0, 10), [findings]);
  const endossoRank = useMemo(() => groupByEndosso(findings).slice(0, 8), [findings]);
  const monthly = aggregates.findingsByVigencia;
  const revenue = aggregates.revenueByMonth;
  const repasse = aggregates.repasseByMonth;
  const issuances = aggregates.issuancesByMonth;
  const totalApolices = useMemo(() => issuances.reduce((s, r) => s + r.apolices, 0), [issuances]);
  const totalEndossos = useMemo(() => issuances.reduce((s, r) => s + r.endossosTotal, 0), [issuances]);
  const totalUsd = useMemo(() => revenue.reduce((s, r) => s + r.usd, 0), [revenue]);
  const repasseTotals = useMemo(
    () =>
      repasse.reduce(
        (acc, r) => ({
          carregamentoExcelsior: acc.carregamentoExcelsior + r.carregamentoExcelsior,
          premioDireto: acc.premioDireto + r.premioDireto,
          pisCofins: acc.pisCofins + r.pisCofins,
          excelsiorLiquido: acc.excelsiorLiquido + r.excelsiorLiquido,
          bruto: acc.bruto + r.bruto,
        }),
        { carregamentoExcelsior: 0, premioDireto: 0, pisCofins: 0, excelsiorLiquido: 0, bruto: 0 },
      ),
    [repasse],
  );
  const repasseAvg = repasse.length > 0 ? repasseTotals.excelsiorLiquido / repasse.length : 0;
  const heatmap = useMemo(() => buildHeatmap(latest, history, 12), [latest, history]);



  // Distribuição por nº de endossos
  const endorsementsDist = useMemo(() => {
    const buckets = [
      { label: "0", count: 0 },
      { label: "1-2", count: 0 },
      { label: "3-5", count: 0 },
      { label: "6-10", count: 0 },
      { label: "> 10", count: 0 },
    ];
    for (const p of policies) {
      const n = p.endorsements_count ?? 0;
      const idx = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4;
      buckets[idx].count++;
    }
    return buckets.filter((b) => b.count > 0);
  }, [policies]);


  const chartsRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"none" | "report" | "charts">("none");

  const handleExportReport = () => {
    if (!latest) return;
    setExporting("report");
    try {
      exportAuditPdf(latest, history);
      toast.success("Relatório gerado");
    } catch (e) {
      toast.error("Falha ao gerar relatório", { description: (e as Error).message });
    } finally {
      setExporting("none");
    }
  };

  const handleExportCharts = async () => {
    if (!chartsRef.current) return;
    const nodes = Array.from(
      chartsRef.current.querySelectorAll<HTMLElement>('[data-export="chart"]'),
    );
    if (nodes.length === 0) return;
    setExporting("charts");
    try {
      await exportChartsPdf(nodes);
      toast.success(`${nodes.length} gráficos exportados`);
    } catch (e) {
      toast.error("Falha ao exportar gráficos", { description: (e as Error).message });
    } finally {
      setExporting("none");
    }
  };

  const loading = latestQ.isLoading || historyQ.isLoading;
  const lastRunAt = latest?.run.data_auditoria ?? latest?.run.created_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[24px] font-semibold tracking-tight">Analytics</h1>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              BI · LIVE
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Inteligência estratégica sobre carteira, runs de auditoria, severidade e eficiência operacional.
            {history.length > 0 && (
              <>
                {" · "}
                <span className="font-mono">{history.length}</span> runs no histórico
                {lastRunAt && <> · última {relativeTime(lastRunAt)}</>}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCharts}
            disabled={!latest || exporting !== "none"}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-2 text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting === "charts" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Exportar gráficos (PDF)
          </button>
          <button
            onClick={handleExportReport}
            disabled={!latest || exporting !== "none"}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting === "report" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Relatório completo (PDF)
          </button>
        </div>
      </div>

      {loading && !latest ? (
        <LoadingState />
      ) : !latest ? (
        <EmptyState />
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Apólices na carteira" value={formatInt(policies.length)} />
            <Kpi
              label="Auditadas (última run)"
              value={formatInt(kpis?.audited ?? 0)}
              delta={kpis?.deltaApproved}
              deltaSuffix="%"
            />
            <Kpi
              label="Conformidade"
              value={formatPct(kpis?.approvedRate ?? 0, 1)}
              delta={kpis ? -kpis.deltaRisk : undefined}
              deltaSuffix=" pp"
              tone="success"
            />
            <Kpi
              label="Risco operacional"
              value={formatPct(kpis?.operationalRisk ?? 0, 1)}
              delta={kpis?.deltaRisk}
              deltaSuffix=" pp"
              tone="warning"
              invertDelta
            />
            <Kpi label="Erros críticos" value={formatInt(sev.erros)} tone="destructive" />
            <Kpi label="Alertas" value={formatInt(sev.alertas)} tone="warning" />
            <Kpi label="Tipos de erro únicos" value={formatInt(kpis?.uniqueErrorTypes ?? 0)} />
            <Kpi
              label="Apólices impactadas"
              value={formatInt(kpis?.affectedPolicies ?? 0)}
              hint={
                policies.length > 0
                  ? `${formatPct(((kpis?.affectedPolicies ?? 0) / policies.length) * 100, 1)} da carteira`
                  : undefined
              }
              tone="destructive"
            />
            <Kpi
              label="Receita acumulada Excelsior (USD)"
              value={formatUSD(repasseTotals.excelsiorLiquido, { maximumFractionDigits: 0 })}
              hint={`${repasse.length} meses · média ${formatUSD(repasseAvg, { maximumFractionDigits: 0 })}/mês`}
              tone="success"
            />
          </div>


          <div ref={chartsRef} className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <ChartCard
                className="lg:col-span-2"
                title="Tendência de runs"
                subtitle="Aprovados vs reprovados nas últimas 12 auditorias"
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="gApr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--success)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gRej" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip {...tooltipProps} />
                      <Area type="monotone" dataKey="approved" stackId="1" stroke="var(--success)" fill="url(#gApr)" />
                      <Area type="monotone" dataKey="rejected" stackId="1" stroke="var(--destructive)" fill="url(#gRej)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Severidade" subtitle="Distribuição na última auditoria">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Erros", value: sev.erros, color: "var(--destructive)" },
                          { name: "Alertas", value: sev.alertas, color: "var(--warning)" },
                          { name: "Info", value: sev.infos, color: "var(--info)" },
                        ].filter((d) => d.value > 0)}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {[
                          "var(--destructive)",
                          "var(--warning)",
                          "var(--info)",
                        ].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <SeverityLegend sev={sev} />
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Conformidade ao longo do tempo" subtitle="% aprovado por run">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.map((s) => ({ ...s, conf: s.total ? (s.approved / s.total) * 100 : 0 }))}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip {...tooltipProps} formatter={(v) => formatPct(Number(v), 1)} />
                      <Line type="monotone" dataKey="conf" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Volume processado" subtitle="Apólices auditadas por run">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip {...tooltipProps} />
                      <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Top 10 tipos de erro" subtitle="Última auditoria">
                {errorTypes.length === 0 ? (
                  <EmptyMsg text="Nenhum tipo de erro nesta run." />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={errorTypes} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="tipo"
                          stroke="var(--muted-foreground)"
                          fontSize={10}
                          width={140}
                          tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                        />
                        <Tooltip {...tooltipProps} />
                        <Bar dataKey="count" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Findings por mês de vigência" subtitle="Distribuição temporal das inconsistências">
                {monthly.length === 0 ? (
                  <EmptyMsg text="Sem datas de vigência nos findings." />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                        <Tooltip {...tooltipProps} />
                        <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <ChartCard
              title="Receita Excelsior (USD) por mês de pagamento"
              subtitle={`Total Repasse = Carregamento (US$ 8.333,33) + Prêmio Direto (40% líquido IOF) − PIS/COFINS (4,65% × comissões Olé+Nomad) · espelha o Mapa de Repasses · Total: ${formatUSD(repasseTotals.excelsiorLiquido, { maximumFractionDigits: 0 })} · Média/mês: ${formatUSD(repasseAvg, { maximumFractionDigits: 0 })} · ${repasse.length} meses`}
            >
              {repasse.length === 0 ? (
                <EmptyMsg text="Sem prêmios pagos sincronizados." />
              ) : (
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={repasse} margin={{ top: 28, right: 24, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="gCarregamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="gPremioDireto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--success)" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="var(--success)" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="gLiquido" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--info)" stopOpacity={1} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickFormatter={(v) => `$${formatCompact(Number(v))}`}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        padding={{ top: 16, bottom: 8 }}
                      />
                      <Tooltip
                        {...tooltipProps}
                        cursor={{ fill: "var(--muted)", fillOpacity: 0.18 }}
                        content={<RepasseTooltip />}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <ReferenceLine
                        y={REPASSE_RULES.FIXO_SUPLEMENTAR_PISO}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        label={{
                          value: "Piso · US$ 8.333,33",
                          position: "insideTopRight",
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Bar
                        dataKey="carregamentoExcelsior"
                        name="Carregamento"
                        stackId="rec"
                        fill="url(#gCarregamento)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={48}
                        isAnimationActive
                        animationDuration={900}
                      />
                      <Bar
                        dataKey="premioDireto"
                        name="Prêmio Direto"
                        stackId="rec"
                        fill="url(#gPremioDireto)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        isAnimationActive
                        animationDuration={900}
                      />
                      <Bar
                        dataKey="pisCofinsDeducao"
                        name="PIS/COFINS (dedução)"
                        fill="var(--destructive)"
                        fillOpacity={0.85}
                        radius={[0, 0, 4, 4]}
                        maxBarSize={24}
                        isAnimationActive
                        animationDuration={900}
                      />
                      <Line
                        type="monotone"
                        dataKey="excelsiorLiquido"
                        name="Total Excelsior"
                        stroke="url(#gLiquido)"
                        strokeWidth={2.5}
                        dot={{ fill: "var(--info)", r: 3.5, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive
                        animationDuration={1200}
                      >
                        <LabelList
                          dataKey="excelsiorLiquido"
                          position="top"
                          offset={10}
                          fontSize={10}
                          fill="var(--muted-foreground)"
                          formatter={(v: React.ReactNode) => `$${formatCompact(Number(v))}`}
                        />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>



            <ChartCard
              title="Heatmap · tipo de erro × runs"
              subtitle="Intensidade de inconsistências por tipo nas últimas runs"
            >
              <Heatmap runs={heatmap.runs} rows={heatmap.rows} />
            </ChartCard>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard
                title="Apólices mais problemáticas"
                subtitle={`Top ${apoliceRank.length} por nº de inconsistências`}
              >
                {apoliceRank.length === 0 ? (
                  <EmptyMsg text="Nenhuma apólice com inconsistências." />
                ) : (
                  <div className="space-y-2.5">
                    {apoliceRank.map((g, i) => {
                      const max = apoliceRank[0].total;
                      const s = countBySeverity(g.findings);
                      return (
                        <div key={g.apolice} className="group">
                          <div className="flex items-baseline justify-between mb-1.5 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10.5px] text-muted-foreground w-5">
                                #{i + 1}
                              </span>
                              <Link
                                to="/apolices/$id"
                                params={{ id: g.apolice }}
                                className="font-mono text-[11.5px] text-foreground hover:text-primary truncate"
                              >
                                {g.apolice}
                              </Link>
                              {s.erros > 0 && (
                                <span className="text-[10px] font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                  {s.erros}E
                                </span>
                              )}
                              {s.alertas > 0 && (
                                <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                                  {s.alertas}A
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[12px] text-foreground">{g.total}</span>
                          </div>
                          <div className="h-1 rounded-full bg-background overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-destructive to-warning transition-all"
                              style={{ width: `${(g.total / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Top endossos com inconsistências"
                subtitle="Endossos que mais acumulam findings"
              >
                {endossoRank.length === 0 ? (
                  <EmptyMsg text="Sem endossos identificados." />
                ) : (
                  <div className="space-y-2.5">
                    {endossoRank.map((e, i) => {
                      const max = endossoRank[0].total;
                      return (
                        <div key={e.endosso} className="group">
                          <div className="flex items-baseline justify-between mb-1.5 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10.5px] text-muted-foreground w-5">
                                #{i + 1}
                              </span>
                              <span className="font-mono text-[11.5px] text-foreground truncate">
                                {e.endosso}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {e.apolices} apólices
                              </span>
                            </div>
                            <span className="font-mono text-[12px] text-foreground">{e.total}</span>
                          </div>
                          <div className="h-1 rounded-full bg-background overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-warning to-destructive transition-all"
                              style={{ width: `${(e.total / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard
                title="Carteira por nº de endossos"
                subtitle="Quantas alterações cada apólice acumulou"
              >
                {endorsementsDist.length === 0 ? (
                  <EmptyMsg text="Sem apólices na carteira." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={endorsementsDist}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                        <Tooltip {...tooltipProps} />
                        <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Apólices emitidas por mês"
                subtitle={`${formatInt(totalApolices)} apólices em ${issuances.filter((i) => i.apolices > 0).length} meses`}
              >
                {issuances.length === 0 ? (
                  <EmptyMsg text="Sem emissões registradas." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuances}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                        <Tooltip {...tooltipProps} formatter={(v) => formatInt(Number(v))} />
                        <Bar dataKey="apolices" name="Apólices" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard
                title="Endossos emitidos por mês"
                subtitle={`${formatInt(totalEndossos)} endossos em ${issuances.filter((i) => i.endossosTotal > 0).length} meses`}
              >
                {issuances.length === 0 ? (
                  <EmptyMsg text="Sem endossos registrados." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuances}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                        <Tooltip {...tooltipProps} formatter={(v) => formatInt(Number(v))} />
                        <Bar dataKey="endossosTotal" name="Endossos" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Emissões por mês e por tipo"
                subtitle="Apólices e endossos (A, B, C, D) lado a lado"
              >
                {issuances.length === 0 ? (
                  <EmptyMsg text="Sem emissões registradas." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuances}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                        <Tooltip {...tooltipProps} formatter={(v) => formatInt(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="apolices" name="Apólice" stackId="emi" fill="var(--primary)" />
                        <Bar dataKey="endossoA" name="Endosso A" stackId="emi" fill="var(--info)" />
                        <Bar dataKey="endossoB" name="Endosso B" stackId="emi" fill="var(--success)" />
                        <Bar dataKey="endossoC" name="Endosso C" stackId="emi" fill="var(--warning)" />
                        <Bar dataKey="endossoD" name="Endosso D" stackId="emi" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const tooltipProps = {
  contentStyle: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
  cursor: { fill: "var(--accent)", opacity: 0.3 },
} as const;

function Kpi({
  label,
  value,
  hint,
  delta,
  deltaSuffix = "%",
  tone,
  invertDelta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  deltaSuffix?: string;
  tone?: "success" | "warning" | "destructive";
  invertDelta?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : tone === "destructive"
      ? "text-destructive"
      : "text-foreground";

  const showDelta = delta !== undefined && Number.isFinite(delta) && Math.abs(delta) >= 0.05;
  const positive = invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-elevated">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={`mt-1.5 text-[22px] font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        {showDelta && (
          <span
            className={`font-mono ${positive ? "text-success" : "text-destructive"}`}
          >
            {(delta ?? 0) > 0 ? "▲" : "▼"} {Math.abs(delta ?? 0).toFixed(1)}
            {deltaSuffix}
          </span>
        )}
        {hint && <span className="text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-export="chart"
      data-title={title}
      className={`rounded-2xl border border-border bg-surface p-5 shadow-elevated ${className ?? ""}`}
    >
      <div className="mb-4">
        <div className="text-[13px] font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function SeverityLegend({ sev }: { sev: { erros: number; alertas: number; infos: number } }) {
  const items = [
    { name: "Erros", value: sev.erros, color: "var(--destructive)" },
    { name: "Alertas", value: sev.alertas, color: "var(--warning)" },
    { name: "Info", value: sev.infos, color: "var(--info)" },
  ];
  return (
    <div className="mt-3 space-y-1.5">
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-2 text-[11.5px]">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          <span className="text-muted-foreground flex-1">{it.name}</span>
          <span className="font-mono text-foreground">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function Heatmap({
  runs,
  rows,
}: {
  runs: ReturnType<typeof runSeries>;
  rows: { tipo: string; cells: number[] }[];
}) {
  if (rows.length === 0 || runs.length === 0) {
    return <EmptyMsg text="Sem dados suficientes para o heatmap." />;
  }
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10.5px]">
        <thead>
          <tr>
            <th className="text-left font-normal text-muted-foreground pb-2 pr-3 sticky left-0 bg-surface">
              Tipo de erro
            </th>
            {runs.map((r) => (
              <th
                key={r.id}
                className="text-center font-mono font-normal text-muted-foreground pb-2 px-1 min-w-[42px]"
              >
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((r) => (
            <tr key={r.tipo}>
              <td className="py-1 pr-3 text-foreground truncate max-w-[200px] sticky left-0 bg-surface">
                {r.tipo}
              </td>
              {r.cells.map((c, i) => {
                const intensity = c / max;
                const bg =
                  c === 0
                    ? "transparent"
                    : `color-mix(in oklab, var(--destructive) ${Math.round(
                        20 + intensity * 70,
                      )}%, transparent)`;
                return (
                  <td key={i} className="p-0.5">
                    <div
                      className="h-7 rounded flex items-center justify-center font-mono text-[10px] text-foreground border border-border/40"
                      style={{ background: bg }}
                      title={`${c} inconsistências`}
                    >
                      {c > 0 ? formatCompact(c) : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <div className="h-[160px] flex items-center justify-center text-[12px] text-muted-foreground">
      {text}
    </div>
  );
}

function RepasseTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number> & { label: string } }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const row = (label: string, value: number, tone?: string) => (
    <div className="flex items-center justify-between gap-6 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${tone ?? "text-foreground"}`}>
        {formatUSD(value, { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
  return (
    <div className="rounded-lg border border-border bg-surface/95 backdrop-blur p-3 shadow-elevated min-w-[260px]">
      <div className="text-[12px] font-semibold mb-2">{d.label}</div>
      <div className="space-y-1">
        {row("Prêmio Total Pago", d.premioTotalPago, "text-muted-foreground")}
        {row("(−) IOF (0,38%)", -d.iof, "text-muted-foreground")}
        {row("(=) Prêmio Líquido IOF", d.premioLiquidoIof, "text-muted-foreground")}
        <div className="h-px bg-border my-1.5" />
        {row("Carregamento Excelsior", d.carregamentoExcelsior)}
        {row("Prêmio Direto (40%)", d.premioDireto, "text-success")}
        {row("Comissões Olé+Nomad (55%)", d.comissoesOle, "text-muted-foreground")}
        {row("(−) PIS/COFINS (4,65%)", -d.pisCofins, "text-destructive")}
        <div className="h-px bg-border my-1.5" />
        {row("Total Repasse Excelsior", d.excelsiorLiquido, "text-info font-semibold")}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[320px] rounded-2xl border border-border bg-surface animate-pulse" />
        <div className="h-[320px] rounded-2xl border border-border bg-surface animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-12 text-center">
      <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <div className="text-[14px] font-semibold mb-1">Sem auditorias ainda</div>
      <p className="text-[12.5px] text-muted-foreground mb-4">
        Execute uma auditoria para começar a ver indicadores e gráficos por aqui.
      </p>
      <Link
        to="/operacao"
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-[12px] font-medium"
      >
        Ir para Operação
      </Link>
    </div>
  );
}
