import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addExceptionReasonTag,
  listExceptionReasonTags,
  removeExceptionReasonTag,
  updateExceptionReasonTag,
} from "@/lib/exception-tags.functions";

export const exceptionTagsQuery = queryOptions({
  queryKey: ["exception-reason-tags"] as const,
  queryFn: () => listExceptionReasonTags(),
  staleTime: 5 * 60_000,
});

export function useExceptionTags() {
  return useQuery(exceptionTagsQuery);
}

const describeError = (err: Error) =>
  err.message === "Forbidden" ? "Apenas administradores." : err.message;

export function useAddExceptionTag() {
  const qc = useQueryClient();
  const fn = useServerFn(addExceptionReasonTag);
  return useMutation({
    mutationFn: (input: { name: string; color: string }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exception-reason-tags"] });
      toast.success("Tag criada");
    },
    onError: (err: Error) =>
      toast.error("Falha ao criar tag", { description: describeError(err) }),
  });
}

export function useUpdateExceptionTag() {
  const qc = useQueryClient();
  const fn = useServerFn(updateExceptionReasonTag);
  return useMutation({
    mutationFn: (input: { id: string; name?: string; color?: string }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exception-reason-tags"] });
      qc.invalidateQueries({ queryKey: ["audit-ignores"] });
      qc.invalidateQueries({ queryKey: ["endorsement-exceptions"] });
      toast.success("Tag atualizada");
    },
    onError: (err: Error) =>
      toast.error("Falha ao atualizar tag", { description: describeError(err) }),
  });
}

export function useRemoveExceptionTag() {
  const qc = useQueryClient();
  const fn = useServerFn(removeExceptionReasonTag);
  return useMutation({
    mutationFn: (input: { id: string }) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exception-reason-tags"] });
      qc.invalidateQueries({ queryKey: ["audit-ignores"] });
      qc.invalidateQueries({ queryKey: ["endorsement-exceptions"] });
      toast.success("Tag removida");
    },
    onError: (err: Error) =>
      toast.error("Falha ao remover tag", { description: describeError(err) }),
  });
}
