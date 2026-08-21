import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NATUREZA_PREMIO_LABEL, TIPO_PESSOA_LABEL } from "@/lib/excelsior/codes";
import { billingTagInfo, type BillingRecord, type BillingTag } from "@/lib/billing/status";
import {
  BillingFilters,
  matchSituacao,
  type SituacaoFilter,
} from "@/components/billing/billing-filters";

import type {
  CancelamentoInfo,
  CoberturaInfo,
  CotacaoInfo,
  DadosGerais,
  DatasInfo,
  DocumentoInfo,
  ItemInfo,
  LimiteApoliceInfo,
  MotivoEndossoInfo,
  PagamentoInfo,
  ParteInfo,
  TipoEndosso,
} from "@/lib/excelsior/translate";

// ============ Utilitários visuais ============
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDateTime(iso);
  } catch {
    return iso;
  }
}
export function fmtNum(n: number | null | undefined, moeda = "BRL"): string {
  if (n === null || n === undefined) return "—";
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  };
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda,
      ...opts,
    }).format(n);
  } catch {
    return `${moeda} ${n.toLocaleString("pt-BR", opts)}`;
  }
}
function fmtCPFCNPJ(tipo: string, valor: string): string {
  const v = valor.replace(/\D/g, "");
  if (tipo === "CPF" && v.length === 11)
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  if (tipo === "CNPJ" && v.length === 14)
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  return valor;
}
function fmtCEP(v: string | null): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  if (d.length !== 8) return v;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ============ Primitivas ============
export function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-[13px] text-foreground", mono && "font-mono text-[12.5px]")}>
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <div className="text-[14px] font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

// ============ Badge de tipo de documento ============
export function badgeStylesFor(
  tipo: "APOLICE" | "ENDOSSO",
  tipoEndosso: TipoEndosso | null,
): { label: string; className: string } {
  if (tipo === "APOLICE") {
    return {
      label: "APÓLICE",
      className: "bg-primary/10 text-primary border-primary/30",
    };
  }
  switch (tipoEndosso) {
    case "A":
      return {
        label: "ENDOSSO A",
        className: "bg-warning/10 text-warning border-warning/30",
      };
    case "B":
      return {
        label: "ENDOSSO B",
        className: "bg-accent/15 text-accent-foreground border-accent/40",
      };
    case "C":
      return {
        label: "ENDOSSO C",
        className: "bg-destructive/10 text-destructive border-destructive/30",
      };
    default:
      return {
        label: "ENDOSSO",
        className: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function EndossoBadge({
  tipo,
  tipoEndosso,
  sequencial,
  size = "md",
}: {
  tipo: "APOLICE" | "ENDOSSO";
  tipoEndosso: TipoEndosso | null;
  sequencial?: string;
  size?: "sm" | "md";
}) {
  const { label, className } = badgeStylesFor(tipo, tipoEndosso);
  const sizeCls =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px]"
      : "px-2 py-0.5 text-[10.5px]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-mono font-semibold border whitespace-nowrap",
        sizeCls,
        className,
      )}
    >
      {label}
      {sequencial && tipo === "ENDOSSO" && (
        <span className="ml-1 opacity-70">· {sequencial}</span>
      )}
    </span>
  );
}

export function DocumentoHeader({
  documento,
  premioValor,
  premioMoeda,
  seguradoNome,
  badge,
  extra,
}: {
  documento: DocumentoInfo;
  premioValor?: number | null;
  premioMoeda?: string;
  seguradoNome?: string | null;
  badge?: ReactNode;
  extra?: ReactNode;
}) {
  const isApolice = documento.tipo === "APOLICE";
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel bg-gradient-surface p-5"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <EndossoBadge
              tipo={documento.tipo}
              tipoEndosso={documento.tipoEndosso}
              sequencial={isApolice ? undefined : documento.sequencial}
            />
            {badge}
            {!isApolice && (
              <span className="text-[11px] text-muted-foreground">
                da apólice <span className="font-mono">{documento.numeroApolice}</span>
              </span>
            )}
          </div>
          <div className="font-mono text-[18px] sm:text-[22px] font-semibold tracking-tight break-all">
            {documento.numeroCompleto}
          </div>
          {seguradoNome && (
            <div className="text-[13px] text-muted-foreground mt-1">
              Segurado: <span className="text-foreground">{seguradoNome}</span>
            </div>
          )}
        </div>
        {premioValor !== undefined && (
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Prêmio total
            </div>
            <div className="text-[18px] sm:text-[22px] font-semibold text-foreground font-mono">
              {fmtNum(premioValor ?? 0, premioMoeda ?? "BRL")}
            </div>
          </div>
        )}
      </div>
      {extra && <div className="mt-6">{extra}</div>}
    </motion.div>
  );
}

// ============ Motivo do endosso (A/B/C) ============
const MOTIVO_ENDOSSO_LABEL: Record<string, string> = {
  ERRO_EMISSAO: "Erro de emissão",
  AJUSTE: "Ajuste",
  FATURA: "Fatura",
  INADIMPLENCIA: "Inadimplência",
  CANCELAMENTO: "Cancelamento",
  ALTERACAO: "Alteração",
  INCLUSAO: "Inclusão",
  EXCLUSAO: "Exclusão",
  RENOVACAO: "Renovação",
  COBRANCA: "Cobrança",
  SUBSTITUICAO: "Substituição",
  REATIVACAO: "Reativação",
};


/** Cores por natureza do motivo — destaca alterações vs. correções. */
function motivoTone(codigo: string | null): string {
  switch (codigo) {
    case "ERRO_EMISSAO":
    case "INADIMPLENCIA":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "CANCELAMENTO":
    case "EXCLUSAO":
    case "FATURA":
      return "bg-warning/10 text-warning border-warning/30";
    case "AJUSTE":
    case "ALTERACAO":
    case "SUBSTITUICAO":
      return "bg-primary/10 text-primary border-primary/30";
    default:
      return "bg-surface-2 text-foreground border-border";
  }
}

export function MotivoEndossoCard({ motivo }: { motivo: MotivoEndossoInfo }) {
  const label = motivo.codigo
    ? (MOTIVO_ENDOSSO_LABEL[motivo.codigo] ?? motivo.codigo.replace(/_/g, " "))
    : "Não informado";
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface-2/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Motivo da emissão
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-semibold",
              motivoTone(motivo.codigo),
            )}
          >
            {label}
          </span>
          {motivo.codigo && (
            <code className="rounded bg-surface-2 border border-border px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {motivo.codigo}
            </code>
          )}
          {motivo.tipoCancelamento && (
            <span className="inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {motivo.tipoCancelamento}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Endosso afetado" value={motivo.numeroEndossoCancelado} mono />
          <Field label="Pagamento" value={motivo.pagamento} />
        </div>

        {motivo.descricao && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Descrição do motivo
            </div>
            <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap border-l-2 border-primary/40 pl-3">
              {motivo.descricao}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Cancelamento / alteração (endosso B/C) ============

export function CancelamentoCard({
  cancelamento,
  tipoEndosso,
}: {
  cancelamento: CancelamentoInfo;
  tipoEndosso: TipoEndosso | null;
}) {
  const titulo =
    tipoEndosso === "C"
      ? "Dados do cancelamento"
      : tipoEndosso === "B"
        ? "Dados da alteração"
        : "Dados do endosso";
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface-2/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {titulo}
      </div>
      <div className="p-5 grid sm:grid-cols-3 gap-4">
        <Field label="Endosso afetado" value={cancelamento.numeroEndossoCancelado} mono />
        <Field label="Motivo" value={cancelamento.motivo} />
        <Field label="Pagamento" value={cancelamento.pagamento} />
        {cancelamento.descricaoMotivo && (
          <div className="sm:col-span-3">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Descrição
            </div>
            <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
              {cancelamento.descricaoMotivo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Dados gerais ============
export function DadosGeraisCard({ dados }: { dados: DadosGerais }) {
  return (
    <div className="panel p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Nº proposta seguradora" value={dados.numeroPropostaSeguradora} mono />
      <Field label="Proposta origem" value={dados.idPropostaOrigem} mono />
      <Field label="Produto" value={dados.idProduto} mono />
      <Field
        label="SUSEP (grupo / ramo)"
        value={dados.grupoSusep ? `${dados.grupoSusep} / ${dados.ramoSusep ?? "—"}` : null}
        mono
      />
      <Field label="Sistema origem" value={dados.sistemaOrigem} />
      <Field label="Subscritor" value={dados.subscritor} />
      <Field
        label="Resultado subscrição"
        value={
          dados.resultadoSubscricao && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[11px] font-mono",
                dados.resultadoSubscricao === "APROVADA"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {dados.resultadoSubscricao}
            </span>
          )
        }
      />
      <Field label="Tipo apólice" value={dados.tipoApolice} mono />
      <Field
        label="Emissão condicionada ao pagamento"
        value={
          dados.emissaoCondicionadaPagamento === null
            ? null
            : dados.emissaoCondicionadaPagamento
              ? "Sim"
              : "Não"
        }
      />
      {dados.condicoesGerais.length > 0 && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Field
            label="Condições gerais"
            value={
              <div className="flex flex-wrap gap-1.5">
                {dados.condicoesGerais.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-[10.5px] bg-muted/50 px-1.5 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

// ============ Datas ============
export function DatasCard({ datas }: { datas: DatasInfo }) {
  return (
    <div className="panel p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Início da vigência" value={fmtDate(datas.inicioVigencia)} mono />
      <Field label="Fim da vigência" value={fmtDate(datas.fimVigencia)} mono />
      <Field label="Data de emissão" value={fmtDate(datas.dataEmissao)} mono />
      <Field label="Assinatura" value={fmtDate(datas.assinatura)} mono />
      <Field label="Conclusão subscrição" value={fmtDate(datas.conclusaoSubscricao)} mono />
      <Field label="Registro origem" value={fmtDate(datas.registroOrigem)} mono />
      <Field label="Protocolo origem" value={fmtDate(datas.protocoloOrigem)} mono />
    </div>
  );
}

// ============ Partes ============
export function PartesList({ partes }: { partes: ParteInfo[] }) {
  if (partes.length === 0)
    return (
      <div className="panel p-5 text-[12px] text-muted-foreground">
        Nenhuma parte registrada.
      </div>
    );
  return (
    <div className="panel">
      <Accordion type="multiple" className="divide-y divide-border">
        {partes.map((p) => (
          <AccordionItem
            key={p.id}
            value={p.id}
            className="border-b-0 px-4 first:pt-0 last:pb-0"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 min-w-0 text-left">
                <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                  {p.papel} / {p.tipo}
                </span>
                <span className="text-[13px] font-medium truncate">{p.nome}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Field
                  label="Tipo pessoa"
                  value={p.tipoPessoa ? (TIPO_PESSOA_LABEL[p.tipoPessoa] ?? p.tipoPessoa) : null}
                />
                <Field label="Nacionalidade" value={p.nacionalidade} mono />
                <Field
                  label={p.tipoPessoa === "JURIDICA" ? "Fundação" : "Nascimento"}
                  value={fmtDate(p.dataNascimentoFundacao)}
                  mono
                />
                <Field label="Exposição política" value={p.exposicaoPolitica} />
              </div>

              {p.documentos.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Documentos
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.documentos.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-border font-mono text-[11px]"
                      >
                        <span className="text-muted-foreground">{d.tipo}</span>
                        <span className="text-foreground">{fmtCPFCNPJ(d.tipo, d.valor)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.contatos.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Contatos
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {p.contatos.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border text-[12px]"
                      >
                        <span className="text-muted-foreground font-mono text-[10.5px]">
                          {c.tipo}
                        </span>
                        <span className="text-foreground truncate">{c.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.enderecos.length > 0 && (
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Endereços
                  </div>
                  <div className="space-y-2">
                    {p.enderecos.map((e, i) => (
                      <div
                        key={i}
                        className="rounded-md bg-surface-2 border border-border p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[12px]"
                      >
                        <Field label="Tipo" value={e.tipo} />
                        <Field
                          label="Logradouro"
                          value={
                            [e.logradouro, e.numero].filter(Boolean).join(", ") || null
                          }
                        />
                        <Field label="Complemento" value={e.complemento} />
                        <Field label="Bairro" value={e.bairro} />
                        <Field
                          label="Cidade / UF"
                          value={
                            e.cidade ? `${e.cidade}${e.estado ? ` / ${e.estado}` : ""}` : null
                          }
                        />
                        <Field label="CEP" value={fmtCEP(e.cep)} mono />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ============ Itens & Coberturas ============
function CoberturaCard({ c }: { c: CoberturaInfo }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-foreground">{c.nome}</div>
          <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
            {c.codigo} · SUSEP {c.grupoSusep}/{c.ramoSusep}
          </div>
        </div>
        {c.processoSusep && (
          <span className="font-mono text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
            Processo {c.processoSusep}
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px]">
        <Field label="Início" value={fmtDate(c.inicioVigencia)} mono />
        <Field label="Fim" value={fmtDate(c.fimVigencia)} mono />
        <Field label="Abrangência" value={c.abrangenciaGeografica} />
      </div>

      {c.limites.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Limites
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {c.limites.map((l, i) => (
              <div
                key={i}
                className="rounded-md bg-background border border-border p-3 flex items-center justify-between text-[12px]"
              >
                <div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">
                    {l.tipoLimite} · {l.tipoObrigacao}
                  </div>
                  <div className="font-mono text-foreground mt-0.5">
                    {fmtNum(l.valor, l.moeda ?? "BRL")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.beneficiarios.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Beneficiários
          </div>
          <div className="space-y-1">
            {c.beneficiarios.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-background border border-border text-[12px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-foreground">{b.parentesco ?? "—"}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground truncate">
                    {b.id}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-primary">
                  {b.participacao !== null ? `${b.participacao.toFixed(2)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.composicaoPremio.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Composição do prêmio
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="data-table text-[11.5px]">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-2 py-1.5">Natureza</th>
                  <th className="text-left font-medium px-2 py-1.5">Tipo</th>
                  <th className="text-right font-medium px-2 py-1.5">Valor</th>
                </tr>
              </thead>
              <tbody>
                {c.composicaoPremio.map((l, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-2 py-1.5">
                      {NATUREZA_PREMIO_LABEL[l.natureza] ?? l.natureza}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{l.tipo}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {fmtNum(l.valor, l.moeda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ItensCoberturas({ itens }: { itens: ItemInfo[] }) {
  if (itens.length === 0)
    return (
      <div className="panel p-5 text-[12px] text-muted-foreground">
        Nenhum item segurado.
      </div>
    );
  return (
    <div className="space-y-4">
      {itens.map((it, i) => (
        <div key={i} className="panel p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[13.5px] font-semibold">
                Item #{it.numero ?? i + 1} · {it.tipoObjeto ?? "Objeto"}
              </div>
              {it.classeRisco && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Classe de risco: {it.classeRisco}
                </div>
              )}
            </div>
          </div>

          {it.dadosItem && Object.keys(it.dadosItem).length > 0 && (
            <div className="rounded-md bg-surface-2/60 border border-border p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(it.dadosItem).map(([k, v]) => (
                <Field
                  key={k}
                  label={k.replace(/_/g, " ")}
                  value={typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v ?? "—")}
                />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {it.coberturas.map((c, j) => (
              <CoberturaCard key={j} c={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Pagamento ============
export function PagamentoCard({ pagamento }: { pagamento: PagamentoInfo }) {
  if (pagamento.parcelas.length === 0)
    return (
      <div className="panel p-5 text-[12px] text-muted-foreground">
        Sem parcelas registradas.
      </div>
    );
  const moeda =
    pagamento.parcelas.find((p) => p.moeda)?.moeda ?? "BRL";
  const totalMoeda = pagamento.parcelas.reduce((acc, p) => acc + (p.valor ?? 0), 0);
  return (
    <div className="panel overflow-hidden">
      <table className="data-table text-[12px]">
        <thead className="bg-surface-2/60 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-3 py-2">#</th>
            <th className="text-left font-medium px-3 py-2">Vencimento</th>
            <th className="text-left font-medium px-3 py-2">Agente</th>
            <th className="text-right font-medium px-3 py-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          {pagamento.parcelas.map((p, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="px-3 py-2 font-mono">{p.numero ?? i + 1}</td>
              <td className="px-3 py-2 font-mono">{fmtDate(p.vencimento)}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {p.agenteCobrador ?? "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {fmtNum(p.valor, p.moeda ?? "BRL")}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border bg-surface-2/40 font-semibold">
            <td colSpan={3} className="px-3 py-2 text-right">
              Total
            </td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalMoeda, moeda)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============ Cotação ============
export function CotacaoCard({ cotacoes }: { cotacoes: CotacaoInfo[] }) {
  if (cotacoes.length === 0) return null;
  return (
    <div className="panel p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cotacoes.map((c, i) => (
        <div key={i} className="space-y-1">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {c.moeda}
          </div>
          <div className="font-mono text-[14px] text-foreground">
            1 {c.moeda} = R$ {c.taxaCambio.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
          </div>
          <div className="text-[10.5px] text-muted-foreground">
            {fmtDate(c.dataCotacao)} · {c.identificador ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Limite máximo da apólice ============
export function LimiteApoliceCard({ limite }: { limite: LimiteApoliceInfo | null }) {
  if (!limite) return null;
  return (
    <div className="panel p-5 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          Limite máximo da apólice
        </div>
        <div className="text-[20px] font-semibold font-mono mt-1">
          {fmtNum(limite.valor, limite.moeda ?? "BRL")}
        </div>
      </div>
    </div>
  );
}

// ============ Aviso de wrapper vazio ============
export function EndossoSemDadosAviso({ numeroApolice }: { numeroApolice: string }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-5 text-[12.5px] text-foreground">
      <div className="font-semibold mb-1">Endosso sem corpo completo</div>
      <p className="text-muted-foreground">
        Este endosso do MOTOR OLÉ contém apenas o delta (geralmente novas datas). Para enxergar
        partes, itens e composição de prêmio, consulte a apólice mãe{" "}
        <span className="font-mono text-foreground">{numeroApolice}</span>.
      </p>
    </div>
  );
}

// ============ Cobrança ============
export function BillingBadge({
  statusPagamento,
  situacaoEmissao,
  size = "md",
}: {
  statusPagamento: string | null | undefined;
  situacaoEmissao: string | null | undefined;
  size?: "sm" | "md";
}) {
  const { label, className } = billingTagInfo(statusPagamento, situacaoEmissao);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-mono font-semibold border whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[10.5px]",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Data pura (yyyy-mm-dd) sem deslocamento de fuso. */
function fmtDateOnly(v: string | null | undefined): string {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return fmtDate(v);
}

function statusPagamentoLabel(v: string | null | undefined): string {
  const s = (v ?? "").trim().toLowerCase();
  if (s.startsWith("total")) return "Total (quitado)";
  if (s.startsWith("parcial")) return "Parcial";
  if (s.startsWith("abert")) return "Aberta";
  return v ?? "—";
}

/** Card de cobrança de um documento (apólice vigente ou endosso). */
export function CobrancaCard({
  record,
  titulo = "Cobrança",
}: {
  record: BillingRecord | null;
  titulo?: string;
}) {
  if (!record) {
    return (
      <div className="panel p-5 text-[12.5px] text-muted-foreground">
        Sem dados de cobrança para este documento.
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface-2/50 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {titulo}
        </span>
        <BillingBadge
          statusPagamento={record.status_pagamento}
          situacaoEmissao={record.situacao_emissao}
        />
      </div>
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Status do pagamento" value={statusPagamentoLabel(record.status_pagamento)} />
        <Field label="Situação da emissão" value={record.situacao_emissao || "—"} />
        <Field label="Nº da proposta" value={record.numero_proposta ?? "—"} mono />
        <Field label="Vencimento" value={fmtDateOnly(record.data_vencimento)} mono />
        <Field label="Quitação" value={fmtDate(record.data_quitacao)} mono />
        <Field label="Endosso" value={record.numero_endosso} mono />
      </div>
    </div>
  );
}

/** Histórico de cobranças por endosso da apólice, com filtros por tag e situação. */
export function CobrancasList({ rows: allRows }: { rows: BillingRecord[] }) {
  const [tags, setTags] = useState<BillingTag[]>([]);
  const [situacao, setSituacao] = useState<SituacaoFilter>("todas");

  const rows = allRows.filter((r) => {
    const tag = billingTagInfo(r.status_pagamento, r.situacao_emissao).tag;
    if (tags.length > 0 && !tags.includes(tag)) return false;
    return matchSituacao(r.situacao_emissao, situacao);
  });

  if (allRows.length === 0) {
    return (
      <div className="panel p-5 text-[12.5px] text-muted-foreground">
        Nenhuma cobrança registrada para esta apólice.
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-2/40">
        <BillingFilters
          tags={tags}
          onToggleTag={(t) =>
            setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
          }
          onClearTags={() => setTags([])}
          situacao={situacao}
          onSituacao={setSituacao}
        />
      </div>
      <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
        <div className="col-span-2">Endosso</div>
        <div className="col-span-3">Proposta</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Vencimento</div>
        <div className="col-span-3 text-right">Quitação</div>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          Nenhuma cobrança corresponde aos filtros.
        </div>
      )}

      {rows.map((r) => (
        <div
          key={`${r.numero_apolice}-${r.numero_endosso}`}
          className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 text-[12px]"
        >
          <div className="col-span-2 font-mono text-muted-foreground">{r.numero_endosso}</div>
          <div className="col-span-3 font-mono text-[11.5px] text-muted-foreground truncate">
            {r.numero_proposta ?? "—"}
          </div>
          <div className="col-span-2">
            <BillingBadge
              statusPagamento={r.status_pagamento}
              situacaoEmissao={r.situacao_emissao}
              size="sm"
            />
          </div>
          <div className="col-span-2 text-right font-mono text-[11.5px]">
            {fmtDateOnly(r.data_vencimento)}
          </div>
          <div className="col-span-3 text-right font-mono text-[11.5px]">
            {fmtDate(r.data_quitacao)}
          </div>
        </div>
      ))}
    </div>
  );
}
