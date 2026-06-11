import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Plus, Send, Sparkles, Trash2, BookOpen, MessageSquare } from "lucide-react";
import {
  createThread,
  deleteThread,
  listThreads,
  loadMemory,
  loadThreadMessages,
  replaceMemory,
  type OliverThread,
} from "@/lib/oliver.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { ChartPart, type ChartInput } from "@/components/oliver/chart-part";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({
    meta: [
      { title: "Oléver · OLÉ COPILOT" },
      { name: "description", content: "Oléver — assistente de IA da operação OLÉ." },
    ],
  }),
  component: OleverPage,
});

const SUGGESTIONS = [
  "Quais os tipos de erro com maior tendência de alta nos últimos 3 meses?",
  "Mostre em um gráfico de barras os 5 tipos de erro mais frequentes.",
  "Projete a receita do próximo mês em um gráfico de linha.",
  "Faça um diagnóstico geral da operação e sugira 3 melhorias.",
];

function OleverPage() {
  const [threads, setThreads] = useState<OliverThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const loadMsgs = useServerFn(loadThreadMessages);

  const refreshThreads = async () => {
    const data = await list();
    setThreads(data);
    if (!activeId && data.length > 0) setActiveId(data[0].id);
  };

  useEffect(() => {
    refreshThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNew = async () => {
    const t = await create({ data: {} });
    setThreads((cur) => [t, ...cur]);
    setActiveId(t.id);
  };

  const handleDelete = async (id: string) => {
    await del({ data: { id } });
    setThreads((cur) => cur.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
    setDeleteConfirmId(null);
  };

  const threadToDelete = threads.find((t) => t.id === deleteConfirmId);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 rounded-2xl border border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={handleNew} className="w-full justify-start gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2 space-y-1">
            {threads.length === 0 && (
              <div className="text-xs text-muted-foreground p-3">
                Nenhuma conversa ainda.
              </div>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-muted/60 transition-colors",
                  activeId === t.id && "bg-muted",
                )}
                onClick={() => setActiveId(t.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 truncate">{t.title}</span>
                <button
                  type="button"
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded-md hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(t.id);
                  }}
                  aria-label="Excluir conversa"
                  title="Excluir conversa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setMemoryOpen(true)}
          >
            <BookOpen className="h-4 w-4" />
            Memória do Oléver
          </Button>
        </div>
      </aside>

      {/* Chat panel */}
      <main className="flex-1 rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
        {activeId ? (
          <ChatPanel
            key={activeId}
            threadId={activeId}
            loadMsgs={loadMsgs}
            onFirstMessage={refreshThreads}
          />
        ) : (
          <EmptyState onNew={handleNew} />
        )}
      </main>

      <MemoryDialog open={memoryOpen} onOpenChange={setMemoryOpen} />

      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conversa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir "{threadToDelete?.title ?? "esta conversa"}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 grid place-items-center text-center p-8">
      <div className="max-w-sm space-y-4">
        <div className="h-12 w-12 mx-auto rounded-xl bg-primary/15 border border-primary/30 grid place-items-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Olá, eu sou o Oléver</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Copiloto de inteligência da operação OLÉ. Posso diagnosticar, projetar e sugerir melhorias.
          </p>
        </div>
        <Button onClick={onNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Iniciar conversa
        </Button>
      </div>
    </div>
  );
}

type LoadMsgsFn = ReturnType<typeof useServerFn<typeof loadThreadMessages>>;

function ChatPanel({
  threadId,
  loadMsgs,
  onFirstMessage,
}: {
  threadId: string;
  loadMsgs: LoadMsgsFn;
  onFirstMessage: () => void;
}) {
  const [initial, setInitial] = useState<unknown[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInitial(null);
    loadMsgs({ data: { threadId } }).then((rows) => {
      if (cancelled) return;
      setInitial(
        rows.map((r) => ({ id: r.id, role: r.role, parts: r.parts })) as unknown[],
      );
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, loadMsgs]);

  if (initial === null) {
    return <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  return <ChatInner key={threadId} threadId={threadId} initial={initial} onFirstMessage={onFirstMessage} />;
}

function ChatInner({
  threadId,
  initial,
  onFirstMessage,
}: {
  threadId: string;
  initial: unknown[];
  onFirstMessage: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/oliver-chat",
        body: { threadId },
        fetch: async (url, init) => {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
    [threadId],
  );
  const [input, setInput] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chat = useChat<any>({
    id: threadId,
    transport,
    messages: initial as never,
  });
  const { messages, sendMessage, status, stop } = chat;
  const isBusy = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    const wasEmpty = messages.length === 0;
    await sendMessage({ text });
    if (wasEmpty) setTimeout(onFirstMessage, 1500);
  };


  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Oléver</div>
                  <div className="text-xs text-muted-foreground">Em que posso ajudar?</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                    }}
                    className="text-left text-sm rounded-lg border border-border bg-muted/30 hover:bg-muted/60 p-3 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isBusy && (
            <div className="text-sm text-muted-foreground italic">Pensando…</div>
          )}
        </div>
      </div>
      <div className="border-t border-border p-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Pergunte ao Oléver…"
            rows={1}
            className="resize-none min-h-[44px] max-h-40"
            autoFocus
          />
          {isBusy ? (
            <Button onClick={stop} variant="outline" size="icon">
              <span className="block h-3 w-3 bg-current rounded-sm" />
            </Button>
          ) : (
            <Button onClick={submit} size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  const parts = (message.parts ?? []) as Array<{ type: string; text?: string; toolName?: string; state?: string }>;
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
  const toolParts = parts.filter((p) => p.type?.startsWith("tool-"));

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 grid place-items-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {toolParts.length > 0 && (
          <div className="space-y-2">
            {toolParts.map((tp, i) => {
              const toolName = String(tp.type).replace(/^tool-/, "");
              if (toolName === "render_chart") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const input = (tp as any).input as ChartInput | undefined;
                if (input) return <ChartPart key={i} input={input} />;
              }
              return (
                <details key={i} className="text-xs rounded-md border border-border bg-muted/30 px-2 py-1">
                  <summary className="cursor-pointer text-muted-foreground">
                    🔧 {toolName} {tp.state ? `· ${tp.state}` : ""}
                  </summary>
                  <pre className="mt-2 overflow-auto text-[10px]">
                    {JSON.stringify(tp, null, 2)}
                  </pre>
                </details>
              );
            })}
          </div>
        )}
        <MessageResponse className="text-sm leading-relaxed">{text}</MessageResponse>
      </div>
    </div>
  );
}

function MemoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const load = useServerFn(loadMemory);
  const replace = useServerFn(replaceMemory);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load().then((d) => {
      setContent((d?.content as string) ?? "");
      setLoading(false);
    });
  }, [open, load]);

  const save = async () => {
    await replace({ data: { content } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Memória do Oléver</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando…</div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] font-mono text-xs"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar memória</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
