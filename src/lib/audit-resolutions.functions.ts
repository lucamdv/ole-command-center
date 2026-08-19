import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ResolutionTimeSummary } from "@/lib/audit/resolution-filter";

export interface AuditResolutionRow {
  id: string;
  apolice: string;
  tipo_erro: string;
  endosso: string | null;
  run_id: string | null;
  first_seen_at: string | null;
  resolved_at: string;
  resolved_by: string | null;
  motivo: string | null;
  reopened_at: string | null;
  origem: string | null;
  created_at: string;
}

export const listAuditResolutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_resolutions")
      .select("*")
      .order("resolved_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AuditResolutionRow[];
  });

const ResolveSchema = z.object({
  apolice: z.string().min(1).max(120),
  tipo_erro: z.string().min(1).max(200),
  endosso: z.string().max(120).optional().nullable(),
  run_id: z.string().uuid().optional().nullable(),
  motivo: z.string().max(500).optional().nullable(),
});

export const resolveFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ResolveSchema>) => ResolveSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Já resolvido e ainda não reaberto?
    let existingQuery = context.supabase
      .from("audit_resolutions")
      .select("id")
      .eq("apolice", data.apolice)
      .eq("tipo_erro", data.tipo_erro)
      .is("reopened_at", null);
    existingQuery = data.endosso
      ? existingQuery.eq("endosso", data.endosso)
      : existingQuery.is("endosso", null);
    const { data: existing, error: selErr } = await existingQuery.maybeSingle();

    if (selErr) throw new Error(selErr.message);
    if (existing) return { id: (existing as { id: string }).id, alreadyExists: true };

    // Primeira detecção do problema em qualquer auditoria.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let firstQuery = supabaseAdmin
      .from("audit_findings")
      .select("created_at")
      .eq("apolice", data.apolice)
      .eq("tipo_erro", data.tipo_erro);
    firstQuery = data.endosso
      ? firstQuery.eq("endosso", data.endosso)
      : firstQuery.is("endosso", null);
    const { data: first } = await firstQuery
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const firstSeenAt = (first as { created_at: string } | null)?.created_at ?? null;

    const { data: inserted, error } = await context.supabase
      .from("audit_resolutions")
      .insert({
        apolice: data.apolice,
        tipo_erro: data.tipo_erro,
        endosso: data.endosso ?? null,
        run_id: data.run_id ?? null,
        first_seen_at: firstSeenAt,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
        origem: "manual",
        motivo: data.motivo?.trim() ? data.motivo.trim() : null,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id, alreadyExists: false };
  });

export const unresolveFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("audit_resolutions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getResolutionTimeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResolutionTimeSummary> => {
    const { deriveResolutionTimes } = await import("@/lib/audit/resolution-filter");
    const { data, error } = await context.supabase
      .from("audit_resolutions")
      .select("apolice, tipo_erro, first_seen_at, resolved_at, reopened_at, origem")
      .order("resolved_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return deriveResolutionTimes(
      (data ?? []) as Array<{
        apolice: string;
        tipo_erro: string;
        first_seen_at: string | null;
        resolved_at: string;
        reopened_at: string | null;
        origem: string | null;
      }>,
    );
  });
