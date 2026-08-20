import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEndorsementDetail } from "@/hooks/use-policies";
import { useEndorsementBilling } from "@/hooks/use-billing";
import { JsonExplorer } from "@/components/json-explorer";
import {
  BillingBadge,
  CancelamentoCard,
  CobrancaCard,
  CotacaoCard,
  DadosGeraisCard,
  DatasCard,
  DocumentoHeader,
  EndossoSemDadosAviso,
  ItensCoberturas,
  LimiteApoliceCard,
  MotivoEndossoCard,
  PagamentoCard,
  PartesList,
  Section,
} from "@/components/apolice/cards";
import {
  normalizeEndossoNum,
  parseDocumento,
  translateProposta,
} from "@/lib/excelsior/translate";

export const Route = createFileRoute("/_authenticated/apolices/$id/endossos/$num")({
  head: ({ params }) => ({
    meta: [
      { title: `Endosso ${params.num} · ${params.id} · OLÉ COPILOT` },
      { name: "description", content: `Detalhe do endosso ${params.num}.` },
    ],
  }),
  component: EndossoDetail,
});

function EndossoDetail() {
  const { id, num } = Route.useParams();
  const { data: endo, isLoading } = useEndorsementDetail(id, num);
  const { record: cobranca } = useEndorsementBilling(id, num);

  if (isLoading) {
    return <div className="page-subtitle">Carregando endosso…</div>;
  }

  if (!endo) {
    return (
      <div className="space-y-4">
        <Link
          to="/apolices/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à apólice
        </Link>
        <div className="panel p-12 text-center page-subtitle">
          Endosso não encontrado.
        </div>
      </div>
    );
  }

  const t = translateProposta(endo.proposta);
  // Número real do documento: vem do envelope; fallback = apolice base + sequencial do param.
  const numeroDoc =
    t.numeroDocumento ?? endo.numero_apolice.slice(0, -6) + normalizeEndossoNum(num);
  const documento = parseDocumento(numeroDoc, t.tipoEndosso);
  const seguradoNome = t.partes.find((p) => p.papel === "SEGURADO")?.nome ?? null;
  const isCancelamento = t.tipoEndosso === "B" || t.tipoEndosso === "C";

  return (
    <div className="space-y-6">
      <nav className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Link to="/apolices" className="hover:text-foreground transition">
          Apólices
        </Link>
        <span>/</span>
        <Link
          to="/apolices/$id"
          params={{ id }}
          className="hover:text-foreground transition font-mono"
        >
          {id}
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono">Endosso {documento.sequencial}</span>
      </nav>

      <DocumentoHeader
        documento={documento}
        premioValor={isCancelamento ? undefined : endo.premio_liquido}
        premioMoeda={endo.premio_moeda}
        seguradoNome={seguradoNome}
        badge={
          cobranca ? (
            <BillingBadge
              statusPagamento={cobranca.status_pagamento}
              situacaoEmissao={cobranca.situacao_emissao}
            />
          ) : null
        }
      />

      <Section
        title="Cobrança"
        subtitle="Situação financeira registrada para este endosso"
      >
        <CobrancaCard record={cobranca} />
      </Section>

      {/* Motivo da emissão — vale para todos os tipos de endosso */}
      {t.motivoEndosso && (
        <Section
          title="Motivo do endosso"
          subtitle="Justificativa registrada pela seguradora para a emissão deste documento"
        >
          <MotivoEndossoCard motivo={t.motivoEndosso} />
        </Section>
      )}

      {/* Endossos B/C: visualização de cancelamento/alteração */}
      {isCancelamento ? (
        <>
          <Section title="Dados gerais">
            <DadosGeraisCard dados={t.dadosGerais} />
          </Section>

          {t.cancelamento && (
            <Section
              title={t.tipoEndosso === "C" ? "Cancelamento" : "Alteração"}
              subtitle={
                t.tipoEndosso === "C"
                  ? "Este endosso cancela um documento da apólice"
                  : "Este endosso altera um documento da apólice"
              }
            >
              <CancelamentoCard cancelamento={t.cancelamento} tipoEndosso={t.tipoEndosso} />
            </Section>
          )}

          <Section title="Datas">
            <DatasCard datas={t.datas} />
          </Section>
        </>
      ) : (
        <>
          {t.isWrapperVazio && <EndossoSemDadosAviso numeroApolice={documento.numeroApolice} />}

          {!t.isWrapperVazio && (
            <>
              <Section title="Dados gerais">
                <DadosGeraisCard dados={t.dadosGerais} />
              </Section>

              <Section title="Datas">
                <DatasCard datas={t.datas} />
              </Section>

              {t.limiteApolice && (
                <Section title="Limite & Cotação">
                  <LimiteApoliceCard limite={t.limiteApolice} />
                  <CotacaoCard cotacoes={t.cotacoes} />
                </Section>
              )}

              {t.partes.length > 0 && (
                <Section title="Partes">
                  <PartesList partes={t.partes} />
                </Section>
              )}

              {t.itens.length > 0 && (
                <Section title="Itens & coberturas">
                  <ItensCoberturas itens={t.itens} />
                </Section>
              )}

              {t.pagamento.parcelas.length > 0 && (
                <Section title="Pagamento">
                  <PagamentoCard pagamento={t.pagamento} />
                </Section>
              )}
            </>
          )}

          {/* Datas sempre úteis no endosso A (delta) */}
          {t.isWrapperVazio &&
            (t.datas.inicioVigencia || t.datas.fimVigencia || t.datas.assinatura) && (
              <Section title="Datas do endosso">
                <DatasCard datas={t.datas} />
              </Section>
            )}
        </>
      )}

      <Section title="Dados brutos" subtitle="Payload completo retornado pelo MOTOR OLÉ">
        <JsonExplorer data={endo.proposta} title="Endosso (raw)" defaultDepth={1} />
      </Section>
    </div>
  );
}
