// Extração de fatos da apólice (vigência e prêmio) a partir do JSON `proposta`.
// Mesma tolerância de formato usada em analytics.functions.ts (achatado ou
// encapsulado em endosso_A/B/C/D → proposta_endosso_X → proposta).

export interface PolicyFacts {
  inicio: string | null; // YYYY-MM-DD
  fim: string | null; // YYYY-MM-DD
  premioUsd: number;
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
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

export function policyFacts(propostaRaw: unknown): PolicyFacts {
  const raw =
    typeof propostaRaw === "string"
      ? safeJson(propostaRaw)
      : ((propostaRaw ?? {}) as Record<string, unknown>);
  const proposta = resolveProposta(raw);

  const datas = (proposta.datas ?? {}) as Record<string, unknown>;
  const inicio =
    typeof datas.inicio_vigencia === "string" ? datas.inicio_vigencia.slice(0, 10) : null;
  const fim = typeof datas.fim_vigencia === "string" ? datas.fim_vigencia.slice(0, 10) : null;

  let premioUsd = 0;
  const itens = Array.isArray(proposta.itens) ? proposta.itens : [];
  for (const it of itens as Array<Record<string, unknown>>) {
    const coberturas = Array.isArray(it.coberturas) ? it.coberturas : [];
    for (const cob of coberturas as Array<Record<string, unknown>>) {
      const comps = Array.isArray(cob.composicao_premio_cobertura)
        ? cob.composicao_premio_cobertura
        : [];
      for (const c of comps as Array<Record<string, unknown>>) {
        if (c.tipo_premio === "DIRETO" && c.natureza_premio === "PREMIO") {
          premioUsd += Number(c.valor_premio) || 0;
        }
      }
    }
  }

  return { inicio, fim, premioUsd: Math.round(premioUsd * 100) / 100 };
}

/** Vigente na data de referência (default: hoje). */
export function isActive(f: PolicyFacts, ref = new Date()): boolean {
  const today = ref.toISOString().slice(0, 10);
  if (!f.inicio) return false;
  if (f.inicio > today) return false;
  if (f.fim && f.fim < today) return false;
  return true;
}
