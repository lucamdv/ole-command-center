import { createFileRoute } from "@tanstack/react-router";
import { runPolicySync } from "@/lib/policies.functions";

// Endpoint público chamado pelo pg_cron para sincronizar a carteira periodicamente.
// Sem auth — `/api/public/*` bypassa a auth do Lovable; protegido implicitamente
// porque só dispara um job assíncrono no n8n e não expõe dados.
export const Route = createFileRoute("/api/public/hooks/policy-sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runPolicySync();
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
