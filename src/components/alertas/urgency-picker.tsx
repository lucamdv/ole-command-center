import { Lock, RotateCcw } from "lucide-react";
import { URGENCY_LABEL, URGENCY_ORDER, type Urgency } from "@/lib/audit/escalation";
import { cn } from "@/lib/utils";
import { URG_BG, URG_TEXT } from "./urgency-ui";

/** Seletor de nível de alerta manual. Sobrepõe o escalonamento automático. */
export function UrgencyPicker({
  value,
  manual,
  onSet,
  onClear,
  size = "sm",
}: {
  value: Urgency;
  manual: Urgency | null;
  onSet: (u: Urgency) => void;
  onClear: () => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-1">
      {manual && (
        <span title="Nível definido manualmente" className="flex">
          <Lock className="h-3 w-3 shrink-0 text-primary" />
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onSet(e.target.value as Urgency)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Definir nível de alerta"
        className={cn(
          "rounded-md border bg-surface px-1.5 font-medium capitalize outline-none transition focus:border-primary/60",
          size === "sm" ? "h-7 text-[11px]" : "h-8 text-[12px]",
          manual ? "border-primary/60" : "border-border",
          URG_TEXT[value],
          manual && URG_BG[value],
        )}
      >
        {[...URGENCY_ORDER].reverse().map((u) => (
          <option key={u} value={u} className="text-foreground">
            {URGENCY_LABEL[u]}
          </option>
        ))}
      </select>
      {manual && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          title="Voltar ao nível automático"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
