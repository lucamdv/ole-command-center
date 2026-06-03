import { useEffect, useRef, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getEndorsement,
  getLatestPolicySync,
  getPolicies,
  getPolicyByNumero,
  getPolicySyncStatus,
  runPolicySync,
} from "@/lib/policies.functions";

export const policiesQuery = queryOptions({
  queryKey: ["policies", "list"] as const,
  queryFn: () => getPolicies(),
  staleTime: 30_000,
});

export const latestPolicySyncQuery = queryOptions({
  queryKey: ["policies", "latest-sync"] as const,
  queryFn: () => getLatestPolicySync(),
  staleTime: 30_000,
});

export function usePolicies() {
  return useQuery(policiesQuery);
}

export function useLatestPolicySync() {
  return useQuery(latestPolicySyncQuery);
}

export function usePolicy(numero: string | undefined) {
  return useQuery({
    queryKey: ["policies", "detail", numero] as const,
    queryFn: () => getPolicyByNumero({ data: { numero: numero! } }),
    enabled: !!numero,
    staleTime: 30_000,
  });
}

export function useEndorsementDetail(numero: string | undefined, endosso: string | undefined) {
  return useQuery({
    queryKey: ["policies", "endorsement", numero, endosso] as const,
    queryFn: () =>
      getEndorsement({ data: { numero: numero!, endosso: endosso! } }),
    enabled: !!numero && !!endosso,
    staleTime: 30_000,
  });
}

export function useRunPolicySync() {
  const qc = useQueryClient();
  const fireFn = useServerFn(runPolicySync);
  const statusFn = useServerFn(getPolicySyncStatus);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    setIsPolling(false);
    setActiveRunId(null);
  };

  const pollOnce = async (runId: string, startedAt: number) => {
    try {
      const row = await statusFn({ data: { runId } });
      if (row?.status === "success") {
        toast.success("Carteira sincronizada", {
          description: `${row.total_apolices} apólices atualizadas.`,
        });
        qc.invalidateQueries({ queryKey: ["policies"] });
        stopPolling();
        return;
      }
      if (row?.status === "error") {
        toast.error("Falha na sincronização", {
          description: row.error_message ?? "Erro desconhecido.",
          duration: 30_000,
        });
        stopPolling();
        return;
      }
    } catch (err) {
      console.error("[poll] erro consultando status:", err);
    }
    if (Date.now() - startedAt > 15 * 60_000) {
      toast.error("Sincronização expirou", { description: "Sem resposta após 15 minutos." });
      stopPolling();
      return;
    }
    pollTimer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
  };

  const mutation = useMutation({
    mutationFn: () => fireFn(),
    onSuccess: ({ runId }) => {
      setActiveRunId(runId);
      setIsPolling(true);
      toast.info("Sincronização iniciada", { description: "Aguardando MOTOR OLÉ…" });
      const startedAt = Date.now();
      pollTimer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
    },
    onError: (err: Error) => {
      toast.error("Falha ao disparar sincronização", { description: err.message });
    },
  });

  return { ...mutation, isRunning: mutation.isPending || isPolling, activeRunId };
}
