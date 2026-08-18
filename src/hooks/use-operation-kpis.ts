import { queryOptions, useQuery } from "@tanstack/react-query";
import { getOperationKpis } from "@/lib/kpis.functions";

export const operationKpisQuery = queryOptions({
  queryKey: ["kpis", "operation"] as const,
  queryFn: () => getOperationKpis(),
  staleTime: 60_000,
});

export function useOperationKpis() {
  return useQuery(operationKpisQuery);
}
