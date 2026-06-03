import { queryOptions, useQuery } from "@tanstack/react-query";
import { getAnalyticsAggregates } from "@/lib/analytics.functions";

export const analyticsAggregatesQuery = queryOptions({
  queryKey: ["analytics", "aggregates"] as const,
  queryFn: () => getAnalyticsAggregates(),
  staleTime: 60_000,
});

export function useAnalyticsAggregates() {
  return useQuery(analyticsAggregatesQuery);
}
