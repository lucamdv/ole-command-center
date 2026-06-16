import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCurrentRole } from "@/lib/admin.functions";

export function useCurrentRole() {
  const fn = useServerFn(getCurrentRole);
  return useQuery({
    queryKey: ["current-role"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
