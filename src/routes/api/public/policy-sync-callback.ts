import { createFileRoute } from "@tanstack/react-router";
import { PolicySyncCallbackSchema } from "@/lib/policies.functions";

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

export const Route = createFileRoute("/api/public/policy-sync-callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        // Reaproveita AUDIT_CALLBACK_SECRET para não exigir secret novo.
        const expected = process.env.AUDIT_CALLBACK_SECRET;
        const provided = request.headers.get("x-callback-secret");
        if (!expected || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const root = Array.isArray(raw) ? raw[0] : raw;
        // Desembrulha possível wrapper { payload: {...} }
        const candidate =
          root &&
          typeof root === "object" &&
          "payload" in (root as Record<string, unknown>) &&
          (root as Record<string, unknown>).payload &&
          typeof (root as Record<string, unknown>).payload === "object"
            ? (root as { payload: Record<string, unknown> }).payload
            : root;

        const parsed = PolicySyncCallbackSchema.safeParse(candidate);
        if (!parsed.success) {
          return json({ error: "Payload inválido", issues: parsed.error.issues }, 400);
        }
        const payload = parsed.data;

        const url = new URL(request.url);
        const runId = url.searchParams.get("run_id");
        if (!runId) {
          return json({ error: "run_id ausente na query string do callback_url" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing, error: fetchErr } = await supabaseAdmin
          .from("policy_sync_runs")
          .select("id, created_at")
          .eq("id", runId)
          .maybeSingle();
        if (fetchErr) return json({ error: fetchErr.message }, 500);
        if (!existing) return json({ error: "run_id not found" }, 404);

        const startedAt = new Date((existing as { created_at: string }).created_at).getTime();
        const durationMs = Date.now() - startedAt;

        // Persiste cada apólice + endossos (idempotente)
        let processed = 0;
        for (const apolice of payload.dados) {
          const numero = apolice.numero_apolice_seguradora;
          if (!numero) continue;

          // upsert policy
          const { data: up, error: upErr } = await supabaseAdmin
            .from("policies")
            .upsert(
              {
                numero_apolice: numero,
                numero_endosso_atual: apolice.numero_endosso_seguradora ?? null,
                premio_liquido: apolice.premio_liquido ?? 0,
                proposta: apolice.proposta ?? {},
                last_sync_run_id: runId,
                updated_at: new Date().toISOString(),
              } as never,
              { onConflict: "numero_apolice" },
            )
            .select("id")
            .single();
          if (upErr || !up) {
            console.error("[policy-sync-callback] upsert policy falhou", numero, upErr);
            continue;
          }
          const policyId = (up as { id: string }).id;

          // Replace endorsements
          await supabaseAdmin.from("endorsements").delete().eq("policy_id", policyId);
          const endos = (apolice.historico_endossos ?? []).map((e, idx) => ({
            policy_id: policyId,
            numero_apolice: e.numero_apolice_seguradora ?? numero,
            numero_endosso: e.numero_endosso_seguradora ?? String(idx),
            premio_liquido: e.premio_liquido ?? 0,
            proposta: e.proposta ?? {},
            ordem: idx,
          }));
          if (endos.length > 0) {
            const { error: endErr } = await supabaseAdmin
              .from("endorsements")
              .insert(endos as never);
            if (endErr) console.error("[policy-sync-callback] insert endorsements", endErr);
          }
          processed++;
        }

        const { error: updErr } = await supabaseAdmin
          .from("policy_sync_runs")
          .update({
            status: "success",
            total_apolices: processed,
            duration_ms: durationMs,
            finished_at: new Date().toISOString(),
            raw: payload as unknown as Record<string, unknown>,
          } as never)
          .eq("id", runId);
        if (updErr) return json({ error: updErr.message }, 500);

        return json({ ok: true, run_id: runId, processed, duration_ms: durationMs });
      },
    },
  },
});
