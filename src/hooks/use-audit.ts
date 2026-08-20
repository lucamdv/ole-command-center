import { useWebhookMode } from "@/hooks/use-webhook-mode";
import { useEffect, useRef, useState } from "react";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAuditHistory,
  getAuditRunStatus,
  getLatestAudit,
  runAudit,
} from "@/lib/audit.functions";

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

/**
 * Dispara a auditoria e faz polling até o callback do n8n preencher o resultado.
 */
export function useRunAudit() {
  const qc = useQueryClient();
  const fireFn = useServerFn(runAudit);
  const { mode } = useWebhookMode();
  const statusFn = useServerFn(getAuditRunStatus);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer ao desmontar
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
      if (!row) {
        // ainda não disponível, segue polling
      } else if (row.status === "success") {
        const reprov = row.reprovados ?? 0;
        const total = row.total_processado ?? 0;
        toast.success("Auditoria concluída", {
          description:
            reprov === 0
              ? `${total} apólices · todas em conformidade.`
              : `${reprov} de ${total} com inconsistências.`,
        });
        qc.invalidateQueries({ queryKey: ["audit"] });
        stopPolling();
        return;
      } else if (row.status === "error") {
        toast.error("Falha na auditoria", {
          description: row.error_message ?? "Erro desconhecido no motor.",
          duration: 30_000,
          style: { whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: "12px" },
        });
        stopPolling();
        return;
      }
    } catch (err) {
      console.error("[poll] erro consultando status:", err);
    }

    // timeout de segurança: 15 min
    if (Date.now() - startedAt > 15 * 60_000) {
      toast.error("Auditoria expirou", {
        description: "Sem resposta do motor após 15 minutos.",
      });
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
      toast.info("Auditoria iniciada", {
        description: "Aguardando retorno do motor n8n…",
      });
      const startedAt = Date.now();
      pollTimer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
    },
    onError: (err: Error) => {
      toast.error("Falha ao disparar auditoria", { description: err.message });
    },
  });

  return {
    ...mutation,
    isRunning: mutation.isPending || isPolling,
    activeRunId,
  };
}
