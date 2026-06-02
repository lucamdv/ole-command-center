import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useServerFn } from "@tanstack/react-query";
import { Play, Loader2, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { startAudit, getAuditStatus } from "@/lib/audit/audit.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type RunPayload = Awaited<ReturnType<typeof getAuditStatus>>;

function isRun(x: RunPayload | undefined): x is Exclude<RunPayload, { notFound: true }> {
  return !!x && !(x as any).notFound;
}

const STAGE_LABEL: Record<string, string> = {
  authenticating: "Autenticando na API Excelsior",
  listing_policies: "Listando apólices",
  fetching_endorsements: "Baixando endossos & auditando",
  auditing: "Auditando",
  done: "Concluído",
  error: "Erro",
};

export function RunAuditButton() {
  const [runId, setRunId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const startFn = useServerFn(startAudit);
  const statusFn = useServerFn(getAuditStatus);

  const startMut = useMutation({
    mutationFn: () => startFn(),
    onSuccess: (data) => {
      setRunId(data.runId);
      setOpen(true);
      toast.success("Auditoria iniciada", { description: "Pipeline conectado à API Excelsior." });
    },
    onError: (e: any) => toast.error("Falha ao iniciar auditoria", { description: e?.message }),
  });

  const statusQuery = useQuery({
    queryKey: ["audit-run", runId],
    queryFn: () => statusFn({ data: { runId: runId! } }),
    enabled: !!runId,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (isRun(d) && (d.status === "done" || d.status === "error")) return false;
      return 1500;
    },
  });

  const run = isRun(statusQuery.data) ? statusQuery.data : undefined;

  useEffect(() => {
    if (run?.status === "done") {
      toast.success("Auditoria concluída", {
        description: `${run.progress.approved} OK · ${run.progress.rejected} reprovadas`,
      });
    } else if (run?.status === "error") {
      toast.error("Auditoria falhou", { description: run.error });
    }
  }, [run?.status]);

  return (
    <>
      <button
        onClick={() => startMut.mutate()}
        disabled={startMut.isPending || run?.status === "running"}
        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-95 transition shadow-glow inline-flex items-center gap-2 disabled:opacity-60"
      >
        {startMut.isPending || run?.status === "running" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {run?.status === "running" ? "Auditoria em andamento" : "Rodar auditoria"}
      </button>

      {runId && (
        <button
          onClick={() => setOpen(true)}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-[12.5px] hover:bg-surface-2 transition"
        >
          Ver resultados
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl bg-surface border-l border-border p-0 overflow-y-auto">
          <SheetHeader className="px-6 py-5 border-b border-border space-y-1">
            <SheetTitle className="text-[15px] font-semibold flex items-center gap-2">
              Auditoria de Emissão
              {run?.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Execução conectada à API Excelsior — regras de vigência, prêmio e cobertura.
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-5">
            {!run ? (
              <div className="text-[12.5px] text-muted-foreground">Carregando…</div>
            ) : (
              <AuditDetail run={run} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function AuditDetail({ run }: { run: Exclude<RunPayload, { notFound: true }> }) {
  const p = run.progress;
  const pct = p.totalPolicies > 0 ? Math.round((p.processedPolicies / p.totalPolicies) * 100) : 0;

  const rejected = useMemo(
    () => run.results.filter((r) => r.status_auditoria === "REPROVADO"),
    [run.results],
  );
  const errors = useMemo(
    () => run.results.filter((r) => r.status_auditoria === "ERRO_LEITURA"),
    [run.results],
  );

  return (
    <div className="space-y-5">
      {/* Stage */}
      <div className="rounded-lg border border-border bg-background/40 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-muted-foreground">{STAGE_LABEL[p.stage] ?? p.stage}</div>
          <div className="font-mono text-[11px] text-foreground">
            {p.processedPolicies}/{p.totalPolicies || "?"}
          </div>
        </div>
        <Progress value={pct} className="h-1.5" />
        {p.message && <div className="text-[11px] text-destructive mt-2">{p.message}</div>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Total" value={p.totalPolicies} tone="default" />
        <Stat label="Aprovadas" value={p.approved} tone="success" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
        <Stat label="Reprovadas" value={p.rejected} tone="destructive" icon={<ShieldAlert className="h-3.5 w-3.5" />} />
        <Stat label="Erros leitura" value={p.errors} tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
      </div>

      {/* Errors de leitura */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <div className="text-[12px] font-semibold text-warning mb-1">
            {errors.length} apólice(s) com erro de leitura
          </div>
          <div className="text-[11px] text-muted-foreground">
            Foram puladas — provavelmente timeout/5xx na API. Tente novamente.
          </div>
        </div>
      )}

      {/* Reprovadas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-semibold">Apólices reprovadas</div>
          <div className="font-mono text-[11px] text-muted-foreground">{rejected.length}</div>
        </div>

        {rejected.length === 0 ? (
          run.status === "done" ? (
            <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-6 text-center">
              <ShieldCheck className="h-6 w-6 text-success mx-auto mb-2" />
              <div className="text-[13px] font-semibold text-success">Tudo em conformidade</div>
              <div className="text-[11.5px] text-muted-foreground mt-1">
                Nenhuma apólice apresentou inconformidade nesta execução.
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground">Nenhuma reprovação encontrada até o momento.</div>
          )
        ) : (
          <div className="space-y-2">
            {rejected.map((r) => (
              <PolicyRow key={r.apolice} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyRow({ result }: { result: Exclude<RunPayload, { notFound: true }>["results"][number] }) {
  const [open, setOpen] = useState(false);
  const errs = result.erros_encontrados || [];
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-destructive/10 transition"
      >
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-foreground truncate">{result.apolice}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {result.total_erros ?? errs.length} achado(s) ·{" "}
            {errs.filter((e) => e.nivel === "erro").length} erro(s) ·{" "}
            {errs.filter((e) => e.nivel === "alerta").length} alerta(s)
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-destructive/20 divide-y divide-border/40">
          {errs.map((e, i) => (
            <div key={i} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border",
                    e.nivel === "erro"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-warning/15 text-warning border-warning/30",
                  )}
                >
                  {e.nivel}
                </span>
                <span className="text-[12px] font-semibold">{e.tipo_erro}</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
                  end. {e.endosso_com_erro}
                </span>
              </div>
              <div className="text-[11.5px] text-muted-foreground leading-snug">{e.detalhe_erro}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "destructive" | "warning";
  icon?: React.ReactNode;
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("text-[18px] font-semibold font-mono mt-0.5", toneCls)}>{value}</div>
    </div>
  );
}
