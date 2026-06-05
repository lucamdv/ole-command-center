import { createFileRoute } from "@tanstack/react-router";
import { runPolicySyncImpl } from "@/lib/policies.functions";

/**
 * Endpoint público chamado pelo pg_cron (e outros agendadores) para
 * disparar a sincronização de carteira.
 *
 * Protegido por shared-secret no header `x-hook-secret` (configure a env
 * `POLICY_SYNC_HOOK_SECRET` no Lovable Cloud). Sem esse header — ou com
 * valor incorreto — o endpoint retorna 401 imediatamente.
 */
export const Route = createFileRoute("/api/public/hooks/policy-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.POLICY_SYNC_HOOK_SECRET;
        if (!expected) {
          return new Response(
            JSON.stringify({ ok: false, error: "POLICY_SYNC_HOOK_SECRET não configurado" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        const provided = request.headers.get("x-hook-secret");
        if (!provided || provided !== expected) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const result = await runPolicySyncImpl();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
