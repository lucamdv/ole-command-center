import { queryOptions, useQuery } from "@tanstack/react-query";
import { getFindingRecurrence } from "@/lib/audit-recurrence.functions";

export const findingRecurrenceQuery = queryOptions({
  queryKey: ["audit", "recurrence"] as const,
  queryFn: () => getFindingRecurrence(),
  staleTime: 60_000,
});

export function useFindingRecurrence() {
  return useQuery(findingRecurrenceQuery);
}
