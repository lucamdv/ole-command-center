import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/assert-admin";
import { resolveWebhookUrl, type WebhookMode } from "@/lib/webhook-mode";

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

export const pingMotorPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { mode?: WebhookMode }) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const raw = process.env.N8N_MOTOR_POLICIES_URL;
    return pingWebhook(raw ? resolveWebhookUrl(raw, data.mode) : raw, "MOTOR OLÉ");
  });

export const pingAuditWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { mode?: WebhookMode }) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const raw = process.env.N8N_AUDIT_WEBHOOK_URL;
    return pingWebhook(raw ? resolveWebhookUrl(raw, data.mode) : raw, "N8N Auditoria");
  });

export interface DataCounters {
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
  const { translateProposta, computePremioTotal } = await import("@/lib/excelsior/translate");
  const { csvDocument, csvNumber, csvDate, csvDateTime } = await import("@/lib/csv");

  const PAGE = 1000;

  type PolicyRow = {
    numero_apolice: string;
    numero_endosso_atual: string | null;
    proposta: Record<string, unknown> | null;
    updated_at: string;
  };

  // Leitura paginada — a API limita o retorno por requisição.
  const rows: PolicyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("policies")
      .select("numero_apolice, numero_endosso_atual, proposta, updated_at")
      .order("numero_apolice", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as PolicyRow[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }

  // Endossos por apólice: quantidade e maior sequencial (= endosso atual real).
  const endorsementCount = new Map<string, number>();
  const lastEndorsement = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("endorsements")
      .select("numero_apolice, numero_endosso")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Array<{ numero_apolice: string; numero_endosso: string }>;
    for (const e of batch) {
      endorsementCount.set(e.numero_apolice, (endorsementCount.get(e.numero_apolice) ?? 0) + 1);
      const prev = lastEndorsement.get(e.numero_apolice);
      if (!prev || e.numero_endosso > prev) lastEndorsement.set(e.numero_apolice, e.numero_endosso);
    }
    if (batch.length < PAGE) break;
  }


  const header = [
    "numero_apolice",
    "endosso_atual",
    "qtd_endossos",
    "segurado",
    "documento_segurado",
    "corretor",
    "grupo_susep",
    "ramo_susep",
    "tipo_apolice",
    "inicio_vigencia",
    "fim_vigencia",
    "data_assinatura",
    "premio_total",
    "moeda",
    "limite_maximo_apolice",
    "moeda_limite",
    "atualizado_em",
  ];

  const out: unknown[][] = [header];
  for (const r of rows) {
    const t = translateProposta(r.proposta ?? {});
    const segurado = t.partes.find((p) => p.papel === "SEGURADO");
    const corretor = t.partes.find((p) => p.papel === "CORRETOR");
    const { valor, moeda } = computePremioTotal(r.proposta ?? {});
    out.push([
      r.numero_apolice,
      lastEndorsement.get(r.numero_apolice) ?? r.numero_endosso_atual ?? "",
      endorsementCount.get(r.numero_apolice) ?? 0,
      segurado?.nome ?? "",
      segurado?.documentos?.[0]?.valor ?? "",
      corretor?.nome ?? "",
      t.dadosGerais.grupoSusep ?? "",
      t.dadosGerais.ramoSusep ?? "",
      t.dadosGerais.tipoApolice ?? "",
      csvDate(t.datas.inicioVigencia),
      csvDate(t.datas.fimVigencia),
      csvDate(t.datas.assinatura),
      csvNumber(valor),
      moeda,
      csvNumber(t.limiteApolice?.valor ?? null),
      t.limiteApolice?.moeda ?? "",
      csvDateTime(r.updated_at),
    ]);
  }

  return { csv: csvDocument(out), count: rows.length };
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
