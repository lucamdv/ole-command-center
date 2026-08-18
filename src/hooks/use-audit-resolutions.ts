import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getResolutionTimeStats,
  listAuditResolutions,
  resolveFinding,
  unresolveFinding,
} from "@/lib/audit-resolutions.functions";

export const auditResolutionsQuery = queryOptions({
  queryKey: ["audit-resolutions"] as const,
  queryFn: () => listAuditResolutions(),
  staleTime: 60_000,
});

export const resolutionTimeStatsQuery = queryOptions({
  queryKey: ["audit-resolutions", "time-stats"] as const,
  queryFn: () => getResolutionTimeStats(),
  staleTime: 60_000,
});

export function useAuditResolutions() {
  return useQuery(auditResolutionsQuery);
}

export function useResolutionTimeStats() {
  return useQuery(resolutionTimeStatsQuery);
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["audit-resolutions"] });
  qc.invalidateQueries({ queryKey: ["audit"] });
  qc.invalidateQueries({ queryKey: ["kpis"] });
  qc.invalidateQueries({ queryKey: ["system-status"] });
}

export function useResolveFinding() {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveFinding);
  const undoFn = useServerFn(unresolveFinding);
  return useMutation({
    mutationFn: (input: {
      apolice: string;
      tipo_erro: string;
      endosso?: string | null;
      run_id?: string | null;
      motivo?: string | null;
    }) => resolveFn({ data: input }),
    onSuccess: (res, vars) => {
      invalidateAll(qc);
      toast.success(res.alreadyExists ? "Já estava resolvido" : "Marcado como resolvido", {
        description: `${vars.tipo_erro} em ${vars.apolice}`,
        action: {
          label: "Desfazer",
          onClick: async () => {
            await undoFn({ data: { id: res.id } });
            invalidateAll(qc);
          },
        },
      });
    },
    onError: (err: Error) => {
      toast.error("Falha ao marcar como resolvido", { description: err.message });
    },
  });
}

export function useUnresolveFinding() {
  const qc = useQueryClient();
  const undoFn = useServerFn(unresolveFinding);
  return useMutation({
    mutationFn: (input: { id: string }) => undoFn({ data: input }),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Resolução removida");
    },
    onError: (err: Error) => {
      toast.error("Falha ao remover resolução", { description: err.message });
    },
  });
}
