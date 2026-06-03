import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { usePolicies, useLatestPolicySync, useRunPolicySync } from "@/hooks/use-policies";
import { formatBRL, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apolices/")({
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

  const filtered = useMemo(() => {
    if (!policies) return [];
    if (!q) return policies;
    const s = q.toLowerCase();
    return policies.filter((p) => p.numero_apolice.toLowerCase().includes(s));
  }, [policies, q]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Apólices</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {policies?.length ?? 0} apólices na carteira ·{" "}
            {lastSync?.finished_at
              ? `última sincronização ${relativeTime(lastSync.finished_at)}`
              : lastSync?.status === "running"
                ? "sincronização em andamento"
                : "ainda não sincronizada"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runSync()}
            disabled={isRunning}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
            {isRunning ? "Sincronizando…" : "Sincronizar carteira"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] h-9 px-3 rounded-md bg-background border border-border focus-within:border-primary/50 transition">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número da apólice…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
          <div className="col-span-5">Apólice</div>
          <div className="col-span-2 text-center">Endosso atual</div>
          <div className="col-span-2 text-center">Endossos</div>
          <div className="col-span-2 text-right">Prêmio líquido</div>
          <div className="col-span-1 text-right">Atualizado</div>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">
              Carregando carteira…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-16 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
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
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/apolices/$id"
              params={{ id: p.numero_apolice }}
              className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-surface-2/50 transition"
            >
              <div className="col-span-5 min-w-0">
                <span className="font-mono text-[12.5px] text-foreground">{p.numero_apolice}</span>
              </div>
              <div className="col-span-2 text-center font-mono text-[11.5px] text-muted-foreground">
                {p.numero_endosso_atual ?? "—"}
              </div>
              <div className="col-span-2 text-center font-mono text-[12px] text-muted-foreground">
                {p.endorsements_count}
              </div>
              <div className="col-span-2 text-right font-mono text-[12px] text-foreground">
                {formatBRL(p.premio_liquido)}
              </div>
              <div className="col-span-1 text-right text-[10.5px] text-muted-foreground" title={formatDateTime(p.updated_at)}>
                {relativeTime(p.updated_at)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
