import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_WEBHOOK_MODE,
  WEBHOOK_MODE_KEY,
  type WebhookMode,
} from "@/lib/webhook-mode";

type Listener = (m: WebhookMode) => void;
const listeners = new Set<Listener>();

function read(): WebhookMode {
  if (typeof window === "undefined") return DEFAULT_WEBHOOK_MODE;
  const raw = localStorage.getItem(WEBHOOK_MODE_KEY);
  return raw === "test" || raw === "production" ? raw : DEFAULT_WEBHOOK_MODE;
}

/** Preferência por usuário (localStorage) do modo do webhook n8n. */
export function useWebhookMode() {
  const [mode, setMode] = useState<WebhookMode>(DEFAULT_WEBHOOK_MODE);

  useEffect(() => {
    setMode(read());
    const l: Listener = (m) => setMode(m);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const update = useCallback((next: WebhookMode) => {
    localStorage.setItem(WEBHOOK_MODE_KEY, next);
    listeners.forEach((l) => l(next));
  }, []);

  return { mode, setMode: update, isProduction: mode === "production" };
}
