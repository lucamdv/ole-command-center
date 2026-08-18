import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  EyeOff,
  FileDown,
  LayoutList,
  Search,
  Table as TableIcon,
  XCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  countBySeverity,
  groupByApolice,
  normalizeFinding,
  severityOf,
  type Severity,
} from "@/lib/audit/derive";
import { useAuditHistory } from "@/hooks/use-audit";
import { useAddAuditIgnore, useAuditIgnores } from "@/hooks/use-audit-ignores";
import { IgnoreReasonDialog } from "@/components/exceptions/ignore-reason-dialog";
import { useResolveFinding } from "@/hooks/use-audit-resolutions";
import type { AuditFindingRow, LatestAudit } from "@/lib/audit/types";
import { formatDate, formatDateTime, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";

type View = "agrupado" | "tabela";

export function FindingsListDialog({
  latest,
  trigger,
}: {
  latest: LatestAudit;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data: history = [] } = useAuditHistory();
  const { data: ignores = [] } = useAuditIgnores();
  const addIgnore = useAddAuditIgnore();
  const resolve = useResolveFinding();
  const [tipo, setTipo] = useState<string>("__all__");
  const [sev, setSev] = useState<Severity | "__all__">("__all__");
  const [view, setView] = useState<View>("agrupado");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [pendingIgnore, setPendingIgnore] = useState<{
    apolice: string;
    tipo_erro: string | null;
  } | null>(null);

  const handleIgnore = (apolice: string, tipo_erro?: string) => {
    setPendingIgnore({ apolice, tipo_erro: tipo_erro ?? null });
  };

  const handleResolve = (f: AuditFindingRow) => {
    resolve.mutate({
      apolice: f.apolice,
      tipo_erro: f.tipo_erro,
      endosso: f.endosso,
      run_id: latest.run.id,
    });
  };

  const tipos = useMemo(
    () => Array.from(new Set(latest.findings.map((f) => f.tipo_erro))).sort(),
    [latest.findings],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return latest.findings.filter((f) => {
      if (tipo !== "__all__" && f.tipo_erro !== tipo) return false;
      if (sev !== "__all__" && severityOf(f) !== sev) return false;
      if (term) {
        const n = normalizeFinding(f);
        const hay = `${f.apolice} ${f.tipo_erro} ${n.motivo} ${n.detalhe} ${n.endosso ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [latest.findings, q, tipo, sev]);

  const grouped = useMemo(() => groupByApolice(filtered), [filtered]);
  const totals = countBySeverity(latest.findings);

  const copy = async (txt: string, msg = "Copiado") => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(msg);
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const copyAll = () => {
    const lines: string[] = [];
    lines.push(`Relatório Consolidado de Auditoria — ${formatDateTime(latest.run.data_auditoria ?? latest.run.created_at)}`);
    lines.push(
      `✅ ${latest.run.aprovados} OK | ⚠️ ${latest.run.reprovados} Intervenções Necessárias`,
    );
    for (const g of grouped) {
      lines.push("");
      lines.push(`🔍 Apólice: ${g.apolice}`);
      for (const f of g.findings) {
        const icon = severityOf(f) === "erro" ? "🔴" : "⚠️";
        const nrm = normalizeFinding(f);
        const detalhe = nrm.motivo || nrm.detalhe || "";
        lines.push(`  ${icon} ${f.tipo_erro}${nrm.endosso ? ` (end. ${nrm.endosso})` : ""} — ${detalhe}`);
      }
    }
    copy(lines.join("\n"), "Relatório copiado");
  };

  const toggleAll = (collapse: boolean) => {
    setCollapsed(Object.fromEntries(grouped.map((g) => [g.apolice, collapse])));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0">
        {/* Banner topo */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-linear-to-r from-surface-2 to-surface">
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <span>📊</span> Relatório Consolidado de Auditoria
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]">
            <span className="text-muted-foreground">
              Data: <span className="font-mono text-foreground">{formatDateTime(latest.run.data_auditoria ?? latest.run.created_at)}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <Chip tone="success">✅ {formatInt(latest.run.aprovados)} OK</Chip>
            <Chip tone="warning">⚠️ {formatInt(latest.run.reprovados)} Intervenções</Chip>
            <Chip tone="destructive">🔴 {formatInt(totals.erros)} erros</Chip>
            <Chip tone="warning">⚠️ {formatInt(totals.alertas)} alertas</Chip>
            <Chip tone="info">🔍 {formatInt(grouped.length)} apólices</Chip>
            <Chip tone="default">📋 {formatInt(filtered.length)} achados</Chip>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nº de apólice ou texto do motivo…"
              className="pl-8 h-9 text-[12.5px]"
            />
          </div>
          <Select value={sev} onValueChange={(v) => setSev(v as Severity | "__all__")}>
            <SelectTrigger className="h-9 w-[140px] text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas severidades</SelectItem>
              <SelectItem value="erro">🔴 Erros</SelectItem>
              <SelectItem value="alerta">⚠️ Alertas</SelectItem>
              <SelectItem value="info">ℹ️ Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9 w-[240px] text-[12.5px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-md border border-border overflow-hidden h-9 ml-auto">
            <button
              type="button"
              onClick={() => setView("agrupado")}
              className={cn(
                "px-2.5 h-full text-[11.5px] font-medium flex items-center gap-1.5 transition",
                view === "agrupado" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" /> Agrupado
            </button>
            <button
              type="button"
              onClick={() => setView("tabela")}
              className={cn(
                "px-2.5 h-full text-[11.5px] font-medium flex items-center gap-1.5 transition border-l border-border",
                view === "tabela" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40",
              )}
            >
              <TableIcon className="h-3.5 w-3.5" /> Tabela
            </button>
          </div>

          {view === "agrupado" && grouped.length > 0 && (
            <>
              <Button size="sm" variant="ghost" className="h-9 text-[11.5px]" onClick={() => toggleAll(false)}>
                Expandir
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-[11.5px]" onClick={() => toggleAll(true)}>
                Recolher
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={copyAll}>
            <Copy className="h-3.5 w-3.5" /> Copiar tudo
          </Button>
          <Button size="sm" variant="outline" onClick={async () => {
            const { exportAuditPdf } = await import("@/lib/audit/export-pdf");
            exportAuditPdf(latest, history);
          }} className="gap-1.5">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>

        {ignores.length > 0 && (
          <div className="px-6 py-2 border-b border-border bg-muted/30 text-[11.5px] text-muted-foreground flex items-center gap-2">
            <EyeOff className="h-3.5 w-3.5" />
            {ignores.length} {ignores.length === 1 ? "exceção aplicada" : "exceções aplicadas"} ·{" "}
            <Link to="/configuracoes" className="text-primary hover:underline">
              gerenciar em Configurações
            </Link>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto bg-background/40">
          {view === "agrupado" ? (
            <GroupedView
              groups={grouped}
              collapsed={collapsed}
              onToggle={(k) => setCollapsed((s) => ({ ...s, [k]: !s[k] }))}
              onCopy={copy}
              onIgnore={handleIgnore}
              onResolve={handleResolve}
            />
          ) : (
            <TableView
              findings={filtered}
              onCopy={copy}
              onIgnore={handleIgnore}
              onResolve={handleResolve}
            />
          )}
        </div>

        <IgnoreReasonDialog
          open={!!pendingIgnore}
          onOpenChange={(v) => !v && setPendingIgnore(null)}
          targetLabel={
            pendingIgnore
              ? pendingIgnore.tipo_erro
                ? `${pendingIgnore.tipo_erro} · apólice ${pendingIgnore.apolice}`
                : `Todos os erros da apólice ${pendingIgnore.apolice}`
              : undefined
          }
          description="Esta exceção oculta o achado nas próximas auditorias. O motivo é obrigatório."
          pending={addIgnore.isPending}
          onConfirm={({ motivo, reason_tag_id }) => {
            if (!pendingIgnore) return;
            addIgnore.mutate(
              {
                apolice: pendingIgnore.apolice,
                tipo_erro: pendingIgnore.tipo_erro,
                motivo,
                reason_tag_id,
              },
              { onSuccess: () => setPendingIgnore(null) },
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "warning" | "destructive" | "info" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border",
        tone === "success" && "bg-success/10 text-success border-success/30",
        tone === "warning" && "bg-warning/10 text-warning border-warning/30",
        tone === "destructive" && "bg-destructive/10 text-destructive border-destructive/30",
        tone === "info" && "bg-info/10 text-info border-info/30",
        tone === "default" && "bg-muted/40 text-muted-foreground border-border",
      )}
    >
      {children}
    </span>
  );
}

function GroupedView({
  groups,
  collapsed,
  onToggle,
  onCopy,
  onIgnore,
  onResolve,
}: {
  groups: ReturnType<typeof groupByApolice>;
  collapsed: Record<string, boolean>;
  onToggle: (apolice: string) => void;
  onCopy: (txt: string, msg?: string) => void;
  onIgnore: (apolice: string, tipo_erro?: string) => void;
  onResolve: (f: AuditFindingRow) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-[12.5px] text-success">
        ✅ Nenhum achado para o filtro atual.
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {groups.map((g) => {
        const sev = countBySeverity(g.findings);
        const isCollapsed = collapsed[g.apolice];
        return (
          <section key={g.apolice} className="bg-surface/40">
            <header className="px-5 py-3 flex items-start gap-3 sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border">
              <button
                type="button"
                onClick={() => onToggle(g.apolice)}
                className="mt-0.5 text-muted-foreground hover:text-foreground transition"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">🔍 Apólice</span>
                  <span className="font-mono text-[13px] text-foreground break-all">{g.apolice}</span>
                  <button
                    type="button"
                    onClick={() => onCopy(g.apolice, "Apólice copiada")}
                    className="opacity-60 hover:opacity-100"
                    title="Copiar número"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                  {sev.erros > 0 && <Chip tone="destructive">🔴 {sev.erros} erros</Chip>}
                  {sev.alertas > 0 && <Chip tone="warning">⚠️ {sev.alertas} alertas</Chip>}
                  {sev.infos > 0 && <Chip tone="info">ℹ️ {sev.infos} info</Chip>}
                  <Link
                    to="/apolices/$id"
                    params={{ id: g.apolice }}
                    className="ml-1 text-[11px] text-primary hover:underline"
                  >
                    Abrir detalhes →
                  </Link>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => onIgnore(g.apolice)}
                title="Ignorar apólice em futuras auditorias"
              >
                <EyeOff className="h-3.5 w-3.5" /> Ignorar apólice
              </Button>
            </header>

            {!isCollapsed && (
              <ul className="px-5 py-3 space-y-2.5">
                {g.findings.map((f) => (
                  <FindingBullet key={f.id} f={f} onIgnore={onIgnore} onResolve={onResolve} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FindingBullet({
  f,
  onIgnore,
  onResolve,
}: {
  f: AuditFindingRow;
  onIgnore: (apolice: string, tipo_erro?: string) => void;
  onResolve: (f: AuditFindingRow) => void;
}) {
  const sev = severityOf(f);
  const Icon = sev === "erro" ? XCircle : AlertTriangle;
  const n = normalizeFinding(f);
  return (
    <li className="flex gap-2.5 text-[12.5px] leading-relaxed">
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 mt-0.5",
          sev === "erro" && "text-destructive",
          sev === "alerta" && "text-warning",
          sev === "info" && "text-info",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "font-mono text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded",
              sev === "erro" && "bg-destructive/10 text-destructive",
              sev === "alerta" && "bg-warning/10 text-warning",
              sev === "info" && "bg-info/10 text-info",
            )}
          >
            {sev === "erro" ? "ERRO" : sev === "alerta" ? "ALERTA" : "INFO"}
          </span>
          <span className="font-semibold text-foreground">{f.tipo_erro}</span>
          {n.endosso && (
            <span className="inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Endosso {n.endosso}
            </span>
          )}
          {n.endossoAnterior && n.endossoAnterior !== "N/A" && (
            <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
              Anterior {n.endossoAnterior}
            </span>
          )}
          <button
            type="button"
            onClick={() => onIgnore(f.apolice, f.tipo_erro)}
            className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition"
            title="Ignorar este erro em futuras auditorias"
          >
            <EyeOff className="h-3 w-3" /> Ignorar
          </button>
          <button
            type="button"
            onClick={() => onResolve(f)}
            className="inline-flex items-center gap-1 text-[10.5px] text-success/80 hover:text-success opacity-80 hover:opacity-100 transition"
            title="Marcar como resolvido (alimenta os KPIs de resolução)"
          >
            <CheckCircle2 className="h-3 w-3" /> Resolvido
          </button>
        </div>

        {n.motivo && (
          <div className="mt-1 text-[12.5px]">
            <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 mr-1.5">Motivo:</span>
            <span className="text-foreground/90">{n.motivo}</span>
          </div>
        )}
        {n.detalhe && n.detalhe !== n.motivo && (
          <div className="mt-0.5 text-[12px]">
            <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 mr-1.5">Detalhe:</span>
            <span className="text-muted-foreground">{n.detalhe}</span>
          </div>
        )}
        {!n.motivo && !n.detalhe && (
          <div className="mt-1 text-[12px] text-muted-foreground italic">Sem mensagem adicional.</div>
        )}

        {(f.data_inicio || f.data_fim) && (
          <div className="mt-1 text-[11px] font-mono text-muted-foreground/80 flex items-center gap-1.5">
            <span className="uppercase tracking-wider text-muted-foreground/60">Vigência:</span>
            {f.data_inicio && <span>{formatDate(f.data_inicio)}</span>}
            {f.data_inicio && f.data_fim && <span>→</span>}
            {f.data_fim && <span>{formatDate(f.data_fim)}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

function TableView({
  findings,
  onCopy,
  onIgnore,
  onResolve,
}: {
  findings: AuditFindingRow[];
  onCopy: (txt: string, msg?: string) => void;
  onIgnore: (apolice: string, tipo_erro?: string) => void;
  onResolve: (f: AuditFindingRow) => void;
}) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-surface z-10">
        <TableRow>
          <TableHead className="text-[11px]">Sev</TableHead>
          <TableHead className="text-[11px]">Apólice</TableHead>
          <TableHead className="text-[11px]">Tipo de erro</TableHead>
          <TableHead className="text-[11px]">Endosso</TableHead>
          <TableHead className="text-[11px]">Início</TableHead>
          <TableHead className="text-[11px]">Fim</TableHead>
          <TableHead className="text-[11px]">Detalhe</TableHead>
          <TableHead className="text-[11px] w-[110px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((f) => {
          const sev = severityOf(f);
          return (
            <TableRow key={f.id}>
              <TableCell className="align-top">
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase px-1.5 py-0.5 rounded",
                    sev === "erro" && "bg-destructive/10 text-destructive",
                    sev === "alerta" && "bg-warning/10 text-warning",
                    sev === "info" && "bg-info/10 text-info",
                  )}
                >
                  {sev}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[11.5px] align-top">
                <div className="flex items-start gap-1.5">
                  <span className="break-all">{f.apolice}</span>
                  <button
                    type="button"
                    onClick={() => onCopy(f.apolice, "Apólice copiada")}
                    className="opacity-50 hover:opacity-100 shrink-0"
                    title="Copiar"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </TableCell>
              <TableCell className="text-[12px] align-top">{f.tipo_erro}</TableCell>
              <TableCell className="text-[12px] font-mono align-top">{normalizeFinding(f).endosso ?? "—"}</TableCell>
              <TableCell className="text-[12px] font-mono align-top">{f.data_inicio ?? "—"}</TableCell>
              <TableCell className="text-[12px] font-mono align-top">{f.data_fim ?? "—"}</TableCell>
              <TableCell className="text-[12px] align-top max-w-[420px]">
                {(() => {
                  const n = normalizeFinding(f);
                  return (
                    <>
                      {n.motivo && (
                        <div className="text-foreground/90">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1">Motivo:</span>
                          {n.motivo}
                        </div>
                      )}
                      {n.detalhe && n.detalhe !== n.motivo && (
                        <div className="text-muted-foreground mt-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1">Detalhe:</span>
                          {n.detalhe}
                        </div>
                      )}
                      {!n.motivo && !n.detalhe && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </>
                  );
                })()}
              </TableCell>
              <TableCell className="align-top">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onIgnore(f.apolice, f.tipo_erro)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Ignorar este erro"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(f)}
                    className="inline-flex items-center gap-1 text-[11px] text-success/80 hover:text-success"
                    title="Marcar como resolvido"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {findings.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-[12px] text-muted-foreground">
              Nenhum achado para o filtro atual.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
