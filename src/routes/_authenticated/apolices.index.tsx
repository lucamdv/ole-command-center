import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { usePolicies, useLatestPolicySync, useRunPolicySync } from "@/hooks/use-policies";
import { NextRunCountdown } from "@/components/automation/next-run-countdown";

import { formatDateTime, relativeTime } from "@/lib/format";
import { fmtNum } from "@/components/apolice/cards";
import { useBillingTagMap } from "@/hooks/use-billing";
import { billingTagClass, type BillingTag } from "@/lib/billing/status";
import { cn } from "@/lib/utils";
import { VirtualList } from "@/components/ui/virtual-list";

export const Route = createFileRoute("/_authenticated/apolices/")({
  head: () => ({
    meta: [
      { title: "Apólices · OLÉ COPILOT" },
      { name: "description", content: "Carteira de apólices sincronizada com o MOTOR OLÉ." },
    ],
  }),
  component: ApolicesPage,
});

function ApolicesPage() {
  const [q, setQ] = useState("");
  const { data: policies, isLoading } = usePolicies();
  const { data: lastSync } = useLatestPolicySync();
  const { mutate: runSync, isRunning } = useRunPolicySync();
  const { map: billingTags } = useBillingTagMap();

  const filtered = useMemo(() => {
    if (!policies) return [];
    if (!q) return policies;
    const s = q.toLowerCase();
    return policies.filter((p) =>
      p.numero_apolice.toLowerCase().includes(s) ||
      (p.segurado_nome ?? "").toLowerCase().includes(s),
    );
  }, [policies, q]);

  const synced = !!lastSync?.finished_at;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="page-title">Apólices</h1>
          <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                synced ? "bg-emerald-500" : isRunning ? "bg-warning animate-pulse" : "bg-muted-foreground/50",
              )}
            />
            <span>
              <span className="text-foreground font-medium">{policies?.length ?? 0}</span> apólices na carteira
            </span>
            <span className="text-border">•</span>
            <span>
              {lastSync?.finished_at
                ? `última sincronização ${relativeTime(lastSync.finished_at)}`
                : lastSync?.status === "running"
                  ? "sincronização em andamento"
                  : "ainda não sincronizada"}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <NextRunCountdown job="policy_sync" />
          <button
            onClick={() => runSync()}
            disabled={isRunning}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold shadow-lg shadow-primary/10 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
            {isRunning ? "Sincronizando…" : "Sincronizar carteira"}
          </button>
        </div>

      </div>

      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground/70 group-focus-within:text-primary transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="text"
          placeholder="Buscar por número da apólice ou segurado…"
          className="w-full bg-surface/60 border border-border focus:border-primary/40 focus:ring-4 focus:ring-primary/10 rounded-xl py-3.5 pl-11 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
        />
        <div className="absolute inset-y-0 right-4 hidden sm:flex items-center pointer-events-none">
          <kbd className="inline-flex h-6 items-center gap-1 rounded border border-border bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="hidden md:grid grid-cols-[1fr_140px_120px_200px_140px] text-[10.5px] font-semibold text-muted-foreground/80 uppercase tracking-[0.14em] pb-2">
          <div className="pl-5">Apólice</div>
          <div className="text-center">Endosso atual</div>
          <div className="text-center">Endossos</div>
          <div className="text-right pr-10">Prêmio total</div>
          <div className="text-right pr-5">Atualizado</div>
        </div>

        {isLoading && (
          <div className="px-4 py-16 text-center text-[13px] text-muted-foreground bg-surface/40 border border-border/60 rounded-xl">
            Carregando carteira…
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-16 text-center bg-surface/40 border border-border/60 rounded-xl">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <div className="text-[13px] text-foreground font-medium">
              {policies && policies.length === 0
                ? "Nenhuma apólice sincronizada ainda."
                : "Nenhuma apólice corresponde à busca."}
            </div>
            {policies && policies.length === 0 && (
              <div className="text-[11.5px] text-muted-foreground mt-1">
                Clique em &quot;Sincronizar carteira&quot; para puxar do MOTOR OLÉ.
              </div>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <VirtualList
            items={filtered}
            getKey={(p) => p.id}
            estimateSize={76}
            gap={8}
            className="max-h-[70dvh] rounded-xl"
          >
            {(p) => <PolicyRow p={p} billingTag={billingTags.get(p.numero_apolice)} />}
          </VirtualList>
        )}
      </div>
    </div>
  );
}

const PolicyRow = memo(function PolicyRow({
  p,
  billingTag,
}: {
  p: NonNullable<ReturnType<typeof usePolicies>["data"]>[number];
  billingTag?: BillingTag;
}) {
  // Split USD prefix from numeric value so we can style the currency tag
  const formatted = fmtNum(p.premio_liquido, p.premio_moeda);
  const match = formatted.match(/^([^\d-]+)\s*(.+)$/);
  const currency = match?.[1]?.trim() ?? p.premio_moeda ?? "";
  const amount = match?.[2] ?? formatted;

  return (
    <div className="group text-[13px]">
      <Link
        to="/apolices/$id"
        params={{ id: p.numero_apolice }}
        className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[1fr_140px_120px_200px_140px] items-center bg-surface/50 hover:bg-surface-2/60 border border-border/60 hover:border-primary/30 rounded-xl transition-all shadow-sm relative overflow-hidden"
      >
        {/* hover accent bar */}
        <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Apólice */}
        <div className="py-3 md:py-3.5 pl-4 md:pl-5 pr-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-mono text-[12.5px] font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
              {p.numero_apolice}
            </div>
            {billingTag && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap",
                  billingTagClass(billingTag),
                )}
              >
                {billingTag}
              </span>
            )}
          </div>
          {p.segurado_nome && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {p.segurado_nome}
            </div>
          )}
          <div className="md:hidden mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-mono">
            <span>End. {p.numero_endosso_atual ?? "—"}</span>
            <span className="text-border">•</span>
            <span>{p.endorsements_count} endossos</span>
            <span className="text-border">•</span>
            <span className="truncate">{relativeTime(p.updated_at)}</span>
          </div>
        </div>

        {/* Endosso atual */}
        <div className="hidden md:block text-center py-3.5">
          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border/60 font-mono text-[11px] font-medium">
            {p.numero_endosso_atual ?? "—"}
          </span>
        </div>

        {/* Endossos */}
        <div className="hidden md:block text-center py-3.5">
          <span className="font-mono text-[12px] text-foreground/80 font-medium tabular-nums">
            {p.endorsements_count}
          </span>
        </div>

        {/* Prêmio total */}
        <div className="text-right py-3 md:py-3.5 pr-4 md:pr-10 font-mono tabular-nums whitespace-nowrap">
          <span className="text-primary/70 text-[10px] mr-1 font-semibold">{currency}</span>
          <span className="text-foreground font-semibold text-[12.5px]">{amount}</span>
        </div>

        {/* Atualizado */}
        <div
          className="hidden md:block text-right py-3.5 pr-5 text-[11px] text-muted-foreground italic"
          title={formatDateTime(p.updated_at)}
        >
          {relativeTime(p.updated_at)}
        </div>
      </Link>
    </div>
  );
});
