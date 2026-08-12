import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RANGE,
  PRESET_LABELS,
  formatRangeBadge,
  isRangeActive,
  toISODate,
  type DateRangePreset,
  type DateRangeState,
} from "@/lib/analytics/date-filter";

function parseISO(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function fmt(iso: string | null, fallback: string): string {
  const d = parseISO(iso);
  if (!d) return fallback;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeState;
  onChange: (next: DateRangeState) => void;
}) {
  const active = isRangeActive(value);
  const badge = formatRangeBadge(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.preset}
        onValueChange={(p) =>
          onChange(
            p === "custom"
              ? { preset: "custom", from: value.from, to: value.to }
              : { preset: p as DateRangePreset, from: null, to: null },
          )
        }
      >
        <SelectTrigger className="h-9 w-[188px] text-[12px] bg-surface border-border">
          <CalendarIcon className="h-3.5 w-3.5 mr-1 opacity-70" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map((p) => (
            <SelectItem key={p} value={p} className="text-[12px]">
              {PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-[12px] font-normal bg-surface",
                  !value.from && "text-muted-foreground",
                )}
              >
                {fmt(value.from, "Data inicial")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseISO(value.from)}
                onSelect={(d) => onChange({ ...value, preset: "custom", from: d ? toISODate(d) : null })}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-[12px] text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-[12px] font-normal bg-surface",
                  !value.to && "text-muted-foreground",
                )}
              >
                {fmt(value.to, "Data final")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseISO(value.to)}
                onSelect={(d) => onChange({ ...value, preset: "custom", to: d ? toISODate(d) : null })}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {active && badge && (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
          {badge}
        </span>
      )}

      {(active || value.preset !== "all") && (
        <button
          onClick={() => onChange(DEFAULT_RANGE)}
          className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-[12px] text-muted-foreground transition"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      )}
    </div>
  );
}
