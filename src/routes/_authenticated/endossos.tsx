import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitBranch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/endossos")({
  head: () => ({
    meta: [
      { title: "Endossos · OLÉ COPILOT" },
      { name: "description", content: "Endossos vivem dentro de cada apólice." },
    ],
  }),
  component: EndossosPage,
});

function EndossosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Endossos</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Visualização consolidada dos endossos
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-surface p-10 text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center mx-auto mb-4">
          <GitBranch className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-[16px] font-semibold">Endossos agora vivem dentro da apólice</h2>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto">
          Para evitar perda de contexto, cada endosso é acessado pela apólice de origem. Abra uma
          apólice na carteira para navegar pelos seus endossos.
        </p>
        <Link
          to="/apolices"
          className="inline-flex items-center gap-2 mt-6 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium"
        >
          Ir para Apólices <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
