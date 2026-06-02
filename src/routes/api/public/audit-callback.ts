import { createFileRoute } from "@tanstack/react-router";
import { CallbackPayloadSchema } from "@/lib/audit.functions";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-callback-secret",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function parseIso(maybe?: string | null): string | null {
  if (!maybe) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(maybe)) {
    const [d, m, y] = maybe.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(maybe);
  return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/audit-callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        // 1. Valida secret
        const expected = process.env.AUDIT_CALLBACK_SECRET;
        const provided = request.headers.get("x-callback-secret");
        if (!expected || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        // 2. Parse body
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const candidate = Array.isArray(raw) ? raw[0] : raw;
        const parsed = CallbackPayloadSchema.safeParse(candidate);
        if (!parsed.success) {
          return json(
            { error: "Payload inválido", issues: parsed.error.issues },
            400,
          );
        }
        const payload = parsed.data;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // 3. Confirma run existente
        const { data: existing, error: fetchErr } = await supabaseAdmin
          .from("audit_runs")
          .select("id, created_at")
          .eq("id", payload.run_id)
          .maybeSingle();

        if (fetchErr) return json({ error: fetchErr.message }, 500);
        if (!existing) return json({ error: "run_id not found" }, 404);

        const startedAt = new Date(
          (existing as { created_at: string }).created_at,
        ).getTime();
        const durationMs = Date.now() - startedAt;

        if (payload.status === "error" || payload.error || payload.error_message) {
          const message = payload.error_message ?? payload.error ?? "Erro desconhecido no motor n8n.";
          const { error: errUpd } = await supabaseAdmin
            .from("audit_runs")
            .update({
              status: "error",
              status_geral: "ERRO",
              error_message: message,
              duration_ms: durationMs,
              raw: payload as unknown as Record<string, unknown>,
            } as never)
            .eq("id", payload.run_id);

          if (errUpd) return json({ error: errUpd.message }, 500);
          return json({ ok: true, run_id: payload.run_id, status: "error", duration_ms: durationMs });
        }

        // 4. Atualiza audit_run
        const { error: updErr } = await supabaseAdmin
          .from("audit_runs")
          .update({
            status: "success",
            data_auditoria: payload.data_auditoria ?? new Date().toISOString(),
            status_geral: payload.status_geral ?? "SUCESSO",
            mensagem_geral: payload.mensagem_geral ?? null,
            total_processado: payload.resumo?.total_processado ?? 0,
            aprovados: payload.resumo?.aprovados ?? 0,
            reprovados: payload.resumo?.reprovados ?? 0,
            duration_ms: durationMs,
            raw: payload as unknown as Record<string, unknown>,
          } as never)
          .eq("id", payload.run_id);

        if (updErr) return json({ error: updErr.message }, 500);

        // 5. Insere findings
        const findings = payload.apolices_com_erro.flatMap((a) =>
          a.erros.map((e) => ({
            run_id: payload.run_id,
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
          if (findErr) return json({ error: findErr.message }, 500);
        }

        return json({
          ok: true,
          run_id: payload.run_id,
          findings: findings.length,
          duration_ms: durationMs,
        });
      },
    },
  },
});
