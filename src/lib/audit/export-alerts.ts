import type { AlertItem } from "./alert-view";
import { URGENCY_LABEL } from "./escalation";

const HEADERS = [
  "apolice",
  "tipo_erro",
  "urgencia",
  "severidade_base",
  "auditorias_consecutivas_em_aberto",
  "auditorias_total",
  "dias_em_aberto",
  "reaberto",
  "reincidente_na_apolice",
  "endossos_anteriores_com_erro",
  "endosso",
  "motivo",
  "detalhe",
  "primeira_deteccao",
  "detectado_em",
];

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function alertsToCsv(items: AlertItem[]): string {
  const lines = [HEADERS.join(";")];
  for (const i of items) {
    lines.push(
      [
        i.f.apolice,
        i.f.tipo_erro,
        URGENCY_LABEL[i.urgency],
        i.severity,
        i.occurrences,
        i.totalOccurrences,
        i.daysOpen,
        i.reopened ? "sim" : "não",
        i.recorrenteNaApolice ? "sim" : "não",
        i.policyHistory.map((h) => h.endosso).join(" / "),
        i.endosso ?? "",
        i.motivo,
        i.detalhe,
        i.firstSeenAt,
        i.f.created_at,
      ]
        .map(esc)
        .join(";"),
    );
  }
  return "\uFEFF" + lines.join("\n");
}

export function downloadAlertsCsv(items: AlertItem[]) {
  const blob = new Blob([alertsToCsv(items)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alertas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
