import { useState } from "react";
import { HEATMAP_DATA } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

function intensity(v: number, max: number) {
  return Math.min(1, v / max);
}

export function RiskHeatmap() {
  const [hover, setHover] = useState<{ rule: string; week: number; value: number } | null>(null);
  const max = Math.max(...HEATMAP_DATA.flatMap((r) => r.weeks));

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border bg-linear-to-r from-surface to-surface-2">
        <div>
          <div className="text-[14px] font-semibold tracking-tight">Matriz de Risco Operacional</div>
          <div className="text-[11px] text-muted-foreground">
            Incidência de falhas por regra de auditoria nas últimas 12 semanas
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
          <span>Menor</span>
          <div className="flex h-2 w-32 rounded overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  background: `color-mix(in oklab, var(--destructive) ${(i + 1) * 12}%, transparent)`,
                }}
              />
            ))}
          </div>
          <span>Maior</span>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Column labels */}
          <div className="flex items-center gap-1 mb-2 pl-[220px]">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex-1 text-center text-[10px] font-mono text-muted-foreground/70">
                S{i + 1}
              </div>
            ))}
          </div>

          {HEATMAP_DATA.map((row) => (
            <div key={row.rule} className="flex items-center gap-1 mb-1">
              <div className="w-[220px] pr-3 text-[12px] text-muted-foreground truncate">{row.rule}</div>
              <div className="flex-1 flex items-center gap-1">
                {row.weeks.map((v, i) => {
                  const ratio = intensity(v, max);
                  const isHot = hover?.rule === row.rule && hover?.week === i;
                  return (
                    <button
                      key={i}
                      onMouseEnter={() => setHover({ rule: row.rule, week: i, value: v })}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "flex-1 h-7 rounded-[5px] transition-all duration-150",
                        isHot && "ring-2 ring-primary ring-offset-2 ring-offset-surface scale-110",
                      )}
                      style={{
                        background:
                          v === 0
                            ? "color-mix(in oklab, var(--muted) 50%, transparent)"
                            : `color-mix(in oklab, var(--destructive) ${20 + ratio * 70}%, transparent)`,
                      }}
                      title={`${row.rule} · S${i + 1} · ${v} ocorrências`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-5 py-3 flex items-center justify-between text-[11px]">
        {hover ? (
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">{hover.rule}</span> · Semana{" "}
            <span className="font-mono text-foreground">{hover.week + 1}</span> ·{" "}
            <span className="font-mono text-destructive">{hover.value}</span> ocorrências
          </div>
        ) : (
          <div className="text-muted-foreground">Passe o cursor sobre uma célula para detalhes</div>
        )}
        <div className="text-muted-foreground font-mono">
          Pico: <span className="text-destructive">{max}</span> · Total ciclo:{" "}
          <span className="text-foreground">{HEATMAP_DATA.reduce((s, r) => s + r.weeks.reduce((a, b) => a + b, 0), 0)}</span>
        </div>
      </div>
    </div>
  );
}
