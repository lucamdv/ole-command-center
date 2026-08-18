import type { Urgency } from "@/lib/audit/escalation";

export const URG_TEXT: Record<Urgency, string> = {
  critica: "text-destructive",
  alta: "text-destructive",
  media: "text-warning",
  baixa: "text-info",
};

export const URG_BG: Record<Urgency, string> = {
  critica: "bg-destructive/15",
  alta: "bg-destructive/10",
  media: "bg-warning/10",
  baixa: "bg-info/10",
};

export const URG_DOT: Record<Urgency, string> = {
  critica: "bg-destructive",
  alta: "bg-destructive/70",
  media: "bg-warning",
  baixa: "bg-info",
};

export const URG_BORDER: Record<Urgency, string> = {
  critica:
    "border-l-destructive shadow-[inset_4px_0_0_var(--destructive),0_0_30px_-12px_var(--destructive)]",
  alta: "border-l-destructive/70 shadow-[inset_4px_0_0_var(--destructive)]",
  media: "border-l-warning shadow-[inset_4px_0_0_var(--warning)]",
  baixa: "border-l-info shadow-[inset_4px_0_0_var(--info)]",
};
