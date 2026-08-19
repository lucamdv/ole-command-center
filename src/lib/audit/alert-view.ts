// Derivação da visão de Alertas: junta findings da última auditoria com o
// histórico de reincidência e aplica o escalonamento de urgência.

import { normalizeFinding, severityOf, type Severity } from "./derive";
import {
  daysBetween,
  escalate,
  DEFAULT_ESCALATION_RULES,
  URGENCY_ORDER,
  type EscalationRules,
  type Urgency,
} from "./escalation";
import type { AuditFindingRow } from "./types";
import type { PolicyHistoryEntry, RecurrenceItem } from "@/lib/audit-recurrence.functions";

export interface AlertItem {
  f: AuditFindingRow;
  severity: Severity;
  /** Urgência efetiva (manual quando definida, senão a automática). */
  urgency: Urgency;
  /** Urgência calculada pelas regras, ignorando o override manual. */
  autoUrgency: Urgency;
  /** Nível definido manualmente pelo operador, quando houver. */
  manualUrgency: Urgency | null;
  baseUrgency: Urgency;
  bumps: number;
  escalationReasons: string[];
  /** Auditorias consecutivas em aberto (apólice + tipo + endosso). */
  occurrences: number;
  totalOccurrences: number;
  /** Mesmo tipo de erro já ocorreu em outro endosso desta apólice. */
  recorrenteNaApolice: boolean;
  policyHistory: PolicyHistoryEntry[];
  streak: number;
  firstSeenAt: string;
  firstSeenEverAt: string;
  daysOpen: number;
  reopened: boolean;
  resolvedTimes: number;
  motivo: string;
  detalhe: string;
  endosso: string | null;
  /** Chave estável do incidente (apólice + tipo). */
  key: string;
}

export function keyOf(apolice: string, tipo: string, endosso?: string | null) {
  return `${apolice}||${tipo}||${(endosso ?? "").trim()}`;
}

export function buildAlertItems(
  findings: AuditFindingRow[],
  recurrence: RecurrenceItem[],
  rules: EscalationRules = DEFAULT_ESCALATION_RULES,
  overrides: Record<string, Urgency> = {},
): AlertItem[] {
  const rec = new Map(recurrence.map((r) => [r.key, r] as const));
  return findings.map((f) => {
    const key = keyOf(f.apolice, f.tipo_erro, f.endosso);
    const r = rec.get(key);
    const severity = severityOf(f);
    const firstSeenAt = r?.firstSeenAt ?? f.created_at;
    const daysOpen = daysBetween(firstSeenAt);
    const occurrences = r?.occurrences ?? 1;
    const totalOccurrences = r?.totalOccurrences ?? occurrences;
    const reopened = r?.reopened ?? false;
    const recorrenteNaApolice = r?.recorrenteNaApolice ?? false;
    const esc = escalate(
      severity,
      { occurrences, daysOpen, reopened, recorrenteNaApolice },
      rules,
    );
    const norm = normalizeFinding(f);
    const legacyKey = `${f.apolice}||${f.tipo_erro}`;
    const manualUrgency = overrides[key] ?? overrides[legacyKey] ?? null;
    return {
      f,
      severity,
      urgency: manualUrgency ?? esc.urgency,
      autoUrgency: esc.urgency,
      manualUrgency,
      baseUrgency: esc.base,
      bumps: esc.bumps,
      escalationReasons: esc.reasons,
      occurrences,
      totalOccurrences,
      recorrenteNaApolice,
      policyHistory: r?.policyHistory ?? [],
      streak: r?.streak ?? 1,
      firstSeenAt,
      firstSeenEverAt: r?.firstSeenEverAt ?? firstSeenAt,
      daysOpen,
      reopened,
      resolvedTimes: r?.resolvedTimes ?? 0,
      motivo: norm.motivo,
      detalhe: norm.detalhe,
      endosso: norm.endosso,
      key,
    };
  });
}

export type SortKey = "urgencia" | "idade" | "reincidencia" | "apolice";

export function sortAlerts(items: AlertItem[], key: SortKey): AlertItem[] {
  const u = (i: AlertItem) => URGENCY_ORDER.indexOf(i.urgency);
  const out = [...items];
  out.sort((a, b) => {
    switch (key) {
      case "idade":
        return b.daysOpen - a.daysOpen || u(b) - u(a);
      case "reincidencia":
        return b.occurrences - a.occurrences || u(b) - u(a);
      case "apolice":
        return a.f.apolice.localeCompare(b.f.apolice);
      case "urgencia":
      default:
        return u(b) - u(a) || b.occurrences - a.occurrences || b.daysOpen - a.daysOpen;
    }
  });
  return out;
}
