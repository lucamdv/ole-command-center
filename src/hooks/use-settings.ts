import { useCallback, useEffect, useState } from "react";
import type { NotifKind } from "@/lib/notifications.functions";

export interface OperatorProfile {
  nome: string;
  email: string;
  fuso: string;
  idioma: "pt-BR" | "en-US";
}

export type NotifPrefs = Record<NotifKind, boolean> & { som: boolean };

const PROFILE_KEY = "ole.profile.v1";
const NOTIF_PREFS_KEY = "ole.notif.prefs.v1";

const DEFAULT_PROFILE: OperatorProfile = {
  nome: "Luca Monteiro",
  email: "luca@excelsior.com.br",
  fuso: "America/Sao_Paulo",
  idioma: "pt-BR",
};

const DEFAULT_PREFS: NotifPrefs = {
  auditoria_concluida: true,
  auditoria_erro: true,
  sync_carteira: true,
  achados_criticos: true,
  apolices_atualizadas: true,
  som: false,
};

type ProfileListener = (p: OperatorProfile) => void;
type PrefsListener = (p: NotifPrefs) => void;
const profileListeners = new Set<ProfileListener>();
const prefsListeners = new Set<PrefsListener>();

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<OperatorProfile>(() =>
    readJSON(PROFILE_KEY, DEFAULT_PROFILE),
  );
  useEffect(() => {
    const l: ProfileListener = (p) => setProfileState(p);
    profileListeners.add(l);
    return () => {
      profileListeners.delete(l);
    };
  }, []);
  const update = useCallback((patch: Partial<OperatorProfile>) => {
    const next = { ...readJSON(PROFILE_KEY, DEFAULT_PROFILE), ...patch };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    profileListeners.forEach((l) => l(next));
  }, []);
  return { profile, update };
}

export function useNotifPrefs() {
  const [prefs, setPrefsState] = useState<NotifPrefs>(() => readJSON(NOTIF_PREFS_KEY, DEFAULT_PREFS));
  useEffect(() => {
    const l: PrefsListener = (p) => setPrefsState(p);
    prefsListeners.add(l);
    return () => {
      prefsListeners.delete(l);
    };
  }, []);
  const update = useCallback((patch: Partial<NotifPrefs>) => {
    const next = { ...readJSON(NOTIF_PREFS_KEY, DEFAULT_PREFS), ...patch };
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
    prefsListeners.forEach((l) => l(next));
  }, []);
  return { prefs, update };
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Pequeno beep WebAudio para notificações críticas
export function playNotifBeep() {
  try {
    const AC: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.4);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    /* no-op */
  }
}
