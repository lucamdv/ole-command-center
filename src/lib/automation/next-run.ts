// Helpers puros (client + server) para calcular o próximo disparo agendado
// respeitando o fuso horário configurado.

export interface ScheduleLike {
  enabled: boolean;
  run_at_time: string; // "HH:MM:SS"
  weekdays: number[];
  timezone: string;
  last_triggered_at?: string | null;
}

/** Partes de uma data em um fuso específico. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: wdMap[parts.weekday ?? "Sun"] ?? 0,
  };
}

/** Offset (ms) do fuso em relação ao UTC no instante informado. */
function zoneOffsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const [y, m, d] = p.dateKey.split("-").map(Number);
  const asUTC = Date.UTC(y!, (m ?? 1) - 1, d!, p.hour, p.minute, p.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

function parseTime(t: string) {
  const [h, m] = t.split(":");
  return { h: Number(h ?? 0), m: Number(m ?? 0) };
}

/** Instante UTC do horário local (dateKey + HH:MM) no fuso informado. */
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const { h, m } = parseTime(time);
  const guess = new Date(Date.UTC(y!, (mo ?? 1) - 1, d!, h, m, 0));
  const offset = zoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function addDaysKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Próximo disparo (Date UTC) ou null quando desabilitado / sem dias válidos. */
export function nextRunAt(schedule: ScheduleLike, now = new Date()): Date | null {
  if (!schedule.enabled || !schedule.weekdays?.length) return null;
  const tz = schedule.timezone || "America/Sao_Paulo";
  const cur = zonedParts(now, tz);
  for (let i = 0; i <= 8; i++) {
    const key = addDaysKey(cur.dateKey, i);
    const weekday = (cur.weekday + i) % 7;
    if (!schedule.weekdays.includes(weekday)) continue;
    const candidate = zonedTimeToUtc(key, schedule.run_at_time, tz);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

/** Formata um intervalo em ms como "3h 41m 12s" / "12m 05s". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}
