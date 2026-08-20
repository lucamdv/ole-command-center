import { AlertTriangle } from "lucide-react";
import type { Policy } from "@/lib/mock/data";
import { formatDate } from "@/lib/format";

export function ValidityTimeline({ policy }: { policy: Policy }) {
  // Build 4 segments: vigência atual + 3 segmentos artificiais para mostrar histórico/renovações/gap
  const segments = [
    { label: "Vigência anterior", from: "2023-01-15", to: "2024-01-14", tone: "muted" as const },
    ...(policy.hasGap
      ? [{ label: "GAP DE VIGÊNCIA", from: "2024-01-15", to: "2024-02-04", tone: "gap" as const }]
      : []),
    {
      label: "Vigência atual",
      from: policy.hasGap ? "2024-02-05" : policy.startDate,
      to: policy.endDate,
      tone: "primary" as const,
    },
    { label: "Renovação prevista", from: "2025-01-15", to: "2026-01-14", tone: "future" as const },
  ];

  const start = +new Date("2023-01-01");
  const end = +new Date("2026-02-01");
  const totalMs = end - start;

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[13px] font-semibold">Linha do Tempo de Vigência</div>
          <div className="text-[11px] text-muted-foreground">Histórico de períodos, renovações e descontinuidades</div>
        </div>
        {policy.hasGap && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            GAP detectado
          </div>
        )}
      </div>

      <div className="relative h-12 rounded-lg bg-background/60 border border-border overflow-hidden">
        {/* Year markers */}
        {["2023", "2024", "2025", "2026"].map((y) => {
          const left = ((+new Date(`${y}-01-01`) - start) / totalMs) * 100;
          return (
            <div key={y} className="absolute top-0 bottom-0 border-l border-border/60" style={{ left: `${left}%` }}>
              <span className="absolute -top-4 left-1 text-[10px] font-mono text-muted-foreground">{y}</span>
            </div>
          );
        })}

        {/* Segments */}
        {segments.map((s, i) => {
          const left = ((+new Date(s.from) - start) / totalMs) * 100;
          const width = ((+new Date(s.to) - +new Date(s.from)) / totalMs) * 100;
          const cls =
            s.tone === "gap"
              ? "bg-destructive/40 border-destructive shadow-[0_0_20px_var(--destructive)]"
              : s.tone === "primary"
                ? "bg-primary/40 border-primary"
                : s.tone === "future"
                  ? "bg-info/20 border-info/50 border-dashed"
                  : "bg-muted/40 border-border";
          return (
            <div
              key={i}
              className={`absolute top-2 bottom-2 rounded border ${cls} group`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="absolute inset-0 px-2 flex items-center text-[10.5px] font-medium truncate text-foreground/90">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {segments.map((s, i) => (
          <div key={i} className="text-[11px]">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{s.label}</div>
            <div className="font-mono text-foreground mt-0.5">
              {formatDate(s.from)} → {formatDate(s.to)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
