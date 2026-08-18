// Filtro de EXCEÇÕES DA AUDITORIA (tabela audit_ignores).
// NÃO confundir com as exceções da ferramenta de Últimos Endossos
// (tabela endorsement_exceptions) — são independentes.

export interface IgnoreEntry {
  apolice: string;
  tipo_erro: string | null;
}

export interface IgnoreSets {
  apoliceWhole: Set<string>;
  apolicePlusTipo: Set<string>;
  isEmpty: boolean;
}

export function buildIgnoreSets(list: IgnoreEntry[]): IgnoreSets {
  const apoliceWhole = new Set(list.filter((i) => !i.tipo_erro).map((i) => i.apolice));
  const apolicePlusTipo = new Set(
    list.filter((i) => i.tipo_erro).map((i) => `${i.apolice}::${i.tipo_erro}`),
  );
  return {
    apoliceWhole,
    apolicePlusTipo,
    isEmpty: apoliceWhole.size === 0 && apolicePlusTipo.size === 0,
  };
}

export function isIgnoredFinding(
  sets: IgnoreSets,
  f: { apolice: string; tipo_erro: string },
): boolean {
  return (
    sets.apoliceWhole.has(f.apolice) || sets.apolicePlusTipo.has(`${f.apolice}::${f.tipo_erro}`)
  );
}

export function filterFindings<T extends { apolice: string; tipo_erro: string }>(
  sets: IgnoreSets,
  findings: T[],
): T[] {
  if (sets.isEmpty) return findings;
  return findings.filter((f) => !isIgnoredFinding(sets, f));
}

/**
 * Recalcula reprovados/aprovados de uma execução descontando as exceções.
 * reprovados = apólices distintas com pelo menos 1 achado não ignorado.
 */
export function adjustRunCounts(
  run: { total_processado: number; aprovados: number; reprovados: number },
  sets: IgnoreSets,
  runFindings: Array<{ apolice: string; tipo_erro: string }>,
): { total_processado: number; aprovados: number; reprovados: number } {
  const antes = new Set(runFindings.map((f) => f.apolice));
  const depois = new Set(filterFindings(sets, runFindings).map((f) => f.apolice));
  const reprovados = depois.size;
  const removidos = antes.size - depois.size;
  const aprovados = (run.aprovados ?? 0) + removidos;
  return { total_processado: run.total_processado, aprovados, reprovados };
}
