import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useServerFn } from "@tanstack/react-start";
import { moveActivity } from "@/lib/calendar.functions";
import type { ExpandedOccurrence } from "@/lib/calendar/rrule-utils";
import { PRIORITY_COLORS } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

interface Props {
  anchor: Date;
  occurrences: ExpandedOccurrence[];
  onNew: (date: Date) => void;
  onEdit: (id: string) => void;
  onMoved: () => void;
}

export function MonthView({ anchor, occurrences, onNew, onEdit, onMoved }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
    const arr: Date[] = [];
    let d = start;
    while (d <= end) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [anchor]);

  const byDay = useMemo(() => {
    const m = new Map<string, ExpandedOccurrence[]>();
    occurrences.forEach((o) => {
      const k = format(new Date(o.occurrence_start), "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    });
    return m;
  }, [occurrences]);

  const move = useServerFn(moveActivity);

  const onDrop = async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("activity-id");
    const origStart = e.dataTransfer.getData("orig-start");
    const origEnd = e.dataTransfer.getData("orig-end");
    if (!id || !origStart) return;
    const oldStart = new Date(origStart);
    const oldEnd = new Date(origEnd);
    const newStart = new Date(day);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const dur = oldEnd.getTime() - oldStart.getTime();
    const newEnd = new Date(newStart.getTime() + dur);
    await move({ data: { id, start_at: newStart.toISOString(), end_at: newEnd.toISOString() } });
    onMoved();
  };

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border bg-surface-2">
        {["DOM","SEG","TER","QUA","QUI","SEX","SÁB"].map((d) => (
          <div key={d} className="px-3 py-2 text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const k = format(day, "yyyy-MM-dd");
          const items = byDay.get(k) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const today = isToday(day);
          return (
            <div
              key={k}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, day)}
              onDoubleClick={() => onNew(day)}
              className={cn(
                "min-h-[120px] border-r border-b border-border p-1.5 cursor-pointer hover:bg-muted/20 transition relative group",
                !inMonth && "bg-surface-2/40 opacity-60",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[11.5px] font-medium tabular-nums w-6 h-6 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground",
                  !today && "text-foreground",
                )}>{format(day, "d")}</span>
                {items.length > 0 && <span className="text-[10px] text-muted-foreground">{items.length}</span>}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((o) => (
                  <button
                    key={o.occurrence_id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("activity-id", o.id); e.dataTransfer.setData("orig-start", o.occurrence_start); e.dataTransfer.setData("orig-end", o.occurrence_end); }}
                    onClick={(e) => { e.stopPropagation(); onEdit(o.id); }}
                    title={`${o.title} — ${format(new Date(o.occurrence_start), "HH:mm")}`}
                    className={cn(
                      "w-full text-left text-[10.5px] px-1.5 py-0.5 rounded truncate border-l-2 bg-surface-2 hover:bg-muted/50 transition",
                      o.status === "done" && "line-through opacity-60",
                    )}
                    style={{ borderLeftColor: PRIORITY_COLORS[o.priority] }}
                  >
                    {!o.all_day && <span className="text-muted-foreground mr-1">{format(new Date(o.occurrence_start), "HH:mm")}</span>}
                    {o.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <button onClick={(e) => { e.stopPropagation(); onNew(day); }} className="text-[10px] text-primary hover:underline">
                    +{items.length - 3} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
