import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface AuditIgnoreRow {
  id: string;
  created_by: string | null;
  scope: "apolice" | "apolice_tipo";
  apolice: string;
  tipo_erro: string | null;
  motivo: string | null;
  reason_tag_id: string | null;
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
  motivo: z.string().trim().min(1, "Motivo obrigatório").max(500),
  reason_tag_id: z.string().uuid().optional().nullable(),
});

export const addAuditIgnore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AddSchema>) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    const scope: "apolice" | "apolice_tipo" = data.tipo_erro ? "apolice_tipo" : "apolice";
    const row = {
      created_by: context.userId,
      scope,
      apolice: data.apolice,
      tipo_erro: data.tipo_erro ?? null,
      motivo: data.motivo.trim(),
      reason_tag_id: data.reason_tag_id ?? null,
    };
    // Idempotente em escopo global (apolice, coalesce(tipo_erro,''))
    let q = context.supabase
      .from("audit_ignores")
      .select("id")
      .eq("apolice", data.apolice);
    q = data.tipo_erro ? q.eq("tipo_erro", data.tipo_erro) : q.is("tipo_erro", null);
    const { data: existing, error: selErr } = await q.maybeSingle();
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

const UpdateSchema = z.object({
  id: z.string().uuid(),
  motivo: z.string().trim().min(1, "Motivo obrigatório").max(500),
  reason_tag_id: z.string().uuid().optional().nullable(),
});

export const updateAuditIgnore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof UpdateSchema>) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("audit_ignores")
      .update({
        motivo: data.motivo.trim(),
        reason_tag_id: data.reason_tag_id ?? null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
