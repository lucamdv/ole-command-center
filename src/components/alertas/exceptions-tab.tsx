import { useMemo, useState } from "react";
import { EyeOff, Search, Trash2 } from "lucide-react";
import { useAuditIgnores, useRemoveAuditIgnore } from "@/hooks/use-audit-ignores";
import { useExceptionTags } from "@/hooks/use-exception-tags";
import { ReasonDisplay } from "@/components/exceptions/reason-chip";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export function ExceptionsTab() {
  const { data = [], isLoading } = useAuditIgnores();
  const { data: tags = [] } = useExceptionTags();
  const remove = useRemoveAuditIgnore();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) =>
      `${r.apolice} ${r.tipo_erro ?? ""} ${r.motivo ?? ""}`.toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar exceções…"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12.5px] outline-none focus:border-primary/60"
          />
        </div>
        <span className="text-[11.5px] text-muted-foreground">
          {rows.length} exceção(ões) ativas · não entram nos indicadores
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
          <EyeOff className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
          <div className="mb-1 text-[13px] font-semibold">Nenhuma exceção registrada</div>
          <p className="text-[11.5px] text-muted-foreground">
            Incidentes ignorados aparecem aqui com o motivo informado.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-border border-l-4 border-l-warning bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-warning">
                    {r.scope === "apolice" ? "apólice inteira" : "tipo específico"}
                  </span>
                  <span className="text-[13px] font-semibold">
                    {r.tipo_erro ?? "Todos os tipos"}
                  </span>
                </div>
                <div className="text-[11.5px]">
                  <ReasonDisplay motivo={r.motivo} tagId={r.reason_tag_id} tags={tags} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="font-mono text-foreground/80">
                    apólice …{r.apolice.slice(-12)}
                  </span>
                  <span>·</span>
                  <span>desde {formatDateTime(r.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => remove.mutate({ id: r.id })}
                disabled={remove.isPending}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] transition hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
