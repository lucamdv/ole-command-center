import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  Wrench,
} from "lucide-react";
import { POLICIES } from "@/lib/mock/data";

const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, hint: "Dashboard executivo" },
  { to: "/operacao", label: "Operação", icon: Radio, hint: "Centro de monitoramento" },
  { to: "/apolices", label: "Apólices", icon: FileText, hint: "Lista e busca" },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, hint: "Incidentes operacionais" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, hint: "Rankings e tendências" },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench, hint: "Utilitários operacionais" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, hint: "Preferências da plataforma" },
] as const;

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const policyMatches = q
    ? POLICIES.filter((p) =>
        [p.number, p.broker, p.product, p.insured].some((s) => s.toLowerCase().includes(q.toLowerCase())),
      ).slice(0, 5)
    : POLICIES.slice(0, 4);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-start justify-center pt-[14vh] px-4 bg-background/60 backdrop-blur-md animate-in fade-in" onClick={() => onOpenChange(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[620px] panel overflow-hidden animate-in zoom-in-95 slide-in-from-top-4"
      >
        <Command label="Command Palette" className="bg-transparent">
          <div className="border-b border-border px-4">
            <Command.Input
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder="Pesquisar apólice, endosso, corretor, cobertura ou erro…"
              className="w-full bg-transparent py-4 text-[14px] text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
          </div>
          <Command.List className="max-h-[55vh] sm:max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-[13px] text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação" className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <Command.Item
                    key={n.to}
                    onSelect={() => go(n.to)}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer text-[13px] text-foreground aria-selected:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{n.label}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{n.hint}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Apólices" className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5 mt-2">
              {policyMatches.map((p) => (
                <Command.Item
                  key={p.id}
                  onSelect={() => go(`/apolices/${p.id}`)}
                  value={`${p.number} ${p.broker} ${p.insured} ${p.product}`}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer text-[13px] text-foreground aria-selected:bg-accent"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-[12px]">{p.number}</span>
                  <span className="text-muted-foreground truncate">— {p.insured}</span>
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      p.audit === "APROVADA" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {p.audit}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10.5px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↑↓</kbd>
            navegar
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono">↵</kbd>
            selecionar
            <kbd className="ml-auto px-1.5 py-0.5 rounded border border-border bg-background font-mono">esc</kbd>
            fechar
          </div>
        </Command>
      </div>
    </div>
  );
}
