import type { ExceptionReasonTag } from "@/lib/exception-tags.functions";

/** Luminância relativa simples para decidir texto claro/escuro sobre a cor da tag. */
export function readableOn(hex: string): "#ffffff" | "#111827" {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#111827" : "#ffffff";
}

export function ReasonTagChip({
  tag,
  className,
}: {
  tag: Pick<ExceptionReasonTag, "name" | "color">;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${className ?? ""}`}
      style={{ backgroundColor: tag.color, color: readableOn(tag.color) }}
    >
      {tag.name}
    </span>
  );
}

/**
 * Exibe o motivo: chip colorido quando vem de uma tag, texto quando personalizado.
 */
export function ReasonDisplay({
  motivo,
  tagId,
  tags,
  emptyLabel,
}: {
  motivo: string | null;
  tagId?: string | null;
  tags: ExceptionReasonTag[];
  emptyLabel?: string;
}) {
  const tag = tagId ? tags.find((t) => t.id === tagId) : undefined;
  if (tag) {
    const extra = motivo && motivo !== tag.name ? motivo : null;
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <ReasonTagChip tag={tag} />
        {extra && <span className="text-[12.5px] text-muted-foreground">{extra}</span>}
      </span>
    );
  }
  if (motivo) return <span className="text-[12.5px]">{motivo}</span>;
  return <span className="italic text-muted-foreground">{emptyLabel ?? "Sem motivo"}</span>;
}
