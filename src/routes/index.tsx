import { createFileRoute } from "@tanstack/react-router";
import { StatusBar } from "@/components/layout/status-bar";
import { KpiCard } from "@/components/kpi/kpi-card";
import { PulsoOperacional } from "@/components/pulso/pulso-operacional";
import { RiskHeatmap } from "@/components/heatmap/risk-heatmap";
import { computeKpis, HOURLY_THROUGHPUT, WEEKLY_TREND } from "@/lib/mock/data";
import { formatBRL, formatCompact, formatInt } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · OLÉ COPILOT" },
      { name: "description", content: "Centro de comando executivo com KPIs, pulso operacional e matriz de risco." },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const k = computeKpis();
  const sparkProcessed = HOURLY_THROUGHPUT.map((h) => h.processed);
  const sparkFailed = HOURLY_THROUGHPUT.map((h) => h.failed);
  const sparkPremium = WEEKLY_TREND.map((w) => w.premium);
  const sparkApproved = WEEKLY_TREND.map((w) => w.approved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">OLÉ COPILOT</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Visão Geral</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Centro de Comando OLÉ</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1 max-w-2xl">
            Monitoramento operacional inteligente da emissão de seguros. Visibilidade completa de apólices, endossos,
            auditorias e exposição financeira em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-surface text-[12.5px] hover:bg-surface-2 transition">
            Exportar relatório
          </button>
          <button className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-95 transition shadow-glow">
            Forçar sincronização
          </button>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Apólices Auditadas"
          value={k.audited}
          format={formatInt}
          delta={4.2}
          spark={sparkProcessed}
          tone="default"
          hint="Ciclo atual"
        />
        <KpiCard
          label="Conformes"
          value={k.approved}
          format={formatInt}
          delta={2.8}
          spark={sparkApproved}
          tone="success"
          hint={`${k.approvedRate.toFixed(1)}% do total`}
        />
        <KpiCard
          label="Não Conformes"
          value={k.rejected}
          format={formatInt}
          delta={-1.4}
          spark={sparkFailed}
          tone="destructive"
          hint="Reprovações automatizadas"
        />
        <KpiCard
          label="Alertas Ativos"
          value={k.activeAlerts}
          format={formatInt}
          delta={6.1}
          spark={[12, 18, 15, 22, 28, 24, 31, 29, 35, 33, 40, 38]}
          tone="warning"
          hint="Incidentes abertos"
        />
        <KpiCard
          label="Risco Operacional"
          value={k.operationalRisk}
          suffix="%"
          delta={-0.6}
          spark={[32, 30, 31, 29, 28, 30, 27, 26, 28, 25, 24, 23]}
          tone="warning"
          hint="Índice composto"
        />
        <KpiCard
          label="Exposição Financeira"
          value={k.exposure}
          format={(n) => `R$ ${formatCompact(n)}`}
          delta={3.4}
          spark={sparkPremium}
          tone="info"
          hint={formatBRL(k.exposure)}
        />
        <KpiCard
          label="Prêmio Total"
          value={k.totalPremium}
          format={(n) => `R$ ${formatCompact(n)}`}
          delta={1.9}
          spark={sparkPremium}
          tone="default"
          hint="Soma da carteira ativa"
        />
        <KpiCard
          label="Produtividade"
          value={k.productivity}
          suffix="%"
          delta={0.8}
          spark={[92, 93, 94, 93, 95, 96, 95, 96, 97, 96, 97, 96]}
          tone="success"
          hint="Auditorias / hora"
        />
      </div>

      {/* Pulso Operacional */}
      <PulsoOperacional />

      {/* Heatmap */}
      <RiskHeatmap />
    </div>
  );
}
