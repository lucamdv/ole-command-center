// Porta direta das regras do n8n "Auditoria de Vigência".
// Entrada: lista de JSONs brutos de endossos de uma única apólice
// (formato retornado por /backoffice/ro/emissao/{numero_documento_endosso}).

export type AuditSeverity = "erro" | "alerta";

export interface AuditFindingRule {
  tipo_erro: string;
  nivel: AuditSeverity;
  endosso_anterior: string;
  endosso_com_erro: string;
  detalhe_erro: string;
}

export type AuditStatus = "APROVADO" | "REPROVADO" | "IGNORADO" | "ERRO_LEITURA";

export interface PolicyAuditResult {
  status_auditoria: AuditStatus;
  apolice: string;
  total_erros?: number;
  erros_encontrados?: AuditFindingRule[];
  mensagem?: string;
  motivo?: string;
}

const APOLICES_IGNORADAS = new Set<string>(["056902026000213910007893000000"]);
const APOLICES_EXCECAO_PREMIO = new Set<string>([
  "056902026000213910007891000000",
  "056902025000213910045478000000",
]);

interface CoberturaAgg {
  endosso: string;
  motivo: string;
  inicioIso: string;
  fimIso: string;
  listaCoberturas: any[];
}

function calcularPremioTotal(lista: any[] | undefined): number {
  if (!lista) return 0;
  let total = 0;
  for (const cob of lista) {
    if (cob.composicao_premio_cobertura) {
      for (const p of cob.composicao_premio_cobertura) {
        total += parseFloat(p.valor_premio || 0);
      }
    }
  }
  return Math.round(total * 10000) / 10000;
}

function calcularComponente(lista: any[] | undefined, tipo: string): number {
  if (!lista) return 0;
  let total = 0;
  for (const cob of lista) {
    if (cob.composicao_premio_cobertura) {
      for (const p of cob.composicao_premio_cobertura) {
        if (p.tipo_premio === tipo) total += parseFloat(p.valor_premio || 0);
      }
    }
  }
  return Math.round(total * 10000) / 10000;
}

function fmtData(iso: string): string {
  return iso.split("T")[0].split("-").reverse().join("/");
}

export function auditPolicy(itensBrutos: any[]): PolicyAuditResult {
  const apoliceBase: string =
    itensBrutos[0]?.numero_apolice_seguradora || "Desconhecida";

  if (APOLICES_IGNORADAS.has(apoliceBase)) {
    return { status_auditoria: "IGNORADO", apolice: apoliceBase, motivo: "Apólice na lista de exceções." };
  }

  // Mapa de endossos C (cancelamentos)
  const endossosCancelados = new Set<string>();
  for (const json of itensBrutos) {
    if (!json) continue;
    if (json.proposta?.endosso_C) {
      const num = json.proposta.endosso_C?.proposta_endosso_C?.numero_endosso_cancelado;
      if (num) endossosCancelados.add(num);
    }
  }

  // Farejador universal
  const coberturas: CoberturaAgg[] = [];
  for (const json of itensBrutos) {
    if (!json) continue;
    let endossoAtual: string | undefined;
    if (json.numero_endosso_seguradora === "000000") {
      endossoAtual = "000000";
    } else if (json.proposta?.endosso_A) {
      endossoAtual = json.proposta.endosso_A.numero_endosso_seguradora;
    }
    if (!endossoAtual) continue;
    if (endossosCancelados.has(endossoAtual)) continue;

    if (endossoAtual === "000000") {
      const coberturasBrutas = json.proposta?.itens?.[0]?.coberturas;
      const datas = coberturasBrutas?.[0]?.datas;
      if (datas) {
        coberturas.push({
          endosso: "000000",
          motivo: "EMISSAO_INICIAL",
          inicioIso: datas.inicio_vigencia_cobertura,
          fimIso: datas.fim_vigencia_cobertura,
          listaCoberturas: coberturasBrutas,
        });
      }
    } else if (json.proposta?.endosso_A) {
      const endA = json.proposta.endosso_A;
      const coberturasBrutas = endA.proposta_endosso_A?.proposta?.itens?.[0]?.coberturas;
      const datas = coberturasBrutas?.[0]?.datas;
      const motivo = endA.proposta_endosso_A?.motivo_endosso || "DESCONHECIDO";
      if (datas) {
        coberturas.push({
          endosso: endA.numero_endosso_seguradora,
          motivo,
          inicioIso: datas.inicio_vigencia_cobertura,
          fimIso: datas.fim_vigencia_cobertura,
          listaCoberturas: coberturasBrutas,
        });
      }
    }
  }

  if (coberturas.length === 0) {
    return {
      status_auditoria: "IGNORADO",
      apolice: apoliceBase,
      motivo: "Sem coberturas válidas pós-filtros de cancelamento.",
    };
  }

  const alertas: AuditFindingRule[] = [];

  coberturas.sort((a, b) => parseInt(a.endosso) - parseInt(b.endosso));

  // Duplicidade de vigência (FATURA)
  for (let i = 1; i < coberturas.length; i++) {
    const atual = coberturas[i];
    const anterior = coberturas[i - 1];
    if (
      atual.inicioIso === anterior.inicioIso &&
      atual.fimIso === anterior.fimIso &&
      atual.motivo === "FATURA" &&
      anterior.motivo === "FATURA"
    ) {
      alertas.push({
        tipo_erro: "DUPLICIDADE DE VIGÊNCIA",
        nivel: "erro",
        endosso_anterior: anterior.endosso,
        endosso_com_erro: atual.endosso,
        detalhe_erro: `O endosso ${atual.endosso} (FATURA) possui a exata mesma vigência do endosso ${anterior.endosso} (${fmtData(atual.inicioIso)} a ${fmtData(atual.fimIso)}), indicando falha na renovação do período.`,
      });
    }
  }

  // Filtro de substituição e ordenação cronológica
  const efetivasMap: Record<number, CoberturaAgg> = {};
  for (const cob of coberturas) {
    const chave = new Date(cob.inicioIso).getTime();
    if (!efetivasMap[chave] || parseInt(cob.endosso) > parseInt(efetivasMap[chave].endosso)) {
      efetivasMap[chave] = cob;
    }
  }
  const efetivas = Object.values(efetivasMap).sort(
    (a, b) => new Date(a.inicioIso).getTime() - new Date(b.inicioIso).getTime(),
  );

  for (let i = 0; i < efetivas.length; i++) {
    const atual = efetivas[i];

    const premioTotal = calcularPremioTotal(atual.listaCoberturas);
    const iof = calcularComponente(atual.listaCoberturas, "IOF");
    const administracao = calcularComponente(atual.listaCoberturas, "ADMINISTRACAO");
    const distribuicao = calcularComponente(atual.listaCoberturas, "DISTRIBUICAO");
    const margemContratual = calcularComponente(atual.listaCoberturas, "MARGEM_SERVICO_CONTRATUAL");
    const margemAdicional = calcularComponente(atual.listaCoberturas, "MARGEM_SERVICO_CONTRATUAL_ADICIONAL");
    const direto = calcularComponente(atual.listaCoberturas, "DIRETO");
    const premioLiquido = Math.round((premioTotal - iof) * 10000) / 10000;

    if (premioTotal > 0) {
      const espAdm = Math.round(premioLiquido * 0.35 * 10000) / 10000;
      const espDist = Math.round(premioLiquido * 0.2 * 10000) / 10000;
      const espMargem = Math.round(premioLiquido * 0.05 * 10000) / 10000;
      const espMargemAd = 0;
      const espDireto =
        Math.round((premioLiquido - (espAdm + espDist + espMargem + espMargemAd)) * 10000) / 10000;

      if (Math.abs(administracao - espAdm) > 0.005) {
        alertas.push({
          tipo_erro: "TAXA DE ADMINISTRAÇÃO INCORRETA",
          nivel: "alerta",
          endosso_anterior: "N/A",
          endosso_com_erro: atual.endosso,
          detalhe_erro: `No endosso ${atual.endosso}, a Administração (USD ${administracao.toFixed(4)}) difere do esperado (USD ${espAdm.toFixed(4)} - 35% do Prêmio Líquido).`,
        });
      }
      if (Math.abs(distribuicao - espDist) > 0.005) {
        alertas.push({
          tipo_erro: "TAXA DE DISTRIBUIÇÃO INCORRETA",
          nivel: "alerta",
          endosso_anterior: "N/A",
          endosso_com_erro: atual.endosso,
          detalhe_erro: `No endosso ${atual.endosso}, a Distribuição (USD ${distribuicao.toFixed(4)}) difere do esperado (USD ${espDist.toFixed(4)} - 20% do Prêmio Líquido).`,
        });
      }
      if (Math.abs(margemContratual - espMargem) > 0.005) {
        alertas.push({
          tipo_erro: "MARGEM DE SERVIÇO CONTRATUAL INCORRETA",
          nivel: "alerta",
          endosso_anterior: "N/A",
          endosso_com_erro: atual.endosso,
          detalhe_erro: `No endosso ${atual.endosso}, a Margem de Serviço (USD ${margemContratual.toFixed(4)}) difere do esperado (USD ${espMargem.toFixed(4)} - 5% do Prêmio Líquido).`,
        });
      }
      if (Math.abs(margemAdicional - espMargemAd) > 0.005) {
        alertas.push({
          tipo_erro: "MARGEM DE SERVIÇO ADICIONAL INCORRETA",
          nivel: "alerta",
          endosso_anterior: "N/A",
          endosso_com_erro: atual.endosso,
          detalhe_erro: `No endosso ${atual.endosso}, a Margem de Serviço Adicional (USD ${margemAdicional.toFixed(4)}) difere do esperado (USD ${espMargemAd.toFixed(4)}).`,
        });
      }
      if (Math.abs(direto - espDireto) > 0.005) {
        alertas.push({
          tipo_erro: "PROPORÇÃO DE PRÊMIO DIRETO INCORRETA",
          nivel: "alerta",
          endosso_anterior: "N/A",
          endosso_com_erro: atual.endosso,
          detalhe_erro: `No endosso ${atual.endosso}, o Prêmio Direto (USD ${direto.toFixed(4)}) não corresponde ao saldo remanescente do Prêmio Líquido. O valor esperado é USD ${espDireto.toFixed(4)}.`,
        });
      }
    }

    if (i > 0) {
      const anterior = efetivas[i - 1];
      const fimAnt = new Date(anterior.fimIso).getTime();
      const iniAt = new Date(atual.inicioIso).getTime();
      if (iniAt !== fimAnt) {
        alertas.push({
          tipo_erro: "GAP DE DIA",
          nivel: "erro",
          endosso_anterior: anterior.endosso,
          endosso_com_erro: atual.endosso,
          detalhe_erro: `O endosso ${atual.endosso} iniciou em ${fmtData(atual.inicioIso)}, mas a vigência deveria iniciar exatamente em ${fmtData(anterior.fimIso)} (fim do endosso ${anterior.endosso}).`,
        });
      }
      const premioAnt = calcularPremioTotal(anterior.listaCoberturas);
      const premioAt = calcularPremioTotal(atual.listaCoberturas);
      if (premioAnt !== premioAt && premioAnt > 0) {
        alertas.push({
          tipo_erro: "VARIAÇÃO DE PRÊMIO",
          nivel: "alerta",
          endosso_anterior: anterior.endosso,
          endosso_com_erro: atual.endosso,
          detalhe_erro: `O prêmio total sofreu alteração. Endosso ${anterior.endosso}: USD ${premioAnt.toFixed(2)} ➔ Endosso ${atual.endosso}: USD ${premioAt.toFixed(2)}.`,
        });
      }
    }

    if (atual.listaCoberturas) {
      for (const cob of atual.listaCoberturas) {
        const nome = (cob.nome_cobertura || "COBERTURA DESCONHECIDA").toUpperCase();
        const valorCob = cob.limites?.length > 0 ? parseFloat(cob.limites[0].valor_limite_cobertura || 0) : 0;
        if (nome.includes("MORTE") && (valorCob < 100000 || valorCob > 500000)) {
          alertas.push({
            tipo_erro: "LIMITE DE COBERTURA INVÁLIDO",
            nivel: "erro",
            endosso_anterior: "N/A",
            endosso_com_erro: atual.endosso,
            detalhe_erro: `A cobertura de MORTE no endosso ${atual.endosso} está com o valor de ${valorCob.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, fora da régua permitida (Mín: 100.000 / Máx: 500.000).`,
          });
        }

        let premioCob = 0;
        if (cob.composicao_premio_cobertura) {
          for (const p of cob.composicao_premio_cobertura) premioCob += parseFloat(p.valor_premio || 0);
        }
        const premioArred = Math.round(premioCob * 100) / 100;
        if (!APOLICES_EXCECAO_PREMIO.has(apoliceBase) && (premioArred < 15 || premioArred > 700)) {
          alertas.push({
            tipo_erro: "PRÊMIO FORA DO PADRÃO",
            nivel: "erro",
            endosso_anterior: "N/A",
            endosso_com_erro: atual.endosso,
            detalhe_erro: `O prêmio na cobertura '${nome}' do endosso ${atual.endosso} resultou em USD ${premioArred.toFixed(2)}, fora da margem permitida (Mín: USD 20 / Máx: USD 700).`,
          });
        }

        if (i === efetivas.length - 1 && cob.datas?.inicio_vigencia_cobertura && cob.datas?.fim_vigencia_cobertura) {
          const hoje = Date.now();
          const ini = new Date(cob.datas.inicio_vigencia_cobertura).getTime();
          const fim = new Date(cob.datas.fim_vigencia_cobertura).getTime();
          if (hoje < ini || hoje > fim) {
            alertas.push({
              tipo_erro: "COBERTURA INATIVA",
              nivel: "erro",
              endosso_anterior: "N/A",
              endosso_com_erro: atual.endosso,
              detalhe_erro: `A '${nome}' no último endosso válido (${atual.endosso}) não está ativa na data de hoje. O período coberto registado é de ${fmtData(cob.datas.inicio_vigencia_cobertura)} a ${fmtData(cob.datas.fim_vigencia_cobertura)}.`,
            });
          }
        }
      }
    }
  }

  if (alertas.length > 0) {
    return {
      status_auditoria: "REPROVADO",
      apolice: apoliceBase,
      total_erros: alertas.length,
      erros_encontrados: alertas,
    };
  }
  return {
    status_auditoria: "APROVADO",
    apolice: apoliceBase,
    mensagem: "Nenhum erro de emissão encontrado.",
  };
}
