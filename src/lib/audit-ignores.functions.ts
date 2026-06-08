import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface AuditIgnoreRow {
  id: string;
  user_id: string;
  scope: "apolice" | "apolice_tipo";
  apolice: string;
  tipo_erro: string | null;
  motivo: string | null;
  created_at: string;
}

export const listAuditIgnores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_ignores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AuditIgnoreRow[];
  });

const AddSchema = z.object({
  apolice: z.string().min(1).max(120),
  tipo_erro: z.string().min(1).max(200).optional().nullable(),
  motivo: z.string().max(500).optional().nullable(),
});

export const addAuditIgnore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AddSchema>) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    const scope: "apolice" | "apolice_tipo" = data.tipo_erro ? "apolice_tipo" : "apolice";
    const row = {
      user_id: context.userId,
      scope,
      apolice: data.apolice,
      tipo_erro: data.tipo_erro ?? null,
      motivo: data.motivo ?? null,
    };
    // Upsert idempotente sobre (user_id, apolice, coalesce(tipo_erro,''))
    const { data: existing, error: selErr } = await context.supabase
      .from("audit_ignores")
      .select("id")
      .eq("apolice", data.apolice)
      .is("tipo_erro", data.tipo_erro ?? null)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (existing) return { id: (existing as { id: string }).id, alreadyExists: true };

    const { data: inserted, error } = await context.supabase
      .from("audit_ignores")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id, alreadyExists: false };
  });

export const removeAuditIgnore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("audit_ignores")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
