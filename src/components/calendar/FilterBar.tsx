import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityFilters, ActivityStatus, ActivityPriority } from "@/lib/calendar/types";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/calendar/types";

export function FilterBar({ filters, onChange }: { filters: ActivityFilters; onChange: (f: ActivityFilters) => void }) {
  const [search, setSearch] = useState(filters.search ?? "");
  const activeCount =
    (filters.statuses?.length ?? 0) + (filters.priorities?.length ?? 0) + (filters.tags?.length ?? 0) + (filters.search ? 1 : 0);

  const toggle = <K extends keyof ActivityFilters>(k: K, v: string) => {
    const cur = (filters[k] as string[] | undefined) ?? [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    onChange({ ...filters, [k]: next.length ? next : undefined });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filtros {activeCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Buscar</label>
            <div className="flex gap-1.5 mt-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onChange({ ...filters, search: search || undefined })}
                placeholder="Título da atividade"
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <Section label="Status">
            {(Object.keys(STATUS_LABELS) as ActivityStatus[]).map((s) => (
              <Chip key={s} active={filters.statuses?.includes(s)} onClick={() => toggle("statuses", s)}>
                {STATUS_LABELS[s]}
              </Chip>
            ))}
          </Section>

          <Section label="Prioridade">
            {(Object.keys(PRIORITY_LABELS) as ActivityPriority[]).map((p) => (
              <Chip key={p} active={filters.priorities?.includes(p)} onClick={() => toggle("priorities", p)}>
                {PRIORITY_LABELS[p]}
              </Chip>
            ))}
          </Section>

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={() => { setSearch(""); onChange({}); }}>
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] px-2 py-1 rounded-md border transition",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
