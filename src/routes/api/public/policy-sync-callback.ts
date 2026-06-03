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
        // Normaliza várias formas possíveis vindas do n8n:
        // 1) array cru no topo → trata como `dados`
        // 2) { payload: {...} } ou { body: {...} } → desembrulha
        // 3) { dados | apolices | policies | items | data: [...] } → renomeia para `dados`
        // 4) objeto único de apólice → embrulha em array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unwrap = (v: any): any => {
          if (!v || typeof v !== "object" || Array.isArray(v)) return v;
          if (v.payload && typeof v.payload === "object") return unwrap(v.payload);
          if (v.body && typeof v.body === "object") return unwrap(v.body);
          if (v.json && typeof v.json === "object") return unwrap(v.json);
          return v;
        };
        let candidate: unknown = unwrap(raw);
        if (Array.isArray(candidate)) {
          candidate = { dados: candidate };
        } else if (candidate && typeof candidate === "object") {
          const obj = candidate as Record<string, unknown>;
          if (!Array.isArray(obj.dados)) {
            const altKey = ["apolices", "policies", "items", "data", "results"].find(
              (k) => Array.isArray(obj[k]),
            );
            if (altKey) {
              obj.dados = obj[altKey];
            } else if (obj.numero_apolice_seguradora || obj.historico_endossos) {
              // Único objeto-apólice; embrulha em array
              candidate = { dados: [obj] };
            }
          }
        }

        const parsed = PolicySyncCallbackSchema.safeParse(candidate);
        if (!parsed.success) {
          // Persiste o raw para debug antes de falhar
          const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
          const urlEarly = new URL(request.url);
          const runIdEarly = urlEarly.searchParams.get("run_id");
          if (runIdEarly) {
            await sa
              .from("policy_sync_runs")
              .update({
                status: "error",
                error_message:
                  "Payload inválido: " + JSON.stringify(parsed.error.issues).slice(0, 500),
                raw: (raw ?? {}) as unknown as Record<string, unknown>,
                finished_at: new Date().toISOString(),
              } as never)
              .eq("id", runIdEarly);
          }
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

        // Persiste cada apólice + endossos (idempotente).
        // Aceita tanto "*_seguradora" quanto os nomes enviados pelo MOTOR OLÉ atual.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickNum = (o: any): string | undefined =>
          o?.numero_apolice_seguradora ?? o?.numero_apolice ?? o?.numeroApolice ?? undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickEnd = (o: any): string | null =>
          o?.numero_endosso_seguradora ?? o?.numero_endosso ?? o?.numeroEndosso ?? null;

        let processed = 0;
        for (const apolice of payload.dados as Array<Record<string, any>>) {
          const numero = pickNum(apolice);
          if (!numero) continue;

          const { data: up, error: upErr } = await supabaseAdmin
            .from("policies")
            .upsert(
              {
                numero_apolice: numero,
                numero_endosso_atual: pickEnd(apolice),
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

          await supabaseAdmin.from("endorsements").delete().eq("policy_id", policyId);
          const endos = (apolice.historico_endossos ?? []).map((e, idx) => ({
            policy_id: policyId,
            numero_apolice: pickNum(e) ?? numero,
            numero_endosso: pickEnd(e) ?? String(idx),
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
