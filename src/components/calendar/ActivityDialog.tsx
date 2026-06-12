import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Paperclip, Bell, Link as LinkIcon, Download, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getActivity, createActivity, updateActivity, deleteActivity,
  listAttachments, recordAttachment, removeAttachment, getAttachmentUrl,
  listReminders, upsertReminder, removeReminder,
} from "@/lib/calendar.functions";
import type { ActivityStatus, ActivityPriority, CalendarAttachment, CalendarReminder } from "@/lib/calendar/types";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/calendar/types";
import { buildRRuleString, parseRRule, type RecurrenceConfig } from "@/lib/calendar/rrule-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activityId: string | null;
  seedStart: Date | null;
  onSaved: () => void;
}

const dtLocal = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function ActivityDialog({ open, onOpenChange, activityId, seedStart, onSaved }: Props) {
  const fetchAct = useServerFn(getActivity);
  const createFn = useServerFn(createActivity);
  const updateFn = useServerFn(updateActivity);
  const deleteFn = useServerFn(deleteActivity);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [status, setStatus] = useState<ActivityStatus>("not_started");
  const [priority, setPriority] = useState<ActivityPriority>("medium");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [client, setClient] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);

  const actQ = useQuery({
    queryKey: ["cal-activity", activityId],
    queryFn: () => fetchAct({ data: { id: activityId! } }),
    enabled: !!activityId && open,
  });

  useEffect(() => {
    if (!open) return;
    if (activityId && actQ.data) {
      const a = actQ.data as any;
      setTitle(a.title); setDescription(typeof a.description === "string" ? a.description : (a.description?.text ?? ""));
      setStartAt(dtLocal(new Date(a.start_at))); setEndAt(dtLocal(new Date(a.end_at)));
      setAllDay(a.all_day); setStatus(a.status); setPriority(a.priority);
      setCategory(a.category ?? ""); setProject(a.project ?? ""); setClient(a.client ?? "");
      setTagsText((a.tags ?? []).join(", "));
      setRecurrence(parseRRule(a.recurrence_rule));
    } else if (!activityId) {
      const s = seedStart ?? new Date();
      const e = new Date(s.getTime() + 60 * 60_000);
      setTitle(""); setDescription("");
      setStartAt(dtLocal(s)); setEndAt(dtLocal(e));
      setAllDay(false); setStatus("not_started"); setPriority("medium");
      setCategory(""); setProject(""); setClient(""); setTagsText(""); setRecurrence(null);
    }
  }, [open, activityId, actQ.data, seedStart]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    const startDate = new Date(startAt);
    const payload = {
      title: title.trim(),
      description: { text: description } as any,
      start_at: startDate.toISOString(),
      end_at: new Date(endAt).toISOString(),
      all_day: allDay,
      status, priority,
      category: category || null,
      project: project || null,
      client: client || null,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      recurrence_rule: recurrence ? buildRRuleString(recurrence, startDate) : null,
      recurrence_until: recurrence?.until ?? null,
      recurrence_count: recurrence?.count ?? null,
    };
    try {
      if (activityId) await updateFn({ data: { id: activityId, patch: payload } });
      else await createFn({ data: payload });
      toast.success("Atividade salva");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
  };

  const handleDelete = async () => {
    if (!activityId) return;
    if (!confirm("Excluir esta atividade?")) return;
    await deleteFn({ data: { id: activityId } });
    toast.success("Atividade excluída");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activityId ? "Editar atividade" : "Nova atividade"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="recurrence">Recorrência</TabsTrigger>
            <TabsTrigger value="attachments" disabled={!activityId}>Anexos</TabsTrigger>
            <TabsTrigger value="reminders" disabled={!activityId}>Lembretes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-3">
            <div>
              <Label className="text-[11px]">Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que você precisa fazer?" autoFocus />
            </div>
            <div>
              <Label className="text-[11px]">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Detalhes, contexto, links…" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={allDay} onCheckedChange={setAllDay} id="allday" />
              <Label htmlFor="allday" className="text-[12px] cursor-pointer">Dia inteiro</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Início</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-[11px]">Fim</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ActivityPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px]">Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Auditoria" /></div>
              <div><Label className="text-[11px]">Projeto</Label><Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Ex.: Renovação" /></div>
              <div><Label className="text-[11px]">Cliente</Label><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nome" /></div>
            </div>
            <div>
              <Label className="text-[11px]">Tags (separadas por vírgula)</Label>
              <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="urgente, financeiro" />
            </div>
          </TabsContent>

          <TabsContent value="recurrence" className="space-y-3 pt-3">
            <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
          </TabsContent>

          <TabsContent value="attachments" className="pt-3">
            {activityId && <AttachmentsPanel activityId={activityId} />}
          </TabsContent>

          <TabsContent value="reminders" className="pt-3">
            {activityId && <RemindersPanel activityId={activityId} />}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          {activityId ? (
            <Button variant="ghost" onClick={handleDelete} className="text-destructive gap-1.5">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecurrenceEditor({ value, onChange }: { value: RecurrenceConfig | null; onChange: (v: RecurrenceConfig | null) => void }) {
  const enabled = !!value;
  const v = value ?? { freq: "WEEKLY" as const, interval: 1 };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={(c) => onChange(c ? { freq: "WEEKLY", interval: 1 } : null)} id="rec" />
        <Label htmlFor="rec" className="text-[12px] cursor-pointer">Repetir esta atividade</Label>
      </div>
      {enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-primary/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Frequência</Label>
              <Select value={v.freq} onValueChange={(f) => onChange({ ...v, freq: f as RecurrenceConfig["freq"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diária</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">A cada</Label>
              <Input type="number" min={1} max={365} value={v.interval} onChange={(e) => onChange({ ...v, interval: Number(e.target.value) || 1 })} />
            </div>
          </div>
          {v.freq === "WEEKLY" && (
            <div>
              <Label className="text-[11px]">Dias da semana</Label>
              <div className="flex gap-1 mt-1">
                {["S", "T", "Q", "Q", "S", "S", "D"].map((label, idx) => {
                  const active = v.byweekday?.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const cur = v.byweekday ?? [];
                        const next = cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx];
                        onChange({ ...v, byweekday: next.length ? next : undefined });
                      }}
                      className={`h-7 w-7 rounded-md text-[11px] border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border"}`}
                    >{label}</button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Termina em (opcional)</Label>
              <Input type="date" value={v.until ? v.until.slice(0, 10) : ""} onChange={(e) => onChange({ ...v, until: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <Label className="text-[11px]">Nº de ocorrências (opcional)</Label>
              <Input type="number" min={1} max={1000} value={v.count ?? ""} onChange={(e) => onChange({ ...v, count: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttachmentsPanel({ activityId }: { activityId: string }) {
  const listFn = useServerFn(listAttachments);
  const recFn = useServerFn(recordAttachment);
  const remFn = useServerFn(removeAttachment);
  const urlFn = useServerFn(getAttachmentUrl);
  const q = useQuery({ queryKey: ["cal-atts", activityId], queryFn: () => listFn({ data: { activityId } }) });
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");

  const upload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${activityId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("calendar-attachments").upload(path, file);
    if (error) { toast.error(error.message); return; }
    await recFn({ data: { activity_id: activityId, file_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, is_link: false } });
    q.refetch();
    toast.success("Anexo enviado");
  };

  const openFile = async (path: string) => {
    const { url } = await urlFn({ data: { path } });
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition"
      >
        <Paperclip className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
        <div className="text-[12px]">Clique ou arraste um arquivo</div>
        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>

      <div className="flex gap-2">
        <Input placeholder="Nome do link" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="h-8" />
        <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-8" />
        <Button size="sm" disabled={!linkUrl || !linkName} onClick={async () => {
          await recFn({ data: { activity_id: activityId, file_name: linkName, is_link: true, external_url: linkUrl } });
          setLinkUrl(""); setLinkName(""); q.refetch();
        }}><LinkIcon className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="space-y-1">
        {(q.data ?? []).map((a: CalendarAttachment) => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded border border-border bg-surface-2">
            <div className="flex items-center gap-2 min-w-0">
              {a.is_link ? <LinkIcon className="h-3.5 w-3.5 shrink-0" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
              <span className="text-[12px] truncate">{a.file_name}</span>
            </div>
            <div className="flex gap-1">
              {a.is_link && a.external_url ? (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(a.external_url!, "_blank")}><Download className="h-3.5 w-3.5" /></Button>
              ) : a.file_path ? (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openFile(a.file_path!)}><Download className="h-3.5 w-3.5" /></Button>
              ) : null}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { await remFn({ data: { id: a.id } }); q.refetch(); }}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRESETS = [
  { label: "Na hora", value: 0 },
  { label: "15 min antes", value: 15 },
  { label: "1 hora antes", value: 60 },
  { label: "24 horas antes", value: 1440 },
];

function RemindersPanel({ activityId }: { activityId: string }) {
  const listFn = useServerFn(listReminders);
  const upFn = useServerFn(upsertReminder);
  const remFn = useServerFn(removeReminder);
  const q = useQuery({ queryKey: ["cal-rems", activityId], queryFn: () => listFn({ data: { activityId } }) });
  const [custom, setCustom] = useState(30);
  const [emailToo, setEmailToo] = useState(false);

  const add = async (offset: number) => {
    const channels = emailToo ? ["in_app", "email"] : ["in_app"];
    await upFn({ data: { activity_id: activityId, offset_minutes: offset, channels: channels as ("in_app" | "email")[] } });
    q.refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button key={p.value} size="sm" variant="outline" onClick={() => add(p.value)}><Plus className="h-3 w-3 mr-1" />{p.label}</Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} max={43200} value={custom} onChange={(e) => setCustom(Number(e.target.value))} className="h-8 w-24" />
        <span className="text-[11px] text-muted-foreground">min antes</span>
        <Button size="sm" onClick={() => add(custom)}>Adicionar</Button>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={emailToo} onCheckedChange={setEmailToo} id="email" />
        <Label htmlFor="email" className="text-[11.5px] cursor-pointer">Também enviar por e-mail (requer domínio configurado)</Label>
      </div>

      <div className="space-y-1">
        {(q.data ?? []).map((r: CalendarReminder) => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded border border-border bg-surface-2">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-primary" />
              <span className="text-[12px]">{r.offset_minutes === 0 ? "Na hora" : `${r.offset_minutes} min antes`}</span>
              <span className="text-[10px] text-muted-foreground">{r.channels.join(", ")}</span>
              {r.sent_at && <span className="text-[10px] text-emerald-500">enviado</span>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { await remFn({ data: { id: r.id } }); q.refetch(); }}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
