import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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

/** Um registro de cobrança devolvido pelo MOTOR OLÉ. */
const ItemSchema = z
  .object({
    numero_apolice: z.string().min(6).max(60).optional(),
    documento: z.string().min(6).max(60).optional(),
    numero_documento: z.string().min(6).max(60).optional(),
    numero_endosso: z.union([z.string(), z.number()]).optional(),
    numero_proposta: z.union([z.string(), z.number()]).nullish(),
    status_pagamento: z.string().max(40).nullish(),
    situacao_emissao: z.string().max(40).nullish(),
    data_vencimento: z.string().max(40).nullish(),
    data_quitacao: z.string().max(60).nullish(),
  })
  .passthrough();

const PayloadSchema = z.object({ dados: z.array(ItemSchema).max(20_000) });

/** yyyy-mm-dd a partir de ISO ou dd/mm/yyyy. */
function toDateOnly(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return iso ? iso[1]! : null;
}

function toTimestamp(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = toDateOnly(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(v.trim())) return v.trim();
  return d ? `${d}T00:00:00Z` : null;
}

export const Route = createFileRoute("/api/public/billing-sync-callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const expected = process.env.AUDIT_CALLBACK_SECRET;
        const provided = request.headers.get("x-callback-secret");
        if (!expected || provided !== expected) return json({ error: "Unauthorized" }, 401);

        const runId = new URL(request.url).searchParams.get("run_id");

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        // Aceita array cru, { atualizacoes | dados | cobrancas | items | data: [...] } ou objeto único.
        let candidate: unknown = raw;
        if (Array.isArray(candidate)) {
          candidate = { dados: candidate };
        } else if (candidate && typeof candidate === "object") {
          const obj = { ...(candidate as Record<string, unknown>) };
          const key = [
            "atualizacoes",
            "dados",
            "cobrancas",
            "billing",
            "items",
            "data",
            "results",
          ].find((k) => Array.isArray(obj[k]));
          candidate = key ? { dados: obj[key] } : { dados: [obj] };
        }

        const parsed = PayloadSchema.safeParse(candidate);
        if (!parsed.success) {
          return json({ error: "Payload inválido", issues: parsed.error.issues }, 400);
        }


        type Row = {
          numero_apolice: string;
          numero_endosso: string;
          numero_proposta: string | null;
          status_pagamento: string;
          situacao_emissao: string;
          data_vencimento: string | null;
          data_quitacao: string | null;
          updated_at: string;
        };

        const byKey = new Map<string, Row>();
        for (const item of parsed.data.dados) {
          const docRaw = item.numero_apolice ?? item.documento ?? item.numero_documento;
          if (!docRaw) continue;
          const digits = String(docRaw).replace(/\D/g, "");
          if (digits.length < 12) continue;
          const seq =
            item.numero_endosso != null
              ? String(item.numero_endosso).replace(/\D/g, "").slice(-6).padStart(6, "0")
              : digits.slice(-6);
          // A apólice é sempre gravada com sequencial 000000.
          const apolice = digits.slice(0, -6) + "000000";
          const row: Row = {
            numero_apolice: apolice,
            numero_endosso: seq,
            numero_proposta:
              item.numero_proposta != null ? String(item.numero_proposta).trim() || null : null,
            status_pagamento: (item.status_pagamento ?? "").trim() || "Aberta",
            situacao_emissao: (item.situacao_emissao ?? "").trim() || "Ativa",
            data_vencimento: toDateOnly(item.data_vencimento),
            data_quitacao: toTimestamp(item.data_quitacao),
            updated_at: new Date().toISOString(),
          };
          byKey.set(`${apolice}#${seq}`, row);
        }

        const rows = [...byKey.values()];
        const { markSyncLeg } = await import("@/lib/sync-legs.server");

        if (rows.length === 0) {
          if (runId) await markSyncLeg(runId, "cobrancas", { status: "success", total: 0 });
          return json({ ok: true, upserted: 0 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let upserted = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await supabaseAdmin
            .from("policy_billing")
            .upsert(chunk as never, { onConflict: "numero_apolice,numero_endosso" });
          if (error) {
            console.error("[billing-sync-callback] upsert falhou", error.message);
            if (runId)
              await markSyncLeg(runId, "cobrancas", {
                status: "error",
                total: upserted,
                errorMessage: `Cobranças: ${error.message}`,
              });
            return json({ error: error.message, upserted }, 500);
          }
          upserted += chunk.length;
        }

        if (runId) await markSyncLeg(runId, "cobrancas", { status: "success", total: upserted });

        return json({ ok: true, upserted });
      },
    },
  },
});
