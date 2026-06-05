/**
 * Regras contábeis Excelsior — visão do gráfico de receita.
 *
 * Fórmula (informada pelo usuário, baseada no Mapa de Repasses):
 *   Receita Excelsior = Carregamento (fixo) + Prêmio Direto − PIS/COFINS
 *
 * Onde:
 *   - Carregamento = USD 8.333,33 (piso contratual, aplicado TODO mês)
 *   - Prêmio Direto = soma do prêmio direto pago no mês (composição_premio
 *     com tipo_premio = "DIRETO" e natureza_premio = "PREMIO")
 *   - PIS/COFINS = 4,65% incidente sobre (Carregamento + Prêmio Direto)
 */

export const REPASSE_RULES = {
  FIXO_SUPLEMENTAR_PISO: 8333.33,
  PIS_COFINS_PCT: 0.0465,
  IOF_PCT: 0.0038,
  FEE_OLE_PCT: 0.35,
  CUSTO_AQUISICAO_PCT: 0.20,
} as const;

export interface RepasseBreakdown {
  /** Carregamento fixo da Excelsior — sempre USD 8.333,33. */
  carregamentoExcelsior: number;
  /** Prêmio direto pago no mês (bruto). */
  premioDireto: number;
  /** PIS/COFINS = 4,65% sobre comissões Olé (Fee Olé + Custo Aquisição). */
  pisCofins: number;
  /** Receita líquida Excelsior = carregamento + prêmio direto − PIS/COFINS. */
  excelsiorLiquido: number;
}

/**
 * Recebe o prêmio direto bruto pago no mês e devolve a composição da
 * receita Excelsior.
 *
 * PIS/COFINS é calculado sobre as comissões da Olé:
 *   comissões Olé = (Prêmio − IOF) × (Fee Olé 35% + Custo Aquisição 20%)
 *   PIS/COFINS    = 4,65% × comissões Olé
 *
 * Mesmo com `premioDiretoBruto = 0`, o carregamento de USD 8.333,33
 * continua sendo aplicado (garantia contratual mínima).
 */
export function computeRepasse(premioDiretoBruto: number): RepasseBreakdown {
  const r = REPASSE_RULES;
  const carregamentoExcelsior = r.FIXO_SUPLEMENTAR_PISO;
  const premioDireto = Math.max(0, premioDiretoBruto);

  const iof = premioDireto * r.IOF_PCT;
  const liquidoDeIof = premioDireto - iof;
  const comissoesOle = liquidoDeIof * (r.FEE_OLE_PCT + r.CUSTO_AQUISICAO_PCT);
  const pisCofins = comissoesOle * r.PIS_COFINS_PCT;

  const excelsiorLiquido = carregamentoExcelsior + premioDireto - pisCofins;

  return {
    carregamentoExcelsior: round2(carregamentoExcelsior),
    premioDireto: round2(premioDireto),
    pisCofins: round2(pisCofins),
    excelsiorLiquido: round2(excelsiorLiquido),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
