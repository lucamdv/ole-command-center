/**
 * Regras contábeis Excelsior — visão do gráfico de receita.
 *
 * Espelha a planilha "Mapa de Repasses" (aba Capa_Resumo):
 *
 *   (+) Prêmio Total Pago               = premioTotalPago
 *   (−) IOF                             = premioTotalPago × 0,38%
 *   (=) Prêmio Líquido de IOF           = premioTotalPago − IOF
 *
 *   Comissões Olé + Nomad               = Prêmio Líquido × 55% (35% + 20%)
 *   PIS/COFINS (Olé + Nomad)            = comissões × 4,65%
 *
 *   Fee Excelsior                       = Prêmio Líquido × 5%
 *   Fixo Suplementar                    = 8.333,33 − Fee Excelsior
 *   Carregamento Excelsior              = Fee Excelsior + Fixo Suplementar = 8.333,33
 *
 *   Prêmio Direto (Seguradora + RE)     = Prêmio Líquido − Comissões − Fee Excelsior
 *                                        = Prêmio Líquido × 40%
 *
 *   Total Repasse Excelsior             = Carregamento + Prêmio Direto − PIS/COFINS
 */

export const REPASSE_RULES = {
  FIXO_SUPLEMENTAR_PISO: 8333.33,
  PIS_COFINS_PCT: 0.0465,
  IOF_PCT: 0.0038,
  FEE_OLE_PCT: 0.35,
  /** Comissão Nomad (custo de aquisição) — 20% do prêmio líquido de IOF. */
  NOMAD_PCT: 0.20,
  FEE_EXCELSIOR_PCT: 0.05,
} as const;

export interface RepasseBreakdown {
  /** Prêmio total pago no mês (bruto, antes de IOF). */
  premioTotalPago: number;
  /** IOF retido sobre o prêmio total pago (0,38%). */
  iof: number;
  /** Prêmio líquido de IOF. */
  premioLiquidoIof: number;
  /** Comissões Olé + Nomad: Prêmio Líquido × 55%. */
  comissoesOle: number;
  /** PIS/COFINS = 4,65% sobre comissões Olé + Nomad. */
  pisCofins: number;
  /** Mesmo valor de pisCofins com sinal negativo, para visualizar como abatimento. */
  pisCofinsDeducao: number;
  /** Fee Excelsior (5% do prêmio líquido de IOF). */
  feeExcelsior: number;
  /** Fixo Suplementar = 8.333,33 − Fee Excelsior. */
  fixoSuplementar: number;
  /** Carregamento Excelsior = Fee Excelsior + Fixo Suplementar (= 8.333,33). */
  carregamentoExcelsior: number;
  /** Prêmio Direto Seguradora + Resseguradora = 40% do prêmio líquido de IOF. */
  premioDireto: number;
  /** Receita líquida Excelsior = Carregamento + Prêmio Direto − PIS/COFINS. */
  excelsiorLiquido: number;
}

/**
 * Recebe o prêmio total pago no mês e devolve a composição da receita Excelsior
 * exatamente como no Mapa de Repasses.
 *
 * Mesmo com `premioTotalPagoBruto = 0`, o carregamento Excelsior de USD
 * 8.333,33 continua sendo aplicado (garantia contratual mínima).
 */
export function computeRepasse(premioTotalPagoBruto: number): RepasseBreakdown {
  const r = REPASSE_RULES;
  const premioTotalPago = Math.max(0, premioTotalPagoBruto);

  const iof = premioTotalPago * r.IOF_PCT;
  const premioLiquidoIof = premioTotalPago - iof;

  const comissoesOle = premioLiquidoIof * (r.FEE_OLE_PCT + r.NOMAD_PCT);
  const pisCofins = comissoesOle * r.PIS_COFINS_PCT;

  const feeExcelsior = premioLiquidoIof * r.FEE_EXCELSIOR_PCT;
  const fixoSuplementar = r.FIXO_SUPLEMENTAR_PISO - feeExcelsior;
  const carregamentoExcelsior = feeExcelsior + fixoSuplementar; // = 8333.33

  const premioDireto = premioLiquidoIof - comissoesOle - feeExcelsior; // = 40% líquido

  const excelsiorLiquido = carregamentoExcelsior + premioDireto - pisCofins;

  return {
    premioTotalPago: round2(premioTotalPago),
    iof: round2(iof),
    premioLiquidoIof: round2(premioLiquidoIof),
    comissoesOle: round2(comissoesOle),
    pisCofins: round2(pisCofins),
    pisCofinsDeducao: round2(-pisCofins),
    feeExcelsior: round2(feeExcelsior),
    fixoSuplementar: round2(fixoSuplementar),
    carregamentoExcelsior: round2(carregamentoExcelsior),
    premioDireto: round2(premioDireto),
    excelsiorLiquido: round2(excelsiorLiquido),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
