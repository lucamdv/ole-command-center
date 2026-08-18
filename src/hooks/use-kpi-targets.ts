import { useCallback, useEffect, useState } from "react";
import { DEFAULT_KPI_TARGETS, type KpiTargets } from "@/lib/kpis/derive";

const KEY = "ole.kpi.targets.v1";

type Listener = (t: KpiTargets) => void;
const listeners = new Set<Listener>();

function read(): KpiTargets {
  if (typeof window === "undefined") return DEFAULT_KPI_TARGETS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_KPI_TARGETS;
    return { ...DEFAULT_KPI_TARGETS, ...(JSON.parse(raw) as Partial<KpiTargets>) };
  } catch {
    return DEFAULT_KPI_TARGETS;
  }
}

export function useKpiTargets() {
  const [targets, setTargets] = useState<KpiTargets>(() => read());

  useEffect(() => {
    const l: Listener = (t) => setTargets(t);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const update = useCallback((patch: Partial<KpiTargets>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l(next));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    listeners.forEach((l) => l(DEFAULT_KPI_TARGETS));
  }, []);

  return { targets, update, reset };
}
