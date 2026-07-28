import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint de cron para disparo de lembretes do calendário.
 * Protegido por shared-secret privado no header `x-hook-secret`
 * (env `CALENDAR_REMINDERS_HOOK_SECRET`).
 */
export const Route = createFileRoute("/api/public/calendar-reminders-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CALENDAR_REMINDERS_HOOK_SECRET;
        if (!expected) return new Response("Not configured", { status: 500 });
        const provided = request.headers.get("x-hook-secret");
        if (!provided || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const nowIso = new Date().toISOString();
          const { data: due, error } = await supabaseAdmin
            .from("calendar_reminders")
            .select("id, user_id, activity_id, offset_minutes, channels, calendar_activities(title, start_at, end_at)")
            .lte("next_trigger_at", nowIso)
            .is("sent_at", null)
            .limit(100);
          if (error) throw error;
          let processed = 0;
          for (const r of (due ?? []) as any[]) {
            const act = r.calendar_activities;
            if (!act) continue;
            const minutesText =
              r.offset_minutes === 0
                ? "agora"
                : r.offset_minutes < 60
                  ? `em ${r.offset_minutes} min`
                  : r.offset_minutes < 1440
                    ? `em ${Math.round(r.offset_minutes / 60)}h`
                    : `em ${Math.round(r.offset_minutes / 1440)} dia(s)`;
            const title = `Lembrete: ${act.title}`;
            const body = `Sua atividade começa ${minutesText} (${new Date(act.start_at).toLocaleString("pt-BR")}).`;
            if (r.channels?.includes("in_app")) {
              await supabaseAdmin.from("calendar_notifications").insert({
                user_id: r.user_id,
                activity_id: r.activity_id,
                title,
                body,
                kind: "reminder",
              });
            }
            // e-mail channel: best-effort; requires email infra (skipped if not configured)
            await supabaseAdmin.from("calendar_reminders").update({ sent_at: nowIso }).eq("id", r.id);
            processed++;
          }
          return Response.json({ ok: true, processed });
        } catch (e) {
          console.error("[calendar-reminders-tick]", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
