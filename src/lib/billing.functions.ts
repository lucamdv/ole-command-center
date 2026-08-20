import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BillingRecord } from "@/lib/billing/status";

const COLS =
  "numero_apolice, numero_endosso, numero_proposta, status_pagamento, situacao_emissao, data_quitacao, data_vencimento";

/** Cobranças (uma por endosso) de uma apólice. */
export const getPolicyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { numero: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("policy_billing")
      .select(COLS)
      .eq("numero_apolice", data.numero)
      .order("numero_endosso", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as BillingRecord[];
  });

/** Todas as cobranças — usado para mostrar a tag vigente na listagem da carteira. */
export const getBillingIndex = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("policy_billing")
      .select(COLS)
      .order("numero_endosso", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as BillingRecord[];
  });
