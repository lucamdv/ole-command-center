import { RotateCcw, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useKpiTargets } from "@/hooks/use-kpi-targets";
import { useEscalationRules } from "@/hooks/use-escalation-rules";
import { URGENCY_LABEL, URGENCY_ORDER, type Urgency } from "@/lib/audit/escalation";
import type { KpiTargets } from "@/lib/kpis/derive";

const FIELDS: Array<{
  key: keyof KpiTargets;
  label: string;
  desc: string;
  suffix: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: "reincidenciaMaxPct",
    label: "Reincidência máxima",
    desc: "Percentual aceitável de achados que voltam a aparecer (semanal e mensal).",
    suffix: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "criticasAbertasMax",
    label: "Ocorrências críticas em aberto",
    desc: "Quantidade tolerada de achados de nível ERRO na última auditoria.",
    suffix: "achados",
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: "picoDesvioPct",
    label: "Desvio máximo vs. média móvel",
    desc: "A partir deste desvio, o volume diário de inconsistências é sinalizado como pico.",
    suffix: "%",
    min: 0,
    max: 300,
    step: 5,
  },
  {
    key: "capacidadeContratos",
    label: "Capacidade operacional",
    desc: "Número de contratos ativos que a operação atende com o time atual.",
    suffix: "contratos",
    min: 1,
    max: 100000,
    step: 1,
  },
  {
    key: "crescimentoAnualMinPct",
    label: "Crescimento anual mínimo",
    desc: "Meta de crescimento da carteira em contratos, ano contra ano.",
    suffix: "%",
    min: 0,
    max: 500,
    step: 1,
  },
];

export function MetasTab() {
  const { targets, update, reset } = useKpiTargets();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start gap-2 panel bg-surface/60 p-3">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[12px] text-muted-foreground">
          As metas definem o selo de status exibido nos cartões de KPI da auditoria e do analytics.
          São preferências deste dispositivo e não alteram nenhum dado da operação.
        </p>
      </div>

      <div className="panel divide-y divide-border">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{f.label}</div>
              <div className="text-[11.5px] text-muted-foreground">{f.desc}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                value={targets[f.key]}
                min={f.min}
                max={f.max}
                step={f.step}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  if (!Number.isFinite(raw)) return;
                  const next = Math.min(f.max, Math.max(f.min, raw));
                  update({ [f.key]: next } as Partial<KpiTargets>);
                }}
                className="h-9 w-24 rounded-md border border-border bg-surface-2 px-2 text-right text-[13px] font-mono tabular-nums outline-none focus:border-primary"
              />
              <span className="w-16 text-[11px] text-muted-foreground">{f.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          reset();
          toast.success("Metas restauradas para o padrão");
        }}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[12.5px] transition hover:bg-surface-2"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restaurar padrões
      </button>

      <EscalationSection />
    </div>
  );
}

function EscalationSection() {
  const { rules, update, reset } = useEscalationRules();

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-start gap-2 panel bg-surface/60 p-3">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <div className="text-[13px] font-medium">Escalonamento de alertas</div>
          <p className="text-[12px] text-muted-foreground">
            Define quando a urgência de um incidente sobe de nível na página de Alertas (baixa →
            média → alta → crítica) por persistência em auditorias, tempo em aberto ou reabertura.
          </p>
        </div>
      </div>

      <div className="panel divide-y divide-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">Auditorias para escalar</div>
            <div className="text-[11.5px] text-muted-foreground">
              A partir deste número de auditorias com o problema em aberto, sobe um nível.
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={50}
              value={rules.auditsToEscalate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) update({ auditsToEscalate: Math.min(50, Math.max(0, v)) });
              }}
              className="h-9 w-24 rounded-md border border-border bg-surface-2 px-2 text-right text-[13px] font-mono tabular-nums outline-none focus:border-primary"
            />
            <span className="w-16 text-[11px] text-muted-foreground">auditorias</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">Dias para escalar</div>
            <div className="text-[11.5px] text-muted-foreground">
              A partir deste tempo desde a primeira detecção, sobe um nível.
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={365}
              value={rules.daysToEscalate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) update({ daysToEscalate: Math.min(365, Math.max(0, v)) });
              }}
              className="h-9 w-24 rounded-md border border-border bg-surface-2 px-2 text-right text-[13px] font-mono tabular-nums outline-none focus:border-primary"
            />
            <span className="w-16 text-[11px] text-muted-foreground">dias</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">Escalar em reincidência na apólice</div>
            <div className="text-[11.5px] text-muted-foreground">
              Sobe um nível quando o mesmo tipo de erro já ocorreu em endosso anterior da mesma
              apólice.
            </div>
          </div>
          <button
            onClick={() => update({ policyRecurrenceBump: !rules.policyRecurrenceBump })}
            className={`h-9 shrink-0 rounded-md border px-3 text-[12.5px] transition ${
              rules.policyRecurrenceBump
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            {rules.policyRecurrenceBump ? "Ativado" : "Desativado"}
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">Escalar em reabertura</div>
            <div className="text-[11.5px] text-muted-foreground">
              Sobe um nível extra quando o problema já foi resolvido e voltou a aparecer.
            </div>
          </div>
          <button
            onClick={() => update({ reopenedBump: !rules.reopenedBump })}
            className={`h-9 shrink-0 rounded-md border px-3 text-[12.5px] transition ${
              rules.reopenedBump
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            {rules.reopenedBump ? "Ativado" : "Desativado"}
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">Urgência máxima automática</div>
            <div className="text-[11.5px] text-muted-foreground">
              Teto que o escalonamento automático pode alcançar.
            </div>
          </div>
          <select
            value={rules.maxUrgency}
            onChange={(e) => update({ maxUrgency: e.target.value as Urgency })}
            className="h-9 shrink-0 rounded-md border border-border bg-surface-2 px-2 text-[12.5px] outline-none focus:border-primary"
          >
            {URGENCY_ORDER.map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => {
          reset();
          toast.success("Regras de escalonamento restauradas");
        }}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[12.5px] transition hover:bg-surface-2"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restaurar escalonamento
      </button>
    </div>
  );
}
