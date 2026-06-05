import { createFileRoute } from "@tanstack/react-router";
import { Wrench, Sparkles, Hammer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ferramentas")({
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
        <h1 className="text-[24px] font-semibold tracking-tight">Ferramentas Operacionais</h1>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
          Um conjunto de ferramentas de produtividade, automação e análise — desenhadas para acelerar a operação
          OLÉ.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-surface to-surface-2 p-10 shadow-elevated">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary text-[11px] font-mono uppercase tracking-wider mb-4">
            <Sparkles className="h-3 w-3" />
            Em construção
          </div>
          <h2 className="text-[22px] font-semibold tracking-tight mb-2 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Caixa de ferramentas a caminho
          </h2>
          <p className="text-[13.5px] text-muted-foreground leading-relaxed">
            Estamos preparando utilitários como simuladores de cálculo, importadores em lote, validadores de
            documentação e integrações diretas com o motor de auditoria. Em breve disponíveis nesta aba.
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { label: "Importadores", desc: "Carga em lote de apólices e endossos" },
              { label: "Validadores", desc: "Check rápido contra regras OLÉ" },
              { label: "Simuladores", desc: "Cenários de prêmio e cobertura" },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-xl border border-border/60 bg-surface/60 p-3.5 hover:border-primary/30 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12.5px] font-semibold">{t.label}</span>
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
