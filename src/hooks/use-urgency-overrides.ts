import { useCallback, useEffect, useState } from "react";
import type { Urgency } from "@/lib/audit/escalation";

const KEY = "ole.alert.urgency.overrides.v1";

export type UrgencyOverrides = Record<string, Urgency>;

type Listener = (o: UrgencyOverrides) => void;
const listeners = new Set<Listener>();

function read(): UrgencyOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UrgencyOverrides;
  } catch {
    return {};
  }
}

function write(next: UrgencyOverrides) {
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l(next));
}

export function useUrgencyOverrides() {
  const [overrides, setOverrides] = useState<UrgencyOverrides>(() => read());

  useEffect(() => {
    const l: Listener = (o) => setOverrides(o);
    listeners.add(l);
    setOverrides(read());
    return () => {
      listeners.delete(l);
    };
  }, []);

  const setOverride = useCallback((key: string, urgency: Urgency) => {
    write({ ...read(), [key]: urgency });
  }, []);

  const clearOverride = useCallback((key: string) => {
    const next = { ...read() };
    delete next[key];
    write(next);
  }, []);

  const clearAll = useCallback(() => write({}), []);

  return { overrides, setOverride, clearOverride, clearAll };
}
