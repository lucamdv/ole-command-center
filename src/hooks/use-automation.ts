import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAutomationSchedules,
  updateAutomationSchedule,
  type AutomationJob,
  type AutomationSchedule,
} from "@/lib/automation.functions";

export function useAutomationSchedules() {
  const fetchFn = useServerFn(getAutomationSchedules);
  return useQuery({
    queryKey: ["automation-schedules"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useAutomationSchedule(job: AutomationJob) {
  const { data, ...rest } = useAutomationSchedules();
  const schedule: AutomationSchedule | undefined = (data ?? []).find((s) => s.job === job);
  return { schedule, ...rest };
}

export function useUpdateAutomationSchedule() {
  const qc = useQueryClient();
  const fn = useServerFn(updateAutomationSchedule);
  return useMutation({
    mutationFn: (input: {
      job: AutomationJob;
      enabled?: boolean;
      run_at_time?: string;
      weekdays?: number[];
    }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-schedules"] });
      toast.success("Agendamento atualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar agendamento"),
  });
}
