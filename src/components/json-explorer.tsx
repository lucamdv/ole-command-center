import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonExplorerProps {
  data: unknown;
  /** Chaves já renderizadas em outro lugar — serão omitidas. */
  omitKeys?: string[];
  /** Título do bloco. */
  title?: string;
  /** Profundidade inicial expandida. */
  defaultDepth?: number;
}

export function JsonExplorer({ data, omitKeys = [], title, defaultDepth = 1 }: JsonExplorerProps) {
  const filtered = useMemo(() => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;
    const obj = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (omitKeys.includes(k)) continue;
      if (v === null || v === undefined || v === "") continue;
      out[k] = v;
    }
    return out;
  }, [data, omitKeys]);

  const isEmpty =
    !filtered ||
    (typeof filtered === "object" && !Array.isArray(filtered) && Object.keys(filtered).length === 0);

  if (isEmpty) return null;

  return (
    <div className="panel">
      {title && (
        <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
          <div className="text-[12px] font-semibold tracking-tight">{title}</div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            campos adicionais
          </span>
        </div>
      )}
      <div className="p-3 font-mono text-[12px]">
        <Node value={filtered} depth={0} defaultDepth={defaultDepth} />
      </div>
    </div>
  );
}

function Node({
  value,
  label,
  depth,
  defaultDepth,
}: {
  value: unknown;
  label?: string;
  depth: number;
  defaultDepth: number;
}) {
  const [open, setOpen] = useState(depth < defaultDepth);

  if (value === null || value === undefined) {
    return <Leaf label={label} text="—" muted />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Leaf label={label} text="[]" muted />;
    return (
      <Collapsible
        label={label}
        summary={`[${value.length} itens]`}
        open={open}
        onToggle={() => setOpen(!open)}
      >
        {value.map((v, i) => (
          <Node key={i} label={`[${i}]`} value={v} depth={depth + 1} defaultDepth={defaultDepth} />
        ))}
      </Collapsible>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
    if (entries.length === 0) return <Leaf label={label} text="{}" muted />;
    return (
      <Collapsible
        label={label}
        summary={`{${entries.length} campos}`}
        open={open}
        onToggle={() => setOpen(!open)}
      >
        {entries.map(([k, v]) => (
          <Node key={k} label={k} value={v} depth={depth + 1} defaultDepth={defaultDepth} />
        ))}
      </Collapsible>
    );
  }

  return <Leaf label={label} text={String(value)} />;
}

function Leaf({ label, text, muted }: { label?: string; text: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 pl-5">
      {label && <span className="text-muted-foreground shrink-0">{label}:</span>}
      <span className={cn("break-all", muted ? "text-muted-foreground/60" : "text-foreground")}>
        {text}
      </span>
    </div>
  );
}

function Collapsible({
  label,
  summary,
  open,
  onToggle,
  children,
}: {
  label?: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-0.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-left hover:text-foreground transition w-full"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label && <span className="text-muted-foreground">{label}:</span>}
        <span className="text-muted-foreground/70">{summary}</span>
      </button>
      {open && <div className="ml-3 border-l border-border/40 pl-2">{children}</div>}
    </div>
  );
}
