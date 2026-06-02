import { ShieldQuestion } from "lucide-react";
import { RunAuditButton } from "./run-audit-button";

export function AuditEmptyState({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 backdrop-blur p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-40 pointer-events-none" />
      <div className="relative max-w-md mx-auto">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 border border-primary/30 grid place-items-center mb-4">
          <ShieldQuestion className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight">
          {title ?? "Nenhuma auditoria executada ainda"}
        </h2>
        <p className="text-[13px] text-muted-foreground mt-2 mb-6">
          {description ??
            "Dispare a primeira auditoria para que o motor processe a carteira e o Centro de Comando passe a operar com dados reais."}
        </p>
        <div className="flex justify-center">
          <RunAuditButton />
        </div>
      </div>
    </div>
  );
}
