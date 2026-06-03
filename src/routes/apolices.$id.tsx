import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, GitBranch } from "lucide-react";
import { usePolicy } from "@/hooks/use-policies";
import { formatBRL, formatDateTime, relativeTime } from "@/lib/format";
import { JsonExplorer } from "@/components/json-explorer";

export const Route = createFileRoute("/apolices/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} · Apólice · OLÉ COPILOT` },
      { name: "description", content: `Detalhe da apólice ${params.id}.` },
    ],
  }),
  component: ApoliceDetail,
});

// Campos que renderizamos com layout dedicado — não duplicar no JsonExplorer.
const KNOWN_KEYS = [
  "segurado",
  "tomador",
  "corretor",
  "produto",
  "ramo",
  "coberturas",
  "vigencia",
  "data_inicio_vigencia",
  "data_fim_vigencia",
  "vigencia_inicio",
  "vigencia_fim",
  "premio_liquido",
  "premio_bruto",
  "valor_premio",
  "numero_apolice",
  "numero_apolice_seguradora",
  "numero_endosso",
  "numero_endosso_seguradora",
];

export default function ApoliceDetail() {
  const { id } = Route.useParams();
  const { data: policy, isLoading } = usePolicy(id);

  if (isLoading) {
    return <div className="text-[13px] text-muted-foreground">Carregando apólice…</div>;
  }

  if (!policy) {
    return (
      <div className="space-y-4">
        <Link
          to="/apolices"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar à carteira
        </Link>
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <div className="text-[13px] font-medium">Apólice não encontrada</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            Esta apólice não está na carteira sincronizada.
          </div>
        </div>
      </div>
    );
  }

  const proposta = policy.proposta ?? {};
  const summary = extractKnown(proposta);

  return (
    <div className="space-y-6">
      <Link
        to="/apolices"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à carteira
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-surface p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="font-mono text-[12.5px] text-muted-foreground mb-1">APÓLICE</div>
            <div className="font-mono text-[26px] font-semibold tracking-tight">
              {policy.numero_apolice}
            </div>
            {summary.segurado && (
              <div className="text-[13px] text-muted-foreground mt-1">{summary.segurado}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Prêmio líquido
            </div>
            <div className="text-[22px] font-semibold text-foreground font-mono">
              {formatBRL(policy.premio_liquido)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 mt-6 rounded-xl overflow-hidden">
          <Fact label="Endosso atual" value={policy.numero_endosso_atual ?? "—"} />
          <Fact label="Endossos" value={String(policy.endorsements.length)} />
          <Fact
            label="Vigência"
            value={
              summary.vigencia_inicio && summary.vigencia_fim
                ? `${summary.vigencia_inicio} → ${summary.vigencia_fim}`
                : "—"
            }
          />
          <Fact
            label="Última sincronização"
            value={
              policy.last_sync_at ? relativeTime(policy.last_sync_at) : relativeTime(policy.updated_at)
            }
            hint={formatDateTime(policy.last_sync_at ?? policy.updated_at)}
          />
        </div>
      </div>

      {/* Conhecidos */}
      {(summary.corretor || summary.produto || summary.tomador) && (
        <div>
          <SectionTitle title="Resumo" subtitle="Campos principais reconhecidos automaticamente" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.tomador && <InfoCard label="Tomador" value={summary.tomador} />}
            {summary.segurado && <InfoCard label="Segurado" value={summary.segurado} />}
            {summary.corretor && <InfoCard label="Corretor" value={summary.corretor} />}
            {summary.produto && <InfoCard label="Produto" value={summary.produto} />}
            {summary.ramo && <InfoCard label="Ramo" value={summary.ramo} />}
          </div>
        </div>
      )}

      {/* Coberturas se houver array */}
      {Array.isArray(summary.coberturas) && summary.coberturas.length > 0 && (
        <div>
          <SectionTitle
            title="Coberturas"
            subtitle={`${summary.coberturas.length} coberturas contratadas`}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.coberturas.map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <JsonExplorer data={c} defaultDepth={2} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Endossos */}
      <div>
        <SectionTitle
          title="Endossos"
          subtitle={`${policy.endorsements.length} endossos · clique para abrir`}
        />
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-surface-2/60 border-b border-border">
            <div className="col-span-2">#</div>
            <div className="col-span-6">Número do endosso</div>
            <div className="col-span-3 text-right">Prêmio líquido</div>
            <div className="col-span-1 text-right">→</div>
          </div>
          {policy.endorsements.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              Apólice sem endossos registrados.
            </div>
          )}
          {policy.endorsements.map((e) => (
            <Link
              key={e.id}
              to="/apolices/$id/endossos/$num"
              params={{ id: policy.numero_apolice, num: e.numero_endosso }}
              className="grid grid-cols-12 items-center px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-surface-2/50 transition"
            >
              <div className="col-span-2 font-mono text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" /> {e.ordem}
              </div>
              <div className="col-span-6 font-mono text-[12.5px]">{e.numero_endosso}</div>
              <div className="col-span-3 text-right font-mono text-[12px]">
                {formatBRL(e.premio_liquido)}
              </div>
              <div className="col-span-1 text-right text-muted-foreground">›</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Fallback completo */}
      <div>
        <SectionTitle title="Dados completos da proposta" subtitle="Plano B — todos os campos retornados pelo MOTOR OLÉ" />
        <JsonExplorer data={proposta} omitKeys={KNOWN_KEYS} title="Proposta (campos restantes)" />
      </div>
    </div>
  );
}

function extractKnown(p: Record<string, unknown>) {
  const get = (k: string) => p[k] as unknown;
  const str = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      return (o.nome as string) ?? (o.descricao as string) ?? (o.razao_social as string) ?? null;
    }
    return null;
  };
  return {
    segurado: str(get("segurado")),
    tomador: str(get("tomador")),
    corretor: str(get("corretor")),
    produto: str(get("produto")),
    ramo: str(get("ramo")),
    coberturas: Array.isArray(get("coberturas")) ? (get("coberturas") as unknown[]) : null,
    vigencia_inicio:
      str(get("data_inicio_vigencia")) ?? str(get("vigencia_inicio")) ?? null,
    vigencia_fim: str(get("data_fim_vigencia")) ?? str(get("vigencia_fim")) ?? null,
  };
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[13px] font-semibold text-foreground mt-0.5 truncate">{value}</div>
      {hint && <div className="text-[10.5px] font-mono text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[13.5px] font-medium text-foreground mt-1">{value}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <div className="text-[14px] font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}
