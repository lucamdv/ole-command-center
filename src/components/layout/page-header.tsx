import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  /** Linha de contexto abaixo do título. */
  description?: ReactNode;
  /** Rótulo pequeno acima do título. */
  eyebrow?: ReactNode;
  /** Ações à direita (botões, filtros). */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
