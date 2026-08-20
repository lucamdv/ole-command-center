import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, GitBranch } from "lucide-react";
import { usePolicy } from "@/hooks/use-policies";
import { usePolicyBilling } from "@/hooks/use-billing";
import { formatDateTime, relativeTime } from "@/lib/format";
import { JsonExplorer } from "@/components/json-explorer";
import {
  BillingBadge,
  CobrancaCard,
  CobrancasList,
  CotacaoCard,
  DadosGeraisCard,
  DatasCard,
  DocumentoHeader,
  EndossoBadge,
  fmtNum,
  ItensCoberturas,
  LimiteApoliceCard,
  PagamentoCard,
  PartesList,
  Section,
} from "@/components/apolice/cards";
import {
  normalizeEndossoNum,
  parseDocumento,
  translateProposta,
  unwrapProposta,
} from "@/lib/excelsior/translate";

export const Route = createFileRoute("/_authenticated/apolices/$id/")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} · Apólice · OLÉ COPILOT` },
      { name: "description", content: `Detalhe da apólice ${params.id}.` },
    ],
  }),
  component: ApoliceDetail,
});

export default function ApoliceDetail() {
  const { id } = Route.useParams();
  const { data: policy, isLoading } = usePolicy(id);
  const { rows: cobrancas, vigente: cobrancaVigente } = usePolicyBilling(id);

  if (isLoading) {
    return <div className="page-subtitle">Carregando apólice…</div>;
  }

  if (!policy) {
    return (
      <div className="space-y-4">
        <Link
          to="/apolices"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à carteira
        </Link>
        <div className="panel p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <div className="text-[13px] font-medium">Apólice não encontrada</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            Esta apólice não está na carteira sincronizada.
          </div>
        </div>
      </div>
    );
  }

  const proposta = policy.proposta ?? {};
  const t = translateProposta(proposta);
  const documento = parseDocumento(policy.numero_apolice, t.tipoEndosso);
  const seguradoNome = t.partes.find((p) => p.papel === "SEGURADO")?.nome ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/apolices"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à carteira
      </Link>

      <DocumentoHeader
        documento={documento}
        premioValor={policy.premio_liquido}
        premioMoeda={policy.premio_moeda}
        seguradoNome={seguradoNome}
        badge={
          cobrancaVigente ? (
            <BillingBadge
              statusPagamento={cobrancaVigente.status_pagamento}
              situacaoEmissao={cobrancaVigente.situacao_emissao}
            />
          ) : null
        }
        extra={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 rounded-xl overflow-hidden">
            <HeaderFact
              label="Vigência"
              value={
                t.datas.inicioVigencia && t.datas.fimVigencia
                  ? `${formatDateTime(t.datas.inicioVigencia)} → ${formatDateTime(t.datas.fimVigencia)}`
                  : "—"
              }
            />
            <HeaderFact label="Endossos" value={String(policy.endorsements.length)} />
            <HeaderFact
              label="Produto"
              value={t.dadosGerais.idProduto ?? "—"}
              mono
            />
            <HeaderFact
              label="Sincronizada"
              value={relativeTime(policy.last_sync_at ?? policy.updated_at)}
              hint={formatDateTime(policy.last_sync_at ?? policy.updated_at)}
            />
          </div>
        }
      />

      <Section
        title="Cobrança"
        subtitle={
          cobrancaVigente
            ? "Situação financeira vigente da apólice e histórico por endosso"
            : "Sem dados de cobrança para esta apólice"
        }
      >
        <CobrancaCard record={cobrancaVigente} titulo="Cobrança vigente" />
        {cobrancas.length > 0 && <CobrancasList rows={cobrancas} />}
      </Section>

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

      <Section title="Partes" subtitle={`${t.partes.length} envolvidos`}>
        <PartesList partes={t.partes} />
      </Section>

      <Section
        title="Itens & coberturas"
        subtitle={`${t.itens.length} item(ns) · ${t.itens.reduce((a, i) => a + i.coberturas.length, 0)} cobertura(s)`}
      >
        <ItensCoberturas itens={t.itens} />
      </Section>

      <Section title="Pagamento" subtitle={`${t.pagamento.parcelas.length} parcela(s)`}>
        <PagamentoCard pagamento={t.pagamento} />
      </Section>

      <Section title="Endossos" subtitle={`${policy.endorsements.length} no histórico`}>
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
            <div className="col-span-2">#</div>
            <div className="col-span-7">Identificador</div>
            <div className="col-span-2 text-right">Prêmio total</div>
            <div className="col-span-1 text-right">→</div>
          </div>
          {policy.endorsements.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Apólice sem endossos adicionais (apenas a emissão original).
            </div>
          )}
          {policy.endorsements.map((e) => {
            const seq = normalizeEndossoNum(e.numero_endosso);
            const isApolice = seq === "000000";
            const { tipoEndosso } = unwrapProposta(e.proposta);
            return (
              <Link
                key={e.id}
                to="/apolices/$id/endossos/$num"
                params={{ id: policy.numero_apolice, num: e.numero_endosso }}
                className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-surface-2/50 transition"
              >
                <div className="col-span-2 font-mono text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" /> {e.ordem}
                </div>
                <div className="col-span-7 flex items-center gap-2 min-w-0">
                  <EndossoBadge
                    tipo={isApolice ? "APOLICE" : "ENDOSSO"}
                    tipoEndosso={tipoEndosso}
                    size="sm"
                  />
                  <span className="font-mono text-[11.5px] text-muted-foreground truncate">
                    {policy.numero_apolice.slice(0, -6) + seq}
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono text-[12px]">
                  {fmtNum(e.premio_liquido, e.premio_moeda)}
                </div>
                <div className="col-span-1 text-right text-muted-foreground">›</div>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section title="Dados brutos" subtitle="Payload completo retornado pelo MOTOR OLÉ">
        <JsonExplorer data={t.raw} title="Proposta (raw)" defaultDepth={1} />
      </Section>
    </div>
  );
}

function HeaderFact({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-[13px] font-semibold text-foreground mt-0.5 truncate ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10.5px] font-mono text-muted-foreground mt-0.5">{hint}</div>
      )}
    </div>
  );
}
