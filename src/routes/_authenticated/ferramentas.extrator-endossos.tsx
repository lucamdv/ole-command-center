import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  EyeOff,
  FileDown,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VirtualList } from "@/components/ui/virtual-list";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  useAddEndorsementException,
  useEndorsementExceptions,
  useLatestExtraction,
  useRemoveEndorsementException,
  useRunEndorsementExtraction,
  useUpdateEndorsementException,
} from "@/hooks/use-endorsement-extraction";
import type { EndorsementExceptionRow } from "@/lib/endorsement-extraction.functions";
import { useExceptionTags } from "@/hooks/use-exception-tags";
import { IgnoreReasonDialog } from "@/components/exceptions/ignore-reason-dialog";
import { ReasonDisplay } from "@/components/exceptions/reason-chip";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ferramentas/extrator-endossos")({
  head: () => ({
    meta: [
      { title: "Extrator de Últimos Endossos · OLÉ COPILOT" },
      {
        name: "description",
        content:
          "Extraia o último endosso emitido de cada apólice da carteira e exporte em CSV ou PDF.",
      },
      { property: "og:title", content: "Extrator de Últimos Endossos · OLÉ COPILOT" },
      {
        property: "og:description",
        content: "Último endosso emitido por apólice, com exceções e exportação CSV/PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExtratorPage,
});

function ExtratorPage() {
  const { data: roleInfo } = useCurrentRole();
  const isAdmin = !!roleInfo?.isAdmin;

  const { data: latest, isLoading } = useLatestExtraction();
  const { mutate: run, isRunning } = useRunEndorsementExtraction();
  const addException = useAddEndorsementException();

  const [q, setQ] = useState("");
  const [asc, setAsc] = useState(true);
  const [pendingPolicy, setPendingPolicy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const items = latest?.items ?? [];
    const term = q.trim().toLowerCase();
    const filtered = term
      ? items.filter((i) => i.policy_number.toLowerCase().includes(term))
      : items;
    return [...filtered].sort((a, b) =>
      asc
        ? a.policy_number.localeCompare(b.policy_number)
        : b.policy_number.localeCompare(a.policy_number),
    );
  }, [latest, q, asc]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">
              Ferramentas
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Extrator
            </span>
          </div>
          <h1 className="page-title flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Extrator de Últimos Endossos
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                latest ? "bg-emerald-500" : isRunning ? "bg-warning animate-pulse" : "bg-muted-foreground/50",
              )}
            />
            <span>
              <span className="text-foreground font-medium">{latest?.items.length ?? 0}</span>{" "}
              apólices
            </span>
            {!!latest?.hiddenCount && (
              <>
                <span className="text-border">•</span>
                <span>{latest.hiddenCount} ocultadas por exceção</span>
              </>
            )}
            <span className="text-border">•</span>
            <span title={latest?.run.finished_at ? formatDateTime(latest.run.finished_at) : undefined}>
              {latest?.run.finished_at
                ? `última extração ${relativeTime(latest.run.finished_at)}`
                : isRunning
                  ? "extração em andamento"
                  : "nenhuma extração ainda"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExceptionsDialog isAdmin={isAdmin} />
          <Button
            variant="outline"
            className="h-10 gap-2 text-[12.5px]"
            disabled={rows.length === 0}
            onClick={async () => {
              const { exportEndorsementsCsv } = await import("@/lib/extrator/export-endorsements");
              exportEndorsementsCsv(rows);
            }}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2 text-[12.5px]"
            disabled={rows.length === 0}
            onClick={async () => {
              const { exportEndorsementsPdf } = await import("@/lib/extrator/export-endorsements");
              exportEndorsementsPdf(rows, latest?.run.finished_at ?? null);
            }}
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            className="h-10 gap-2 text-[12.5px] font-semibold"
            disabled={isRunning}
            onClick={() => run()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
            {isRunning ? "Extraindo…" : "Extrair últimos endossos"}
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative w-full md:w-[380px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar apólice…"
          className="pl-9 h-10 text-[12.5px]"
        />
      </div>

      {/* Tabela */}
      <div className="panel overflow-hidden">
        <div
          className={
            isAdmin
              ? "grid grid-cols-[minmax(0,1fr)_130px_110px] gap-2 px-4 py-2.5 border-b border-border bg-surface-2/40 text-[11px] font-medium text-muted-foreground"
              : "grid grid-cols-[minmax(0,1fr)_130px] gap-2 px-4 py-2.5 border-b border-border bg-surface-2/40 text-[11px] font-medium text-muted-foreground"
          }
        >
          <button
            type="button"
            onClick={() => setAsc((v) => !v)}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors justify-self-start"
          >
            PolicyNumber <ArrowUpDown className="h-3 w-3" />
          </button>
          <div className="text-right truncate">last_seq_endosso</div>
          {isAdmin && <div className="text-right">Ações</div>}
        </div>

        {isLoading && (
          <div className="text-center py-10 text-[12.5px] text-muted-foreground">Carregando…</div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="text-center py-14 text-[12.5px] text-muted-foreground px-4">
            {latest
              ? "Nenhuma apólice corresponde à busca."
              : 'Nenhuma extração ainda. Clique em "Extrair últimos endossos".'}
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <VirtualList
            items={rows}
            getKey={(r) => r.policy_number}
            estimateSize={48}
            className="max-h-[65dvh]"
          >
            {(r) => (
              <div
                className={cn(
                  "grid gap-2 items-center px-4 py-2.5 border-b border-border/60 hover:bg-surface-2/40 transition-colors",
                  isAdmin
                    ? "grid-cols-[minmax(0,1fr)_130px_110px]"
                    : "grid-cols-[minmax(0,1fr)_130px]",
                )}
              >
                <div className="font-mono text-[12px] break-all min-w-0">{r.policy_number}</div>
                <div className="text-right font-mono text-[12px] tabular-nums">
                  {r.last_sequencial_endosso_used ?? "—"}
                </div>
                {isAdmin && (
                  <div className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-[11.5px] gap-1 text-muted-foreground hover:text-foreground"
                      disabled={addException.isPending}
                      onClick={() => setPendingPolicy(r.policy_number)}
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Ignorar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </VirtualList>
        )}
      </div>

      <IgnoreReasonDialog
        open={!!pendingPolicy}
        onOpenChange={(v) => !v && setPendingPolicy(null)}
        targetLabel={pendingPolicy ? `Apólice ${pendingPolicy}` : undefined}
        description="A apólice deixa de aparecer na tabela, nas exportações e no envio ao fluxo. O motivo é obrigatório."
        pending={addException.isPending}
        onConfirm={({ motivo, reason_tag_id }) => {
          if (!pendingPolicy) return;
          addException.mutate(
            { policy_number: pendingPolicy, motivo, reason_tag_id },
            { onSuccess: () => setPendingPolicy(null) },
          );
        }}
      />
    </div>
  );
}

function ExceptionsDialog({ isAdmin }: { isAdmin: boolean }) {
  const { data: exceptions = [], isLoading } = useEndorsementExceptions();
  const add = useAddEndorsementException();
  const update = useUpdateEndorsementException();
  const remove = useRemoveEndorsementException();

  const { data: tags = [] } = useExceptionTags();
  const [policy, setPolicy] = useState("");
  const [askReasonFor, setAskReasonFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<EndorsementExceptionRow | null>(null);

  const submit = () => {
    if (!policy.trim()) return;
    setAskReasonFor(policy.trim());
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 text-[12.5px]">
          <EyeOff className="h-3.5 w-3.5" /> Exceções
          {exceptions.length > 0 && (
            <span className="ml-0.5 rounded bg-muted px-1.5 text-[11px] font-mono">
              {exceptions.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Exceções da extração</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Apólices listadas aqui não aparecem na tabela nem nas exportações, e não são enviadas
            ao fluxo n8n. Esta lista é independente das exceções de auditoria.
          </DialogDescription>
        </DialogHeader>

        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Número da apólice"
              className="h-9 text-[12.5px] sm:w-[240px] font-mono"
            />
            <Button
              className="h-9 gap-1 text-[12.5px]"
              disabled={add.isPending || !policy.trim()}
              onClick={submit}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar com motivo
            </Button>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Apenas administradores podem criar, editar ou remover exceções.
          </p>
        )}

        <div className="rounded-lg border border-border overflow-hidden max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Apólice</TableHead>
                <TableHead className="text-[11px]">Motivo</TableHead>
                <TableHead className="text-[11px]">Criada em</TableHead>
                {isAdmin && (
                  <TableHead className="text-[11px] w-[160px] text-right">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 4 : 3}
                    className="text-center py-8 text-[12px] text-muted-foreground"
                  >
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && exceptions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 4 : 3}
                    className="text-center py-10 text-[12.5px] text-muted-foreground"
                  >
                    Nenhuma exceção registrada.
                  </TableCell>
                </TableRow>
              )}
              {exceptions.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-[12px] break-all">
                    {e.policy_number}
                  </TableCell>
                  <TableCell className="text-[12.5px] max-w-[260px]">
                    <ReasonDisplay motivo={e.motivo} tagId={e.reason_tag_id} tags={tags} />
                  </TableCell>
                  <TableCell className="text-[11.5px] font-mono text-muted-foreground">
                    {formatDateTime(e.created_at)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[11.5px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate({ id: e.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <IgnoreReasonDialog
          open={!!askReasonFor}
          onOpenChange={(v) => !v && setAskReasonFor(null)}
          targetLabel={askReasonFor ? `Apólice ${askReasonFor}` : undefined}
          pending={add.isPending}
          onConfirm={({ motivo, reason_tag_id }) => {
            if (!askReasonFor) return;
            add.mutate(
              { policy_number: askReasonFor, motivo, reason_tag_id },
              {
                onSuccess: () => {
                  setAskReasonFor(null);
                  setPolicy("");
                },
              },
            );
          }}
        />

        <IgnoreReasonDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          title="Editar motivo da exceção"
          confirmLabel="Salvar motivo"
          targetLabel={editing ? `Apólice ${editing.policy_number}` : undefined}
          initialMotivo={editing?.motivo ?? ""}
          initialTagId={editing?.reason_tag_id ?? null}
          pending={update.isPending}
          onConfirm={({ motivo, reason_tag_id }) => {
            if (!editing) return;
            update.mutate(
              { id: editing.id, motivo, reason_tag_id },
              { onSuccess: () => setEditing(null) },
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
