// Filtro de RESOLUÇÕES (tabela audit_resolutions).
// Uma inconsistência é resolvida em duas situações:
//   1) marcada manualmente como resolvida (origem = 'manual');
//   2) estava na auditoria anterior e não aparece mais na atual (origem = 'auto').
// Achados com EXCEÇÃO cadastrada (audit_ignores) nunca geram resolução.
// Um achado resolvido deixa de contar como aberto até que a auditoria o
// detecte novamente (reabertura automática no callback).

import type { IgnoreEntry } from "./ignore-filter";

export type ResolutionOrigem = "manual" | "auto";

export interface ActiveResolution {
  apolice: string;
  tipo_erro: string;
  endosso?: string | null;
}

/**
 * Converte resoluções ativas em entradas compatíveis com o filtro de exceções.
 * A chave inclui o endosso: resolver o endosso 3 não silencia o endosso 4.
 */
export function resolutionsAsIgnoreEntries(rows: ActiveResolution[]): IgnoreEntry[] {
  return rows.map((r) => ({
    apolice: r.apolice,
    tipo_erro: r.tipo_erro,
    endosso: r.endosso ?? null,
  }));
}

export interface ResolutionRow {
  apolice: string;
  tipo_erro: string;
  first_seen_at: string | null;
  resolved_at: string;
  reopened_at?: string | null;
  origem?: string | null;
}

export interface ResolutionTimeStat {
  tipo_erro: string;
  resolvidas: number;
  /** Horas. */
  mediaHoras: number;
  medianaHoras: number;
}

const HOUR = 3_600_000;

function horas(r: ResolutionRow): number | null {
  if (!r.first_seen_at) return null;
  const delta = +new Date(r.resolved_at) - +new Date(r.first_seen_at);
  if (!Number.isFinite(delta) || delta < 0) return null;
  return delta / HOUR;
}


function media(vals: number[]): number {
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

function mediana(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const v = s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  return Math.round(v * 10) / 10;
}

export interface ResolutionTimeSummary {
  totalResolvidas: number;
  mediaHoras: number;
  medianaHoras: number;
  byTipo: ResolutionTimeStat[];
}

/**
 * Agrega tempo de resolução (primeira detecção → resolução) geral e por tipo.
 * Considera resoluções manuais e automáticas; resoluções reabertas (o problema
 * voltou a aparecer) não contam como resolvidas.
 */
export function deriveResolutionTimes(rows: ResolutionRow[]): ResolutionTimeSummary {
  const all: number[] = [];
  const perTipo = new Map<string, number[]>();
  const countPerTipo = new Map<string, number>();
  const validas = rows.filter((r) => !r.reopened_at);

  for (const r of validas) {
    countPerTipo.set(r.tipo_erro, (countPerTipo.get(r.tipo_erro) ?? 0) + 1);
    const h = horas(r);
    if (h == null) continue;
    all.push(h);
    const list = perTipo.get(r.tipo_erro) ?? [];
    list.push(h);
    perTipo.set(r.tipo_erro, list);
  }


  const byTipo: ResolutionTimeStat[] = Array.from(countPerTipo.entries())
    .map(([tipo_erro, resolvidas]) => {
      const vals = perTipo.get(tipo_erro) ?? [];
      return {
        tipo_erro,
        resolvidas,
        mediaHoras: media(vals),
        medianaHoras: mediana(vals),
      };
    })
    .sort((a, b) => b.resolvidas - a.resolvidas || b.mediaHoras - a.mediaHoras);

  return {
    totalResolvidas: validas.length,
    mediaHoras: media(all),
    medianaHoras: mediana(all),
    byTipo,
  };
}

/** "2d 4h" / "5h" / "45min" */
export function formatDuracaoHoras(h: number): string {
  if (!h || h <= 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 48) return `${Math.round(h * 10) / 10}h`;
  const dias = Math.floor(h / 24);
  const resto = Math.round(h % 24);
  return resto > 0 ? `${dias}d ${resto}h` : `${dias}d`;
}
