import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import { useLatestAudit } from "@/hooks/use-audit";
import { normalizeFinding, severityOf, type Severity } from "@/lib/audit/derive";
import type { AuditFindingRow } from "@/lib/audit/types";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas · OLÉ COPILOT" },
      {
        name: "description",
        content:
          "Centro de operações: incidentes operacionais detectados na última auditoria.",
      },
    ],
  }),
  component: AlertasPage,
});

type SevFilter = Severity | "all";

const SEV_LABEL: Record<Severity, string> = {
  erro: "erro",
  alerta: "alerta",
  info: "info",
};

const SEV_BORDER: Record<Severity, string> = {
  erro: "border-l-destructive shadow-[inset_4px_0_0_var(--destructive),0_0_30px_-15px_var(--destructive)]",
  alerta: "border-l-warning shadow-[inset_4px_0_0_var(--warning)]",
  info: "border-l-info shadow-[inset_4px_0_0_var(--info)]",
};

const SEV_TEXT: Record<Severity, string> = {
  erro: "text-destructive",
  alerta: "text-warning",
  info: "text-info",
};

const SEV_BG: Record<Severity, string> = {
  erro: "bg-destructive/10",
  alerta: "bg-warning/10",
  info: "bg-info/10",
};

const SEV_DOT: Record<Severity, string> = {
  erro: "bg-destructive",
  alerta: "bg-warning",
  info: "bg-info",
};

function AlertasPage() {
  const { data: latest, isLoading, error } = useLatestAudit();
  const findings = latest?.findings ?? [];
  const run = latest?.run ?? null;

  const [sev, setSev] = useState<SevFilter>("all");
  const [tipo, setTipo] = useState<string>("all");
  const [search, setSearch] = useState("");

  const tipos = useMemo(
    () => Array.from(new Set(findings.map((f) => f.tipo_erro))).sort(),
    [findings],
  );

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { erro: 0, alerta: 0, info: 0 };
    for (const f of findings) c[severityOf(f)]++;
    return c;
  }, [findings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return findings.filter((f) => {
      if (sev !== "all" && severityOf(f) !== sev) return false;
      if (tipo !== "all" && f.tipo_erro !== tipo) return false;
      if (q) {
        const norm = normalizeFinding(f);
        const hay =
          `${f.apolice} ${f.tipo_erro} ${norm.motivo} ${norm.endosso ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [findings, sev, tipo, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-warning">
              SOC · INCIDENT VIEW
            </span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight">Alertas</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {isLoading
              ? "Carregando incidentes…"
              : run
                ? `${filtered.length} de ${findings.length} visíveis · última auditoria ${relativeTime(run.created_at)}`
                : "Nenhuma auditoria executada ainda."}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por apólice, tipo, motivo…"
            className="h-9 w-full pl-8 pr-3 rounded-lg border border-border bg-surface text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-[12px] text-destructive">
          Falha ao carregar findings: {error.message}
        </div>
      )}

      {/* Severity tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setSev("all")}
          className={cn(
            "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
            sev === "all" ? "border-primary/60 shadow-glow" : "border-border",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground">
              Todos
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-[24px] font-semibold tabular-nums">
            {isLoading ? <Skeleton className="h-7 w-12" /> : findings.length}
          </div>
          <div className="text-[11px] text-muted-foreground">incidentes na última run</div>
        </button>
        {(["erro", "alerta", "info"] as Severity[]).map((s) => (
          <button
            key={s}
            onClick={() => setSev(sev === s ? "all" : s)}
            className={cn(
              "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
              sev === s ? "border-primary/60 shadow-glow" : "border-border",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={cn(
                  "text-[10.5px] uppercase tracking-wider font-semibold",
                  SEV_TEXT[s],
                )}
              >
                {SEV_LABEL[s]}
              </span>
              <span className={cn("h-1.5 w-1.5 rounded-full", SEV_DOT[s])} />
            </div>
            <div className="text-[24px] font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-7 w-12" /> : counts[s]}
            </div>
            <div className="text-[11px] text-muted-foreground">incidentes registrados</div>
          </button>
        ))}
      </div>

      {/* Tipo filter */}
      {tipos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground">Tipo:</span>
          <button
            onClick={() => setTipo("all")}
            className={cn(
              "h-7 px-2.5 rounded-md text-[11.5px] font-medium border transition",
              tipo === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
          </button>
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(tipo === t ? "all" : t)}
              className={cn(
                "h-7 px-2.5 rounded-md text-[11.5px] font-medium border transition",
                tipo === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Incident list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
            <div className="text-[13px] font-semibold mb-1">
              {findings.length === 0
                ? "Nenhum incidente na última auditoria"
                : "Nenhum incidente com esses filtros"}
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {findings.length === 0
                ? "Carteira em conformidade ou auditoria ainda não executada."
                : "Ajuste os filtros para ver mais resultados."}
            </p>
          </div>
        ) : (
          filtered.slice(0, 100).map((f) => <IncidentRow key={f.id} f={f} />)
        )}
      </div>
    </div>
  );
}

function IncidentRow({ f }: { f: AuditFindingRow }) {
  const s = severityOf(f);
  const norm = normalizeFinding(f);
  return (
    <Link
      to="/apolices/$id"
      params={{ id: f.apolice }}
      className={cn(
        "block rounded-xl border border-border bg-surface hover:bg-surface-2/60 transition pl-4 pr-4 py-3 border-l-4",
        SEV_BORDER[s],
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded",
                SEV_TEXT[s],
                SEV_BG[s],
              )}
            >
              {SEV_LABEL[s]}
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              {f.tipo_erro}
            </span>
            {norm.endosso && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                end. {norm.endosso.slice(-6)}
              </span>
            )}
          </div>
          {(norm.motivo || norm.detalhe) && (
            <div className="text-[11.5px] text-muted-foreground line-clamp-2">
              {norm.motivo || norm.detalhe}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-mono text-foreground/80">
              apólice …{f.apolice.slice(-12)}
            </span>
            {f.data_inicio && (
              <>
                <span>·</span>
                <span>
                  vig. {new Date(f.data_inicio).toLocaleDateString("pt-BR")}
                  {f.data_fim
                    ? ` → ${new Date(f.data_fim).toLocaleDateString("pt-BR")}`
                    : ""}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {relativeTime(f.created_at)}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 inline-block mt-1" />
        </div>
      </div>
    </Link>
  );
}
