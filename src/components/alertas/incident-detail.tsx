import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, EyeOff, ExternalLink, History, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatDateTime, relativeTime } from "@/lib/format";
import { URGENCY_LABEL } from "@/lib/audit/escalation";
import type { AlertItem } from "@/lib/audit/alert-view";
import type { AuditResolutionRow } from "@/lib/audit-resolutions.functions";
import type { AuditIgnoreRow } from "@/lib/audit-ignores.functions";
import type { RecurrenceRunRef } from "@/lib/audit-recurrence.functions";
import { URG_BG, URG_TEXT } from "./urgency-ui";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 break-words text-[12.5px]">{children}</div>
    </div>
  );
}

export function IncidentDetail({
  item,
  runs,
  itemRuns,
  resolutions,
  ignores,
  onOpenChange,
  onResolve,
  onIgnore,
}: {
  item: AlertItem | null;
  runs: RecurrenceRunRef[];
  itemRuns: string[];
  resolutions: AuditResolutionRow[];
  ignores: AuditIgnoreRow[];
  onOpenChange: (v: boolean) => void;
  onResolve: (item: AlertItem) => void;
  onIgnore: (item: AlertItem) => void;
}) {
  if (!item) return null;
  const { f } = item;
  const present = new Set(itemRuns);
  const timeline = [...runs].reverse();
  const extra = (f.detalhes ?? {}) as unknown as Record<string, unknown>;

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2 text-[15px]">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                URG_TEXT[item.urgency],
                URG_BG[item.urgency],
              )}
            >
              {URGENCY_LABEL[item.urgency]}
            </span>
            {f.tipo_erro}
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            Detectado {relativeTime(f.created_at)} · primeira detecção{" "}
            {formatDateTime(item.firstSeenAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <History className="h-3 w-3" /> auditorias
              </div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{item.occurrences}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> dias abertos
              </div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{item.daysOpen}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <RotateCcw className="h-3 w-3" /> resolvido antes
              </div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">
                {item.resolvedTimes}x
              </div>
            </div>
          </div>

          {item.escalationReasons.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-[12px]">
              <div className="mb-1 font-semibold text-warning">
                Urgência escalada de {URGENCY_LABEL[item.baseUrgency]} para{" "}
                {URGENCY_LABEL[item.urgency]}
              </div>
              <ul className="list-inside list-disc text-muted-foreground">
                {item.escalationReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3">
            <Field label="Apólice">
              <span className="font-mono">{f.apolice}</span>
            </Field>
            <Field label="Endosso">{item.endosso ?? "—"}</Field>
            <Field label="Vigência">
              {f.data_inicio
                ? `${new Date(f.data_inicio).toLocaleDateString("pt-BR")}${
                    f.data_fim ? ` → ${new Date(f.data_fim).toLocaleDateString("pt-BR")}` : ""
                  }`
                : "—"}
            </Field>
            <Field label="Severidade base">{item.severity}</Field>
            <div className="col-span-2">
              <Field label="Motivo">{item.motivo || "—"}</Field>
            </div>
            {item.detalhe && (
              <div className="col-span-2">
                <Field label="Detalhe">{item.detalhe}</Field>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aparições por auditoria
            </div>
            <div className="flex flex-wrap items-end gap-1">
              {timeline.map((r) => (
                <div
                  key={r.id}
                  title={`${formatDateTime(r.created_at)} · ${present.has(r.id) ? "presente" : "ausente"}`}
                  className={cn(
                    "h-6 w-4 rounded-sm",
                    present.has(r.id) ? "bg-destructive/80" : "bg-muted/40",
                  )}
                />
              ))}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {timeline.length} auditorias analisadas · sequência atual: {item.streak}
            </div>
          </div>

          {(resolutions.length > 0 || ignores.length > 0) && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico deste problema
              </div>
              {resolutions.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-surface p-2.5 text-[12px]"
                >
                  <span className="font-semibold text-success">Resolvido</span>{" "}
                  {formatDateTime(r.resolved_at)}
                  {r.reopened_at && (
                    <span className="text-destructive">
                      {" "}
                      · reaberto {formatDateTime(r.reopened_at)}
                    </span>
                  )}
                  {r.motivo && <div className="text-muted-foreground">{r.motivo}</div>}
                </div>
              ))}
              {ignores.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-border bg-surface p-2.5 text-[12px]"
                >
                  <span className="font-semibold text-warning">Exceção</span>{" "}
                  {formatDateTime(i.created_at)}
                  {i.motivo && <div className="text-muted-foreground">{i.motivo}</div>}
                </div>
              ))}
            </div>
          )}

          <details className="rounded-lg border border-border bg-surface p-3">
            <summary className="cursor-pointer text-[12px] font-medium">
              Dados técnicos do achado
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
              {JSON.stringify(extra, null, 2)}
            </pre>
          </details>

          <div className="flex flex-wrap gap-2 pb-4">
            <button
              onClick={() => onResolve(item)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] transition hover:border-success/60 hover:text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como resolvido
            </button>
            <button
              onClick={() => onIgnore(item)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] transition hover:border-warning/60 hover:text-warning"
            >
              <EyeOff className="h-3.5 w-3.5" /> Registrar exceção
            </button>
            <Link
              to="/apolices/$id"
              params={{ id: f.apolice }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] transition hover:border-primary/60"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir apólice
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
