import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, GitBranch } from "lucide-react";
import { useEndorsementDetail } from "@/hooks/use-policies";
import { formatBRL, formatDateTime } from "@/lib/format";
import { JsonExplorer } from "@/components/json-explorer";

export const Route = createFileRoute("/apolices/$id/endossos/$num")({
  head: ({ params }) => ({
    meta: [
      { title: `Endosso ${params.num} · ${params.id} · OLÉ COPILOT` },
      { name: "description", content: `Detalhe do endosso ${params.num}.` },
    ],
  }),
  component: EndossoDetail,
});

function EndossoDetail() {
  const { id, num } = Route.useParams();
  const { data: endo, isLoading } = useEndorsementDetail(id, num);

  if (isLoading) {
    return <div className="text-[13px] text-muted-foreground">Carregando endosso…</div>;
  }

  if (!endo) {
    return (
      <div className="space-y-4">
        <Link
          to="/apolices/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à apólice
        </Link>
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-[13px] text-muted-foreground">
          Endosso não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Link to="/apolices" className="hover:text-foreground transition">
          Apólices
        </Link>
        <span>/</span>
        <Link to="/apolices/$id" params={{ id }} className="hover:text-foreground transition font-mono">
          {id}
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono">Endosso {num}</span>
      </nav>

      <div className="rounded-2xl border border-border bg-gradient-surface p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground mb-1">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="font-mono">ENDOSSO #{endo.ordem}</span>
            </div>
            <div className="font-mono text-[22px] font-semibold tracking-tight">
              {endo.numero_endosso}
            </div>
            <div className="text-[12px] text-muted-foreground mt-1">
              Da apólice <span className="font-mono">{endo.numero_apolice}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Prêmio líquido
            </div>
            <div className="text-[20px] font-semibold text-foreground font-mono">
              {formatBRL(endo.premio_liquido)}
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-1">
              {formatDateTime(endo.created_at)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <div className="text-[14px] font-semibold">Conteúdo do endosso</div>
          <div className="text-[11px] text-muted-foreground">
            Dados completos retornados pelo MOTOR OLÉ
          </div>
        </div>
        <JsonExplorer data={endo.proposta} title="Proposta do endosso" defaultDepth={2} />
      </div>
    </div>
  );
}
