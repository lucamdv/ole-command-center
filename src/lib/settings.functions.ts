import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/assert-admin";

export interface IntegrationStatus {
  id: "motor_policies" | "n8n_audit" | "audit_callback";
  label: string;
  configured: boolean;
  lastStatus: string | null;
  lastAt: string | null;
  lastDetail: string | null;
  publicCallback?: string;
}

export const getIntegrationsStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(
  async ({ context }): Promise<IntegrationStatus[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: lastSync }, { data: lastAudit }] = await Promise.all([
      supabaseAdmin
        .from("policy_sync_runs")
        .select("status, total_apolices, error_message, created_at, finished_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("audit_runs")
        .select("status, total_processado, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const sync = lastSync as {
      status: string;
      total_apolices: number | null;
      error_message: string | null;
      created_at: string;
      finished_at: string | null;
    } | null;
    const audit = lastAudit as {
      status: string;
      total_processado: number | null;
      error_message: string | null;
      created_at: string;
    } | null;

    const { getRequestHost, getRequestHeader } = await import("@tanstack/react-start/server");
    const host = getRequestHost();
    const proto = getRequestHeader("x-forwarded-proto") || "https";
    const base = process.env.PUBLIC_APP_URL || `${proto}://${host}`;

    return [
      {
        id: "motor_policies",
        label: "MOTOR OLÉ — Sincronização da Carteira",
        configured: !!process.env.N8N_MOTOR_POLICIES_URL,
        lastStatus: sync?.status ?? null,
        lastAt: sync?.finished_at ?? sync?.created_at ?? null,
        lastDetail:
          sync?.status === "error"
            ? sync?.error_message
            : sync
              ? `${sync.total_apolices ?? 0} apólices`
              : null,
      },
      {
        id: "n8n_audit",
        label: "N8N — Motor de Auditoria",
        configured: !!process.env.N8N_AUDIT_WEBHOOK_URL,
        lastStatus: audit?.status ?? null,
        lastAt: audit?.created_at ?? null,
        lastDetail:
          audit?.status === "error"
            ? audit?.error_message
            : audit
              ? `${audit.total_processado ?? 0} processadas`
              : null,
      },
      {
        id: "audit_callback",
        label: "Callback de Auditoria (n8n → OLÉ)",
        configured: !!process.env.AUDIT_CALLBACK_SECRET,
        lastStatus: null,
        lastAt: null,
        lastDetail: process.env.AUDIT_CALLBACK_SECRET
          ? "Secret configurado"
          : "Secret AUDIT_CALLBACK_SECRET ausente",
        publicCallback: `${base.replace(/\/$/, "")}/api/public/audit-callback`,
      },
    ];
  },
);

async function pingWebhook(url: string | undefined, label: string) {
  if (!url) return { ok: false, status: 0, message: `${label}: secret não configurada` };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ping: true, source: "ole-config-test", at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8_000),
    });
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok
        ? `${label}: HTTP ${res.status} — webhook respondeu`
        : `${label}: HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `${label}: ${err instanceof Error ? err.message : "falha de rede"}`,
    };
  }
}

export const pingMotorPolicies = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  return pingWebhook(process.env.N8N_MOTOR_POLICIES_URL, "MOTOR OLÉ");
});

export const pingAuditWebhook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  return pingWebhook(process.env.N8N_AUDIT_WEBHOOK_URL, "N8N Auditoria");
});

export interface DataCounters {
  oliver_threads: number;
  oliver_messages: number;
  audit_runs: number;
  audit_findings: number;
  policies: number;
  endorsements: number;
}

export const getDataCounters = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(
  async ({ context }): Promise<DataCounters> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = [
      "oliver_threads",
      "oliver_messages",
      "audit_runs",
      "audit_findings",
      "policies",
      "endorsements",
    ] as const;
    const entries = await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabaseAdmin.from(t).select("id", { count: "exact", head: true });
        return [t, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(entries) as unknown as DataCounters;
  },
);

export const purgeOliver = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // messages cascade if FK; explicitly delete to be safe
  await supabaseAdmin.from("oliver_messages").delete().not("id", "is", null);
  await supabaseAdmin.from("oliver_threads").delete().not("id", "is", null);
  return { ok: true };
});

export const purgeOldAudits = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data.days ?? 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    // FK on audit_findings cascades on audit_runs delete
    const { error, count } = await supabaseAdmin
      .from("audit_runs")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) throw new Error(error.message);
    return { ok: true, removed: count ?? 0, cutoff };
  });

export const exportPoliciesCSV = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { findSeguradoNome, computePremioLiquido } = await import("@/lib/excelsior/translate");
  const { data, error } = await supabaseAdmin
    .from("policies")
    .select("numero_apolice, numero_endosso_atual, premio_liquido, proposta, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    numero_apolice: string;
    numero_endosso_atual: string | null;
    premio_liquido: number | string | null;
    proposta: Record<string, unknown> | null;
    updated_at: string;
  }>;
  const header = [
    "numero_apolice",
    "numero_endosso_atual",
    "segurado",
    "premio_liquido",
    "moeda",
    "updated_at",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    const { valor, moeda } = computePremioLiquido(r.proposta ?? {});
    lines.push(
      [
        r.numero_apolice,
        r.numero_endosso_atual ?? "",
        findSeguradoNome(r.proposta ?? {}) ?? "",
        valor,
        moeda,
        r.updated_at,
      ]
        .map(esc)
        .join(","),
    );
  }
  return { csv: lines.join("\n"), count: rows.length };
});

export const exportLatestAuditJSON = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: runs } = await supabaseAdmin
    .from("audit_runs")
    .select("*")
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);
  const run = (runs ?? [])[0] as { id: string } | undefined;
  if (!run) return { json: null as string | null };
  const { data: findings } = await supabaseAdmin
    .from("audit_findings")
    .select("*")
    .eq("run_id", run.id);
  return { json: JSON.stringify({ run, findings: findings ?? [] }, null, 2) };
});
