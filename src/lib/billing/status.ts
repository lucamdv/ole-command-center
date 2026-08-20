/** Derivação da tag de cobrança a partir dos dados da seguradora. */

export interface BillingRecord {
  numero_apolice: string;
  numero_endosso: string;
  numero_proposta: string | null;
  status_pagamento: string;
  situacao_emissao: string;
  data_quitacao: string | null;
  data_vencimento: string | null;
}

export type BillingTag = "PAGO" | "PARCIAL" | "ABERTA" | "CANCELADA";

export interface BillingTagInfo {
  tag: BillingTag;
  label: BillingTag;
  className: string;
}

const TAG_STYLES: Record<BillingTag, string> = {
  PAGO: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
  PARCIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40",
  ABERTA: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40",
  CANCELADA: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40",
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Regra oficial: Total→PAGO, Parcial→PARCIAL, Aberta+Cancelada→CANCELADA, Aberta+Ativa→ABERTA. */
export function billingTag(
  statusPagamento: string | null | undefined,
  situacaoEmissao: string | null | undefined,
): BillingTag {
  const st = norm(statusPagamento);
  if (st.startsWith("total")) return "PAGO";
  if (st.startsWith("parcial")) return "PARCIAL";
  if (norm(situacaoEmissao).startsWith("cancel")) return "CANCELADA";
  return "ABERTA";
}

export function billingTagInfo(
  statusPagamento: string | null | undefined,
  situacaoEmissao: string | null | undefined,
): BillingTagInfo {
  const tag = billingTag(statusPagamento, situacaoEmissao);
  return { tag, label: tag, className: TAG_STYLES[tag] };
}

export function billingTagClass(tag: BillingTag): string {
  return TAG_STYLES[tag];
}

/** Cobrança vigente = registro com o maior sequencial de endosso. */
export function currentBilling<T extends { numero_endosso: string }>(rows: T[]): T | null {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((acc, r) => {
    const a = parseInt(String(acc.numero_endosso).replace(/\D/g, ""), 10) || 0;
    const b = parseInt(String(r.numero_endosso).replace(/\D/g, ""), 10) || 0;
    return b > a ? r : acc;
  });
}

export function normalizeBillingEndosso(numero: string): string {
  const digits = String(numero).replace(/\D/g, "");
  return digits.slice(-6).padStart(6, "0");
}
