import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, TrendingDown, TrendingUp } from "lucide-react";
import { POLICIES } from "@/lib/mock/data";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/endossos")({
  head: () => ({
    meta: [
      { title: "Endossos · OLÉ COPILOT" },
      { name: "description", content: "Visão consolidada de todos os endossos da carteira." },
    ],
  }),
  component: EndossosPage,
});

function EndossosPage() {
  const all = POLICIES.flatMap((p) =>
    p.endorsements.map((e) => ({ ...e, policy: p })),
  )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 80);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Endossos</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {all.length} endossos recentes em toda a carteira · ordenados por data
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
          <div className="col-span-1">#</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-2">Apólice</div>
          <div className="col-span-3">Alteração</div>
          <div className="col-span-2 text-right">Δ Prêmio</div>
          <div className="col-span-1 text-right">Prêmio</div>
          <div className="col-span-1 text-center">Status</div>
        </div>
        <div className="max-h-[680px] overflow-y-auto">
          {all.map((e) => (
            <Link
              key={e.id}
              to="/apolices/$id"
              params={{ id: e.policy.id }}
              className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-surface-2/50 transition"
            >
              <div className="col-span-1 flex items-center gap-1.5">
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-[11px]">{e.number}</span>
              </div>
              <div className="col-span-2 text-[11.5px] text-muted-foreground">{formatDate(e.date)}</div>
              <div className="col-span-2 font-mono text-[11.5px]">{e.policy.number}</div>
              <div className="col-span-3 min-w-0">
                <div className="text-[12px] truncate">{e.type}</div>
                <div className="text-[10.5px] text-muted-foreground truncate">{e.description}</div>
              </div>
              <div className="col-span-2 text-right font-mono text-[11.5px]">
                {e.premiumDelta === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={cn("inline-flex items-center gap-1", e.premiumDelta > 0 ? "text-success" : "text-destructive")}>
                    {e.premiumDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {e.premiumDelta > 0 ? "+" : ""}
                    {formatBRL(e.premiumDelta)}
                  </span>
                )}
              </div>
              <div className="col-span-1 text-right font-mono text-[11.5px]">{formatBRL(e.newPremium)}</div>
              <div className="col-span-1 flex justify-center">
                <span
                  className={cn(
                    "text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded border",
                    e.status === "APROVADA"
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-destructive/10 text-destructive border-destructive/30",
                  )}
                >
                  {e.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
