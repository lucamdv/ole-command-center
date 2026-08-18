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
import type { RecurrenceItem } from "@/lib/audit-recurrence.functions";

export interface AlertItem {
  f: AuditFindingRow;
  severity: Severity;
  urgency: Urgency;
  baseUrgency: Urgency;
  bumps: number;
  escalationReasons: string[];
  occurrences: number;
  streak: number;
  firstSeenAt: string;
  daysOpen: number;
  reopened: boolean;
  resolvedTimes: number;
  motivo: string;
  detalhe: string;
  endosso: string | null;
}

export function keyOf(apolice: string, tipo: string) {
  return `${apolice}||${tipo}`;
}

export function buildAlertItems(
  findings: AuditFindingRow[],
  recurrence: RecurrenceItem[],
  rules: EscalationRules = DEFAULT_ESCALATION_RULES,
): AlertItem[] {
  const rec = new Map(recurrence.map((r) => [r.key, r] as const));
  return findings.map((f) => {
    const r = rec.get(keyOf(f.apolice, f.tipo_erro));
    const severity = severityOf(f);
    const firstSeenAt = r?.firstSeenAt ?? f.created_at;
    const daysOpen = daysBetween(firstSeenAt);
    const occurrences = r?.occurrences ?? 1;
    const reopened = r?.reopened ?? false;
    const esc = escalate(severity, { occurrences, daysOpen, reopened }, rules);
    const norm = normalizeFinding(f);
    return {
      f,
      severity,
      urgency: esc.urgency,
      baseUrgency: esc.base,
      bumps: esc.bumps,
      escalationReasons: esc.reasons,
      occurrences,
      streak: r?.streak ?? 1,
      firstSeenAt,
      daysOpen,
      reopened,
      resolvedTimes: r?.resolvedTimes ?? 0,
      motivo: norm.motivo,
      detalhe: norm.detalhe,
      endosso: norm.endosso,
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
        return a.apolice_cmp(b);
      case "urgencia":
      default:
        return u(b) - u(a) || b.occurrences - a.occurrences || b.daysOpen - a.daysOpen;
    }
  });
  return out;
}

// Helper de comparação por apólice sem poluir o tipo público.
declare module "./alert-view" {}
Object.defineProperty(Object.prototype, "apolice_cmp", { value: undefined, writable: true });
