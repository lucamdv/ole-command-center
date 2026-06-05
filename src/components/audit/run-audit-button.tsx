import { useEffect, useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { useRunAudit, useLatestAudit } from "@/hooks/use-audit";
import { cn } from "@/lib/utils";

export function RunAuditButton({ compact = false }: { compact?: boolean }) {
  const mutation = useRunAudit();
  const { data: latest } = useLatestAudit();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!mutation.isRunning) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(i);
  }, [mutation.isRunning]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (!mutation.isRunning) mutation.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mutation]);

  const lastAt = latest?.run?.created_at
    ? new Date(latest.run.created_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  if (compact) {
    return (
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isRunning}
        className={cn(
          "h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-95 transition shadow-glow flex items-center gap-2 disabled:opacity-70",
        )}
        title={lastAt ? `Última auditoria: ${lastAt}` : "Disparar nova auditoria"}
      >
        {mutation.isRunning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-mono tabular-nums">{elapsed}s</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            Rodar Auditoria
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isRunning}
        className={cn(
          "relative group h-10 pl-4 pr-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold transition shadow-glow flex items-center gap-2.5 overflow-hidden disabled:cursor-wait",
          !mutation.isRunning && "hover:bg-primary/90 hover:shadow-[0_0_40px_-8px_var(--primary)]",
        )}
      >
        <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        {mutation.isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Auditando carteira</span>
            <span className="font-mono tabular-nums text-primary-foreground/80 ml-1">
              {elapsed}s
            </span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Rodar Auditoria</span>
            <kbd className="ml-1 hidden md:inline-flex items-center gap-0.5 text-[9.5px] font-mono bg-white/15 px-1.5 py-0.5 rounded">
              ⌘⇧A
            </kbd>
          </>
        )}
      </button>
      {lastAt && !mutation.isRunning && (
        <div className="text-[11px] text-muted-foreground">
          Última run · <span className="font-mono text-foreground/80">{lastAt}</span>
        </div>
      )}
    </div>
  );
}
