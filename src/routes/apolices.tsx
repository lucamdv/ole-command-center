import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Filter, Search } from "lucide-react";
import { POLICIES } from "@/lib/mock/data";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apolices")({
  head: () => ({
    meta: [
      { title: "Apólices · OLÉ COPILOT" },
      { name: "description", content: "Lista, busca e filtros avançados sobre toda a carteira de apólices." },
    ],
  }),
  component: ApolicesPage,
});

type AuditFilter = "all" | "APROVADA" | "REPROVADA";

function ApolicesPage() {
  const [q, setQ] = useState("");
  const [audit, setAudit] = useState<AuditFilter>("all");
  const [product, setProduct] = useState<string>("all");

  const products = useMemo(() => Array.from(new Set(POLICIES.map((p) => p.product))).sort(), []);

  const filtered = useMemo(() => {
    return POLICIES.filter((p) => {
      if (audit !== "all" && p.audit !== audit) return false;
      if (product !== "all" && p.product !== product) return false;
      if (q) {
        const s = q.toLowerCase();
        return [p.number, p.broker, p.insured, p.product].some((v) => v.toLowerCase().includes(s));
      }
      return true;
    });
  }, [q, audit, product]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Apólices</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {filtered.length} de {POLICIES.length} apólices na carteira ativa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-surface text-[12.5px] hover:bg-surface-2 transition flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> Filtros avançados
          </button>
          <button className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium">
            Nova apólice
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-surface p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] h-9 px-3 rounded-md bg-background border border-border focus-within:border-primary/50 transition">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, segurado, corretor, produto…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/70"
          />
        </div>

        <Pill label="Auditoria" value={audit} onClick={() => setAudit(audit === "all" ? "APROVADA" : audit === "APROVADA" ? "REPROVADA" : "all")} />
        <Pill label="Produto" value={product === "all" ? "Todos" : product} onClick={() => {
          const i = products.indexOf(product);
          setProduct(product === "all" ? products[0] : i === products.length - 1 ? "all" : products[i + 1]);
        }} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
          <div className="col-span-3">Apólice</div>
          <div className="col-span-2">Produto</div>
          <div className="col-span-2">Corretor</div>
          <div className="col-span-2 text-right">Prêmio</div>
          <div className="col-span-1 text-center">Endossos</div>
          <div className="col-span-1 text-center">Auditoria</div>
          <div className="col-span-1 text-right">Atualizado</div>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/apolices/$id"
              params={{ id: p.id }}
              className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-surface-2/50 transition group"
            >
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] text-foreground">{p.number}</span>
                  <span
                    className={cn(
                      "text-[9.5px] font-mono px-1.5 py-0.5 rounded uppercase",
                      p.status === "ativa" && "bg-success/10 text-success",
                      p.status === "cancelada" && "bg-destructive/10 text-destructive",
                      p.status === "suspensa" && "bg-warning/10 text-warning",
                      p.status === "renovada" && "bg-info/10 text-info",
                    )}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{p.insured}</div>
              </div>
              <div className="col-span-2 text-[12px] text-foreground truncate">{p.product}</div>
              <div className="col-span-2 min-w-0">
                <div className="text-[12px] text-foreground truncate">{p.broker}</div>
                <div className="text-[10.5px] font-mono text-muted-foreground">{p.brokerCode}</div>
              </div>
              <div className="col-span-2 text-right font-mono text-[12px] text-foreground">{formatBRL(p.premium)}</div>
              <div className="col-span-1 text-center font-mono text-[12px] text-muted-foreground">{p.endorsements.length}</div>
              <div className="col-span-1 flex justify-center">
                <span
                  className={cn(
                    "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border",
                    p.audit === "APROVADA"
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-destructive/10 text-destructive border-destructive/30",
                  )}
                >
                  {p.audit}
                </span>
              </div>
              <div className="col-span-1 text-right text-[10.5px] text-muted-foreground">{formatDate(p.updatedAt)}</div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">Nenhuma apólice corresponde aos filtros.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3 rounded-md border border-border bg-background hover:border-primary/40 text-[12px] flex items-center gap-2 transition"
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
