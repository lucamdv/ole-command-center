import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AuditHistoryItem, LatestAudit } from "./audit/types";
import type { WebhookMode } from "@/lib/webhook-mode";

/**
 * Dispara a auditoria de forma ASSÍNCRONA (implementação em audit-run.server.ts).
 * O n8n responde imediatamente e, ao terminar, POSTa em callback_url.
 */
export const runAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { mode?: WebhookMode }) => d ?? {})
  .handler(async ({ data }) => {
    const { runAuditImpl } = await import("./audit-run.server");
    return runAuditImpl("ole-copilot", data.mode);
  });


export const getAuditRunStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { adjustRunCounts, buildIgnoreSets } = await import("./audit/ignore-filter");
  const { resolutionsAsIgnoreEntries } = await import("./audit/resolution-filter");
    const { data: run, error } = await supabaseAdmin
      .from("audit_runs")
      .select("id, status, status_geral, error_message, total_processado, aprovados, reprovados")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) return null;

    const r = run as {
      id: string;
      status: string;
      status_geral: string | null;
      error_message: string | null;
      total_processado: number;
      aprovados: number;
      reprovados: number;
    };

    // Desconta exceções da AUDITORIA (audit_ignores) nos números do toast final.
    const [{ data: ignores }, { data: resolvidos }, { data: findings }] = await Promise.all([
      context.supabase.from("audit_ignores").select("apolice, tipo_erro"),
      context.supabase
        .from("audit_resolutions")
        .select("apolice, tipo_erro, endosso")
        .is("reopened_at", null),
      supabaseAdmin.from("audit_findings").select("apolice, tipo_erro, endosso").eq("run_id", r.id),
    ]);
    const sets = buildIgnoreSets([
      ...((ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>),
      ...resolutionsAsIgnoreEntries(
        (resolvidos ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
      ),
    ]);
    const adj = adjustRunCounts(
      r,
      sets,
      (findings ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
    );

    return { ...r, ...adj };
  });

export const getLatestAudit = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { adjustRunCounts, buildIgnoreSets, filterFindings } = await import("./audit/ignore-filter");
  const { resolutionsAsIgnoreEntries } = await import("./audit/resolution-filter");

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
  const { data: resolvidos } = await context.supabase
    .from("audit_resolutions")
    .select("apolice, tipo_erro, endosso")
    .is("reopened_at", null);
  const sets = buildIgnoreSets([
    ...((ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>),
    ...resolutionsAsIgnoreEntries(
      (resolvidos ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
    ),
  ]);

  const all = (findings ?? []) as Array<{
    apolice: string;
    tipo_erro: string;
    endosso: string | null;
  }>;
  const filtered = filterFindings(sets, all);
  const adj = adjustRunCounts(run, sets, all);

  return {
    run: { ...run, aprovados: adj.aprovados, reprovados: adj.reprovados },
    findings: filtered,
  } as unknown as LatestAudit;
});

export const getAuditHistory = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { adjustRunCounts, buildIgnoreSets } = await import("./audit/ignore-filter");
  const { resolutionsAsIgnoreEntries } = await import("./audit/resolution-filter");

  const { data, error } = await supabaseAdmin
    .from("audit_runs")
    .select("id, created_at, data_auditoria, status_geral, total_processado, aprovados, reprovados, duration_ms, origem")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  const runs = (data ?? []) as AuditHistoryItem[];
  if (runs.length === 0) return runs;

  const { data: ignores } = await context.supabase
    .from("audit_ignores")
    .select("apolice, tipo_erro");
  const { data: resolvidos } = await context.supabase
    .from("audit_resolutions")
    .select("apolice, tipo_erro, endosso")
    .is("reopened_at", null);
  const sets = buildIgnoreSets([
    ...((ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>),
    ...resolutionsAsIgnoreEntries(
      (resolvidos ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
    ),
  ]);
  if (sets.isEmpty) return runs;

  const { data: findings } = await supabaseAdmin
    .from("audit_findings")
    .select("run_id, apolice, tipo_erro, endosso")
    .in("run_id", runs.map((r) => r.id));

  const byRun = new Map<
    string,
    Array<{ apolice: string; tipo_erro: string; endosso: string | null }>
  >();
  for (const f of (findings ?? []) as Array<{
    run_id: string;
    apolice: string;
    tipo_erro: string;
    endosso: string | null;
  }>) {
    const list = byRun.get(f.run_id) ?? [];
    list.push({ apolice: f.apolice, tipo_erro: f.tipo_erro, endosso: f.endosso });
    byRun.set(f.run_id, list);
  }

  return runs.map((r) => ({ ...r, ...adjustRunCounts(r, sets, byRun.get(r.id) ?? []) }));
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

export const getSystemStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { adjustRunCounts, buildIgnoreSets } = await import("./audit/ignore-filter");
  const { resolutionsAsIgnoreEntries } = await import("./audit/resolution-filter");

  const [{ data: lastRun }, { data: lastSync }] = await Promise.all([
    supabaseAdmin
      .from("audit_runs")
      .select("id, status, error_message, created_at, aprovados, reprovados, total_processado")
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
    | {
        id: string;
        status: string;
        error_message: string | null;
        created_at: string;
        aprovados: number | null;
        reprovados: number | null;
        total_processado: number | null;
      }
    | null;
  const sync = lastSync as { status: string; created_at: string } | null;

  // Taxa de aprovação desconta as exceções da AUDITORIA (audit_ignores).
  let aprovadosAjustado = run?.aprovados ?? 0;
  if (run && (run.total_processado ?? 0) > 0) {
    const [{ data: ignores }, { data: resolvidos }, { data: findings }] = await Promise.all([
      context.supabase.from("audit_ignores").select("apolice, tipo_erro"),
      context.supabase
        .from("audit_resolutions")
        .select("apolice, tipo_erro, endosso")
        .is("reopened_at", null),
      supabaseAdmin.from("audit_findings").select("apolice, tipo_erro, endosso").eq("run_id", run.id),
    ]);
    const sets = buildIgnoreSets([
      ...((ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>),
      ...resolutionsAsIgnoreEntries(
        (resolvidos ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
      ),
    ]);
    const adj = adjustRunCounts(
      {
        total_processado: run.total_processado ?? 0,
        aprovados: run.aprovados ?? 0,
        reprovados: run.reprovados ?? 0,
      },
      sets,
      (findings ?? []) as Array<{ apolice: string; tipo_erro: string; endosso: string | null }>,
    );
    aprovadosAjustado = adj.aprovados;
  }

  const approvalRate =
    run && (run.total_processado ?? 0) > 0
      ? (aprovadosAjustado / (run.total_processado as number)) * 100
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
