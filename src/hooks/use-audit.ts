import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAuditHistory, getLatestAudit, runAudit } from "@/lib/audit.functions";

export const latestAuditQuery = queryOptions({
  queryKey: ["audit", "latest"] as const,
  queryFn: () => getLatestAudit(),
  staleTime: 30_000,
});

export const auditHistoryQuery = queryOptions({
  queryKey: ["audit", "history"] as const,
  queryFn: () => getAuditHistory(),
  staleTime: 30_000,
});

export function useLatestAudit() {
  return useQuery(latestAuditQuery);
}

export function useAuditHistory() {
  return useQuery(auditHistoryQuery);
}

export function useRunAudit() {
  const qc = useQueryClient();
  const fn = useServerFn(runAudit);
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: (data) => {
      const reprovados = data.resumo.reprovados;
      if (reprovados === 0) {
        toast.success("Auditoria concluída", {
          description: `${data.resumo.total_processado} apólices · todas em conformidade.`,
        });
      } else {
        toast.warning("Auditoria com alertas", {
          description: `${reprovados} de ${data.resumo.total_processado} apólice(s) com inconsistências.`,
        });
      }
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (err: Error) => {
      toast.error("Falha na auditoria", { description: err.message });
    },
  });
}
