import { createFileRoute } from "@tanstack/react-router";
import { CalendarShell } from "@/components/calendar/CalendarShell";

export const Route = createFileRoute("/_authenticated/ferramentas/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário · OLÉ COPILOT" },
      { name: "description", content: "Calendário inteligente de atividades — planejamento operacional OLÉ." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  return <CalendarShell />;
}
