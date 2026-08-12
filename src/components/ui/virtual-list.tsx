import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  /** Chave estável por item. */
  getKey: (item: T, index: number) => string;
  /** Altura estimada da linha (px) — usada antes da medição real. */
  estimateSize?: number;
  /** Altura máxima do container de rolagem. */
  className?: string;
  /** Espaço vertical entre linhas (px). */
  gap?: number;
  /** Nº de linhas renderizadas fora da viewport. */
  overscan?: number;
  /** Abaixo deste total, renderiza tudo sem virtualizar. */
  threshold?: number;
  children: (item: T, index: number) => ReactNode;
}

/**
 * Lista virtualizada com medição dinâmica de altura.
 * Só entra em modo virtual acima de `threshold` itens — listas curtas
 * continuam com markup simples (sem custo de observers).
 */
export function VirtualList<T>({
  items,
  getKey,
  estimateSize = 64,
  className,
  gap = 0,
  overscan = 6,
  threshold = 30,
  children,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualize = items.length > threshold;

  const virtualizer = useVirtualizer({
    count: virtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
  });

  if (!virtualize) {
    return (
      <div style={gap ? { display: "flex", flexDirection: "column", gap } : undefined}>
        {items.map((item, i) => (
          <div key={getKey(item, i)}>{children(item, i)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("overflow-y-auto overflow-x-hidden overscroll-contain", className)}
      style={{ contain: "paint" }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualItems.map((vi) => {
          const item = items[vi.index];
          return (
            <div
              key={getKey(item, vi.index)}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: gap,
              }}
            >
              {children(item, vi.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
