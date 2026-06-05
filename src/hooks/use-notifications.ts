import { useCallback, useEffect, useState } from "react";
import { RECENT_ACTIVITIES } from "@/lib/mock/data";

export type NotifSeverity = "critical" | "high" | "info" | "low";

export interface Notification {
  id: string;
  text: string;
  time: string;
  createdAt: number;
  severity: NotifSeverity;
  read: boolean;
}

const STORAGE_KEY = "ole.notifications.v1";

type Listener = (items: Notification[]) => void;
const listeners = new Set<Listener>();

function seed(): Notification[] {
  const now = Date.now();
  return RECENT_ACTIVITIES.map((a, i) => ({
    id: String(a.id),
    text: a.text,
    time: a.time,
    createdAt: now - (i + 1) * 60_000,
    severity: a.severity as NotifSeverity,
    read: false,
  }));
}

function load(): Notification[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Notification[];
  } catch {
    return seed();
  }
}

function save(items: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

function relTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

const SAMPLE_EVENTS: Array<Omit<Notification, "id" | "createdAt" | "time" | "read">> = [
  { text: "Novo endosso recebido — OLE-02400078", severity: "info" },
  { text: "Inconsistência detectada em OLE-02400119 (Cobertura)", severity: "high" },
  { text: "Sincronização com motor concluída", severity: "low" },
  { text: "Alerta crítico: gap de vigência em BRK-0091", severity: "critical" },
  { text: "Renovação processada com sucesso", severity: "low" },
];

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>(() => load());

  useEffect(() => {
    const l: Listener = (next) => setItems(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // refresh relative times every 30s
  useEffect(() => {
    const i = setInterval(() => setItems((cur) => [...cur]), 30_000);
    return () => clearInterval(i);
  }, []);

  // simulated incoming notifications every ~45s
  useEffect(() => {
    const i = setInterval(() => {
      const sample = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
      const next: Notification = {
        ...sample,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        time: "agora",
        read: false,
      };
      const cur = load();
      const updated = [next, ...cur].slice(0, 30);
      save(updated);
    }, 45_000);
    return () => clearInterval(i);
  }, []);

  const markAllRead = useCallback(() => {
    const updated = load().map((n) => ({ ...n, read: true }));
    save(updated);
  }, []);

  const markRead = useCallback((id: string) => {
    const updated = load().map((n) => (n.id === id ? { ...n, read: true } : n));
    save(updated);
  }, []);

  const remove = useCallback((id: string) => {
    save(load().filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => save([]), []);

  const withRelTime = items.map((n) => ({ ...n, time: relTime(n.createdAt) }));
  const unread = withRelTime.filter((n) => !n.read).length;

  return { items: withRelTime, unread, markAllRead, markRead, remove, clearAll };
}
