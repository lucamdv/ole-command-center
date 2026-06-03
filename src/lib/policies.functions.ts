import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

// URL pode ser sobrescrita pelo secret N8N_MOTOR_POLICIES_URL.
const DEFAULT_WEBHOOK = "";

const LOVABLE_PROJECT_ID = "5db7fa90-1492-4717-b26e-8b99a107e006";
const PREVIEW_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
const PRODUCTION_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}.lovable.app`;

export interface PolicyListItem {
  id: string;
  numero_apolice: string;
  numero_endosso_atual: string | null;
  premio_liquido: number;
  endorsements_count: number;
  updated_at: string;
}

export interface PolicyDetail {
  id: string;
  numero_apolice: string;
  numero_endosso_atual: string | null;
  premio_liquido: number;
  proposta: Record<string, unknown>;
  updated_at: string;
  last_sync_at: string | null;
  endorsements: Array<{
    id: string;
    numero_endosso: string;
    premio_liquido: number;
    ordem: number;
    proposta: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface PolicySyncStatus {
  id: string;
  status: string;
  total_apolices: number;
  error_message: string | null;
  duration_ms: number | null;
  finished_at: string | null;
}

export const runPolicySync = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.N8N_MOTOR_POLICIES_URL || DEFAULT_WEBHOOK;
  if (!url) {
    throw new Error(
      "Secret N8N_MOTOR_POLICIES_URL ainda não configurada. Cole a URL do webhook do MOTOR OLÉ.",
    );
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runRow, error: insertErr } = await supabaseAdmin
    .from("policy_sync_runs")
    .insert({ status: "running" } as never)
    .select("id")
    .single();

  if (insertErr || !runRow) {
    throw new Error("Falha ao criar run: " + (insertErr?.message ?? "sem id"));
  }
  const runId = (runRow as { id: string }).id;

  const reqHost = getRequestHost();
  const proto = getRequestHeader("x-forwarded-proto") || "https";
  const isLocal =
    !reqHost ||
    reqHost.includes("localhost") ||
    reqHost.startsWith("127.") ||
    reqHost.startsWith("0.");
  const base =
    process.env.PUBLIC_APP_URL ||
    (isLocal
      ? process.env.NODE_ENV === "production"
        ? PRODUCTION_PUBLIC_URL
        : PREVIEW_PUBLIC_URL
      : `${proto}://${reqHost}`);
  const callbackUrl = `${base.replace(/\/$/, "")}/api/public/policy-sync-callback?run_id=${runId}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        callback_url: callbackUrl,
        trigger: "ole-copilot-policies",
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg =
        res.status === 404 && url.includes("/webhook-test/")
          ? 'Webhook n8n (modo teste) não está escutando. Clique em "Listen for test event" no n8n.'
          : `MOTOR OLÉ retornou ${res.status}: ${body.slice(0, 200)}`;
      await supabaseAdmin
        .from("policy_sync_runs")
        .update({ status: "error", error_message: msg, finished_at: new Date().toISOString() } as never)
        .eq("id", runId);
      throw new Error(msg);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    await supabaseAdmin
      .from("policy_sync_runs")
      .update({ status: "error", error_message: msg, finished_at: new Date().toISOString() } as never)
      .eq("id", runId);
    throw new Error(`Não foi possível disparar a sincronização: ${msg}`);
  }

  return { runId, status: "running" as const };
});

export const getPolicySyncStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { runId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("policy_sync_runs")
      .select("id, status, total_apolices, error_message, duration_ms, finished_at")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as PolicySyncStatus | null;
  });

export const getLatestPolicySync = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("policy_sync_runs")
    .select("id, status, total_apolices, finished_at, created_at, error_message")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as {
    id: string;
    status: string;
    total_apolices: number;
    finished_at: string | null;
    created_at: string;
    error_message: string | null;
  } | null;
});

export const getPolicies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("policies")
    .select("id, numero_apolice, numero_endosso_atual, premio_liquido, updated_at, endorsements(id)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{
    id: string;
    numero_apolice: string;
    numero_endosso_atual: string | null;
    premio_liquido: number | string;
    updated_at: string;
    endorsements: Array<{ id: string }>;
  }>).map((p) => ({
    id: p.id,
    numero_apolice: p.numero_apolice,
    numero_endosso_atual: p.numero_endosso_atual,
    premio_liquido: Number(p.premio_liquido ?? 0),
    endorsements_count: p.endorsements?.length ?? 0,
    updated_at: p.updated_at,
  })) as PolicyListItem[];
});

export const getPolicyByNumero = createServerFn({ method: "GET" })
  .inputValidator((d: { numero: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("policies")
      .select("id, numero_apolice, numero_endosso_atual, premio_liquido, proposta, updated_at, last_sync_run_id")
      .eq("numero_apolice", data.numero)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;

    const row = p as {
      id: string;
      numero_apolice: string;
      numero_endosso_atual: string | null;
      premio_liquido: number | string;
      proposta: Record<string, unknown>;
      updated_at: string;
      last_sync_run_id: string | null;
    };

    const { data: endos, error: errE } = await supabaseAdmin
      .from("endorsements")
      .select("id, numero_endosso, premio_liquido, ordem, proposta, created_at")
      .eq("policy_id", row.id)
      .order("ordem", { ascending: true });
    if (errE) throw new Error(errE.message);

    let lastSyncAt: string | null = null;
    if (row.last_sync_run_id) {
      const { data: run } = await supabaseAdmin
        .from("policy_sync_runs")
        .select("finished_at, created_at")
        .eq("id", row.last_sync_run_id)
        .maybeSingle();
      const r = run as { finished_at: string | null; created_at: string } | null;
      lastSyncAt = r?.finished_at ?? r?.created_at ?? null;
    }

    return {
      id: row.id,
      numero_apolice: row.numero_apolice,
      numero_endosso_atual: row.numero_endosso_atual,
      premio_liquido: Number(row.premio_liquido ?? 0),
      proposta: row.proposta ?? {},
      updated_at: row.updated_at,
      last_sync_at: lastSyncAt,
      endorsements: ((endos ?? []) as Array<{
        id: string;
        numero_endosso: string;
        premio_liquido: number | string;
        ordem: number;
        proposta: Record<string, unknown>;
        created_at: string;
      }>).map((e) => ({
        id: e.id,
        numero_endosso: e.numero_endosso,
        premio_liquido: Number(e.premio_liquido ?? 0),
        ordem: e.ordem,
        proposta: e.proposta ?? {},
        created_at: e.created_at,
      })),
    } as PolicyDetail;
  });

export const getEndorsement = createServerFn({ method: "GET" })
  .inputValidator((d: { numero: string; endosso: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("policies")
      .select("id, numero_apolice")
      .eq("numero_apolice", data.numero)
      .maybeSingle();
    if (!p) return null;
    const policy = p as { id: string; numero_apolice: string };
    const { data: e, error } = await supabaseAdmin
      .from("endorsements")
      .select("id, numero_endosso, premio_liquido, ordem, proposta, created_at")
      .eq("policy_id", policy.id)
      .eq("numero_endosso", data.endosso)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!e) return null;
    const row = e as {
      id: string;
      numero_endosso: string;
      premio_liquido: number | string;
      ordem: number;
      proposta: Record<string, unknown>;
      created_at: string;
    };
    return {
      numero_apolice: policy.numero_apolice,
      id: row.id,
      numero_endosso: row.numero_endosso,
      premio_liquido: Number(row.premio_liquido ?? 0),
      ordem: row.ordem,
      proposta: row.proposta ?? {},
      created_at: row.created_at,
    };
  });

// Schema do callback do MOTOR OLÉ
export const PolicySyncCallbackSchema = z.object({
  origem: z.string().optional(),
  total_apolices: z.coerce.number().optional(),
  dados: z
    .array(
      z
        .object({
          numero_apolice_seguradora: z.string().optional(),
          numero_endosso_seguradora: z.string().optional().nullable(),
          premio_liquido: z.coerce.number().optional().default(0),
          proposta: z.record(z.string(), z.unknown()).optional().default({}),
          historico_endossos: z
            .array(
              z
                .object({
                  numero_apolice_seguradora: z.string().optional(),
                  numero_endosso_seguradora: z.string().optional().nullable(),
                  premio_liquido: z.coerce.number().optional().default(0),
                  proposta: z.record(z.string(), z.unknown()).optional().default({}),
                })
                .passthrough(),
            )
            .optional()
            .default([]),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});
