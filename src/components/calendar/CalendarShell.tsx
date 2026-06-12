import { useMemo, useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Filter, Bell, LayoutGrid, List as ListIcon, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { listActivities, getCalendarMetrics, listSavedViews, listCalendarNotifications, markNotificationRead, saveView, deleteView } from "@/lib/calendar.functions";
import type { ViewMode, ActivityFilters, CalendarSavedView, CalendarNotification } from "@/lib/calendar/types";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { ListView } from "./ListView";
import { KpiStrip } from "./KpiStrip";
import { ActivityDialog } from "./ActivityDialog";
import { FilterBar } from "./FilterBar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CalendarShell() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seedStart, setSeedStart] = useState<Date | null>(null);

  // Compute range based on view
  const range = useMemo(() => {
    if (view === "month") {
      const s = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
      const e = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
      return { from: s, to: e };
    }
    if (view === "week") {
      return { from: startOfWeek(anchor, { weekStartsOn: 0 }), to: endOfWeek(anchor, { weekStartsOn: 0 }) };
    }
    if (view === "day") {
      const s = new Date(anchor); s.setHours(0, 0, 0, 0);
      const e = new Date(anchor); e.setHours(23, 59, 59, 999);
      return { from: s, to: e };
    }
    // list: ±60 days
    return { from: addDays(anchor, -30), to: addDays(anchor, 60) };
  }, [view, anchor]);

  const fetchActs = useServerFn(listActivities);
  const fetchMetrics = useServerFn(getCalendarMetrics);
  const fetchViews = useServerFn(listSavedViews);
  const fetchNotifs = useServerFn(listCalendarNotifications);
  const markRead = useServerFn(markNotificationRead);
  const saveViewFn = useServerFn(saveView);
  const delViewFn = useServerFn(deleteView);

  const activitiesQ = useQuery({
    queryKey: ["cal-activities", range.from.toISOString(), range.to.toISOString(), filters],
    queryFn: () => fetchActs({ data: { from: range.from.toISOString(), to: range.to.toISOString(), filters } }),
  });
  const metricsQ = useQuery({
    queryKey: ["cal-metrics", range.from.toISOString(), range.to.toISOString()],
    queryFn: () => fetchMetrics({ data: { from: range.from.toISOString(), to: range.to.toISOString() } }),
  });
  const viewsQ = useQuery({ queryKey: ["cal-views"], queryFn: () => fetchViews() });
  const notifsQ = useQuery({
    queryKey: ["cal-notifs"],
    queryFn: () => fetchNotifs(),
    refetchInterval: 30_000,
  });

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["cal-activities"] });
    qc.invalidateQueries({ queryKey: ["cal-metrics"] });
  }, [qc]);

  const handleOpenNew = (date?: Date) => {
    setEditingId(null);
    setSeedStart(date ?? new Date());
    setDialogOpen(true);
  };
  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setSeedStart(null);
    setDialogOpen(true);
  };

  // Keyboard shortcuts: N = new, F = focus filter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); handleOpenNew(); }
      if (e.key === "ArrowLeft") setAnchor((a) => navDelta(a, view, -1));
      if (e.key === "ArrowRight") setAnchor((a) => navDelta(a, view, +1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const unread = ((notifsQ.data ?? []) as CalendarNotification[]).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">FERRAMENTAS</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Calendário</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-primary" />
            Calendário Inteligente
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Planeje, acompanhe e organize suas atividades em um único lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell items={(notifsQ.data ?? []) as CalendarNotification[]} unread={unread} onRead={async (id) => { await markRead({ data: { id } }); qc.invalidateQueries({ queryKey: ["cal-notifs"] }); }} onReadAll={async () => { await markRead({ data: { all: true } }); qc.invalidateQueries({ queryKey: ["cal-notifs"] }); }} />
          <Button onClick={() => handleOpenNew()} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova atividade <kbd className="ml-1 hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border border-primary-foreground/30 bg-primary-foreground/10">N</kbd>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <KpiStrip metrics={metricsQ.data} />

      {/* CONTROLS */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Hoje</Button>
          <div className="flex items-center rounded-md border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setAnchor((a) => navDelta(a, view, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l border-border" onClick={() => setAnchor((a) => navDelta(a, view, +1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-[14px] font-medium ml-1">
            {anchorLabel(anchor, view)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} />
          <SavedViewsMenu
            views={(viewsQ.data ?? []) as CalendarSavedView[]}
            onApply={(v) => { setFilters((v.filters ?? {}) as ActivityFilters); setView(v.view_mode); }}
            onSave={async (name) => { await saveViewFn({ data: { name, filters, view_mode: view } }); qc.invalidateQueries({ queryKey: ["cal-views"] }); toast.success("Visão salva"); }}
            onDelete={async (id) => { await delViewFn({ data: { id } }); qc.invalidateQueries({ queryKey: ["cal-views"] }); }}
          />
          <div className="flex items-center rounded-md border border-border">
            {(["month", "week", "day", "list"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                onClick={() => setView(v)}
                className={cn("h-8 rounded-none first:rounded-l-md last:rounded-r-md border-l first:border-l-0 border-border", view === v && "bg-primary/10 text-primary")}
              >
                {viewLabel(v)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {activitiesQ.isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Carregando atividades…</div>
        ) : view === "month" ? (
          <MonthView anchor={anchor} occurrences={activitiesQ.data ?? []} onNew={handleOpenNew} onEdit={handleOpenEdit} onMoved={invalidateAll} />
        ) : view === "week" ? (
          <WeekView anchor={anchor} occurrences={activitiesQ.data ?? []} onNew={handleOpenNew} onEdit={handleOpenEdit} onMoved={invalidateAll} />
        ) : view === "day" ? (
          <DayView anchor={anchor} occurrences={activitiesQ.data ?? []} onNew={handleOpenNew} onEdit={handleOpenEdit} onMoved={invalidateAll} />
        ) : (
          <ListView occurrences={activitiesQ.data ?? []} onEdit={handleOpenEdit} />
        )}
      </div>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activityId={editingId}
        seedStart={seedStart}
        onSaved={() => { setDialogOpen(false); invalidateAll(); }}
      />
    </div>
  );
}

function navDelta(d: Date, view: ViewMode, dir: number): Date {
  if (view === "month") return addMonths(d, dir);
  if (view === "week") return addWeeks(d, dir);
  if (view === "day") return addDays(d, dir);
  return addDays(d, dir * 7);
}

function anchorLabel(d: Date, view: ViewMode): string {
  if (view === "month") return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  if (view === "week") {
    const s = startOfWeek(d, { weekStartsOn: 0 });
    const e = endOfWeek(d, { weekStartsOn: 0 });
    return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
  }
  if (view === "day") return format(d, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  return "Lista";
}
function viewLabel(v: ViewMode) {
  return v === "month" ? "Mês" : v === "week" ? "Semana" : v === "day" ? "Dia" : "Lista";
}

function NotificationsBell({ items, unread, onRead, onReadAll }: { items: CalendarNotification[]; unread: number; onRead: (id: string) => void; onReadAll: () => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-[12px] font-semibold">Notificações do calendário</span>
          {unread > 0 && <button onClick={onReadAll} className="text-[11px] text-primary hover:underline">Marcar todas</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground">Nenhuma notificação.</div>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => !n.read_at && onRead(n.id)} className={cn("w-full text-left p-3 border-b border-border/60 hover:bg-muted/30 transition", !n.read_at && "bg-primary/5")}>
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{n.title}</div>
                  {n.body && <div className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "d MMM HH:mm", { locale: ptBR })}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SavedViewsMenu({ views, onApply, onSave, onDelete }: { views: CalendarSavedView[]; onApply: (v: CalendarSavedView) => void; onSave: (name: string) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState("");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> Visões
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Salvar visão atual</div>
          <div className="flex gap-1.5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Minhas tarefas" className="h-8 text-[12px]" />
            <Button size="sm" disabled={!name.trim()} onClick={() => { onSave(name.trim()); setName(""); }}>Salvar</Button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {views.length === 0 ? (
            <div className="p-4 text-center text-[12px] text-muted-foreground">Nenhuma visão salva.</div>
          ) : views.map((v) => (
            <div key={v.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 border-b border-border/60 last:border-0">
              <button onClick={() => onApply(v)} className="text-left flex-1 min-w-0">
                <div className="text-[12.5px] font-medium truncate">{v.name}</div>
                <div className="text-[10.5px] text-muted-foreground">{v.view_mode}</div>
              </button>
              <button onClick={() => onDelete(v.id)} className="text-[11px] text-destructive hover:underline">Excluir</button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
