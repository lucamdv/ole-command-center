import { useState } from "react";
import { VirtualList } from "@/components/ui/virtual-list";
import { ChevronRight } from "lucide-react";
import type { AuditFinding } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function AuditTable({ findings }: { findings: AuditFinding[] }) {
  const [openRow, setOpenRow] = useState<number | null>(0);

  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
        <div className="text-[13px] font-semibold text-success">Auditoria APROVADA</div>
        <div className="text-[12px] text-muted-foreground mt-1">
          Nenhuma inconsistência detectada nas execuções desta apólice.
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-semibold">Resultados da Auditoria</div>
        <div className="text-[11px] font-mono text-muted-foreground">
          {findings.length} {findings.length === 1 ? "achado" : "achados"}
        </div>
      </div>

      <div className="grid grid-cols-12 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/40 px-4 py-2 border-b border-border">
        <div className="col-span-4">Regra</div>
        <div className="col-span-2">Severidade</div>
        <div className="col-span-2">Resultado</div>
        <div className="col-span-3">Impacto</div>
        <div className="col-span-1" />
      </div>

      <VirtualList
        items={findings}
        getKey={(_, i) => String(i)}
        estimateSize={52}
        className="max-h-[70dvh]"
      >
        {(f, i) => {
          const open = openRow === i;
          return (
          <div key={i} className="border-b border-border/60 last:border-0">
            <button
              onClick={() => setOpenRow(open ? null : i)}
              className="w-full grid grid-cols-12 items-center px-4 py-3 text-left hover:bg-surface-2/40 transition"
            >
              <div className="col-span-4 text-[12.5px] font-medium text-foreground">{f.rule}</div>
              <div className="col-span-2">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border",
                    SEVERITY_STYLES[f.severity],
                  )}
                >
                  {f.severity}
                </span>
              </div>
              <div className="col-span-2 text-[11.5px] font-mono text-destructive">{f.result}</div>
              <div className="col-span-3 text-[12px] text-muted-foreground truncate">{f.impact}</div>
              <div className="col-span-1 flex justify-end">
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
              </div>
            </button>

            {open && (
              <div className="px-4 pb-4 pt-1 grid md:grid-cols-3 gap-4 bg-background/40">
                <Detail label="Descrição" value={f.description} />
                <Detail label="Impacto" value={f.impact} />
                <Detail label="Recomendação" value={f.recommendation} />
              </div>
            )}
          </div>
          );
        }}
      </VirtualList>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-[12px] text-foreground/90 leading-snug">{value}</div>
    </div>
  );
}
