import { sistemaOrigemLabel } from "./codes";

// ====== Tipos do retorno do parser (o que os componentes consomem) ======
export type TipoEndosso = "A" | "B" | "C";

export interface DocumentoInfo {
  tipo: "APOLICE" | "ENDOSSO";
  /** Quando tipo = "ENDOSSO", letra do tipo (A/B/C). */
  tipoEndosso: TipoEndosso | null;
  /** Sequencial de 6 dígitos (000000 para apólice, 000001+ para endossos). */
  sequencial: string;
  /** Número completo da apólice base (substitui últimos 6 dígitos por 000000). */
  numeroApolice: string;
  /** Número completo original. */
  numeroCompleto: string;
}

export interface CancelamentoInfo {
  motivo: string | null;
  descricaoMotivo: string | null;
  numeroEndossoCancelado: string | null;
  pagamento: string | null;
}

/** Motivo da emissão do endosso (presente em endossos A/B/C). */
export interface MotivoEndossoInfo {
  /** Código bruto, ex.: ERRO_EMISSAO, AJUSTE. */
  codigo: string | null;
  descricao: string | null;
  tipoCancelamento: string | null;
  numeroEndossoCancelado: string | null;
  pagamento: string | null;
}


export interface DadosGerais {
  numeroPropostaSeguradora: string | null;
  idPropostaOrigem: string | null;
  idProduto: string | null;
  idProdutoOrigem: string | null;
  grupoSusep: string | null;
  ramoSusep: string | null;
  sistemaOrigem: string | null;
  subscritor: string | null;
  resultadoSubscricao: string | null;
  tipoApolice: string | null;
  emissaoCondicionadaPagamento: boolean | null;
  condicoesGerais: string[];
}

export interface DatasInfo {
  inicioVigencia: string | null;
  fimVigencia: string | null;
  assinatura: string | null;
  conclusaoSubscricao: string | null;
  registroOrigem: string | null;
  protocoloOrigem: string | null;
  dataEmissao: string | null;
}

export interface EnderecoInfo {
  tipo: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  pais: string | null;
}

export interface DocumentoIdentificacao {
  tipo: string;
  valor: string;
  pais: string | null;
}

export interface ContatoInfo {
  tipo: string;
  valor: string;
}

export interface ParteInfo {
  id: string;
  papel: string;
  tipo: string;
  nome: string;
  tipoPessoa: string | null;
  nacionalidade: string | null;
  exposicaoPolitica: string | null;
  dataNascimentoFundacao: string | null;
  documentos: DocumentoIdentificacao[];
  contatos: ContatoInfo[];
  enderecos: EnderecoInfo[];
}

export interface BeneficiarioInfo {
  id: string;
  parentesco: string | null;
  participacao: number | null;
}

export interface LimiteInfo {
  tipoLimite: string | null;
  tipoObrigacao: string | null;
  moeda: string | null;
  valor: number | null;
  valorBRL: number | null;
}

export interface ComposicaoPremioLinha {
  natureza: string;
  tipo: string;
  moeda: string;
  valor: number;
  valorBRL: number;
  idPessoaOrigem: string | null;
}

export interface CoberturaInfo {
  nome: string;
  codigo: string | null;
  grupoSusep: string | null;
  ramoSusep: string | null;
  processoSusep: string | null;
  abrangenciaGeografica: string | null;
  inicioVigencia: string | null;
  fimVigencia: string | null;
  limites: LimiteInfo[];
  beneficiarios: BeneficiarioInfo[];
  composicaoPremio: ComposicaoPremioLinha[];
  totalPremioBRL: number;
}

export interface ItemInfo {
  numero: number | null;
  tipoObjeto: string | null;
  classeRisco: string | null;
  dadosItem: Record<string, unknown> | null;
  coberturas: CoberturaInfo[];
}

export interface ParcelaInfo {
  numero: number | null;
  vencimento: string | null;
  valor: number | null;
  valorBRL: number | null;
  moeda: string | null;
  agenteCobrador: string | null;
}

export interface PagamentoInfo {
  parcelas: ParcelaInfo[];
  totalBRL: number;
}

export interface CotacaoInfo {
  moeda: string;
  taxaCambio: number;
  dataCotacao: string | null;
  identificador: string | null;
}

export interface LimiteApoliceInfo {
  moeda: string | null;
  valor: number | null;
  valorBRL: number | null;
}

export interface PropostaTraduzida {
  dadosGerais: DadosGerais;
  datas: DatasInfo;
  partes: ParteInfo[];
  itens: ItemInfo[];
  pagamento: PagamentoInfo;
  cotacoes: CotacaoInfo[];
  limiteApolice: LimiteApoliceInfo | null;
  cancelamento: CancelamentoInfo | null;
  /** Motivo da emissão do endosso (código + descrição). */
  motivoEndosso: MotivoEndossoInfo | null;
  tipoEndosso: TipoEndosso | null;
  /** Número completo do documento (ex.: `…0001` para um endosso). Vem do envelope. */
  numeroDocumento: string | null;
  /** O objeto "proposta" desembrulhado — para o JsonExplorer fallback. */
  raw: Record<string, unknown>;
  /** Indicador se a proposta veio vazia/wrapper (caso típico de endosso A). */
  isWrapperVazio: boolean;
}

// ====== Helpers ======
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
};
const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

/** Aceita o "envelope" do endosso ({ endosso_A: { proposta_endosso_A: { proposta } } })
 *  ou já a própria proposta. Também extrai a letra do tipo de endosso (A/B/C). */
export function unwrapProposta(input: unknown): {
  proposta: Obj;
  envelope: Obj | null;
  isWrapperVazio: boolean;
  tipoEndosso: TipoEndosso | null;
  numeroDocumento: string | null;
} {
  if (!isObj(input))
    return {
      proposta: {},
      envelope: null,
      isWrapperVazio: true,
      tipoEndosso: null,
      numeroDocumento: null,
    };
  // Caso 1: proposta direta (apólice 000000)
  if (Array.isArray(input.itens) || Array.isArray(input.partes) || input.datas) {
    return {
      proposta: input,
      envelope: null,
      isWrapperVazio: false,
      tipoEndosso: null,
      numeroDocumento: null,
    };
  }
  // Caso 2: envelope { endosso_X: { proposta_endosso_X: { proposta: {...} } } }
  for (const k of Object.keys(input)) {
    if (!k.startsWith("endosso_")) continue;
    const letra = k.slice("endosso_".length).toUpperCase();
    const tipoEndosso: TipoEndosso | null =
      letra === "A" || letra === "B" || letra === "C" ? (letra as TipoEndosso) : null;
    const env = input[k];
    if (!isObj(env)) continue;
    const numeroDocumento =
      asStr(env.numero_documento_seguradora) ?? asStr(env.numero_apolice_seguradora);
    // procura proposta_endosso_X dentro
    for (const k2 of Object.keys(env)) {
      if (!k2.startsWith("proposta_endosso_")) continue;
      const wrap = env[k2];
      // Em endossos B/C a própria "proposta_endosso_X" já é o objeto com motivo etc.
      // Em endossos A vem como { proposta: {...} }.
      if (isObj(wrap)) {
        const inner = isObj(wrap.proposta) ? (wrap.proposta as Obj) : wrap;
        const vazio = !(Array.isArray(inner.itens) || Array.isArray(inner.partes));
        return {
          proposta: inner,
          envelope: env,
          isWrapperVazio: vazio,
          tipoEndosso,
          numeroDocumento,
        };
      }
    }
    return {
      proposta: {},
      envelope: env,
      isWrapperVazio: true,
      tipoEndosso,
      numeroDocumento,
    };
  }
  return {
    proposta: input,
    envelope: null,
    isWrapperVazio: true,
    tipoEndosso: null,
    numeroDocumento: null,
  };
}

/** Apólice termina em 000000; endosso tem sequencial > 0 nos últimos 6 dígitos. */
export function parseDocumento(numero: string, tipoEndosso: TipoEndosso | null = null): DocumentoInfo {
  const seq = numero.slice(-6);
  const base = numero.slice(0, -6) + "000000";
  const tipo: "APOLICE" | "ENDOSSO" = seq === "000000" ? "APOLICE" : "ENDOSSO";
  return {
    tipo,
    tipoEndosso: tipo === "ENDOSSO" ? tipoEndosso : null,
    sequencial: seq,
    numeroApolice: base,
    numeroCompleto: numero,
  };
}


/** Normaliza o numero_endosso que pode vir como "0", "2" ou "000002". */
export function normalizeEndossoNum(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "000000";
  return digits.padStart(6, "0");
}

// ====== Parsers ======
function parseDados(p: Obj, env: Obj | null): DadosGerais {
  return {
    numeroPropostaSeguradora: asStr(p.numero_proposta_seguradora) ?? asStr(env?.numero_apolice_seguradora ?? null),
    idPropostaOrigem: asStr(p.id_proposta_origem),
    idProduto: asStr(p.id_produto),
    idProdutoOrigem: asStr(p.id_produto_origem),
    grupoSusep: asStr(p.codigo_grupo_susep_principal),
    ramoSusep: asStr(p.codigo_ramo_susep_principal),
    sistemaOrigem: sistemaOrigemLabel(asStr(p.sistema_origem)),
    subscritor: asStr(p.id_subscritor_origem),
    resultadoSubscricao: asStr(p.resultado_subscricao),
    tipoApolice: asStr(p.tipo_apolice),
    emissaoCondicionadaPagamento:
      typeof p.emissao_condicionada_pagamento === "boolean"
        ? (p.emissao_condicionada_pagamento as boolean)
        : null,
    condicoesGerais: asArr(p.codigos_condicoes_gerais)
      .map((v) => asStr(v))
      .filter((v): v is string => !!v),
  };
}

function parseDatas(p: Obj, env: Obj | null): DatasInfo {
  const d = isObj(p.datas) ? (p.datas as Obj) : {};
  return {
    inicioVigencia: asStr(d.inicio_vigencia),
    fimVigencia: asStr(d.fim_vigencia),
    assinatura: asStr(d.assinatura),
    conclusaoSubscricao: asStr(d.conclusao_subscricao),
    registroOrigem: asStr(d.registro_origem),
    protocoloOrigem: asStr(d.protocolo_origem),
    // Em endossos o `data_emissao` vem no envelope (`endosso_X.data_emissao`);
    // na apólice base ele é mesclado pelo callback diretamente na proposta.
    dataEmissao: asStr(env?.data_emissao ?? null) ?? asStr(p.data_emissao),
  };
}

function parseEndereco(e: Obj): EnderecoInfo {
  return {
    tipo: asStr(e.tipo_endereco),
    logradouro: asStr(e.rua) ?? asStr(e.logradouro),
    numero: asStr(e.numero),
    complemento: asStr(e.complemento),
    bairro: asStr(e.bairro),
    cidade: asStr(e.cidade),
    estado: asStr(e.estado),
    cep: asStr(e.cep),
    pais: asStr(e.pais),
  };
}

function parsePartes(p: Obj): ParteInfo[] {
  return asArr(p.partes)
    .filter(isObj)
    .map((parte): ParteInfo => ({
      id: asStr(parte.id_pessoa) ?? asStr(parte.id_pessoa_origem) ?? crypto.randomUUID(),
      papel: asStr(parte.papel_parte) ?? "—",
      tipo: asStr(parte.tipo_parte) ?? "—",
      nome: asStr(parte.nome_pessoa) ?? "Sem nome",
      tipoPessoa: asStr(parte.tipo_pessoa),
      nacionalidade: asStr(parte.pais_nacionalidade),
      exposicaoPolitica: asStr(parte.exposicao_politica),
      dataNascimentoFundacao: asStr(parte.data_nascimento_fundacao),
      documentos: asArr(parte.documentos_identificacao)
        .filter(isObj)
        .map((d) => ({
          tipo: asStr(d.tipo_identificacao) ?? "DOC",
          valor: asStr(d.valor_identificacao) ?? "",
          pais: asStr(d.pais_identificacao),
        })),
      contatos: asArr(parte.informacao_contato)
        .filter(isObj)
        .map((c) => ({
          tipo: asStr(c.tipo_contato) ?? "—",
          valor: asStr(c.valor_contato) ?? "",
        })),
      enderecos: asArr(parte.enderecos).filter(isObj).map(parseEndereco),
    }));
}

function parseCobertura(c: Obj): CoberturaInfo {
  const datas = isObj(c.datas) ? (c.datas as Obj) : {};
  const composicao: ComposicaoPremioLinha[] = asArr(c.composicao_premio_cobertura)
    .filter(isObj)
    .map((l) => ({
      natureza: asStr(l.natureza_premio) ?? "—",
      tipo: asStr(l.tipo_premio) ?? "—",
      moeda: asStr(l.moeda_premio) ?? "BRL",
      valor: asNum(l.valor_premio) ?? 0,
      valorBRL: asNum(l.valor_premio_brl) ?? 0,
      idPessoaOrigem: asStr(l.id_pessoa_origem),
    }));
  const totalPremioBRL = composicao
    .filter((l) => l.natureza === "PREMIO")
    .reduce((acc, l) => acc + l.valorBRL, 0);
  return {
    nome: asStr(c.nome_cobertura) ?? "Cobertura",
    codigo: asStr(c.codigo_cobertura),
    grupoSusep: asStr(c.codigo_grupo_susep),
    ramoSusep: asStr(c.codigo_ramo_susep),
    processoSusep: asStr(c.numero_processo_susep),
    abrangenciaGeografica: asStr(c.abrangencia_geografica),
    inicioVigencia: asStr(datas.inicio_vigencia_cobertura),
    fimVigencia: asStr(datas.fim_vigencia_cobertura),
    limites: asArr(c.limites)
      .filter(isObj)
      .map((l) => ({
        tipoLimite: asStr(l.tipo_limite_cobertura),
        tipoObrigacao: asStr(l.tipo_obrigacao),
        moeda: asStr(l.moeda_limite_cobertura),
        valor: asNum(l.valor_limite_cobertura),
        valorBRL: asNum(l.valor_limite_cobertura_brl),
      })),
    beneficiarios: asArr(c.beneficiarios)
      .filter(isObj)
      .map((b) => ({
        id: asStr(b.id_pessoa_beneficiario) ?? asStr(b.id_beneficiario) ?? crypto.randomUUID(),
        parentesco: asStr(b.parentesco_beneficiario),
        participacao: asNum(b.participacao_beneficiario),
      })),
    composicaoPremio: composicao,
    totalPremioBRL,
  };
}

function parseItens(p: Obj): ItemInfo[] {
  return asArr(p.itens)
    .filter(isObj)
    .map((it): ItemInfo => ({
      numero: asNum(it.numero_item),
      tipoObjeto: asStr(it.descricao_tipo_objeto) ?? asStr(it.codigo_tipo_objeto),
      classeRisco: asStr(it.classe_risco_item),
      dadosItem: isObj(it.dados_item) ? (it.dados_item as Obj) : null,
      coberturas: asArr(it.coberturas).filter(isObj).map(parseCobertura),
    }));
}

function parsePagamento(p: Obj): PagamentoInfo {
  const pg = isObj(p.pagamento) ? (p.pagamento as Obj) : {};
  const parcelas: ParcelaInfo[] = asArr(pg.parcelas)
    .filter(isObj)
    .map((parc) => {
      const comp = asArr(parc.composicao_premio_parcela).filter(isObj);
      const totalBRL = comp.reduce((acc, l) => acc + (asNum(l.valor_premio_brl) ?? 0), 0);
      const totalMoeda = comp.reduce((acc, l) => acc + (asNum(l.valor_premio) ?? 0), 0);
      const moeda = comp.length > 0 ? (asStr(comp[0].moeda_premio) ?? "BRL") : "BRL";
      return {
        numero: asNum(parc.numero_parcela),
        vencimento: asStr(parc.data_vencimento) ?? asStr(parc.vencimento),
        valor: totalMoeda || null,
        valorBRL: totalBRL || null,
        moeda,
        agenteCobrador: asStr(parc.agente_cobrador),
      };
    });
  const totalBRL = parcelas.reduce((acc, p) => acc + (p.valorBRL ?? 0), 0);
  return { parcelas, totalBRL };
}

function parseCotacoes(p: Obj): CotacaoInfo[] {
  return asArr(p.cotacao_moeda)
    .filter(isObj)
    .map((c) => ({
      moeda: asStr(c.moeda) ?? "—",
      taxaCambio: asNum(c.taxa_cambio) ?? 0,
      dataCotacao: asStr(c.data_cotacao),
      identificador: asStr(c.identificador),
    }));
}

function parseLimiteApolice(p: Obj): LimiteApoliceInfo | null {
  if (!isObj(p.limite_maximo_apolice)) return null;
  const l = p.limite_maximo_apolice as Obj;
  return {
    moeda: asStr(l.moeda_limite_total),
    valor: asNum(l.valor_limite_total),
    valorBRL: asNum(l.valor_limite_total_brl),
  };
}

function parseCancelamento(proposta: Obj, tipoEndosso: TipoEndosso | null): CancelamentoInfo | null {
  if (tipoEndosso !== "B" && tipoEndosso !== "C") return null;
  const motivo = asStr(proposta.motivo_endosso);
  const descricao = asStr(proposta.descricao_motivo_endosso);
  const cancelado = asStr(proposta.numero_endosso_cancelado);
  const pagamento = asStr(proposta.pagamento);
  if (!motivo && !descricao && !cancelado && !pagamento) return null;
  return {
    motivo,
    descricaoMotivo: descricao,
    numeroEndossoCancelado: cancelado,
    pagamento,
  };
}

/**
 * Motivo da emissão do endosso. Procura primeiro na proposta desembrulhada e,
 * como fallback, no wrapper `proposta_endosso_X` do envelope (caso do endosso A,
 * onde o motivo fica um nível acima da `proposta`).
 */
function parseMotivoEndosso(proposta: Obj, envelope: Obj | null): MotivoEndossoInfo | null {
  const fontes: Obj[] = [proposta];
  if (envelope) {
    for (const k of Object.keys(envelope)) {
      if (!k.startsWith("proposta_endosso_")) continue;
      const wrap = envelope[k];
      if (isObj(wrap)) fontes.push(wrap as Obj);
    }
  }
  const pick = (campo: string): string | null => {
    for (const f of fontes) {
      const v = asStr(f[campo]);
      if (v) return v;
    }
    return null;
  };
  const codigo = pick("motivo_endosso");
  const descricao = pick("descricao_motivo_endosso");
  const tipoCancelamento = pick("tipo_cancelamento");
  const numeroEndossoCancelado = pick("numero_endosso_cancelado");
  const pagamento = pick("pagamento");
  if (!codigo && !descricao && !tipoCancelamento) return null;
  return { codigo, descricao, tipoCancelamento, numeroEndossoCancelado, pagamento };
}

export function translateProposta(input: unknown): PropostaTraduzida {
  const { proposta, envelope, isWrapperVazio, tipoEndosso, numeroDocumento } =
    unwrapProposta(input);
  return {
    motivoEndosso: parseMotivoEndosso(proposta, envelope),
    dadosGerais: parseDados(proposta, envelope),

    datas: parseDatas(proposta, envelope),
    partes: parsePartes(proposta),
    itens: parseItens(proposta),
    pagamento: parsePagamento(proposta),
    cotacoes: parseCotacoes(proposta),
    limiteApolice: parseLimiteApolice(proposta),
    cancelamento: parseCancelamento(proposta, tipoEndosso),
    tipoEndosso,
    numeroDocumento,
    raw: proposta,
    isWrapperVazio,
  };
}

/** Atalho: encontra o nome do segurado (para usar em listas). */
export function findSeguradoNome(input: unknown): string | null {
  const { proposta } = unwrapProposta(input);
  const partes = parsePartes(proposta);
  return partes.find((p) => p.papel === "SEGURADO")?.nome ?? null;
}

/** Prêmio total na moeda original = soma de TODAS as linhas de
 *  composicao_premio_parcela em todas as parcelas (mesmo conjunto que
 *  o card de Pagamento exibe como total da parcela). */
export function computePremioTotal(input: unknown): { valor: number; moeda: string } {
  const { proposta } = unwrapProposta(input);
  const pg = isObj(proposta.pagamento) ? (proposta.pagamento as Obj) : {};
  let total = 0;
  let moeda: string | null = null;
  for (const parc of asArr(pg.parcelas).filter(isObj)) {
    for (const l of asArr(parc.composicao_premio_parcela).filter(isObj)) {
      total += asNum(l.valor_premio) ?? 0;
      if (!moeda) moeda = asStr(l.moeda_premio);
    }
  }
  return { valor: total, moeda: moeda ?? "BRL" };
}


/** Compat. */
export const computePremioLiquido = computePremioTotal;
export function computePremioLiquidoBRL(input: unknown): number {
  return computePremioTotal(input).valor;
}

