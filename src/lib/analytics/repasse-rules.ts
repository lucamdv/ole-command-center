/**
 * Regras contábeis do Mapa de Repasses Excelsior → Olé.
 * Fonte: "Mapa de Repasses - 01.05.26 a 31.05.26.xlsx" + Acordo Operacional.
 *
 * Aplicamos os percentuais conservadores do contrato (Fee Olé no topo do range,
 * Fee Excelsior no piso). Sinistralidade variável não é modelada aqui.
 */

export const REPASSE_RULES = {
  IOF_PCT: 0.0038,
  FEE_OLE_PCT: 0.35,
  CUSTO_AQUISICAO_PCT: 0.20,
  PIS_COFINS_PCT: 0.0465,
  FEE_EXC_PCT: 0.05,
  FIXO_SUPLEMENTAR_PISO: 8333.33,
  PREMIO_DIRETO_PCT: 0.40,
  PREMIO_RETIDO_EXC_PCT: 0.10,
  PREMIO_CEDIDO_MUNICH_PCT: 0.90,
} as const;

export interface RepasseBreakdown {
  /** Líquido para Olé (Fee Olé + Custo Aquisição − PIS/COFINS sobre comissões). */
  ole: number;
  /** Excelsior bruto: Fee Exc + Fixo Suplementar + Prêmio Retido (10% do prêmio direto). */
  excelsior: number;
  /** Excelsior líquido: Carregamento (Fee Exc + Fixo Suplementar) + Prêmio Direto Retido − PIS/COFINS sobre carregamento. */
  excelsiorLiquido: number;
  /** Munich RE: 90% do prêmio direto (40% do prêmio líquido de IOF). */
  munich: number;
  /** Governo: IOF + PIS/COFINS sobre comissões. */
  impostos: number;
  /** Total movimentado no mês (= bruto). */
  total: number;
}

/**
 * Aplica as regras do Mapa de Repasses sobre o prêmio bruto pago no mês.
 *
 * Mesmo com `bruto = 0`, o piso de Excelsior (USD 8.333,33) é aplicado —
 * é a garantia contratual mínima.
 */
export function computeRepasse(bruto: number): RepasseBreakdown {
  const r = REPASSE_RULES;
  const iof = bruto * r.IOF_PCT;
  const liquido = bruto - iof;

  const feeOle = liquido * r.FEE_OLE_PCT;
  const custoAquisicao = liquido * r.CUSTO_AQUISICAO_PCT;
  const comissoes = feeOle + custoAquisicao;
  const pisCofinsComissoes = comissoes * r.PIS_COFINS_PCT;
  const ole = comissoes - pisCofinsComissoes;

  const feeExc = liquido * r.FEE_EXC_PCT;
  const fixoSuplementar = Math.max(0, r.FIXO_SUPLEMENTAR_PISO - feeExc);
  const carregamentoExc = feeExc + fixoSuplementar;
  const premioDireto = liquido * r.PREMIO_DIRETO_PCT;
  const premioRetidoExc = premioDireto * r.PREMIO_RETIDO_EXC_PCT;
  const excelsior = carregamentoExc + premioRetidoExc;
  const pisCofinsExc = carregamentoExc * r.PIS_COFINS_PCT;
  const excelsiorLiquido = carregamentoExc + premioRetidoExc - pisCofinsExc;

  const munich = premioDireto * r.PREMIO_CEDIDO_MUNICH_PCT;
  const impostos = iof + pisCofinsComissoes;

  return {
    ole: round2(ole),
    excelsior: round2(excelsior),
    excelsiorLiquido: round2(excelsiorLiquido),
    munich: round2(munich),
    impostos: round2(impostos),
    total: round2(ole + excelsior + munich + impostos),
  };
}


function round2(n: number) {
  return Math.round(n * 100) / 100;
}
