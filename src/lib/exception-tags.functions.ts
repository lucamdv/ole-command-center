import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/assert-admin";

export interface ExceptionReasonTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export const listExceptionReasonTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exception_reason_tags")
      .select("id, name, color, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ExceptionReasonTag[];
  });

const AddTagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(HEX, "Cor inválida"),
});

export const addExceptionReasonTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AddTagSchema>) => AddTagSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: inserted, error } = await context.supabase
      .from("exception_reason_tags")
      .insert({ name: data.name, color: data.color, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        throw new Error("Já existe uma tag com esse nome");
      }
      throw new Error(error.message);
    }
    return { id: (inserted as { id: string }).id };
  });

const UpdateTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().regex(HEX, "Cor inválida").optional(),
});

export const updateExceptionReasonTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof UpdateTagSchema>) => UpdateTagSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, string> = {};
    if (data.name) patch.name = data.name;
    if (data.color) patch.color = data.color;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("exception_reason_tags")
      .update(patch as never)
      .eq("id", data.id);
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        throw new Error("Já existe uma tag com esse nome");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeExceptionReasonTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("exception_reason_tags")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
