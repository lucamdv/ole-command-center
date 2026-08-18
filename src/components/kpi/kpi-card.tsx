import {
  Area,
  AreaChart,
} from "recharts";
import { ResponsiveContainer } from "@/components/charts/in-view-container";
import { memo, useMemo } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { cn } from "@/lib/utils";

export type KpiStatusTone = "ok" | "warn" | "bad";

export interface KpiProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number; // percentage
  spark?: number[];
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  suffix?: string;
  hint?: string;
  /** Texto curto da meta configurada, ex.: "meta ≤ 15%". */
  target?: string;
  /** Situação em relação à meta. */
  status?: KpiStatusTone;
}

const STATUS_STYLE: Record<KpiStatusTone, string> = {
  ok: "text-success bg-success/10 border-success/30",
  warn: "text-warning bg-warning/10 border-warning/30",
  bad: "text-destructive bg-destructive/10 border-destructive/30",
};

const STATUS_LABEL: Record<KpiStatusTone, string> = {
  ok: "na meta",
  warn: "atenção",
  bad: "fora da meta",
};


const TONE_RING: Record<NonNullable<KpiProps["tone"]>, string> = {
  default: "from-primary/30 to-transparent",
  success: "from-success/30 to-transparent",
  warning: "from-warning/30 to-transparent",
  destructive: "from-destructive/30 to-transparent",
  info: "from-info/30 to-transparent",
};

const TONE_STROKE: Record<NonNullable<KpiProps["tone"]>, string> = {
  default: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
};

export const KpiCard = memo(function KpiCard({
  label,
  value,
  format = (n) => Math.round(n).toLocaleString("pt-BR"),
  delta,
  spark,
  tone = "default",
  suffix,
  hint,
  target,
  status,
}: KpiProps) {
  const animated = useAnimatedCounter(value);
  const sparkData = useMemo(() => spark?.map((v, i) => ({ i, v })) ?? [], [spark]);
  const stroke = TONE_STROKE[tone];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface hover:border-primary/30 transition-all duration-300">
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br pointer-events-none",
          TONE_RING[tone],
        )}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {label}
          </span>
          {delta !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded",
                delta > 0 && "text-success bg-success/10",
                delta < 0 && "text-destructive bg-destructive/10",
                delta === 0 && "text-muted-foreground bg-muted/40",
              )}
            >
              {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : delta < 0 ? <ArrowDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-[21px] sm:text-[26px] font-semibold tracking-tight text-foreground tabular-nums leading-none">
            {format(animated)}
          </span>
          {suffix && <span className="text-[12px] text-muted-foreground font-mono">{suffix}</span>}
        </div>

        {hint && <div className="text-[10.5px] text-muted-foreground mb-2">{hint}</div>}

        {(target || status) && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {target && (
              <span className="text-[10px] font-mono text-muted-foreground/90">{target}</span>
            )}
            {status && (
              <span
                className={cn(
                  "rounded border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide",
                  STATUS_STYLE[status],
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            )}
          </div>
        )}

        {sparkData.length > 0 && (
          <div className="h-10 -mx-1 -mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={stroke}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});
