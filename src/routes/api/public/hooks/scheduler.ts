import { createFileRoute } from "@tanstack/react-router";
import { runPolicySyncImpl } from "@/lib/policies.functions";
import { runAuditImpl } from "@/lib/audit-run.server";
import { zonedParts, zonedTimeToUtc } from "@/lib/automation/next-run";

/**
 * Agendador chamado pelo pg_cron a cada 5 minutos.
 * Protegido pelo shared-secret `x-hook-secret` (POLICY_SYNC_HOOK_SECRET).
 *
 * Para cada job habilitado: se o horário local do dia já passou e ainda não
 * houve disparo automático no dia local corrente, dispara. O update
 * condicional de last_triggered_at serve como trava (single-flight).
 */
interface ScheduleRow {
  job: string;
  enabled: boolean;
  run_at_time: string;
  weekdays: number[];
  timezone: string;
  last_triggered_at: string | null;
}

export const Route = createFileRoute("/api/public/hooks/scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.POLICY_SYNC_HOOK_SECRET;
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          });

        if (!expected) return json({ ok: false, error: "POLICY_SYNC_HOOK_SECRET não configurado" }, 500);
        if (request.headers.get("x-hook-secret") !== expected) {
          return json({ ok: false, error: "unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("automation_schedules")
          .select("job, enabled, run_at_time, weekdays, timezone, last_triggered_at");
        if (error) return json({ ok: false, error: error.message }, 500);

        const now = new Date();
        const results: Array<{ job: string; fired: boolean; reason?: string; error?: string }> = [];

        for (const row of (data ?? []) as unknown as ScheduleRow[]) {
          if (row.job !== "audit" && row.job !== "policy_sync") continue;
          if (!row.enabled) {
            results.push({ job: row.job, fired: false, reason: "disabled" });
            continue;
          }
          const tz = row.timezone || "America/Sao_Paulo";
          const cur = zonedParts(now, tz);
          if (!(row.weekdays ?? []).includes(cur.weekday)) {
            results.push({ job: row.job, fired: false, reason: "weekday" });
            continue;
          }
          const target = zonedTimeToUtc(cur.dateKey, row.run_at_time, tz);
          if (now.getTime() < target.getTime()) {
            results.push({ job: row.job, fired: false, reason: "not_due" });
            continue;
          }
          // Já disparou hoje (no fuso local)?
          if (row.last_triggered_at) {
            const lastKey = zonedParts(new Date(row.last_triggered_at), tz).dateKey;
            if (lastKey === cur.dateKey) {
              results.push({ job: row.job, fired: false, reason: "already_today" });
              continue;
            }
          }

          // Trava: só um request consegue mudar last_triggered_at deste ciclo.
          const lockQuery = supabaseAdmin
            .from("automation_schedules")
            .update({ last_triggered_at: now.toISOString(), last_status: "running", last_error: null } as never)
            .eq("job", row.job);
          const { data: locked, error: lockErr } = await (row.last_triggered_at
            ? lockQuery.eq("last_triggered_at", row.last_triggered_at)
            : lockQuery.is("last_triggered_at", null)
          ).select("job");

          if (lockErr) {
            results.push({ job: row.job, fired: false, error: lockErr.message });
            continue;
          }
          if (!locked || locked.length === 0) {
            results.push({ job: row.job, fired: false, reason: "locked" });
            continue;
          }

          try {
            if (row.job === "audit") await runAuditImpl("scheduler");
            else await runPolicySyncImpl();
            await supabaseAdmin
              .from("automation_schedules")
              .update({ last_status: "success" } as never)
              .eq("job", row.job);
            results.push({ job: row.job, fired: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await supabaseAdmin
              .from("automation_schedules")
              .update({ last_status: "error", last_error: msg } as never)
              .eq("job", row.job);
            results.push({ job: row.job, fired: false, error: msg });
          }
        }

        return json({ ok: true, at: now.toISOString(), results });
      },
    },
  },
});
