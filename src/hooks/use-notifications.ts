import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getNotifications,
  type NotifKind,
  type NotifSeverity,
  type ServerNotification,
} from "@/lib/notifications.functions";
import { playNotifBeep, useNotifPrefs } from "@/hooks/use-settings";

export type { NotifSeverity, NotifKind };

export interface Notification {
  id: string;
  kind: NotifKind;
  severity: NotifSeverity;
  text: string;
  time: string;
  createdAt: number;
  read: boolean;
  link?: string;
}

const READ_KEY = "ole.notif.read.v1";
const DISMISSED_KEY = "ole.notif.dismissed.v1";
const LAST_SEEN_KEY = "ole.notif.lastSeenAt.v1";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function writeSet(key: string, s: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...s]));
}
function readLastSeen(): string {
  if (typeof window === "undefined") return new Date(Date.now() - 7 * 86400_000).toISOString();
  return (
    localStorage.getItem(LAST_SEEN_KEY) ??
    new Date(Date.now() - 7 * 86400_000).toISOString()
  );
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

export function useNotifications() {
  const fetchFn = useServerFn(getNotifications);
  const { prefs } = useNotifPrefs();
  const [lastSeenAt] = useState<string>(() => readLastSeen());
  const [readIds, setReadIds] = useState<Set<string>>(() => readSet(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readSet(DISMISSED_KEY));
  const seenIdsRef = useRef<Set<string>>(new Set());

  const { data: serverItems = [] } = useQuery({
    queryKey: ["notifications", lastSeenAt],
    queryFn: () => fetchFn({ data: { lastSeenAt } }),
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  // tick relative times every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  // play sound on new critical/high
  useEffect(() => {
    if (!prefs.som) {
      // still track ids to avoid replaying when re-enabled later
      for (const n of serverItems) seenIdsRef.current.add(n.id);
      return;
    }
    if (seenIdsRef.current.size === 0) {
      for (const n of serverItems) seenIdsRef.current.add(n.id);
      return;
    }
    const fresh = serverItems.filter(
      (n) =>
        !seenIdsRef.current.has(n.id) &&
        (n.severity === "critical" || n.severity === "high") &&
        !readIds.has(n.id) &&
        !dismissedIds.has(n.id),
    );
    if (fresh.length > 0) playNotifBeep();
    for (const n of serverItems) seenIdsRef.current.add(n.id);
  }, [serverItems, prefs.som, readIds, dismissedIds]);

  const items: Notification[] = useMemo(() => {
    return (serverItems as ServerNotification[])
      .filter((n) => prefs[n.kind] !== false)
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => {
        const ts = new Date(n.createdAt).getTime();
        return {
          id: n.id,
          kind: n.kind,
          severity: n.severity,
          text: n.text,
          createdAt: ts,
          time: relTime(ts),
          read: readIds.has(n.id),
          link: n.link,
        };
      });
  }, [serverItems, prefs, readIds, dismissedIds]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    const next = new Set(readIds);
    for (const n of items) next.add(n.id);
    writeSet(READ_KEY, next);
    setReadIds(next);
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  }, [items, readIds]);

  const markRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      writeSet(READ_KEY, next);
      setReadIds(next);
    },
    [readIds],
  );

  const remove = useCallback(
    (id: string) => {
      const next = new Set(dismissedIds);
      next.add(id);
      writeSet(DISMISSED_KEY, next);
      setDismissedIds(next);
    },
    [dismissedIds],
  );

  const clearAll = useCallback(() => {
    const next = new Set(dismissedIds);
    for (const n of items) next.add(n.id);
    writeSet(DISMISSED_KEY, next);
    setDismissedIds(next);
  }, [items, dismissedIds]);

  const resetReadHistory = useCallback(() => {
    writeSet(READ_KEY, new Set());
    writeSet(DISMISSED_KEY, new Set());
    setReadIds(new Set());
    setDismissedIds(new Set());
    localStorage.removeItem(LAST_SEEN_KEY);
  }, []);

  return { items, unread, markAllRead, markRead, remove, clearAll, resetReadHistory };
}
