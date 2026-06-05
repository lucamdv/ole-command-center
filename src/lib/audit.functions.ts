import { createServerFn } from "@tanstack/react-start";
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
export const runAudit = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.N8N_AUDIT_WEBHOOK_URL || DEFAULT_WEBHOOK;
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

  // Monta callback URL pública (n8n na nuvem precisa de URL acessível externamente).
  // Prioridade: PUBLIC_APP_URL (secret) → host do request se não-localhost → URL estável do Lovable.
  const { getRequestHost, getRequestHeader } = await import("@tanstack/react-start/server");
  const reqHost = getRequestHost();
  const proto = getRequestHeader("x-forwarded-proto") || "https";
  const isLocal = !reqHost || reqHost.includes("localhost") || reqHost.startsWith("127.") || reqHost.startsWith("0.");
  const base =
    process.env.PUBLIC_APP_URL ||
    (isLocal
      ? process.env.NODE_ENV === "production"
        ? PRODUCTION_PUBLIC_URL
        : PREVIEW_PUBLIC_URL
      : `${proto}://${reqHost}`);
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

export const getAuditRunStatus = createServerFn({ method: "GET" })
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

export const getLatestAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runs, error: runErr } = await supabaseAdmin
    .from("audit_runs")
    .select("*")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  if (runErr) throw new Error(runErr.message);
  if (!runs || runs.length === 0) return null as LatestAudit | null;

  const run = runs[0];
  const { data: findings, error: findErr } = await supabaseAdmin
    .from("audit_findings")
    .select("*")
    .eq("run_id", (run as { id: string }).id)
    .order("apolice", { ascending: true });

  if (findErr) throw new Error(findErr.message);

  return { run, findings: findings ?? [] } as unknown as LatestAudit;
});

export const getAuditHistory = createServerFn({ method: "GET" }).handler(async () => {
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

export const getSystemStatus = createServerFn({ method: "GET" }).handler(async () => {
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
