import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  EyeOff,
  History,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import { useLatestAudit } from "@/hooks/use-audit";
import { useFindingRecurrence } from "@/hooks/use-audit-recurrence";
import { useEscalationRules } from "@/hooks/use-escalation-rules";
import { useUrgencyOverrides } from "@/hooks/use-urgency-overrides";
import { useResolveFinding } from "@/hooks/use-audit-resolutions";
import { useAddAuditIgnore, useAuditIgnores } from "@/hooks/use-audit-ignores";
import { useAuditResolutions } from "@/hooks/use-audit-resolutions";
import {
  buildAlertItems,
  keyOf,
  sortAlerts,
  type AlertItem,
  type SortKey,
} from "@/lib/audit/alert-view";
import { URGENCY_LABEL, URGENCY_ORDER, type Urgency } from "@/lib/audit/escalation";
import { downloadAlertsCsv } from "@/lib/audit/export-alerts";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualList } from "@/components/ui/virtual-list";
import { IncidentRow } from "@/components/alertas/incident-row";
import { IncidentDetail } from "@/components/alertas/incident-detail";
import { ResolvedTab } from "@/components/alertas/resolved-tab";
import { ExceptionsTab } from "@/components/alertas/exceptions-tab";
import { URG_DOT, URG_TEXT } from "@/components/alertas/urgency-ui";
import {
  IgnoreReasonDialog,
  type IgnoreReasonResult,
} from "@/components/exceptions/ignore-reason-dialog";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas · OLÉ COPILOT" },
      {
        name: "description",
        content:
          "Centro de operações: incidentes abertos com escalonamento de urgência, reincidência e histórico de resolvidos.",
      },
      { property: "og:title", content: "Alertas · OLÉ COPILOT" },
      {
        property: "og:description",
        content: "Incidentes abertos, reincidência por auditoria e histórico de erros resolvidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertasPage,
});

type Tab = "abertos" | "resolvidos" | "excecoes";
type AgeFilter = "all" | "novo" | "1a7" | "mais7";

function AlertasPage() {
  const { data: latest, isLoading, error } = useLatestAudit();
  const { data: recurrence } = useFindingRecurrence();
  const { rules } = useEscalationRules();
  const { overrides, setOverride, clearOverride } = useUrgencyOverrides();
  const { data: resolutions = [] } = useAuditResolutions();
  const { data: ignores = [] } = useAuditIgnores();
  const resolve = useResolveFinding();
  const addIgnore = useAddAuditIgnore();

  const [tab, setTab] = useState<Tab>("abertos");
  const [urg, setUrg] = useState<Urgency | "all">("all");
  const [tipo, setTipo] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [onlyReopened, setOnlyReopened] = useState(false);
  const [age, setAge] = useState<AgeFilter>("all");
  const [sort, setSort] = useState<SortKey>("urgencia");
  const [grouped, setGrouped] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AlertItem | null>(null);
  const [ignoreTarget, setIgnoreTarget] = useState<AlertItem | null>(null);

  const run = latest?.run ?? null;

  const items = useMemo(
    () => buildAlertItems(latest?.findings ?? [], recurrence?.items ?? [], rules, overrides),
    [latest, recurrence, rules, overrides],
  );

  const tipos = useMemo(() => Array.from(new Set(items.map((i) => i.f.tipo_erro))).sort(), [items]);

  const counts = useMemo(() => {
    const c: Record<Urgency, number> = { baixa: 0, media: 0, alta: 0, critica: 0 };
    let reincidentes = 0;
    let novos = 0;
    for (const i of items) {
      c[i.urgency]++;
      if (i.recorrenteNaApolice) reincidentes++;
      if (i.occurrences <= 1 && !i.recorrenteNaApolice) novos++;
    }
    return { c, reincidentes, novos };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = items.filter((i) => {
      if (urg !== "all" && i.urgency !== urg) return false;
      if (tipo !== "all" && i.f.tipo_erro !== tipo) return false;
      if (onlyRecurring && !i.recorrenteNaApolice) return false;
      if (onlyReopened && !i.reopened) return false;
      if (age === "novo" && i.daysOpen > 0) return false;
      if (age === "1a7" && (i.daysOpen < 1 || i.daysOpen > 7)) return false;
      if (age === "mais7" && i.daysOpen <= 7) return false;
      if (q) {
        const hay =
          `${i.f.apolice} ${i.f.tipo_erro} ${i.motivo} ${i.detalhe} ${i.endosso ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortAlerts(out, sort);
  }, [items, urg, tipo, onlyRecurring, onlyReopened, age, search, sort]);

  const groups = useMemo(() => {
    if (!grouped) return [];
    const map = new Map<string, AlertItem[]>();
    for (const i of filtered) {
      const list = map.get(i.f.apolice) ?? [];
      list.push(i);
      map.set(i.f.apolice, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, grouped]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedItems = filtered.filter((i) => selected.has(i.f.id));

  const doResolve = (i: AlertItem) =>
    resolve.mutate({
      apolice: i.f.apolice,
      tipo_erro: i.f.tipo_erro,
      endosso: i.endosso,
      run_id: run?.id ?? null,
    });

  const bulkResolve = () => {
    for (const i of selectedItems) doResolve(i);
    setSelected(new Set());
  };

  const confirmIgnore = (res: IgnoreReasonResult) => {
    const targets = ignoreTarget ? [ignoreTarget] : selectedItems;
    for (const i of targets) {
      addIgnore.mutate({
        apolice: i.f.apolice,
        tipo_erro: i.f.tipo_erro,
        motivo: res.motivo,
        reason_tag_id: res.reason_tag_id,
      });
    }
    setIgnoreTarget(null);
    setSelected(new Set());
    setBulkIgnoreOpen(false);
  };

  const [bulkIgnoreOpen, setBulkIgnoreOpen] = useState(false);

  const setUrgency = (i: AlertItem, u: Urgency) => setOverride(i.key, u);
  const clearUrgency = (i: AlertItem) => {
    clearOverride(i.key);
    // chave antiga (sem endosso), para overrides definidos antes desta versão
    clearOverride(`${i.f.apolice}||${i.f.tipo_erro}`);
  };

  const bulkSetUrgency = (u: Urgency) => {
    for (const i of selectedItems) setOverride(i.key, u);
    setSelected(new Set());
  };

  const detailKey = detail ? keyOf(detail.f.apolice, detail.f.tipo_erro, detail.f.endosso) : null;
  const detailRuns = (recurrence?.items ?? []).find((r) => r.key === detailKey)?.runs ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-warning">
              SOC · INCIDENT VIEW
            </span>
          </div>
          <h1 className="page-title">Alertas</h1>
          <p className="page-subtitle mt-1.5">
            {isLoading
              ? "Carregando incidentes…"
              : run
                ? `${filtered.length} de ${items.length} visíveis · última auditoria ${relativeTime(run.created_at)}`
                : "Nenhuma auditoria executada ainda."}
          </p>
        </div>
        {tab === "abertos" && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por apólice, tipo, motivo…"
                className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>
            <button
              onClick={() => downloadAlertsCsv(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12px] transition hover:border-primary/60 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {(
          [
            { id: "abertos", label: "Abertos", icon: AlertTriangle },
            { id: "resolvidos", label: "Resolvidos", icon: CheckCircle2 },
            { id: "excecoes", label: "Exceções", icon: EyeOff },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-4 text-[13px] font-medium transition",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "resolvidos" && <ResolvedTab />}
      {tab === "excecoes" && <ExceptionsTab />}

      {tab === "abertos" && (
        <>
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-[12px] text-destructive">
              Falha ao carregar findings: {error.message}
            </div>
          )}

          {/* Urgency tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <button
              onClick={() => setUrg("all")}
              className={cn(
                "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
                urg === "all" ? "border-primary/60 shadow-glow" : "border-border",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Todos
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <div className="text-[20px] font-semibold tabular-nums sm:text-[24px]">
                {isLoading ? <Skeleton className="h-7 w-12" /> : items.length}
              </div>
              <div className="text-[11px] text-muted-foreground">incidentes abertos</div>
            </button>
            {[...URGENCY_ORDER].reverse().map((u) => (
              <button
                key={u}
                onClick={() => setUrg(urg === u ? "all" : u)}
                className={cn(
                  "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
                  urg === u ? "border-primary/60 shadow-glow" : "border-border",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10.5px] font-semibold uppercase tracking-wider",
                      URG_TEXT[u],
                    )}
                  >
                    {URGENCY_LABEL[u]}
                  </span>
                  <span className={cn("h-1.5 w-1.5 rounded-full", URG_DOT[u])} />
                </div>
                <div className="text-[20px] font-semibold tabular-nums sm:text-[24px]">
                  {isLoading ? <Skeleton className="h-7 w-12" /> : counts.c[u]}
                </div>
                <div className="text-[11px] text-muted-foreground">urgência {URGENCY_LABEL[u]}</div>
              </button>
            ))}
            <button
              onClick={() => setOnlyRecurring((v) => !v)}
              className={cn(
                "rounded-xl border bg-surface p-4 text-left transition hover:border-primary/30",
                onlyRecurring ? "border-primary/60 shadow-glow" : "border-border",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-warning">
                  reincidentes
                </span>
                <History className="h-3 w-3 text-warning" />
              </div>
              <div className="text-[20px] font-semibold tabular-nums sm:text-[24px]">
                {isLoading ? <Skeleton className="h-7 w-12" /> : counts.reincidentes}
              </div>
              <div className="text-[11px] text-muted-foreground">
                mesmo erro em endosso anterior · {counts.novos} novos
              </div>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Tipo:</span>
            <button
              onClick={() => setTipo("all")}
              className={cn(
                "h-7 rounded-md border px-2.5 text-[11.5px] font-medium transition",
                tipo === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              Todos
            </button>
            {tipos.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(tipo === t ? "all" : t)}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-[11.5px] font-medium transition",
                  tipo === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={age}
              onChange={(e) => setAge(e.target.value as AgeFilter)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-[12px] outline-none"
            >
              <option value="all">Qualquer idade</option>
              <option value="novo">Aberto hoje</option>
              <option value="1a7">1 a 7 dias</option>
              <option value="mais7">Mais de 7 dias</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-[12px] outline-none"
            >
              <option value="urgencia">Ordenar por urgência</option>
              <option value="idade">Ordenar por idade</option>
              <option value="reincidencia">Ordenar por reincidência</option>
              <option value="apolice">Ordenar por apólice</option>
            </select>
            <button
              onClick={() => setOnlyReopened((v) => !v)}
              className={cn(
                "h-8 rounded-md border px-2.5 text-[12px] transition",
                onlyReopened
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              Só reabertos
            </button>
            <button
              onClick={() => setGrouped((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition",
                grouped
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Agrupar por apólice
            </button>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[12.5px] font-medium">{selected.size} selecionado(s)</span>
              <button
                onClick={bulkResolve}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] transition hover:border-success/60 hover:text-success"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolver em lote
              </button>
              <button
                onClick={() => setBulkIgnoreOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12px] transition hover:border-warning/60 hover:text-warning"
              >
                <EyeOff className="h-3.5 w-3.5" /> Ignorar em lote
              </button>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) bulkSetUrgency(e.target.value as Urgency);
                }}
                className="h-8 rounded-md border border-border bg-surface px-2 text-[12px] outline-none"
              >
                <option value="">Definir nível…</option>
                {[...URGENCY_ORDER].reverse().map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSelected(new Set())}
                className="h-8 rounded-md px-2 text-[12px] text-muted-foreground hover:text-foreground"
              >
                Limpar seleção
              </button>
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[96px] rounded-xl" />
              ))
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
                <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                <div className="mb-1 text-[13px] font-semibold">
                  {items.length === 0
                    ? "Nenhum incidente na última auditoria"
                    : "Nenhum incidente com esses filtros"}
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  {items.length === 0
                    ? "Carteira em conformidade ou auditoria ainda não executada."
                    : "Ajuste os filtros para ver mais resultados."}
                </p>
              </div>
            ) : grouped ? (
              <div className="space-y-4">
                {groups.map(([apolice, list]) => (
                  <div key={apolice} className="space-y-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-mono text-foreground/80">
                        apólice …{apolice.slice(-12)}
                      </span>
                      <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                        {list.length} incidente(s)
                      </span>
                    </div>
                    {list.map((i) => (
                      <IncidentRow
                        key={i.f.id}
                        item={i}
                        selected={selected.has(i.f.id)}
                        onToggleSelect={toggleSelect}
                        onOpen={setDetail}
                        onResolve={doResolve}
                        onIgnore={setIgnoreTarget}
                        onSetUrgency={setUrgency}
                        onClearUrgency={clearUrgency}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <VirtualList
                items={filtered}
                getKey={(i) => i.f.id}
                estimateSize={112}
                gap={8}
                className="max-h-[70dvh]"
              >
                {(i) => (
                  <IncidentRow
                    item={i}
                    selected={selected.has(i.f.id)}
                    onToggleSelect={toggleSelect}
                    onOpen={setDetail}
                    onResolve={doResolve}
                    onIgnore={setIgnoreTarget}
                    onSetUrgency={setUrgency}
                    onClearUrgency={clearUrgency}
                  />
                )}
              </VirtualList>
            )}
          </div>
        </>
      )}

      <IncidentDetail
        item={detail}
        runs={recurrence?.runs ?? []}
        itemRuns={detailRuns}
        resolutions={resolutions.filter(
          (r) =>
            detail != null && r.apolice === detail.f.apolice && r.tipo_erro === detail.f.tipo_erro,
        )}
        ignores={ignores.filter(
          (g) =>
            detail != null &&
            g.apolice === detail.f.apolice &&
            (g.tipo_erro === null || g.tipo_erro === detail.f.tipo_erro),
        )}
        onOpenChange={(v) => !v && setDetail(null)}
        onResolve={(i) => {
          doResolve(i);
          setDetail(null);
        }}
        onIgnore={(i) => {
          setDetail(null);
          setIgnoreTarget(i);
        }}
        onSetUrgency={(i, u) => {
          setUrgency(i, u);
          setDetail({ ...i, urgency: u, manualUrgency: u });
        }}
        onClearUrgency={(i) => {
          clearUrgency(i);
          setDetail({ ...i, urgency: i.autoUrgency, manualUrgency: null });
        }}
      />

      <IgnoreReasonDialog
        open={!!ignoreTarget || bulkIgnoreOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIgnoreTarget(null);
            setBulkIgnoreOpen(false);
          }
        }}
        targetLabel={
          ignoreTarget
            ? `${ignoreTarget.f.tipo_erro} · apólice …${ignoreTarget.f.apolice.slice(-12)}`
            : `${selected.size} incidente(s) selecionados`
        }
        pending={addIgnore.isPending}
        onConfirm={confirmIgnore}
      />
    </div>
  );
}
