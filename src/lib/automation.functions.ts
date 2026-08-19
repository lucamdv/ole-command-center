import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/assert-admin";

export type AutomationJob = "audit" | "policy_sync";

export interface AutomationSchedule {
  job: AutomationJob;
  enabled: boolean;
  run_at_time: string; // "HH:MM:SS"
  weekdays: number[];
  timezone: string;
  last_triggered_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export const getAutomationSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AutomationSchedule[]> => {
    const { data, error } = await context.supabase
      .from("automation_schedules")
      .select(
        "job, enabled, run_at_time, weekdays, timezone, last_triggered_at, last_status, last_error",
      )
      .order("job", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AutomationSchedule[];
  });

export const updateAutomationSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      job: AutomationJob;
      enabled?: boolean;
      run_at_time?: string;
      weekdays?: number[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.job !== "audit" && data.job !== "policy_sync") {
      throw new Error("Job inválido");
    }
    const patch: Record<string, unknown> = {};
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (data.run_at_time) {
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(data.run_at_time)) {
        throw new Error("Horário inválido (use HH:MM)");
      }
      patch.run_at_time = data.run_at_time.length === 5 ? `${data.run_at_time}:00` : data.run_at_time;
    }
    if (data.weekdays) {
      const wd = [...new Set(data.weekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
      if (wd.length === 0) throw new Error("Selecione pelo menos um dia da semana");
      patch.weekdays = wd;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("automation_schedules")
      .update(patch as never)
      .eq("job", data.job);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
