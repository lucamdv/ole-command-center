import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ESCALATION_RULES, type EscalationRules } from "@/lib/audit/escalation";

const KEY = "ole.alert.escalation.v1";

type Listener = (r: EscalationRules) => void;
const listeners = new Set<Listener>();

function read(): EscalationRules {
  if (typeof window === "undefined") return DEFAULT_ESCALATION_RULES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ESCALATION_RULES;
    return {
      ...DEFAULT_ESCALATION_RULES,
      ...(JSON.parse(raw) as Partial<EscalationRules>),
    };
  } catch {
    return DEFAULT_ESCALATION_RULES;
  }
}

export function useEscalationRules() {
  const [rules, setRules] = useState<EscalationRules>(() => read());

  useEffect(() => {
    const l: Listener = (r) => setRules(r);
    listeners.add(l);
    setRules(read());
    return () => {
      listeners.delete(l);
    };
  }, []);

  const update = useCallback((patch: Partial<EscalationRules>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l(next));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    listeners.forEach((l) => l(DEFAULT_ESCALATION_RULES));
  }, []);

  return { rules, update, reset };
}
