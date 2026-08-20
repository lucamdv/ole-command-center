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
        const reqUrl = new URL(request.url);
        const runIdQS = reqUrl.searchParams.get("run_id");
        // Reaproveita AUDIT_CALLBACK_SECRET para não exigir secret novo.
        const expected = process.env.AUDIT_CALLBACK_SECRET;
        const provided = request.headers.get("x-callback-secret");
        console.log(
          `[policy-sync-callback] hit run_id=${runIdQS ?? "(missing)"} secret_present=${!!provided} secret_match=${!!expected && provided === expected}`,
        );
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
          const runIdEarly = runIdQS;
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

        const runId = runIdQS;
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

        const { normalizeEndossoNum } = await import("@/lib/excelsior/translate");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickNum = (o: any): string | undefined => {
          const v =
            o?.numero_apolice_seguradora ?? o?.numero_apolice ?? o?.numeroApolice ?? undefined;
          return v === undefined || v === null ? undefined : String(v);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickEnd = (o: any): string | null => {
          const v =
            o?.numero_endosso_seguradora ?? o?.numero_endosso ?? o?.numeroEndosso ?? null;
          return v === undefined || v === null ? null : String(v);
        };

        type FlatEndo = {
          apolice: string;
          num: string;
          seq: number;
          premio: number;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          proposta: any;
        };

        // `dados` agora é uma lista plana de endossos novos. Mantemos suporte ao
        // formato antigo (apólice com `historico_endossos` aninhado) expandindo-o.
        const flat: FlatEndo[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of payload.dados as Array<Record<string, any>>) {
          const apoliceNum = pickNum(item);
          if (!apoliceNum) continue;

          const historico = Array.isArray(item.historico_endossos)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item.historico_endossos as Array<Record<string, any>>)
            : null;

          if (historico) {
            for (const e of historico) {
              const endRaw = pickEnd(e);
              const num = normalizeEndossoNum(endRaw ?? "0");
              const isBase = num === "000000";
              const proposta = isBase
                ? {
                    ...(e.proposta ?? {}),
                    data_emissao: item.data_emissao ?? e.proposta?.data_emissao,
                  }
                : (e.proposta ?? {});
              flat.push({
                apolice: pickNum(e) ?? apoliceNum,
                num,
                seq: parseInt(num, 10) || 0,
                premio: Number(e.premio_liquido ?? 0) || 0,
                proposta,
              });
            }
            continue;
          }

          const endRaw = pickEnd(item);
          if (endRaw === null) continue;
          const num = normalizeEndossoNum(endRaw);
          flat.push({
            apolice: apoliceNum,
            num,
            seq: parseInt(num, 10) || 0,
            premio: Number(item.premio_liquido ?? 0) || 0,
            proposta: item.proposta ?? {},
          });
        }

        // Agrupa por apólice para resolver o vínculo relacional uma vez só.
        const byPolicy = new Map<string, FlatEndo[]>();
        for (const e of flat) {
          const list = byPolicy.get(e.apolice);
          if (list) list.push(e);
          else byPolicy.set(e.apolice, [e]);
        }

        let processed = 0;
        let insertedEndos = 0;

        for (const [numero, endos] of byPolicy) {
          // Endosso de maior sequencial dita os dados "atuais" da apólice.
          const top = endos.reduce((a, b) => (b.seq >= a.seq ? b : a));

          const { data: existingPolicy } = await supabaseAdmin
            .from("policies")
            .select("id, numero_endosso_atual")
            .eq("numero_apolice", numero)
            .maybeSingle();
          const existingRow = existingPolicy as
            | { id: string; numero_endosso_atual: string | null }
            | null;

          const existingSeq = existingRow?.numero_endosso_atual
            ? parseInt(existingRow.numero_endosso_atual.replace(/\D/g, ""), 10) || 0
            : -1;
          // Nunca rebaixa o endosso atual da apólice.
          const endossoAtualFinal = top.seq >= existingSeq ? top.num : existingRow!.numero_endosso_atual;

          const patch: Record<string, unknown> = {
            numero_apolice: numero,
            numero_endosso_atual: endossoAtualFinal,
            last_sync_run_id: runId,
            updated_at: new Date().toISOString(),
          };
          // Só atualiza conteúdo quando o endosso recebido é o mais novo.
          if (top.seq >= existingSeq) {
            patch.premio_liquido = top.premio;
            patch.proposta = top.proposta ?? {};
          }

          const { data: up, error: upErr } = await supabaseAdmin
            .from("policies")
            .upsert(patch as never, { onConflict: "numero_apolice" })
            .select("id")
            .single();
          if (upErr || !up) {
            console.error("[policy-sync-callback] upsert policy falhou", numero, upErr);
            continue;
          }
          const policyId = (up as { id: string }).id;

          const rows = endos.map((e) => ({
            policy_id: policyId,
            numero_apolice: numero,
            numero_endosso: e.num,
            premio_liquido: e.premio,
            proposta: e.proposta ?? {},
            ordem: e.seq,
          }));
          const { error: endErr } = await supabaseAdmin
            .from("endorsements")
            .upsert(rows as never, { onConflict: "policy_id,numero_endosso" });
          if (endErr) {
            console.error("[policy-sync-callback] upsert endorsements", endErr);
            continue;
          }
          insertedEndos += rows.length;
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
