import { cn } from "@/lib/utils";
import { billingTagClass, type BillingTag } from "@/lib/billing/status";

export const BILLING_TAGS: BillingTag[] = ["PAGO", "PARCIAL", "ABERTA", "CANCELADA"];
export const SITUACOES = ["Ativa", "Cancelada"] as const;
export type SituacaoFilter = "todas" | (typeof SITUACOES)[number];

/** Verdadeiro quando a situação da emissão casa com o filtro escolhido. */
export function matchSituacao(situacao: string | null | undefined, filter: SituacaoFilter): boolean {
  if (filter === "todas") return true;
  const s = (situacao ?? "").trim().toLowerCase();
  return filter === "Cancelada" ? s.startsWith("cancel") : !s.startsWith("cancel");
}

export function BillingFilters({
  tags,
  onToggleTag,
  onClearTags,
  situacao,
  onSituacao,
  sort,
  onSort,
  sortOptions,
  className,
}: {
  tags: BillingTag[];
  onToggleTag: (t: BillingTag) => void;
  onClearTags: () => void;
  situacao: SituacaoFilter;
  onSituacao: (s: SituacaoFilter) => void;
  sort?: string;
  onSort?: (v: string) => void;
  sortOptions?: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onClearTags}
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10.5px] font-semibold transition",
            tags.length === 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          TODOS
        </button>
        {BILLING_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggleTag(t)}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10.5px] font-semibold transition",
                active
                  ? billingTagClass(t)
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="uppercase tracking-wider">Emissão</span>
        <select
          value={situacao}
          onChange={(e) => onSituacao(e.target.value as SituacaoFilter)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground outline-none focus:border-primary/40"
        >
          <option value="todas">Todas</option>
          {SITUACOES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {sortOptions && onSort && (
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wider">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-[11.5px] text-foreground outline-none focus:border-primary/40"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
