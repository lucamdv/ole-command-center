import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2, CheckCircle2, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { POLICIES } from "@/lib/mock/data";
import { formatBRL, formatDate } from "@/lib/format";
import { EndorsementTimeline } from "@/components/timeline/endorsement-timeline";
import { ValidityTimeline } from "@/components/timeline/validity-timeline";
import { AuditTable } from "@/components/audit/audit-table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apolices/$id")({
  head: ({ params }) => {
    const p = POLICIES.find((x) => x.id === params.id);
    return {
      meta: [
        { title: p ? `${p.number} · OLÉ COPILOT` : "Apólice · OLÉ COPILOT" },
        { name: "description", content: p ? `Detalhe operacional da apólice ${p.number} — ${p.insured}.` : "Detalhe da apólice." },
      ],
    };
  },
  loader: ({ params }) => {
    const policy = POLICIES.find((p) => p.id === params.id);
    if (!policy) throw notFound();
    return { policy };
  },
  component: ApoliceDetail,
});

function ApoliceDetail() {
  const { policy } = Route.useLoaderData();
  const approved = policy.audit === "APROVADA";

  return (
    <div className="space-y-6">
      <Link to="/apolices" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à carteira
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-surface p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[12.5px] text-muted-foreground">APÓLICE</span>
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase",
                  policy.status === "ativa" && "bg-success/10 text-success",
                  policy.status === "cancelada" && "bg-destructive/10 text-destructive",
                  policy.status === "suspensa" && "bg-warning/10 text-warning",
                  policy.status === "renovada" && "bg-info/10 text-info",
                )}
              >
                {policy.status}
              </span>
            </div>
            <div className="font-mono text-[26px] font-semibold tracking-tight">{policy.number}</div>
            <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" /> {policy.insured}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border",
              approved
                ? "bg-success/10 border-success/30 text-success"
                : "bg-destructive/10 border-destructive/30 text-destructive",
            )}
          >
            {approved ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            <div>
              <div className="text-[10.5px] uppercase tracking-wider opacity-80">Auditoria</div>
              <div className="text-[16px] font-semibold">{policy.audit}</div>
            </div>
          </div>
        </div>

        {/* Key facts */}
        <div className="relative grid grid-cols-2 md:grid-cols-5 gap-px bg-border/60 mt-6 rounded-xl overflow-hidden">
          <Fact label="Prêmio" value={formatBRL(policy.premium)} />
          <Fact label="Exposição" value={formatBRL(policy.exposure)} />
          <Fact label="Corretor" value={policy.broker} hint={policy.brokerCode} />
          <Fact label="Produto" value={policy.product} />
          <Fact label="Vigência" value={`${formatDate(policy.startDate)} → ${formatDate(policy.endDate)}`} />
        </div>
      </div>

      {/* Coverages */}
      <div>
        <SectionTitle title="Coberturas" subtitle={`${policy.coverages.length} coberturas contratadas`} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {policy.coverages.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border bg-surface p-4 transition hover:border-primary/30",
                c.compliant ? "border-border" : "border-destructive/30",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-[13px] font-semibold leading-tight pr-2">{c.name}</div>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border",
                    c.status === "ativa" && "bg-success/10 text-success border-success/30",
                    c.status === "inativa" && "bg-muted text-muted-foreground border-border",
                    c.status === "suspensa" && "bg-warning/10 text-warning border-warning/30",
                  )}
                >
                  {c.status}
                </span>
              </div>
              <div className="space-y-1.5">
                <Row label="Valor segurado" value={formatBRL(c.insuredAmount)} />
                <Row label="Prêmio" value={formatBRL(c.premium)} />
                <Row label="Vigência" value={`${formatDate(c.startDate)} → ${formatDate(c.endDate)}`} />
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/60 text-[11px]">
                {c.compliant ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-success">Conforme</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-destructive">Inconformidade detectada</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validity */}
      <ValidityTimeline policy={policy} />

      {/* Endorsements + Audit */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionTitle title="Timeline de Endossos" subtitle={`${policy.endorsements.length} alterações registradas`} />
          <EndorsementTimeline items={policy.endorsements} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle title="Auditoria" subtitle="Execução automatizada do motor" />
          <AuditTable findings={policy.findings} />
        </div>
      </div>
    </div>
  );
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
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
