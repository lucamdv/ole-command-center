// Escalonamento de urgência: a severidade natural do achado sobe de nível
// conforme o problema persiste em auditorias / dias sem resolução.

import type { Severity } from "./derive";

export type Urgency = "baixa" | "media" | "alta" | "critica";

export const URGENCY_ORDER: Urgency[] = ["baixa", "media", "alta", "critica"];

export const URGENCY_LABEL: Record<Urgency, string> = {
  baixa: "baixa",
  media: "média",
  alta: "alta",
  critica: "crítica",
};

export interface EscalationRules {
  /** A partir de quantas auditorias em aberto sobe um nível. */
  auditsToEscalate: number;
  /** A partir de quantos dias em aberto sobe um nível. */
  daysToEscalate: number;
  /** Sobe um nível extra quando o problema foi resolvido e voltou. */
  reopenedBump: boolean;
  /** Sobe um nível quando o mesmo erro já ocorreu em endosso anterior da apólice. */
  policyRecurrenceBump: boolean;
  /** Teto do escalonamento automático. */
  maxUrgency: Urgency;
}

export const DEFAULT_ESCALATION_RULES: EscalationRules = {
  auditsToEscalate: 3,
  daysToEscalate: 7,
  reopenedBump: true,
  policyRecurrenceBump: true,
  maxUrgency: "critica",
};

const BASE_FROM_SEVERITY: Record<Severity, Urgency> = {
  erro: "alta",
  alerta: "media",
  info: "baixa",
};

export interface EscalationContext {
  /** Em quantas auditorias o problema apareceu. */
  occurrences: number;
  /** Dias desde a primeira detecção. */
  daysOpen: number;
  /** Já foi marcado como resolvido e voltou. */
  reopened: boolean;
  /** Mesmo tipo de erro já ocorreu em outro endosso da mesma apólice. */
  recorrenteNaApolice?: boolean;
}

export interface EscalationResult {
  urgency: Urgency;
  base: Urgency;
  bumps: number;
  reasons: string[];
}

export function escalate(
  severity: Severity,
  ctx: EscalationContext,
  rules: EscalationRules = DEFAULT_ESCALATION_RULES,
): EscalationResult {
  const base = BASE_FROM_SEVERITY[severity];
  const reasons: string[] = [];
  let bumps = 0;

  if (rules.auditsToEscalate > 0 && ctx.occurrences >= rules.auditsToEscalate) {
    bumps++;
    reasons.push(`${ctx.occurrences} auditorias consecutivas em aberto`);
  }
  if (rules.daysToEscalate > 0 && ctx.daysOpen >= rules.daysToEscalate) {
    bumps++;
    reasons.push(`${ctx.daysOpen} dias sem resolução`);
  }
  if (rules.policyRecurrenceBump && ctx.recorrenteNaApolice) {
    bumps++;
    reasons.push("já ocorreu em endosso anterior da apólice");
  }
  if (rules.reopenedBump && ctx.reopened) {
    bumps++;
    reasons.push("reaberto após resolução");
  }

  const baseIdx = URGENCY_ORDER.indexOf(base);
  const capIdx = URGENCY_ORDER.indexOf(rules.maxUrgency);
  const idx = Math.min(
    URGENCY_ORDER.length - 1,
    Math.max(baseIdx, Math.min(baseIdx + bumps, Math.max(baseIdx, capIdx))),
  );

  return { urgency: URGENCY_ORDER[idx], base, bumps: idx - baseIdx, reasons };
}

/**
 * Dias em aberto contados por dia de calendário (não por blocos de 24h),
 * para que dois problemas detectados no mesmo dia tenham sempre o mesmo valor,
 * independente da hora da auditoria.
 */
export function daysBetween(from: string | null | undefined, to = Date.now()): number {
  if (!from) return 0;
  const d = new Date(from);
  if (!Number.isFinite(+d)) return 0;
  const startOfDay = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.max(0, Math.round((startOfDay(new Date(to)) - startOfDay(d)) / 86_400_000));
}
