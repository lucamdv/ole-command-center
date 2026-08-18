// Extração de fatos da apólice (vigência, emissão e prêmio) a partir do JSON `proposta`.
// Mesma tolerância de formato usada em analytics.functions.ts (achatado ou
// encapsulado em endosso_A/B/C/D → proposta_endosso_X → proposta).

export interface PolicyFacts {
  inicio: string | null; // YYYY-MM-DD
  fim: string | null; // YYYY-MM-DD
  /** Data de emissão (assinatura / conclusão de subscrição / registro de origem). */
  emissao: string | null; // YYYY-MM-DD
  /** Prêmio direto puro (tipo_premio=DIRETO, natureza_premio=PREMIO). */
  premioUsd: number;
}

export interface IssuanceFacts {
  emissao: string | null; // YYYY-MM-DD
  /** Parcelas com data de vencimento e soma de TODOS os componentes de prêmio. */
  parcelas: Array<{ data: string | null; valor: number }>;
  /** Prêmio direto puro do registro (DIRETO/PREMIO nas coberturas). */
  premioDiretoUsd: number;
  /** Soma de todos os componentes das coberturas (fallback quando não há parcelas). */
  premioTotalCoberturas: number;
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toRaw(propostaRaw: unknown): Record<string, unknown> {
  return typeof propostaRaw === "string"
    ? safeJson(propostaRaw)
    : ((propostaRaw ?? {}) as Record<string, unknown>);
}

function resolveProposta(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.datas || raw.itens) return raw;
  for (const k of ["endosso_A", "endosso_B", "endosso_C", "endosso_D"]) {
    const wrapper = raw[k] as Record<string, unknown> | undefined;
    if (!wrapper) continue;
    const inner = wrapper[`proposta_${k}`] as Record<string, unknown> | undefined;
    const inside = inner?.proposta as Record<string, unknown> | undefined;
    if (inside && (inside.datas || inside.itens)) return inside;
  }
  return raw;
}

const day = (v: unknown): string | null =>
  typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null;

/** Data de emissão, cobrindo apólice achatada e wrappers de endosso. */
function resolveEmissao(raw: Record<string, unknown>): string | null {
  for (const k of ["endosso_A", "endosso_B", "endosso_C", "endosso_D"]) {
    const wrapper = raw[k] as Record<string, unknown> | undefined;
    if (wrapper && typeof wrapper.data_emissao === "string") return day(wrapper.data_emissao);
  }
  const proposta = resolveProposta(raw);
  const datas = (proposta.datas ?? {}) as Record<string, unknown>;
  return (
    day(datas.assinatura) ?? day(datas.conclusao_subscricao) ?? day(datas.registro_origem) ?? null
  );
}

function sumCoberturas(
  proposta: Record<string, unknown>,
): { direto: number; total: number } {
  let direto = 0;
  let total = 0;
  const itens = Array.isArray(proposta.itens) ? proposta.itens : [];
  for (const it of itens as Array<Record<string, unknown>>) {
    const coberturas = Array.isArray(it.coberturas) ? it.coberturas : [];
    for (const cob of coberturas as Array<Record<string, unknown>>) {
      const comps = Array.isArray(cob.composicao_premio_cobertura)
        ? cob.composicao_premio_cobertura
        : [];
      for (const c of comps as Array<Record<string, unknown>>) {
        const v = Number(c.valor_premio) || 0;
        total += v;
        if (c.tipo_premio === "DIRETO" && c.natureza_premio === "PREMIO") direto += v;
      }
    }
  }
  return { direto: round2(direto), total: round2(total) };
}

export function policyFacts(propostaRaw: unknown): PolicyFacts {
  const raw = toRaw(propostaRaw);
  const proposta = resolveProposta(raw);

  const datas = (proposta.datas ?? {}) as Record<string, unknown>;
  const { direto } = sumCoberturas(proposta);

  return {
    inicio: day(datas.inicio_vigencia),
    fim: day(datas.fim_vigencia),
    emissao: resolveEmissao(raw),
    premioUsd: direto,
  };
}

/**
 * Fatos de emissão (apólice ou endosso): mesma base do Mapa de Repasses —
 * soma de TODOS os componentes de cada parcela, pelo mês/ano de vencimento.
 */
export function issuanceFacts(propostaRaw: unknown): IssuanceFacts {
  const raw = toRaw(propostaRaw);
  const proposta = resolveProposta(raw);
  const emissao = resolveEmissao(raw);

  const pagamento = (proposta.pagamento ?? {}) as Record<string, unknown>;
  const rawParcelas = Array.isArray(pagamento.parcelas) ? pagamento.parcelas : [];
  const parcelas: Array<{ data: string | null; valor: number }> = [];
  for (const parc of rawParcelas as Array<Record<string, unknown>>) {
    const comps = Array.isArray(parc.composicao_premio_parcela)
      ? parc.composicao_premio_parcela
      : [];
    let valor = 0;
    for (const c of comps as Array<Record<string, unknown>>) {
      valor += Number(c.valor_premio) || 0;
    }
    if (valor > 0) parcelas.push({ data: day(parc.data_vencimento), valor: round2(valor) });
  }

  const { direto, total } = sumCoberturas(proposta);
  return { emissao, parcelas, premioDiretoUsd: direto, premioTotalCoberturas: total };
}

/** Vigente na data de referência (default: hoje). */
export function isActive(f: PolicyFacts, ref = new Date()): boolean {
  const today = ref.toISOString().slice(0, 10);
  if (!f.inicio) return false;
  if (f.inicio > today) return false;
  if (f.fim && f.fim < today) return false;
  return true;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
