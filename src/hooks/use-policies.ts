import { useWebhookMode } from "@/hooks/use-webhook-mode";
import { useEffect, useRef, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  cancelPolicySync,
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

export type LegStatus = "running" | "success" | "error" | "cancelled";

export function useRunPolicySync() {
  const qc = useQueryClient();
  const fireFn = useServerFn(runPolicySync);
  const { mode } = useWebhookMode();
  const statusFn = useServerFn(getPolicySyncStatus);
  const cancelFn = useServerFn(cancelPolicySync);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [emissoes, setEmissoes] = useState<LegStatus | null>(null);
  const [cobrancas, setCobrancas] = useState<LegStatus | null>(null);
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
      if (row) {
        setEmissoes((row.emissoes_status ?? "running") as LegStatus);
        setCobrancas((row.cobrancas_status ?? "running") as LegStatus);
      }
      if (row?.status === "cancelled") {
        stopPolling();
        return;
      }
      if (row?.status === "success") {
        toast.success("Carteira sincronizada", {
          description: `${row.total_apolices} apólices atualizadas · ${row.cobrancas_total ?? 0} cobranças.`,
        });
        qc.invalidateQueries({ queryKey: ["policies"] });
        qc.invalidateQueries({ queryKey: ["billing"] });
        stopPolling();
        return;
      }
      if (row?.status === "error") {
        toast.error("Falha na sincronização", {
          description: row.error_message ?? "Erro desconhecido.",
          duration: 30_000,
        });
        qc.invalidateQueries({ queryKey: ["policies"] });
        qc.invalidateQueries({ queryKey: ["billing"] });
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
    mutationFn: () => fireFn({ data: { mode } }),
    onSuccess: ({ runId }) => {
      setActiveRunId(runId);
      setIsPolling(true);
      setEmissoes("running");
      setCobrancas("running");
      toast.info("Sincronização iniciada", { description: "Aguardando MOTOR OLÉ…" });
      const startedAt = Date.now();
      pollTimer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
    },
    onError: (err: Error) => {
      toast.error("Falha ao disparar sincronização", { description: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!activeRunId) return { ok: true };
      return cancelFn({ data: { runId: activeRunId } });
    },
    onSuccess: () => {
      setEmissoes("cancelled");
      setCobrancas("cancelled");
      stopPolling();
      toast.warning("Sincronização cancelada");
    },
    onError: (err: Error) => {
      toast.error("Não foi possível cancelar", { description: err.message });
    },
  });

  return {
    ...mutation,
    isRunning: mutation.isPending || isPolling,
    activeRunId,
    emissoes,
    cobrancas,
    cancel: () => cancelMutation.mutate(),
    isCancelling: cancelMutation.isPending,
  };
}
