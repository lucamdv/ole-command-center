import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Altura do gráfico por porte de tela. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE: Record<NonNullable<ChartFrameProps["size"]>, string> = {
  sm: "h-[180px] sm:h-[200px]",
  md: "h-[220px] sm:h-[260px]",
  lg: "h-[260px] sm:h-[320px]",
};

export function ChartFrame({ title, subtitle, actions, children, size = "md", className }: ChartFrameProps) {
  return (
    <div className={cn("panel flex flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <div className="section-title truncate">{title}</div>
          {subtitle && <div className="caption mt-0.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
      <div className={cn("px-1.5 pb-2", SIZE[size])}>{children}</div>
    </div>
  );
}
