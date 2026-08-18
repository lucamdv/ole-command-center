import type { AuditFindingRow, AuditHistoryItem, AuditRunRow, LatestAudit } from "./types";

export interface KpiBundle {
  audited: number;
  approved: number;
  rejected: number;
  approvedRate: number;
  activeAlerts: number;
  operationalRisk: number;
  uniqueErrorTypes: number;
  affectedPolicies: number;
  topErrorType: string | null;
  topErrorCount: number;
  // Trends vs previous run (percentage points or %)
  deltaApproved: number;
  deltaRejected: number;
  deltaRisk: number;
  deltaAlerts: number;
}

export interface DeriveInput {
  latest: LatestAudit | null;
  history: AuditHistoryItem[];
}

const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
const deltaPct = (cur: number, prev: number) => {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / prev) * 100;
};

export function deriveKpis({ latest, history }: DeriveInput): KpiBundle | null {
  if (!latest) return null;
  const r = latest.run;
  const findings = latest.findings;
  const audited = r.total_processado;
  const approved = r.aprovados;
  const rejected = r.reprovados;
  const approvedRate = pct(approved, audited);
  const operationalRisk = pct(rejected, audited);
  const affectedPolicies = new Set(findings.map((f) => f.apolice)).size;
  const uniqueErrorTypes = new Set(findings.map((f) => f.tipo_erro)).size;

  // Top error type
  const counts = new Map<string, number>();
  for (const f of findings) counts.set(f.tipo_erro, (counts.get(f.tipo_erro) ?? 0) + 1);
  let topErrorType: string | null = null;
  let topErrorCount = 0;
  for (const [k, v] of counts) {
    if (v > topErrorCount) {
      topErrorType = k;
      topErrorCount = v;
    }
  }

  // Previous run (history is desc; first is current)
  const prev = history.find((h) => h.id !== r.id) ?? null;
  const deltaApproved = prev ? deltaPct(approved, prev.aprovados) : 0;
  const deltaRejected = prev ? deltaPct(rejected, prev.reprovados) : 0;
  const prevRisk = prev ? pct(prev.reprovados, prev.total_processado) : operationalRisk;
  const deltaRisk = operationalRisk - prevRisk; // percentage points
  const deltaAlerts = prev ? deltaPct(rejected, prev.reprovados) : 0;

  return {
    audited,
    approved,
    rejected,
    approvedRate,
    activeAlerts: findings.length,
    operationalRisk,
    uniqueErrorTypes,
    affectedPolicies,
    topErrorType,
    topErrorCount,
    deltaApproved,
    deltaRejected,
    deltaRisk,
    deltaAlerts,
  };
}

export interface ErrorTypeBucket {
  tipo: string;
  count: number;
  apolices: number;
}

export function errorTypeBreakdown(findings: AuditFindingRow[]): ErrorTypeBucket[] {
  const map = new Map<string, { count: number; apolices: Set<string> }>();
  for (const f of findings) {
    const cur = map.get(f.tipo_erro) ?? { count: 0, apolices: new Set<string>() };
    cur.count++;
    cur.apolices.add(f.apolice);
    map.set(f.tipo_erro, cur);
  }
  return Array.from(map.entries())
    .map(([tipo, v]) => ({ tipo, count: v.count, apolices: v.apolices.size }))
    .sort((a, b) => b.count - a.count);
}

export interface ApoliceGroup {
  apolice: string;
  total: number;
  tipos: string[];
  findings: AuditFindingRow[];
}

export function groupByApolice(findings: AuditFindingRow[]): ApoliceGroup[] {
  const map = new Map<string, AuditFindingRow[]>();
  for (const f of findings) {
    const list = map.get(f.apolice) ?? [];
    list.push(f);
    map.set(f.apolice, list);
  }
  return Array.from(map.entries())
    .map(([apolice, list]) => ({
      apolice,
      total: list.length,
      tipos: Array.from(new Set(list.map((l) => l.tipo_erro))),
      findings: list,
    }))
    .sort((a, b) => b.total - a.total);
}

// Series for sparklines / charts — uses history in chronological order
export interface RunPoint {
  id: string;
  label: string;
  date: string;
  approved: number;
  rejected: number;
  total: number;
  risk: number;
}

export function runSeries(history: AuditHistoryItem[]): RunPoint[] {
  const asc = [...history].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  return asc.map((h, i) => ({
    id: h.id,
    label: `R${i + 1}`,
    date: h.created_at,
    approved: h.aprovados,
    rejected: h.reprovados,
    total: h.total_processado,
    risk: pct(h.reprovados, h.total_processado),
  }));
}

// Heatmap: tipo_erro × últimas N runs.
// Without per-run findings server-side, we use the latest run's findings for the most recent column
// and infer past columns from the run-level reprovados count distributed across known types proportionally.
export interface HeatmapRow {
  tipo: string;
  cells: number[]; // length = runs.length, oldest -> newest
}

export function buildHeatmap(
  latest: LatestAudit | null,
  history: AuditHistoryItem[],
  maxRuns = 12,
): { runs: RunPoint[]; rows: HeatmapRow[] } {
  const runs = runSeries(history).slice(-maxRuns);
  if (!latest || runs.length === 0) return { runs, rows: [] };

  const breakdown = errorTypeBreakdown(latest.findings);
  const totalLatestErrors = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  const latestRunId = latest.run.id;

  const rows: HeatmapRow[] = breakdown.map((b) => {
    const cells = runs.map((rp) => {
      if (rp.id === latestRunId) return b.count;
      // Proportional estimate from historical rejected count
      const share = b.count / totalLatestErrors;
      return Math.round(rp.rejected * share);
    });
    return { tipo: b.tipo, cells };
  });

  return { runs, rows };
}

// Quick formatter for apólice numbers (sistema usa 30 dígitos; mostrar últimos 6 + base)
export function shortApolice(num: string): string {
  if (num.length <= 12) return num;
  return `…${num.slice(-12, -6)}·${num.slice(-6)}`;
}

export type Severity = "erro" | "alerta" | "info";

/**
 * Normaliza os campos de um finding lidando com nomes alternativos vindos do n8n
 * (ex.: `detalhe_erro` em vez de `motivo`/`detalhe`, `endosso_com_erro` em vez de `endosso`).
 */
export function normalizeFinding(f: Pick<AuditFindingRow, "endosso" | "detalhes">): {
  motivo: string;
  detalhe: string;
  endosso: string | null;
  nivel: string | null;
  endossoAnterior: string | null;
} {
  const d = (f.detalhes ?? {}) as unknown as Record<string, unknown>;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  const motivo = s("motivo") || s("detalhe_erro") || s("mensagem") || s("message");
  const detalhe = s("detalhe") || s("descricao") || s("description") || "";
  const endosso = f.endosso?.trim() || s("endosso_com_erro") || s("endosso") || "" || null;
  const nivel = s("nivel") || null;
  const endossoAnterior = s("endosso_anterior") || null;
  return { motivo, detalhe, endosso, nivel, endossoAnterior };
}

export function severityOf(f: Pick<AuditFindingRow, "tipo_erro" | "detalhes">): Severity {
  const d = (f.detalhes ?? {}) as unknown as Record<string, unknown>;
  const nivel = typeof d.nivel === "string" ? d.nivel.toUpperCase() : "";
  if (nivel === "ERRO") return "erro";
  if (nivel === "ALERTA" || nivel === "WARN" || nivel === "ATENÇÃO") return "alerta";
  const hay =
    `${f.tipo_erro ?? ""} ${d.motivo ?? ""} ${d.detalhe ?? ""} ${d.detalhe_erro ?? ""}`.toUpperCase();
  if (hay.includes("ERRO")) return "erro";
  if (hay.includes("ALERTA") || hay.includes("ATENÇÃO") || hay.includes("WARN")) return "alerta";
  return "info";
}

export interface SeverityBreakdown {
  erros: number;
  alertas: number;
  infos: number;
}

export function countBySeverity(findings: AuditFindingRow[]): SeverityBreakdown {
  const out: SeverityBreakdown = { erros: 0, alertas: 0, infos: 0 };
  for (const f of findings) {
    const s = severityOf(f);
    if (s === "erro") out.erros++;
    else if (s === "alerta") out.alertas++;
    else out.infos++;
  }
  return out;
}

export interface EndossoBucket {
  endosso: string;
  total: number;
  apolices: number;
  erros: number;
  alertas: number;
}

export function groupByEndosso(findings: AuditFindingRow[]): EndossoBucket[] {
  const map = new Map<string, { items: AuditFindingRow[]; apolices: Set<string> }>();
  for (const f of findings) {
    const key = normalizeFinding(f).endosso || "—";
    const cur = map.get(key) ?? { items: [], apolices: new Set<string>() };
    cur.items.push(f);
    cur.apolices.add(f.apolice);
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([endosso, v]) => {
      const sev = countBySeverity(v.items);
      return {
        endosso,
        total: v.items.length,
        apolices: v.apolices.size,
        erros: sev.erros,
        alertas: sev.alertas,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MonthBucket {
  key: string; // YYYY-MM
  label: string;
  count: number;
}

export function bucketByMonth(findings: AuditFindingRow[]): MonthBucket[] {
  const map = new Map<string, number>();
  for (const f of findings) {
    const d = f.data_inicio || f.data_fim;
    if (!d) continue;
    const key = d.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
        new Date(Number(y), Number(m) - 1, 1),
      );
      return { key, label, count };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
