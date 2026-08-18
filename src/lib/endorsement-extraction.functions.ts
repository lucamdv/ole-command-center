import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/assert-admin";

const LOVABLE_PROJECT_ID = "5db7fa90-1492-4717-b26e-8b99a107e006";
const PREVIEW_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
const PRODUCTION_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}.lovable.app`;

export interface ExtractionItem {
  policy_number: string;
  last_sequencial_endosso_used: number | null;
}

export interface ExtractionRun {
  id: string;
  status: string;
  total_apolices: number;
  duration_ms: number | null;
  error_message: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface EndorsementExceptionRow {
  id: string;
  policy_number: string;
  motivo: string | null;
  reason_tag_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** Dispara o fluxo n8n de extração dos últimos endossos (assíncrono, com callback). */
export const runEndorsementExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const url = process.env.N8N_ENDORSEMENT_WEBHOOK_URL;
    if (!url) {
      throw new Error(
        "Secret N8N_ENDORSEMENT_WEBHOOK_URL não configurada. Cole a URL de produção do webhook n8n (/webhook/...).",
      );
    }
    const secret = process.env.ENDORSEMENT_CALLBACK_SECRET;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Exceções (não enviadas ao n8n para processamento)
    const { data: exc } = await context.supabase
      .from("endorsement_exceptions")
      .select("policy_number");
    const excluded = ((exc ?? []) as Array<{ policy_number: string }>).map(
      (e) => e.policy_number,
    );

    const { data: runRow, error: insErr } = await supabaseAdmin
      .from("endorsement_extraction_runs")
      .insert({ status: "running", total_apolices: 0, raw: {} } as never)
      .select("id")
      .single();
    if (insErr || !runRow) {
      throw new Error("Falha ao criar execução: " + (insErr?.message ?? "sem id"));
    }
    const runId = (runRow as { id: string }).id;

    // Preferimos a origem da requisição atual: garante que o callback aponte
    // para o mesmo build que está rodando (preview ou produção).
    let base =
      process.env.PUBLIC_APP_URL ||
      (process.env.NODE_ENV === "production" ? PRODUCTION_PUBLIC_URL : PREVIEW_PUBLIC_URL);
    if (!process.env.PUBLIC_APP_URL) {
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const origin = new URL(getRequest().url).origin;
        if (/^https:\/\//.test(origin) && !origin.includes("localhost")) base = origin;
      } catch {
        // mantém o fallback
      }
    }
    const callbackUrl = `${base.replace(/\/$/, "")}/api/public/endorsement-extraction-callback?run_id=${runId}`;


    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          callback_url: callbackUrl,
          callback_secret_header: "x-callback-secret",
          // O n8n devolve este valor no header x-callback-secret ao chamar a callback_url.
          callback_secret: secret ?? null,

          trigger: "ole-copilot",
          tool: "extrator-ultimos-endossos",
          mode: "async_callback",
          excluded_policies: excluded,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`n8n respondeu ${res.status}. ${body.slice(0, 300)}`);
      }
    } catch (err) {
      await supabaseAdmin
        .from("endorsement_extraction_runs")
        .update({
          status: "error",
          error_message: err instanceof Error ? err.message : String(err),
          finished_at: new Date().toISOString(),
        } as never)
        .eq("id", runId);
      throw err instanceof Error ? err : new Error(String(err));
    }

    if (!secret) {
      console.warn("[extracao-endossos] ENDORSEMENT_CALLBACK_SECRET não configurado.");
    }

    return { runId, status: "running" as const };
  });

export const getExtractionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run, error } = await supabaseAdmin
      .from("endorsement_extraction_runs")
      .select("id, status, total_apolices, error_message, finished_at, duration_ms, created_at")
      .eq("id", data.runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (run ?? null) as ExtractionRun | null;
  });

/** Última extração concluída, já com as exceções filtradas em runtime. */
export const getLatestExtraction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: runs, error: runErr } = await supabaseAdmin
      .from("endorsement_extraction_runs")
      .select("id, status, total_apolices, duration_ms, error_message, finished_at, created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1);
    if (runErr) throw new Error(runErr.message);
    if (!runs || runs.length === 0) return null;

    const run = runs[0] as unknown as ExtractionRun;
    const { data: items, error: itemErr } = await supabaseAdmin
      .from("endorsement_extraction_items")
      .select("policy_number, last_sequencial_endosso_used")
      .eq("run_id", run.id)
      .order("policy_number", { ascending: true });
    if (itemErr) throw new Error(itemErr.message);

    const { data: exc } = await context.supabase
      .from("endorsement_exceptions")
      .select("policy_number");
    const excluded = new Set(
      ((exc ?? []) as Array<{ policy_number: string }>).map((e) => e.policy_number),
    );

    const all = (items ?? []) as unknown as ExtractionItem[];
    const filtered = all.filter((i) => !excluded.has(i.policy_number));

    return {
      run: { ...run, total_apolices: filtered.length },
      items: filtered,
      hiddenCount: all.length - filtered.length,
    };
  });

export const getExtractionHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("endorsement_extraction_runs")
      .select("id, status, total_apolices, duration_ms, error_message, finished_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ExtractionRun[];
  });

// ---------- Exceções (exclusivas desta ferramenta) ----------

export const listEndorsementExceptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("endorsement_exceptions")
      .select("id, policy_number, motivo, reason_tag_id, created_by, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EndorsementExceptionRow[];
  });

const AddSchema = z.object({
  policy_number: z.string().min(1).max(120),
  motivo: z.string().trim().min(1, "Motivo obrigatório").max(500),
  reason_tag_id: z.string().uuid().optional().nullable(),
});

export const addEndorsementException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AddSchema>) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const policy = data.policy_number.trim();
    const { data: existing, error: selErr } = await context.supabase
      .from("endorsement_exceptions")
      .select("id")
      .eq("policy_number", policy)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (existing) return { id: (existing as { id: string }).id, alreadyExists: true };

    const { data: inserted, error } = await context.supabase
      .from("endorsement_exceptions")
      .insert({
        policy_number: policy,
        motivo: data.motivo.trim(),
        reason_tag_id: data.reason_tag_id ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id, alreadyExists: false };
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  motivo: z.string().trim().min(1, "Motivo obrigatório").max(500),
  reason_tag_id: z.string().uuid().optional().nullable(),
});

export const updateEndorsementException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof UpdateSchema>) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("endorsement_exceptions")
      .update({
        motivo: data.motivo.trim(),
        reason_tag_id: data.reason_tag_id ?? null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeEndorsementException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("endorsement_exceptions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
