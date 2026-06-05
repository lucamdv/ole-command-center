import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MEMORY_ID = "00000000-0000-0000-0000-000000000001";

export interface OliverThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const listThreads = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async (): Promise<OliverThread[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("oliver_threads")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OliverThread[];
});

export const createThread = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ title: z.string().max(120).optional() }).parse(input))
  .handler(async ({ data }): Promise<OliverThread> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("oliver_threads")
      .insert({ title: data.title ?? "Nova conversa" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw error;
    return row as OliverThread;
  });

export const renameThread = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("oliver_threads")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Delete messages first, then the thread
    const { error: msgError } = await supabaseAdmin.from("oliver_messages").delete().eq("thread_id", data.id);
    if (msgError) throw msgError;
    const { error } = await supabaseAdmin.from("oliver_threads").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const loadThreadMessages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("oliver_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      role: r.role as string,
      parts: (r.parts ?? []) as Json,
    }));
  });

export const loadMemory = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("oliver_memory")
    .select("content, updated_at")
    .eq("id", MEMORY_ID)
    .maybeSingle();
  if (error) throw error;
  return data ?? { content: "", updated_at: null };
});

export const replaceMemory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ content: z.string().max(200000) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("oliver_memory")
      .upsert({ id: MEMORY_ID, content: data.content });
    if (error) throw error;
    return { ok: true };
  });
