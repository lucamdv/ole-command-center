import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ActivityFilters, CalendarActivity } from "./calendar/types";

const FiltersSchema = z
  .object({
    statuses: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    clients: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    search: z.string().max(200).optional(),
  })
  .partial();

const ActivityInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.any().optional(),
  start_at: z.string(),
  end_at: z.string(),
  all_day: z.boolean().optional(),
  status: z.enum(["not_started", "in_progress", "waiting_approval", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().max(120).nullable().optional(),
  project: z.string().max(120).nullable().optional(),
  client: z.string().max(120).nullable().optional(),
  tags: z.array(z.string().max(60)).max(40).optional(),
  color: z.string().max(40).nullable().optional(),
  recurrence_rule: z.string().max(500).nullable().optional(),
  recurrence_until: z.string().nullable().optional(),
  recurrence_count: z.number().int().min(1).max(1000).nullable().optional(),
});

export const listActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ from: z.string(), to: z.string(), filters: FiltersSchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = new Date(data.from);
    const to = new Date(data.to);
    // Fetch user's master rows whose timeframe could intersect, OR recurring rows (no end limit).
    let q = supabase
      .from("calendar_activities")
      .select("*")
      .eq("user_id", userId)
      .order("start_at", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw error;
    const all = (rows ?? []) as CalendarActivity[];
    // Build exception map: child rows with parent_activity_id + series_exception.original_start
    const exceptions = new Map<string, CalendarActivity>();
    for (const r of all) {
      if (r.parent_activity_id && r.series_exception && typeof r.series_exception === "object") {
        const orig = (r.series_exception as { original_start?: string }).original_start;
        if (orig) exceptions.set(`${r.parent_activity_id}|${orig}`, r);
      }
    }
    const { expandActivity } = await import("./calendar/rrule-utils");
    const filters = (data.filters ?? {}) as ActivityFilters;
    const occurrences = [];
    for (const r of all) {
      if (r.parent_activity_id) continue; // exceptions handled inline
      const occ = expandActivity(r, from, to, exceptions);
      for (const o of occ) {
        if (filters.statuses?.length && !filters.statuses.includes(o.status)) continue;
        if (filters.priorities?.length && !filters.priorities.includes(o.priority)) continue;
        if (filters.categories?.length && (!o.category || !filters.categories.includes(o.category))) continue;
        if (filters.projects?.length && (!o.project || !filters.projects.includes(o.project))) continue;
        if (filters.clients?.length && (!o.client || !filters.clients.includes(o.client))) continue;
        if (filters.tags?.length && !filters.tags.some((t) => o.tags.includes(t))) continue;
        if (filters.search && !o.title.toLowerCase().includes(filters.search.toLowerCase())) continue;
        occurrences.push(o);
      }
    }
    return occurrences;
  });

export const getActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("calendar_activities")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const createActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivityInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("calendar_activities")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: ActivityInputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("calendar_activities")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_activities")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const moveActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), start_at: z.string(), end_at: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_activities")
      .update({ start_at: data.start_at, end_at: data.end_at })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============ ATTACHMENTS ============
export const listAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ activityId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("calendar_attachments")
      .select("*")
      .eq("activity_id", data.activityId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const recordAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        activity_id: z.string().uuid(),
        file_path: z.string().nullable().optional(),
        file_name: z.string().min(1).max(300),
        mime_type: z.string().max(120).nullable().optional(),
        size_bytes: z.number().int().min(0).nullable().optional(),
        is_link: z.boolean().optional(),
        external_url: z.string().url().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("calendar_attachments")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const removeAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: rerr } = await context.supabase
      .from("calendar_attachments")
      .select("file_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (rerr) throw rerr;
    if (row?.file_path) {
      await context.supabase.storage.from("calendar-attachments").remove([row.file_path]);
    }
    const { error } = await context.supabase
      .from("calendar_attachments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("calendar-attachments")
      .createSignedUrl(data.path, 3600);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

// ============ REMINDERS ============
export const listReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ activityId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("calendar_reminders")
      .select("*")
      .eq("activity_id", data.activityId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return rows ?? [];
  });

export const upsertReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        activity_id: z.string().uuid(),
        offset_minutes: z.number().int().min(0).max(60 * 24 * 30),
        channels: z.array(z.enum(["in_app", "email"])).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Need activity start_at to compute next_trigger_at
    const { data: act, error: aerr } = await context.supabase
      .from("calendar_activities")
      .select("start_at")
      .eq("id", data.activity_id)
      .eq("user_id", context.userId)
      .single();
    if (aerr) throw aerr;
    const trigger = new Date(new Date(act.start_at).getTime() - data.offset_minutes * 60_000).toISOString();
    const payload = {
      ...data,
      user_id: context.userId,
      next_trigger_at: trigger,
      sent_at: null,
    };
    const q = data.id
      ? context.supabase.from("calendar_reminders").update(payload).eq("id", data.id).eq("user_id", context.userId)
      : context.supabase.from("calendar_reminders").insert(payload);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const removeReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_reminders")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============ SAVED VIEWS ============
export const listSavedViews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calendar_saved_views")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        filters: z.record(z.string(), z.any()),
        view_mode: z.enum(["month", "week", "day", "list"]),
        is_favorite: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const q = data.id
      ? context.supabase.from("calendar_saved_views").update(payload).eq("id", data.id).eq("user_id", context.userId)
      : context.supabase.from("calendar_saved_views").insert(payload);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const deleteView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calendar_saved_views")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============ NOTIFICATIONS ============
export const listCalendarNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calendar_notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const q = context.supabase
      .from("calendar_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    const { error } = await (data.id ? q.eq("id", data.id) : q);
    if (error) throw error;
    return { ok: true };
  });

// ============ METRICS ============
export const getCalendarMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ from: z.string(), to: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("calendar_activities")
      .select("status, start_at, end_at")
      .eq("user_id", context.userId)
      .gte("start_at", data.from)
      .lte("start_at", data.to);
    if (error) throw error;
    const now = new Date();
    const list = (rows ?? []) as { status: string; start_at: string; end_at: string }[];
    const total = list.length;
    const pending = list.filter((r) => r.status === "not_started").length;
    const inProgress = list.filter((r) => r.status === "in_progress").length;
    const done = list.filter((r) => r.status === "done").length;
    const overdue = list.filter(
      (r) => r.status !== "done" && r.status !== "cancelled" && new Date(r.end_at) < now,
    ).length;
    const upcoming = list
      .filter((r) => r.status !== "done" && r.status !== "cancelled" && new Date(r.start_at) >= now)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .slice(0, 5);
    return {
      total,
      pending,
      inProgress,
      done,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      upcoming,
    };
  });
