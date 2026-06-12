import { format } from "date-fns";
import type { ExpandedOccurrence } from "@/lib/calendar/rrule-utils";
import { PRIORITY_COLORS, STATUS_LABELS } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

interface Props {
  anchor: Date;
  occurrences: ExpandedOccurrence[];
  onNew: (date: Date) => void;
  onEdit: (id: string) => void;
  onMoved: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ anchor, occurrences, onNew, onEdit }: Props) {
  const items = occurrences.filter((o) => new Date(o.occurrence_start).toDateString() === anchor.toDateString());
  const now = new Date();
  const isCurrentDay = now.toDateString() === anchor.toDateString();
  return (
    <div className="overflow-auto max-h-[70vh]">
      {HOURS.map((h) => {
        const hourItems = items.filter((o) => new Date(o.occurrence_start).getHours() === h);
        return (
          <div key={h} className="flex border-b border-border/40 min-h-[60px] relative hover:bg-muted/10 transition group">
            <div className="w-16 text-[10.5px] text-muted-foreground text-right pr-2 pt-1 shrink-0">{h.toString().padStart(2, "0")}:00</div>
            <div
              className="flex-1 p-1 cursor-pointer"
              onDoubleClick={() => { const dt = new Date(anchor); dt.setHours(h, 0, 0, 0); onNew(dt); }}
            >
              {hourItems.map((o) => (
                <button
                  key={o.occurrence_id}
                  onClick={(e) => { e.stopPropagation(); onEdit(o.id); }}
                  className={cn("w-full text-left p-2 rounded-md border-l-4 bg-surface-2 hover:bg-muted/40 transition mb-1", o.status === "done" && "opacity-60")}
                  style={{ borderLeftColor: PRIORITY_COLORS[o.priority] }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[13px] truncate">{o.title}</div>
                    <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[o.status]}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {format(new Date(o.occurrence_start), "HH:mm")} – {format(new Date(o.occurrence_end), "HH:mm")}
                  </div>
                </button>
              ))}
            </div>
            {isCurrentDay && now.getHours() === h && (
              <div className="absolute left-16 right-0 h-px bg-primary z-10" style={{ top: `${(now.getMinutes() / 60) * 100}%` }}>
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
