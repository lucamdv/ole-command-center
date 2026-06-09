import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AuditHistoryItem, LatestAudit } from "./audit/types";

// URL do webhook do fluxo n8n de auditoria. DEVE ser configurada via secret
// N8N_AUDIT_WEBHOOK_URL (use a URL de produção /webhook/..., não /webhook-test/...).
const EMPTY_SUMMARY = {
  aprovados: 0,
  reprovados: 0,
  total_processado: 0,
};

// URL pública estável do Lovable (preview). O n8n na nuvem consegue acessar.
// Pode ser sobrescrita via secret PUBLIC_APP_URL (ex.: domínio final em produção).
const LOVABLE_PROJECT_ID = "5db7fa90-1492-4717-b26e-8b99a107e006";
const PREVIEW_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
const PRODUCTION_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}.lovable.app`;

/**
 * Dispara a auditoria de forma ASSÍNCRONA.
 *
 * Fluxo:
 *  1. Cria uma linha em audit_runs com status='running'.
 *  2. Faz POST para o n8n enviando { run_id, callback_url } no body.
 *     O webhook do n8n deve estar configurado para "Respond Immediately".
 *     O fluxo n8n, ao terminar, deve POSTar o resultado em callback_url
 *     com o header x-callback-secret = AUDIT_CALLBACK_SECRET.
 *  3. Retorna o run_id imediatamente. O frontend faz polling.
 */
export const runAudit = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async () => {
  const url = process.env.N8N_AUDIT_WEBHOOK_URL;
  if (!url) {
    throw new Error(
      "Secret N8N_AUDIT_WEBHOOK_URL não configurada. Cole a URL de produção do webhook n8n (/webhook/...) nos secrets do projeto.",
    );
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Cria o run em status 'running'
  const { data: runRow, error: insertErr } = await supabaseAdmin
    .from("audit_runs")
    .insert({
      status: "running",
      status_geral: "PROCESSANDO",
      total_processado: 0,
      aprovados: 0,
      reprovados: 0,
      raw: {},
    } as never)
    .select("id")
    .single();

  if (insertErr || !runRow) {
    throw new Error("Falha ao criar run: " + (insertErr?.message ?? "sem id"));
  }

  const runId = (runRow as { id: string }).id;

  // Monta callback URL pública. SEMPRE usa o domínio estável do Lovable
  // (project--{id}[-dev].lovable.app) — NUNCA o host do request, porque a
  // preview da sandbox (id-preview--...) tem auth no meio e responde 302
  // para POSTs externos, fazendo o callback do n8n se perder.
  const base =
    process.env.PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_PUBLIC_URL : PREVIEW_PUBLIC_URL);
  const callbackUrl = `${base.replace(/\/$/, "")}/api/public/audit-callback?run_id=${runId}`;

  // 2. Dispara o webhook do n8n (espera resposta imediata)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        callback_url: callbackUrl,
        trigger: "ole-copilot",
        mode: "async_callback",
        status_geral: "PROCESSANDO",
        mensagem_geral: "Auditoria em processamento.",
        resumo: EMPTY_SUMMARY,
        apolices_com_erro: [],
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const errMsg =
        res.status === 404 && url.includes("/webhook-test/")
          ? 'Webhook n8n (modo teste) não está escutando. Clique em "Listen for test event" no n8n.'
          : `Motor de auditoria retornou ${res.status}: ${body.slice(0, 200)}`;

      await supabaseAdmin
        .from("audit_runs")
        .update({ status: "error", error_message: errMsg } as never)
        .eq("id", runId);

      throw new Error(errMsg);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    await supabaseAdmin
      .from("audit_runs")
      .update({ status: "error", error_message: msg } as never)
      .eq("id", runId);
    throw new Error(`Não foi possível disparar a auditoria: ${msg}`);
  }

  return { runId, status: "running" as const };
});

export const getAuditRunStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run, error } = await supabaseAdmin
      .from("audit_runs")
      .select("id, status, status_geral, error_message, total_processado, aprovados, reprovados")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return run as {
      id: string;
      status: string;
      status_geral: string | null;
      error_message: string | null;
      total_processado: number;
      aprovados: number;
      reprovados: number;
    } | null;
  });

export const getLatestAudit = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runs, error: runErr } = await supabaseAdmin
    .from("audit_runs")
    .select("*")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (runErr) throw new Error(runErr.message);
  if (!runs || runs.length === 0) return null as LatestAudit | null;

  const run = runs[0] as Record<string, unknown> & {
    id: string;
    aprovados: number;
    reprovados: number;
    total_processado: number;
  };
  const { data: findings, error: findErr } = await supabaseAdmin
    .from("audit_findings")
    .select("*")
    .eq("run_id", run.id)
    .order("apolice", { ascending: true });

  if (findErr) throw new Error(findErr.message);

  const { data: ignores } = await context.supabase
    .from("audit_ignores")
    .select("apolice, tipo_erro");
  const ignoreList = (ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>;
  const apoliceWhole = new Set(ignoreList.filter((i) => !i.tipo_erro).map((i) => i.apolice));
  const apolicePlusTipo = new Set(
    ignoreList.filter((i) => i.tipo_erro).map((i) => `${i.apolice}::${i.tipo_erro}`),
  );

  const all = (findings ?? []) as Array<{ apolice: string; tipo_erro: string }>;
  const filtered = all.filter(
    (f) => !apoliceWhole.has(f.apolice) && !apolicePlusTipo.has(`${f.apolice}::${f.tipo_erro}`),
  );

  const apolicesAntes = new Set(all.map((f) => f.apolice));
  const apolicesDepois = new Set(filtered.map((f) => f.apolice));
  const reprovadosAjustado = apolicesDepois.size;
  const aprovadosAjustado = (run.aprovados ?? 0) + (apolicesAntes.size - apolicesDepois.size);

  return {
    run: { ...run, aprovados: aprovadosAjustado, reprovados: reprovadosAjustado },
    findings: filtered,
  } as unknown as LatestAudit;
});

export const getAuditHistory = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("audit_runs")
    .select("id, created_at, data_auditoria, status_geral, total_processado, aprovados, reprovados, duration_ms")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditHistoryItem[];
});

// Schema exportado para uso no callback route
export const CallbackPayloadSchema = z.object({
  run_id: z.string().uuid().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
  error_message: z.string().optional(),
  data_auditoria: z.string().optional(),
  resumo: z
    .object({
      aprovados: z.coerce.number().optional().default(0),
      reprovados: z.coerce.number().optional().default(0),
      total_processado: z.coerce.number().optional().default(0),
    })
    .optional(),
  status_geral: z.string().optional(),
  mensagem_geral: z.string().optional(),
  apolices_com_erro: z
    .array(
      z.object({
        apolice: z.string(),
        total_erros: z.number().optional().default(0),
        erros: z
          .array(
            z
              .object({
                tipo_erro: z.string(),
                endosso: z.string().optional().nullable(),
                dataInicio: z.string().optional().nullable(),
                dataFim: z.string().optional().nullable(),
              })
              .passthrough(),
          )
          .optional()
          .default([]),
      }),
    )
    .optional()
    .default([]),
});

export const getSystemStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: lastRun }, { data: lastSync }] = await Promise.all([
    supabaseAdmin
      .from("audit_runs")
      .select("id, status, error_message, created_at, aprovados, total_processado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("policy_sync_runs")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r, () => ({ data: null })),
  ]);

  const run = lastRun as
    | { status: string; error_message: string | null; created_at: string; aprovados: number | null; total_processado: number | null }
    | null;
  const sync = lastSync as { status: string; created_at: string } | null;

  const approvalRate =
    run && (run.total_processado ?? 0) > 0
      ? ((run.aprovados ?? 0) / (run.total_processado as number)) * 100
      : null;

  let state: "operational" | "degraded" | "down" = "operational";
  if (run?.status === "error" || sync?.status === "error") state = "down";
  else if (run?.status === "running" || (approvalRate != null && approvalRate < 95)) state = "degraded";

  return {
    state,
    approvalRate,
    lastRunAt: run?.created_at ?? null,
    lastRunStatus: run?.status ?? null,
    lastSyncAt: sync?.created_at ?? null,
    lastSyncStatus: sync?.status ?? null,
  };
});
