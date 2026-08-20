import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Sparkles, Hammer, ArrowRight, Layers } from "lucide-react";


export const Route = createFileRoute("/_authenticated/ferramentas/")({
  head: () => ({
    meta: [
      { title: "Ferramentas · OLÉ COPILOT" },
      {
        name: "description",
        content: "Conjunto de ferramentas operacionais da plataforma OLÉ — em breve.",
      },
    ],
  }),
  component: FerramentasPage,
});

function FerramentasPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">OLÉ COPILOT</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Ferramentas</span>
        </div>
        <h1 className="page-title">Ferramentas Operacionais</h1>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
          Um conjunto de ferramentas de produtividade, automação e análise — desenhadas para acelerar a operação
          OLÉ.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/ferramentas/extrator-endossos"
          className="group relative overflow-hidden panel p-5 hover:border-primary/40 transition"
        >
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-wider mb-4">
              <Sparkles className="h-3 w-3" />
              Disponível
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight mb-1.5 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Extrator de Últimos Endossos
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Dispara o fluxo do MOTOR OLÉ e devolve o último endosso emitido de cada apólice, com
              exceções próprias e exportação em CSV ou PDF.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-primary font-medium">
              Abrir ferramenta
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </Link>


        <div className="relative overflow-hidden panel p-5">
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider mb-4">
              <Hammer className="h-3 w-3" />
              Em construção
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight mb-1.5 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              Mais ferramentas a caminho
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Importadores em lote, validadores OLÉ e simuladores de prêmio/cobertura estão sendo preparados para
              esta área.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Importadores" },
                { label: "Validadores" },
                { label: "Simuladores" },
              ].map((t) => (
                <div
                  key={t.label}
                  className="rounded-lg border border-border/60 bg-surface/60 p-2 text-center text-[11px] text-muted-foreground"
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
