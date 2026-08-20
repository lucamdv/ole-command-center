import { useWebhookMode } from "@/hooks/use-webhook-mode";
import { useEffect, useRef, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addEndorsementException,
  getExtractionStatus,
  getLatestExtraction,
  listEndorsementExceptions,
  removeEndorsementException,
  runEndorsementExtraction,
  updateEndorsementException,
} from "@/lib/endorsement-extraction.functions";

export const latestExtractionQuery = queryOptions({
  queryKey: ["endorsement-extraction", "latest"] as const,
  queryFn: () => getLatestExtraction(),
  staleTime: 30_000,
});

export const endorsementExceptionsQuery = queryOptions({
  queryKey: ["endorsement-exceptions"] as const,
  queryFn: () => listEndorsementExceptions(),
  staleTime: 60_000,
});

export function useLatestExtraction() {
  return useQuery(latestExtractionQuery);
}

export function useEndorsementExceptions() {
  return useQuery(endorsementExceptionsQuery);
}

export function useRunEndorsementExtraction() {
  const qc = useQueryClient();
  const fireFn = useServerFn(runEndorsementExtraction);
  const { mode } = useWebhookMode();
  const statusFn = useServerFn(getExtractionStatus);
  const [isPolling, setIsPolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setIsPolling(false);
  };

  const pollOnce = async (runId: string, startedAt: number) => {
    try {
      const row = await statusFn({ data: { runId } });
      if (row?.status === "success") {
        toast.success("Extração concluída", {
          description: `${row.total_apolices} apólices retornadas.`,
        });
        qc.invalidateQueries({ queryKey: ["endorsement-extraction"] });
        stop();
        return;
      }
      if (row?.status === "error") {
        toast.error("Falha na extração", {
          description: row.error_message ?? "Erro desconhecido.",
          duration: 30_000,
        });
        stop();
        return;
      }
    } catch (err) {
      console.error("[extracao] erro consultando status:", err);
    }
    if (Date.now() - startedAt > 15 * 60_000) {
      toast.error("Extração expirou", { description: "Sem resposta após 15 minutos." });
      stop();
      return;
    }
    timer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
  };

  const mutation = useMutation({
    mutationFn: () => fireFn({ data: { mode } }),
    onSuccess: ({ runId }) => {
      setIsPolling(true);
      toast.info("Extração iniciada", { description: "Aguardando o fluxo n8n…" });
      const startedAt = Date.now();
      timer.current = setTimeout(() => pollOnce(runId, startedAt), 3_000);
    },
    onError: (err: Error) => {
      toast.error("Falha ao disparar extração", { description: err.message });
    },
  });

  return { ...mutation, isRunning: mutation.isPending || isPolling };
}

export function useAddEndorsementException() {
  const qc = useQueryClient();
  const fn = useServerFn(addEndorsementException);
  return useMutation({
    mutationFn: (input: {
      policy_number: string;
      motivo: string;
      reason_tag_id?: string | null;
    }) => fn({ data: input }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["endorsement-exceptions"] });
      qc.invalidateQueries({ queryKey: ["endorsement-extraction"] });
      toast.success(res.alreadyExists ? "Já estava na lista" : "Exceção registrada", {
        description: `Apólice ${vars.policy_number}`,
      });
    },
    onError: (err: Error) => {
      toast.error("Falha ao registrar exceção", {
        description: err.message === "Forbidden" ? "Apenas administradores." : err.message,
      });
    },
  });
}

export function useUpdateEndorsementException() {
  const qc = useQueryClient();
  const fn = useServerFn(updateEndorsementException);
  return useMutation({
    mutationFn: (input: { id: string; motivo: string; reason_tag_id?: string | null }) =>
      fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endorsement-exceptions"] });
      toast.success("Motivo atualizado");
    },
    onError: (err: Error) => {
      toast.error("Falha ao atualizar motivo", {
        description: err.message === "Forbidden" ? "Apenas administradores." : err.message,
      });
    },
  });
}

export function useRemoveEndorsementException() {
  const qc = useQueryClient();
  const fn = useServerFn(removeEndorsementException);
  return useMutation({
    mutationFn: (input: { id: string }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["endorsement-exceptions"] });
      qc.invalidateQueries({ queryKey: ["endorsement-extraction"] });
      toast.success("Exceção removida");
    },
    onError: (err: Error) => {
      toast.error("Falha ao remover exceção", {
        description: err.message === "Forbidden" ? "Apenas administradores." : err.message,
      });
    },
  });
}
