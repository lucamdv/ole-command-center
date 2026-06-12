import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExpandedOccurrence } from "@/lib/calendar/rrule-utils";
import { PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export function ListView({ occurrences, onEdit }: { occurrences: ExpandedOccurrence[]; onEdit: (id: string) => void }) {
  const sorted = [...occurrences].sort((a, b) => a.occurrence_start.localeCompare(b.occurrence_start));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface-2 border-b border-border">
          <tr className="text-left">
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Quando</th>
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Atividade</th>
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Prioridade</th>
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Categoria</th>
            <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Tags</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Nenhuma atividade neste período.</td></tr>
          )}
          {sorted.map((o) => (
            <tr key={o.occurrence_id} onClick={() => onEdit(o.id)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition">
              <td className="px-3 py-2 whitespace-nowrap text-[12px] text-muted-foreground">
                {format(new Date(o.occurrence_start), "d MMM, HH:mm", { locale: ptBR })}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[o.priority] }} />
                  <span className={cn("font-medium", o.status === "done" && "line-through opacity-60")}>{o.title}</span>
                </div>
              </td>
              <td className="px-3 py-2"><span className="text-[11px] px-2 py-0.5 rounded border border-border bg-surface-2">{STATUS_LABELS[o.status]}</span></td>
              <td className="px-3 py-2"><span className="text-[11px]" style={{ color: PRIORITY_COLORS[o.priority] }}>{PRIORITY_LABELS[o.priority]}</span></td>
              <td className="px-3 py-2 text-muted-foreground">{o.category ?? "—"}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {o.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
