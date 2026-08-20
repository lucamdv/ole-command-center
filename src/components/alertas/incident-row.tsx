import { memo } from "react";
import { CheckCircle2, ChevronRight, EyeOff, History, Repeat, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { URGENCY_LABEL, type Urgency } from "@/lib/audit/escalation";
import type { AlertItem } from "@/lib/audit/alert-view";
import { URG_BG, URG_BORDER, URG_TEXT } from "./urgency-ui";
import { UrgencyPicker } from "./urgency-picker";

export const IncidentRow = memo(function IncidentRow({
  item,
  selected,
  onToggleSelect,
  onOpen,
  onResolve,
  onIgnore,
  onSetUrgency,
  onClearUrgency,
}: {
  item: AlertItem;
  selected: boolean;
  onToggleSelect: (key: string) => void;
  onOpen: (item: AlertItem) => void;
  onResolve: (item: AlertItem) => void;
  onIgnore: (item: AlertItem) => void;
  onSetUrgency: (item: AlertItem, u: Urgency) => void;
  onClearUrgency: (item: AlertItem) => void;
}) {
  const { f } = item;
  const id = `${f.id}`;
  return (
    <div
      className={cn(
        "panel transition hover:bg-surface-2/60 border-l-4 pl-3 pr-3 py-3",
        URG_BORDER[item.urgency],
        selected && "ring-1 ring-primary/60",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(id)}
          aria-label="Selecionar incidente"
          className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--primary)]"
        />
        <button onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                URG_TEXT[item.urgency],
                URG_BG[item.urgency],
              )}
            >
              {URGENCY_LABEL[item.urgency]}
            </span>
            <span className="text-[13px] font-semibold text-foreground">{f.tipo_erro}</span>
            {item.occurrences > 1 ? (
              <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warning">
                <History className="h-3 w-3" />
                {item.occurrences}ª auditoria seguida
              </span>
            ) : (
              <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-info">
                novo
              </span>
            )}
            {item.recorrenteNaApolice && (
              <span
                title={`Mesmo erro já ocorreu em endosso anterior desta apólice: ${item.policyHistory
                  .map((h) => h.endosso)
                  .join(", ")}`}
                className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary"
              >
                <Repeat className="h-3 w-3" /> reincidente na apólice
              </span>
            )}
            {item.reopened && (
              <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                <RotateCcw className="h-3 w-3" /> reaberto
              </span>
            )}
            {item.bumps > 0 && (
              <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                escalado +{item.bumps}
              </span>
            )}
            {item.endosso && (
              <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                end. {item.endosso.slice(-6)}
              </span>
            )}
          </div>
          {(item.motivo || item.detalhe) && (
            <div className="line-clamp-2 text-[11.5px] text-muted-foreground">
              {item.motivo || item.detalhe}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-mono text-foreground/80">apólice …{f.apolice.slice(-12)}</span>
            <span>·</span>
            <span>{item.daysOpen === 0 ? "aberto hoje" : `${item.daysOpen} d em aberto`}</span>
            {f.data_inicio && (
              <>
                <span>·</span>
                <span>
                  vig. {new Date(f.data_inicio).toLocaleDateString("pt-BR")}
                  {f.data_fim ? ` → ${new Date(f.data_fim).toLocaleDateString("pt-BR")}` : ""}
                </span>
              </>
            )}
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[11px] text-muted-foreground">{relativeTime(f.created_at)}</span>
          <div className="flex items-center gap-1">
            <UrgencyPicker
              value={item.urgency}
              manual={item.manualUrgency}
              onSet={(u) => onSetUrgency(item, u)}
              onClear={() => onClearUrgency(item)}
            />
            <button
              onClick={() => onResolve(item)}
              title="Marcar como resolvido"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] transition hover:border-success/60 hover:text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resolver</span>
            </button>
            <button
              onClick={() => onIgnore(item)}
              title="Registrar exceção"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] transition hover:border-warning/60 hover:text-warning"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ignorar</span>
            </button>
            <button
              onClick={() => onOpen(item)}
              title="Ver detalhes"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface transition hover:border-primary/60"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
