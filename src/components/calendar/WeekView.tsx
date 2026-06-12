import { useMemo } from "react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ anchor, occurrences, onNew, onEdit, onMoved }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const move = useServerFn(moveActivity);

  const onDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("activity-id");
    const origStart = e.dataTransfer.getData("orig-start");
    const origEnd = e.dataTransfer.getData("orig-end");
    if (!id) return;
    const dur = new Date(origEnd).getTime() - new Date(origStart).getTime();
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + dur);
    await move({ data: { id, start_at: newStart.toISOString(), end_at: newEnd.toISOString() } });
    onMoved();
  };

  return (
    <div className="overflow-auto max-h-[70vh]">
      <div className="grid sticky top-0 z-10 bg-surface border-b border-border" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className={cn("px-2 py-2 text-center border-l border-border", isToday(d) && "bg-primary/5")}>
            <div className="text-[10.5px] uppercase font-mono text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</div>
            <div className={cn("text-[14px] font-semibold tabular-nums", isToday(d) && "text-primary")}>{format(d, "d")}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        {HOURS.map((h) => (
          <div key={h} className="contents">
            <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1 border-b border-border/40 h-12">{h.toString().padStart(2, "0")}:00</div>
            {days.map((d) => (
              <div
                key={`${d.toISOString()}-${h}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, d, h)}
                onDoubleClick={() => { const dt = new Date(d); dt.setHours(h, 0, 0, 0); onNew(dt); }}
                className="border-b border-l border-border/40 h-12 relative hover:bg-muted/20 transition cursor-pointer"
              >
                {occurrences
                  .filter((o) => {
                    const s = new Date(o.occurrence_start);
                    return s.toDateString() === d.toDateString() && s.getHours() === h;
                  })
                  .map((o) => (
                    <button
                      key={o.occurrence_id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("activity-id", o.id); e.dataTransfer.setData("orig-start", o.occurrence_start); e.dataTransfer.setData("orig-end", o.occurrence_end); }}
                      onClick={(e) => { e.stopPropagation(); onEdit(o.id); }}
                      className="absolute inset-x-0.5 top-0.5 text-[10.5px] px-1.5 py-1 rounded border-l-2 bg-surface-2 hover:bg-muted/60 text-left truncate"
                      style={{ borderLeftColor: PRIORITY_COLORS[o.priority] }}
                    >
                      <div className="font-medium truncate">{o.title}</div>
                      <div className="text-muted-foreground text-[9.5px]">{format(new Date(o.occurrence_start), "HH:mm")}</div>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
