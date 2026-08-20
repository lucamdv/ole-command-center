import { useEffect, useState } from "react";
import { Clock, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { useAutomationSchedules, useUpdateAutomationSchedule } from "@/hooks/use-automation";
import { formatCountdown, nextRunAt } from "@/lib/automation/next-run";
import type { AutomationJob, AutomationSchedule } from "@/lib/automation.functions";
import { relativeTime } from "@/lib/format";

const JOB_META: Record<AutomationJob, { label: string; desc: string; Icon: typeof Clock }> = {
  audit: {
    label: "Auditoria automática",
    desc: "Dispara o motor de auditoria (n8n) no horário definido.",
    Icon: ShieldCheck,
  },
  policy_sync: {
    label: "Sincronização da carteira",
    desc: "Dispara o MOTOR OLÉ para atualizar apólices e endossos.",
    Icon: RefreshCw,
  },
};

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function AutomacaoTab() {
  const { data, isLoading } = useAutomationSchedules();

  if (isLoading) {
    return <div className="text-[13px] text-muted-foreground">Carregando agendamentos…</div>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {(data ?? []).map((s) => (
        <ScheduleCard key={s.job} schedule={s} />
      ))}
      <p className="text-[11.5px] text-muted-foreground pt-2">
        Os disparos acontecem no servidor, no fuso America/São_Paulo — não é necessário manter a
        plataforma aberta. Você continua podendo rodar manualmente a qualquer momento.
      </p>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: AutomationSchedule }) {
  const meta = JOB_META[schedule.job];
  const mut = useUpdateAutomationSchedule();
  const [time, setTime] = useState(schedule.run_at_time.slice(0, 5));

  useEffect(() => {
    setTime(schedule.run_at_time.slice(0, 5));
  }, [schedule.run_at_time]);

  const next = nextRunAt(schedule);
  const Icon = meta.Icon;

  const toggleWeekday = (d: number) => {
    const wd = schedule.weekdays.includes(d)
      ? schedule.weekdays.filter((x) => x !== d)
      : [...schedule.weekdays, d];
    if (wd.length === 0) return;
    mut.mutate({ job: schedule.job, weekdays: wd });
  };

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <div className="text-[13.5px] font-semibold">{meta.label}</div>
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">{meta.desc}</div>
        </div>
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <span className="text-[11.5px] text-muted-foreground">
            {schedule.enabled ? "Ativo" : "Inativo"}
          </span>
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => mut.mutate({ job: schedule.job, enabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--primary)]"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">Horário do disparo</div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-9 px-2 rounded-md bg-background border border-border text-[13px] font-mono"
            />
            <button
              onClick={() => mut.mutate({ job: schedule.job, run_at_time: time })}
              disabled={mut.isPending || time === schedule.run_at_time.slice(0, 5)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-50 hover:bg-primary/90 transition"
            >
              {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-muted-foreground mb-1">Dias da semana</div>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((l, d) => {
              const on = schedule.weekdays.includes(d);
              return (
                <button
                  key={d}
                  title={WEEKDAY_NAMES[d]}
                  onClick={() => toggleWeekday(d)}
                  className={`h-8 w-8 rounded-md border text-[12px] font-medium transition ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Fuso: <span className="font-mono">{schedule.timezone}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border grid gap-1 text-[11.5px]">
        <div>
          Próximo disparo:{" "}
          {next ? (
            <span className="text-foreground font-medium">
              {next.toLocaleString("pt-BR", {
                timeZone: schedule.timezone,
                dateStyle: "short",
                timeStyle: "short",
              })}{" "}
              <span className="text-muted-foreground font-mono">
                (em {formatCountdown(next.getTime() - Date.now())})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="text-muted-foreground">
          Último disparo automático:{" "}
          {schedule.last_triggered_at ? relativeTime(schedule.last_triggered_at) : "nunca"}
          {schedule.last_status ? ` · ${schedule.last_status}` : ""}
        </div>
        {schedule.last_error && (
          <div className="text-destructive truncate">Erro: {schedule.last_error}</div>
        )}
      </div>
    </div>
  );
}
