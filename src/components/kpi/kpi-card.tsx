import {
  Area,
  AreaChart,
} from "recharts";
import { ResponsiveContainer } from "@/components/charts/in-view-container";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { cn } from "@/lib/utils";

export interface KpiProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number; // percentage
  spark?: number[];
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  suffix?: string;
  hint?: string;
}

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

export function KpiCard({
  label,
  value,
  format = (n) => Math.round(n).toLocaleString("pt-BR"),
  delta,
  spark,
  tone = "default",
  suffix,
  hint,
}: KpiProps) {
  const animated = useAnimatedCounter(value);
  const sparkData = spark?.map((v, i) => ({ i, v })) ?? [];
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
}
