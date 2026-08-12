import { useCallback, useEffect, useMemo, useState } from "react";
import type { NotifKind } from "@/lib/notifications.functions";
import { useCurrentRole } from "@/hooks/use-current-role";

export interface OperatorProfile {
  nome: string;
  email: string;
  fuso: string;
  idioma: "pt-BR" | "en-US";
}

export type NotifPrefs = Record<NotifKind, boolean> & { som: boolean };

const PREFS_KEY = "ole.profile.prefs.v1";
const NOTIF_PREFS_KEY = "ole.notif.prefs.v1";

type LocalPrefs = Pick<OperatorProfile, "fuso" | "idioma">;

const DEFAULT_LOCAL: LocalPrefs = {
  fuso: "America/Sao_Paulo",
  idioma: "pt-BR",
};

const FALLBACK_PROFILE: OperatorProfile = {
  nome: "Operador",
  email: "—",
  ...DEFAULT_LOCAL,
};

const DEFAULT_PREFS: NotifPrefs = {
  auditoria_concluida: true,
  auditoria_erro: true,
  sync_carteira: true,
  achados_criticos: true,
  apolices_atualizadas: true,
  som: false,
};

type PrefsListener = (p: NotifPrefs) => void;
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
  const { data: roleInfo } = useCurrentRole();
  const [local, setLocal] = useState<LocalPrefs>(() => readJSON(PREFS_KEY, DEFAULT_LOCAL));

  const profile = useMemo<OperatorProfile>(() => {
    const p = roleInfo?.profile;
    if (!p) return { ...FALLBACK_PROFILE, ...local };
    return {
      nome: p.full_name || p.email || "Operador",
      email: p.email || "—",
      fuso: local.fuso,
      idioma: local.idioma,
    };
  }, [roleInfo, local]);

  const update = useCallback((patch: Partial<OperatorProfile>) => {
    setLocal((prev) => {
      const next: LocalPrefs = {
        fuso: patch.fuso ?? prev.fuso,
        idioma: patch.idioma ?? prev.idioma,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      }
      return next;
    });
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

// ===== Preferências de visualização de gráficos =====

export interface ChartPrefs {
  /** Oculta gráficos sem dados suficientes e mostra um aviso discreto. */
  hideEmptyCharts: boolean;
}

const CHART_PREFS_KEY = "ole.chart.prefs.v1";
const DEFAULT_CHART_PREFS: ChartPrefs = { hideEmptyCharts: true };

type ChartPrefsListener = (p: ChartPrefs) => void;
const chartPrefsListeners = new Set<ChartPrefsListener>();

export function useChartPrefs() {
  const [prefs, setPrefs] = useState<ChartPrefs>(() =>
    readJSON(CHART_PREFS_KEY, DEFAULT_CHART_PREFS),
  );
  useEffect(() => {
    const l: ChartPrefsListener = (p) => setPrefs(p);
    chartPrefsListeners.add(l);
    return () => {
      chartPrefsListeners.delete(l);
    };
  }, []);
  const update = useCallback((patch: Partial<ChartPrefs>) => {
    const next = { ...readJSON(CHART_PREFS_KEY, DEFAULT_CHART_PREFS), ...patch };
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(next));
    chartPrefsListeners.forEach((l) => l(next));
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
