import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AuditPayload, AuditHistoryItem, LatestAudit } from "./audit/types";

// URL pode ser sobrescrita pelo secret N8N_AUDIT_WEBHOOK_URL em produção.
const DEFAULT_WEBHOOK =
  "https://nuvembot.app.n8n.cloud/webhook-test/c80c897f-9951-43c8-9976-df81c44bce16";

const AuditErrorSchema = z
  .object({
    tipo_erro: z.string(),
    endosso: z.string().optional().nullable(),
    dataInicio: z.string().optional().nullable(),
    dataFim: z.string().optional().nullable(),
  })
  .passthrough();

const PayloadSchema = z.object({
  data_auditoria: z.string(),
  resumo: z.object({
    aprovados: z.number(),
    reprovados: z.number(),
    total_processado: z.number(),
  }),
  status_geral: z.string(),
  mensagem_geral: z.string().optional().default(""),
  apolices_com_erro: z
    .array(
      z.object({
        apolice: z.string(),
        total_erros: z.number().optional().default(0),
        erros: z.array(AuditErrorSchema).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

function parseIso(maybe?: string | null): string | null {
  if (!maybe) return null;
  // n8n às vezes manda "DD/MM/YYYY"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(maybe)) {
    const [d, m, y] = maybe.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(maybe);
  return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

export const runAudit = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.N8N_AUDIT_WEBHOOK_URL || DEFAULT_WEBHOOK;
  const startedAt = Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "ole-copilot", at: new Date().toISOString() }),
      signal: AbortSignal.timeout(240_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    throw new Error(`Não foi possível alcançar o motor de auditoria: ${msg}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404 && url.includes("/webhook-test/")) {
      throw new Error(
        "Webhook n8n (modo teste) não está escutando. No n8n, clique em \"Listen for test event\" e tente novamente, ou ative o workflow e troque a URL para /webhook/.",
      );
    }
    throw new Error(`Motor de auditoria retornou ${res.status}: ${body.slice(0, 200)}`);
  }

  const rawJson = await res.json().catch(() => null);
  // n8n às vezes embrulha resposta em array
  const candidate = Array.isArray(rawJson) ? rawJson[0] : rawJson;
  const parsed = PayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      "Payload do n8n não corresponde ao contrato esperado: " +
        parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  const payload = parsed.data as AuditPayload;
  const durationMs = Date.now() - startedAt;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("audit_runs")
    .insert({
      data_auditoria: payload.data_auditoria,
      status_geral: payload.status_geral,
      mensagem_geral: payload.mensagem_geral,
      total_processado: payload.resumo.total_processado,
      aprovados: payload.resumo.aprovados,
      reprovados: payload.resumo.reprovados,
      duration_ms: durationMs,
      raw: payload as unknown as Record<string, unknown>,
    } as never)
    .select("id")
    .single();

  if (runErr || !runRow) {
    throw new Error("Falha ao persistir auditoria: " + (runErr?.message ?? "sem id"));
  }

  const findings = payload.apolices_com_erro.flatMap((a) =>
    a.erros.map((e) => ({
      run_id: runRow.id,
      apolice: a.apolice,
      tipo_erro: e.tipo_erro,
      endosso: e.endosso ?? null,
      data_inicio: parseIso(e.dataInicio ?? null),
      data_fim: parseIso(e.dataFim ?? null),
      detalhes: e as unknown as Record<string, unknown>,
    })),
  );

  if (findings.length > 0) {
    const { error: findErr } = await supabaseAdmin
      .from("audit_findings")
      .insert(findings as never);
    if (findErr) {
      throw new Error("Auditoria salva, mas falha ao gravar achados: " + findErr.message);
    }
  }

  return {
    runId: runRow.id,
    resumo: payload.resumo,
    status: payload.status_geral,
    mensagem: payload.mensagem_geral,
    findingsCount: findings.length,
    durationMs,
  };
});

export const getLatestAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runs, error: runErr } = await supabaseAdmin
    .from("audit_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (runErr) throw new Error(runErr.message);
  if (!runs || runs.length === 0) return null as LatestAudit | null;

  const run = runs[0];
  const { data: findings, error: findErr } = await supabaseAdmin
    .from("audit_findings")
    .select("*")
    .eq("run_id", run.id)
    .order("apolice", { ascending: true });

  if (findErr) throw new Error(findErr.message);

  return { run, findings: findings ?? [] } as unknown as LatestAudit;
});

export const getAuditHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("audit_runs")
    .select("id, created_at, data_auditoria, status_geral, total_processado, aprovados, reprovados, duration_ms")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditHistoryItem[];
});
