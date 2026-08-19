import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Search } from "lucide-react";
import { useAuditResolutions, useUnresolveFinding } from "@/hooks/use-audit-resolutions";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualList } from "@/components/ui/virtual-list";

const HOUR = 3_600_000;

function tempo(first: string | null, resolved: string): string {
  if (!first) return "—";
  const h = (+new Date(resolved) - +new Date(first)) / HOUR;
  if (!Number.isFinite(h) || h < 0) return "—";
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}

export function ResolvedTab() {
  const { data = [], isLoading } = useAuditResolutions();
  const unresolve = useUnresolveFinding();
  const [q, setQ] = useState("");
  const [onlyReopened, setOnlyReopened] = useState(false);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((r) => {
      if (onlyReopened && !r.reopened_at) return false;
      if (!s) return true;
      return `${r.apolice} ${r.tipo_erro} ${r.motivo ?? ""}`.toLowerCase().includes(s);
    });
  }, [data, q, onlyReopened]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar no histórico…"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12.5px] outline-none focus:border-primary/60"
          />
        </div>
        <button
          onClick={() => setOnlyReopened((v) => !v)}
          className={`h-9 rounded-md border px-3 text-[12px] transition ${
            onlyReopened
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          Só reabertos
        </button>
        <span className="text-[11.5px] text-muted-foreground">
          {rows.length} de {data.length} registros
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
          <div className="mb-1 text-[13px] font-semibold">Nenhum erro resolvido ainda</div>
          <p className="text-[11.5px] text-muted-foreground">
            Ao marcar um incidente como resolvido, ele aparece aqui com o tempo de resolução.
          </p>
        </div>
      ) : (
        <VirtualList
          items={rows}
          getKey={(r) => r.id}
          estimateSize={82}
          gap={8}
          className="max-h-[70dvh]"
        >
          {(r) => (
            <div className="rounded-xl border border-border border-l-4 border-l-success bg-surface px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">
                      {r.origem === "auto" ? "resolvido automaticamente" : "resolvido"}
                    </span>
                    <span className="text-[13px] font-semibold">{r.tipo_erro}</span>
                    {r.reopened_at && (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                        <RotateCcw className="h-3 w-3" /> reaberto
                      </span>
                    )}
                  </div>
                  {r.motivo && (
                    <div className="line-clamp-2 text-[11.5px] text-muted-foreground">
                      {r.motivo}
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono text-foreground/80">
                      apólice …{r.apolice.slice(-12)}
                    </span>
                    <span>·</span>
                    <span>resolvido em {formatDateTime(r.resolved_at)}</span>
                    <span>·</span>
                    <span>tempo {tempo(r.first_seen_at, r.resolved_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => unresolve.mutate({ id: r.id })}
                  disabled={unresolve.isPending}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] transition hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                </button>
              </div>
            </div>
          )}
        </VirtualList>
      )}
    </div>
  );
}
