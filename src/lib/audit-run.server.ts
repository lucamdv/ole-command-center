import { resolveWebhookUrl, type WebhookMode } from "@/lib/webhook-mode";

// Implementação server-only do disparo da auditoria.
// Usada tanto pela server function protegida (botão manual) quanto pelo
// agendador público /api/public/hooks/scheduler.

const EMPTY_SUMMARY = {
  aprovados: 0,
  reprovados: 0,
  total_processado: 0,
};

const LOVABLE_PROJECT_ID = "5db7fa90-1492-4717-b26e-8b99a107e006";
const PREVIEW_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
const PRODUCTION_PUBLIC_URL = `https://project--${LOVABLE_PROJECT_ID}.lovable.app`;

export async function runAuditImpl(
  trigger = "ole-copilot",
  webhookMode?: WebhookMode | null,
) {
  const rawUrl = process.env.N8N_AUDIT_WEBHOOK_URL;
  const url = rawUrl ? resolveWebhookUrl(rawUrl, webhookMode) : rawUrl;
  if (!url) {
    throw new Error(
      "Secret N8N_AUDIT_WEBHOOK_URL não configurada. Cole a URL de produção do webhook n8n (/webhook/...) nos secrets do projeto.",
    );
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runRow, error: insertErr } = await supabaseAdmin
    .from("audit_runs")
    .insert({
      status: "running",
      status_geral: "PROCESSANDO",
      total_processado: 0,
      aprovados: 0,
      reprovados: 0,
      origem: trigger === "scheduler" ? "auto" : "manual",
      raw: {},
    } as never)
    .select("id")
    .single();

  if (insertErr || !runRow) {
    throw new Error("Falha ao criar run: " + (insertErr?.message ?? "sem id"));
  }

  const runId = (runRow as { id: string }).id;

  // Callback SEMPRE no domínio estável do Lovable — a preview da sandbox
  // responde 302 para POSTs externos e o callback do n8n se perderia.
  const base =
    process.env.PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_PUBLIC_URL : PREVIEW_PUBLIC_URL);
  const callbackUrl = `${base.replace(/\/$/, "")}/api/public/audit-callback?run_id=${runId}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        callback_url: callbackUrl,
        trigger,
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
}
