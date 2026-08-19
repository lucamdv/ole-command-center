import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Clock } from "lucide-react";
import { useAutomationSchedule } from "@/hooks/use-automation";
import { formatCountdown, nextRunAt } from "@/lib/automation/next-run";
import type { AutomationJob } from "@/lib/automation.functions";

const LABELS: Record<AutomationJob, string> = {
  audit: "auditoria automática",
  policy_sync: "sincronização automática",
};

export function NextRunCountdown({
  job,
  className = "",
}: {
  job: AutomationJob;
  className?: string;
}) {
  const { schedule } = useAutomationSchedule(job);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const next = useMemo(
    () => (schedule ? nextRunAt(schedule, new Date(now)) : null),
    // recalcula a cada segundo é barato (poucas iterações) e mantém o alvo correto
    [schedule, now],
  );

  if (!schedule) return null;

  if (!schedule.enabled || !next) {
    return (
      <div className={`flex items-center gap-1.5 text-[11.5px] text-muted-foreground ${className}`}>
        <CalendarClock className="h-3.5 w-3.5" />
        <span>Agendamento automático desativado</span>
        <Link
          to="/configuracoes"
          className="text-primary hover:underline font-medium"
        >
          configurar
        </Link>
      </div>
    );
  }

  const targetLabel = next.toLocaleString("pt-BR", {
    timeZone: schedule.timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground ${className}`}>
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span>
        Próxima {LABELS[job]} em{" "}
        <span className="font-mono tabular-nums text-foreground font-semibold">
          {formatCountdown(next.getTime() - now)}
        </span>
      </span>
      <span className="text-muted-foreground/70">· {targetLabel}</span>
    </div>
  );
}
