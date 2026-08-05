import { createFileRoute } from "@tanstack/react-router";

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

type Row = Record<string, unknown>;

function pick(row: Row, keys: string[]): unknown {
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const real = lower.get(k.toLowerCase());
    if (real !== undefined && row[real] !== undefined && row[real] !== null) return row[real];
  }
  return undefined;
}

function toRows(raw: unknown): Row[] {
  // Aceita: array direto, { payload: [...] }, { data: [...] }, { items: [...] },
  // ou um objeto único.
  if (Array.isArray(raw)) {
    if (raw.length === 1 && raw[0] && typeof raw[0] === "object" && !Array.isArray(raw[0])) {
      const inner = toRowsFromObject(raw[0] as Row);
      if (inner) return inner;
    }
    return raw.filter((r) => r && typeof r === "object") as Row[];
  }
  if (raw && typeof raw === "object") {
    const inner = toRowsFromObject(raw as Row);
    if (inner) return inner;
    return [raw as Row];
  }
  return [];
}

function toRowsFromObject(obj: Row): Row[] | null {
  for (const key of ["payload", "data", "items", "results", "apolices", "policies"]) {
    const v = obj[key];
    if (Array.isArray(v)) return v.filter((r) => r && typeof r === "object") as Row[];
  }
  return null;
}

export const Route = createFileRoute("/api/public/endorsement-extraction-callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const runId = url.searchParams.get("run_id");
        const expected = process.env.ENDORSEMENT_CALLBACK_SECRET;
        const provided = request.headers.get("x-callback-secret");
        if (!expected || provided !== expected) return json({ error: "Unauthorized" }, 401);
        if (!runId) return json({ error: "run_id ausente" }, 400);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: runRow } = await supabaseAdmin
          .from("endorsement_extraction_runs")
          .select("id, created_at")
          .eq("id", runId)
          .maybeSingle();
        if (!runRow) return json({ error: "Execução não encontrada" }, 404);

        const rows = toRows(raw);
        const items = rows
          .map((r) => {
            const policy = pick(r, [
              "PolicyNumber",
              "policy_number",
              "policynumber",
              "NumeroApolice",
              "numero_apolice",
              "apolice",
            ]);
            const last = pick(r, [
              "last_sequencial_endosso_used",
              "lastSequencialEndossoUsed",
              "last_endosso",
              "ultimo_endosso",
              "numero_endosso_atual",
            ]);
            if (policy === undefined) return null;
            const parsed =
              last === undefined || last === "" ? null : Number.parseInt(String(last), 10);
            return {
              run_id: runId,
              policy_number: String(policy).trim(),
              last_sequencial_endosso_used: Number.isFinite(parsed as number)
                ? (parsed as number)
                : null,
            };
          })
          .filter(Boolean) as Array<{
          run_id: string;
          policy_number: string;
          last_sequencial_endosso_used: number | null;
        }>;

        if (items.length === 0) {
          await supabaseAdmin
            .from("endorsement_extraction_runs")
            .update({
              status: "error",
              error_message: "Callback recebido sem apólices válidas.",
              raw: raw as never,
              finished_at: new Date().toISOString(),
            } as never)
            .eq("id", runId);
          return json({ error: "Nenhuma apólice válida no payload" }, 422);
        }

        // Substitui itens anteriores desta execução (idempotente)
        await supabaseAdmin
          .from("endorsement_extraction_items")
          .delete()
          .eq("run_id", runId);

        for (let i = 0; i < items.length; i += 500) {
          const chunk = items.slice(i, i + 500);
          const { error } = await supabaseAdmin
            .from("endorsement_extraction_items")
            .insert(chunk as never);
          if (error) {
            await supabaseAdmin
              .from("endorsement_extraction_runs")
              .update({
                status: "error",
                error_message: error.message,
                finished_at: new Date().toISOString(),
              } as never)
              .eq("id", runId);
            return json({ error: error.message }, 500);
          }
        }

        const startedAt = new Date((runRow as { created_at: string }).created_at).getTime();
        await supabaseAdmin
          .from("endorsement_extraction_runs")
          .update({
            status: "success",
            total_apolices: items.length,
            duration_ms: Date.now() - startedAt,
            raw: raw as never,
            error_message: null,
            finished_at: new Date().toISOString(),
          } as never)
          .eq("id", runId);

        return json({ ok: true, received: items.length });
      },
    },
  },
});
