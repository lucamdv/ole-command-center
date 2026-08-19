// Cálculos puros dos KPIs de acompanhamento da operação (cadências 5.1–5.4).
// Só usa dados já existentes: runs/achados de auditoria (sem exceções) e carteira.

export type KpiStatus = "ok" | "warn" | "bad";

export interface KpiTargets {
  /** Máximo aceitável de reincidência (%). */
  reincidenciaMaxPct: number;
  /** Máximo de ocorrências críticas em aberto. */
  criticasAbertasMax: number;
  /** Capacidade operacional atual em contratos ativos. */
  capacidadeContratos: number;
  /** Desvio (%) acima da média móvel que caracteriza pico de novas inconsistências. */
  picoDesvioPct: number;
  /** Crescimento anual mínimo esperado da carteira (%). */
  crescimentoAnualMinPct: number;
}

export const DEFAULT_KPI_TARGETS: KpiTargets = {
  reincidenciaMaxPct: 15,
  criticasAbertasMax: 0,
  capacidadeContratos: 100,
  picoDesvioPct: 30,
  crescimentoAnualMinPct: 10,
};

/** Status por limite máximo: ok até o limite, warn até +50%, bad acima. */
export function statusMax(value: number, max: number): KpiStatus {
  if (value <= max) return "ok";
  if (value <= max * 1.5 || max === 0) return value === 0 ? "ok" : max === 0 ? "bad" : "warn";
  return "bad";
}

/** Status por limite mínimo: ok a partir do alvo, warn até 20% abaixo, bad abaixo disso. */
export function statusMin(value: number, min: number): KpiStatus {
  if (value >= min) return "ok";
  if (value >= min * 0.8) return "warn";
  return "bad";
}

export interface FindingLite {
  run_id: string;
  apolice: string;
  tipo_erro: string;
  nivel: string | null;
}

export interface RunLite {
  id: string;
  at: string; // ISO
}

export const findingKey = (f: { apolice: string; tipo_erro: string }) =>
  `${f.apolice}::${f.tipo_erro}`;

export const isCritical = (f: FindingLite) => (f.nivel ?? "").toUpperCase() === "ERRO";

export interface DailyKpis {
  runAt: string | null;
  /** Achados na run mais recente. */
  novas: number;
  /** Achados de nível ERRO na run mais recente. */
  criticasAbertas: number;
  /**
   * Inconsistências resolvidas no ciclo. Preenchido a partir de audit_resolutions
   * (manuais + automáticas) em kpis.functions.ts, não pelo diff entre runs.
   */
  resolvidas: number;
  /** Média móvel de achados nas runs anteriores (até 5). */
  mediaMovel: number;
  /** Desvio (%) da run atual sobre a média móvel. */
  desvioPct: number;
}

export interface WeeklyKpis {
  runs: number;
  total: number;
  repetidas: number;
  novasUnicas: number;
  reincidenciaPct: number;
  apolicesReincidentes: number;
}

export interface MonthlyReincidencia {
  month: string; // YYYY-MM
  label: string;
  total: number;
  repetidas: number;
  reincidenciaPct: number;
  /** Média móvel de 3 meses da reincidência. */
  mm3: number;
}

export interface YearlyPoint {
  year: number;
  /** Contratos emitidos no ano (ano fechado). */
  contratos: number;
  /** Contratos emitidos até o mesmo dia/mês do ano de referência. */
  contratosYtd: number;
  /** Prêmio emitido (todos os componentes das parcelas) no ano. */
  premioEmitidoUsd: number;
  premioEmitidoYtdUsd: number;
  /** Prêmio direto puro (DIRETO/PREMIO) das apólices emitidas no ano. */
  premioDiretoUsd: number;
  premioDiretoYtdUsd: number;
  /** Achados críticos DISTINTOS (apólice + tipo de erro) no ano. */
  criticos: number;
  criticosYtd: number;
}

export function emptyYear(year: number): YearlyPoint {
  return {
    year,
    contratos: 0,
    contratosYtd: 0,
    premioEmitidoUsd: 0,
    premioEmitidoYtdUsd: 0,
    premioDiretoUsd: 0,
    premioDiretoYtdUsd: 0,
    criticos: 0,
    criticosYtd: 0,
  };
}

/** "MM-DD" da data de referência, usado para recortar o acumulado do ano (YTD). */
export function ytdCutoff(ref = new Date()): string {
  return ref.toISOString().slice(5, 10);
}

/** A data (YYYY-MM-DD) está dentro do acumulado até o corte MM-DD? */
export function withinYtd(date: string, cutoffMonthDay: string): boolean {
  return date.slice(5, 10) <= cutoffMonthDay;
}

/** Variação percentual ano a ano; null quando a base é zero (histórico insuficiente). */
export function yoyPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}


function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
}

/** runs em ordem crescente de data; findings de todas elas (já sem exceções). */
export function deriveDaily(runsAsc: RunLite[], byRun: Map<string, FindingLite[]>): DailyKpis {
  if (runsAsc.length === 0) {
    return { runAt: null, novas: 0, criticasAbertas: 0, resolvidas: 0, mediaMovel: 0, desvioPct: 0 };
  }
  const current = runsAsc[runsAsc.length - 1];
  const cur = byRun.get(current.id) ?? [];

  const anteriores = runsAsc.slice(0, -1).slice(-5);
  const mediaMovel =
    anteriores.length > 0
      ? anteriores.reduce((s, r) => s + (byRun.get(r.id)?.length ?? 0), 0) / anteriores.length
      : 0;
  const desvioPct = mediaMovel > 0 ? ((cur.length - mediaMovel) / mediaMovel) * 100 : 0;

  return {
    runAt: current.at,
    novas: cur.length,
    criticasAbertas: cur.filter(isCritical).length,
    resolvidas: 0,
    mediaMovel: Math.round(mediaMovel * 10) / 10,
    desvioPct: Math.round(desvioPct * 10) / 10,
  };
}

/**
 * Reincidência: achado (apólice + tipo de erro) que já apareceu em alguma run
 * anterior à janela analisada.
 */
export function deriveWeekly(
  runsAsc: RunLite[],
  byRun: Map<string, FindingLite[]>,
  days = 7,
): WeeklyKpis {
  if (runsAsc.length === 0) {
    return {
      runs: 0,
      total: 0,
      repetidas: 0,
      novasUnicas: 0,
      reincidenciaPct: 0,
      apolicesReincidentes: 0,
    };
  }
  const last = runsAsc[runsAsc.length - 1];
  const cutoff = +new Date(last.at) - days * 86_400_000;
  let window = runsAsc.filter((r) => +new Date(r.at) >= cutoff);
  if (window.length === 0) window = [last];
  const windowIds = new Set(window.map((r) => r.id));
  const before = runsAsc.filter((r) => !windowIds.has(r.id));

  const historico = new Set<string>();
  for (const r of before) for (const f of byRun.get(r.id) ?? []) historico.add(findingKey(f));

  const seen = new Set<string>();
  const apolices = new Set<string>();
  let repetidas = 0;
  let novasUnicas = 0;
  for (const r of window) {
    for (const f of byRun.get(r.id) ?? []) {
      const key = findingKey(f);
      if (seen.has(key)) continue;
      seen.add(key);
      if (historico.has(key)) {
        repetidas++;
        apolices.add(f.apolice);
      } else {
        novasUnicas++;
      }
    }
  }
  const total = repetidas + novasUnicas;
  return {
    runs: window.length,
    total,
    repetidas,
    novasUnicas,
    reincidenciaPct: total > 0 ? Math.round((repetidas / total) * 1000) / 10 : 0,
    apolicesReincidentes: apolices.size,
  };
}

export function deriveMonthlyReincidencia(
  runsAsc: RunLite[],
  byRun: Map<string, FindingLite[]>,
): MonthlyReincidencia[] {
  const historico = new Set<string>();
  const perMonth = new Map<string, { total: Set<string>; repetidas: Set<string> }>();

  for (const r of runsAsc) {
    const month = r.at.slice(0, 7);
    const bucket = perMonth.get(month) ?? { total: new Set<string>(), repetidas: new Set<string>() };
    const keysDaRun = new Set<string>();
    for (const f of byRun.get(r.id) ?? []) {
      const key = findingKey(f);
      keysDaRun.add(key);
      if (!bucket.total.has(key)) {
        bucket.total.add(key);
        if (historico.has(key)) bucket.repetidas.add(key);
      }
    }
    perMonth.set(month, bucket);
    for (const k of keysDaRun) historico.add(k);
  }

  const rows = Array.from(perMonth.entries())
    .map(([month, v]) => {
      const total = v.total.size;
      const repetidas = v.repetidas.size;
      return {
        month,
        label: monthLabel(month),
        total,
        repetidas,
        reincidenciaPct: total > 0 ? Math.round((repetidas / total) * 1000) / 10 : 0,
        mm3: 0,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return rows.map((r, i) => {
    const slice = rows.slice(Math.max(0, i - 2), i + 1);
    const mm3 = slice.reduce((s, x) => s + x.reincidenciaPct, 0) / slice.length;
    return { ...r, mm3: Math.round(mm3 * 10) / 10 };
  });
}
