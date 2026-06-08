import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addAuditIgnore,
  listAuditIgnores,
  removeAuditIgnore,
} from "@/lib/audit-ignores.functions";

export const auditIgnoresQuery = queryOptions({
  queryKey: ["audit-ignores"] as const,
  queryFn: () => listAuditIgnores(),
  staleTime: 60_000,
});

export function useAuditIgnores() {
  return useQuery(auditIgnoresQuery);
}

export function useAddAuditIgnore() {
  const qc = useQueryClient();
  const addFn = useServerFn(addAuditIgnore);
  const removeFn = useServerFn(removeAuditIgnore);
  return useMutation({
    mutationFn: (input: { apolice: string; tipo_erro?: string | null; motivo?: string | null }) =>
      addFn({ data: input }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["audit-ignores"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      const desc = vars.tipo_erro
        ? `${vars.tipo_erro} em ${vars.apolice}`
        : `Apólice ${vars.apolice}`;
      toast.success(res.alreadyExists ? "Já estava ignorado" : "Exceção registrada", {
        description: desc,
        action: {
          label: "Desfazer",
          onClick: async () => {
            await removeFn({ data: { id: res.id } });
            qc.invalidateQueries({ queryKey: ["audit-ignores"] });
            qc.invalidateQueries({ queryKey: ["audit"] });
          },
        },
      });
    },
    onError: (err: Error) => {
      toast.error("Falha ao registrar exceção", { description: err.message });
    },
  });
}

export function useRemoveAuditIgnore() {
  const qc = useQueryClient();
  const removeFn = useServerFn(removeAuditIgnore);
  return useMutation({
    mutationFn: (input: { id: string }) => removeFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-ignores"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success("Exceção removida");
    },
    onError: (err: Error) => {
      toast.error("Falha ao remover exceção", { description: err.message });
    },
  });
}
