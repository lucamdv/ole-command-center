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

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        // Aceita array cru, { dados | cobrancas | items | data: [...] } ou objeto único.
        let candidate: unknown = raw;
        if (Array.isArray(candidate)) {
          candidate = { dados: candidate };
        } else if (candidate && typeof candidate === "object") {
          const obj = { ...(candidate as Record<string, unknown>) };
          const key = ["dados", "cobrancas", "billing", "items", "data", "results"].find((k) =>
            Array.isArray(obj[k]),
          );
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // O identificador trafegado é o NÚMERO DA PROPOSTA. Resolvemos
        // apólice/endosso a partir dele; se vier apólice explícita, usamos.
        const { data: existing } = await supabaseAdmin
          .from("policy_billing")
          .select("numero_apolice, numero_endosso, numero_proposta");
        const byProposta = new Map<string, { numero_apolice: string; numero_endosso: string }>();
        for (const r of (existing ?? []) as Array<{
          numero_apolice: string;
          numero_endosso: string;
          numero_proposta: string | null;
        }>) {
          const p = (r.numero_proposta ?? "").trim();
          if (p) byProposta.set(p, { numero_apolice: r.numero_apolice, numero_endosso: r.numero_endosso });
        }

        const byKey = new Map<string, Row>();
        const ignorados: string[] = [];
        for (const item of parsed.data.dados) {
          const propostaRaw =
            item.numero_proposta ?? item.documento ?? item.numero_documento ?? null;
          const proposta = propostaRaw != null ? String(propostaRaw).trim() || null : null;

          let apolice: string | null = null;
          let seq: string | null = null;

          const apoliceDigits = item.numero_apolice
            ? String(item.numero_apolice).replace(/\D/g, "")
            : "";
          if (apoliceDigits.length >= 12) {
            apolice = apoliceDigits.slice(0, -6) + "000000";
            seq =
              item.numero_endosso != null
                ? String(item.numero_endosso).replace(/\D/g, "").slice(-6).padStart(6, "0")
                : apoliceDigits.slice(-6);
          } else if (proposta && byProposta.has(proposta)) {
            const hit = byProposta.get(proposta)!;
            apolice = hit.numero_apolice;
            seq = hit.numero_endosso;
          }

          if (!apolice || !seq) {
            if (proposta) ignorados.push(proposta);
            continue;
          }

          const row: Row = {
            numero_apolice: apolice,
            numero_endosso: seq,
            numero_proposta: proposta,
            status_pagamento: (item.status_pagamento ?? "").trim() || "Aberta",
            situacao_emissao: (item.situacao_emissao ?? "").trim() || "Ativa",
            data_vencimento: toDateOnly(item.data_vencimento),
            data_quitacao: toTimestamp(item.data_quitacao),
            updated_at: new Date().toISOString(),
          };
          byKey.set(`${apolice}#${seq}`, row);
        }

        const rows = [...byKey.values()];
        if (rows.length === 0) return json({ ok: true, upserted: 0, ignorados });

        let upserted = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await supabaseAdmin
            .from("policy_billing")
            .upsert(chunk as never, { onConflict: "numero_apolice,numero_endosso" });
          if (error) {
            console.error("[billing-sync-callback] upsert falhou", error.message);
            return json({ error: error.message, upserted }, 500);
          }
          upserted += chunk.length;
        }

        return json({ ok: true, upserted, ignorados });
      },
    },
  },
});
