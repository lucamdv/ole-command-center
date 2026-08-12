export type DateRangePreset = "all" | "3m" | "6m" | "12m" | "ytd" | "custom";

export interface DateRangeState {
  preset: DateRangePreset;
  /** YYYY-MM-DD */
  from: string | null;
  /** YYYY-MM-DD */
  to: string | null;
}

export const DEFAULT_RANGE: DateRangeState = { preset: "all", from: null, to: null };

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  all: "Todo o período",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  "12m": "Últimos 12 meses",
  ytd: "Ano atual",
  custom: "Período personalizado",
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Resolve o estado do filtro em limites concretos (inclusive). */
export function resolveRange(state: DateRangeState): { from: string | null; to: string | null } {
  const now = new Date();
  const today = toISODate(now);
  switch (state.preset) {
    case "all":
      return { from: null, to: null };
    case "3m":
    case "6m":
    case "12m": {
      const months = state.preset === "3m" ? 3 : state.preset === "6m" ? 6 : 12;
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      return { from: toISODate(start), to: today };
    }
    case "ytd":
      return { from: `${now.getFullYear()}-01-01`, to: today };
    case "custom": {
      const from = state.from ?? null;
      const to = state.to ?? null;
      if (from && to && from > to) return { from: to, to: from };
      return { from, to };
    }
  }
}

export function isRangeActive(state: DateRangeState): boolean {
  const { from, to } = resolveRange(state);
  return Boolean(from || to);
}

/** Verifica se uma data ISO (ou datetime ISO) está dentro do intervalo. */
export function withinRange(
  iso: string | null | undefined,
  range: { from: string | null; to: string | null },
): boolean {
  if (!range.from && !range.to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/** Verifica se um bucket "YYYY-MM" intersecta o intervalo. */
export function monthWithinRange(
  month: string | null | undefined,
  range: { from: string | null; to: string | null },
): boolean {
  if (!range.from && !range.to) return true;
  if (!month) return false;
  const m = month.slice(0, 7);
  if (range.from && m < range.from.slice(0, 7)) return false;
  if (range.to && m > range.to.slice(0, 7)) return false;
  return true;
}

function monthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
}

/** Selo curto do intervalo aplicado, ex.: "jan/26 – ago/26". */
export function formatRangeBadge(state: DateRangeState): string | null {
  const { from, to } = resolveRange(state);
  if (!from && !to) return null;
  if (from && to) return `${monthShort(from)} – ${monthShort(to)}`;
  if (from) return `desde ${monthShort(from)}`;
  return `até ${monthShort(to!)}`;
}
