import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Trash2, Database, FileSearch, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  getDataCounters,
  purgeOldAudits,
  exportPoliciesCSV,
  exportLatestAuditJSON,
} from "@/lib/settings.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DadosTab() {
  const qc = useQueryClient();
  const fetchCounters = useServerFn(getDataCounters);
  const { data: counters } = useQuery({
    queryKey: ["data-counters"],
    queryFn: () => fetchCounters(),
    refetchInterval: 30_000,
  });

  const auditFn = useServerFn(purgeOldAudits);
  const exportCSVFn = useServerFn(exportPoliciesCSV);
  const exportAuditFn = useServerFn(exportLatestAuditJSON);

  const [confirm, setConfirm] = useState<null | "audit">(null);

  const purgeAuditMut = useMutation({
    mutationFn: () => auditFn({ data: { days: 90 } }),
    onSuccess: (r) => {
      toast.success(`${r.removed} rodadas de auditoria removidas (anteriores a 90 dias)`);
      qc.invalidateQueries({ queryKey: ["data-counters"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCSVMut = useMutation({
    mutationFn: () => exportCSVFn(),
    onSuccess: (r) => {
      if (!r.count) return toast.info("Nenhuma apólice na carteira para exportar");
      download(
        `carteira-${new Date().toISOString().slice(0, 10)}.csv`,
        r.csv,
        "text/csv;charset=utf-8",
      );
      toast.success(`${r.count} apólices exportadas`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportAuditMut = useMutation({
    mutationFn: () => exportAuditFn(),
    onSuccess: (r) => {
      if (!r.json) return toast.info("Nenhuma auditoria concluída para exportar");
      download(`auditoria-${new Date().toISOString().slice(0, 10)}.json`, r.json, "application/json");
      toast.success("Auditoria exportada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = counters;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Volumes atuais
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat icon={Database} label="Apólices" value={c?.policies} />
          <Stat icon={Database} label="Endossos" value={c?.endorsements} />
          <Stat icon={FileSearch} label="Rodadas de auditoria" value={c?.audit_runs} />
          <Stat icon={FileSearch} label="Achados" value={c?.audit_findings} />
        </div>
      </div>

      <Section title="Exportar">
        <Action
          icon={FileText}
          title="Carteira (CSV)"
          desc="Exporta todas as apólices: número, endosso atual, segurado, prêmio."
          actionLabel={exportCSVMut.isPending ? "Gerando…" : "Baixar CSV"}
          disabled={exportCSVMut.isPending}
          onClick={() => exportCSVMut.mutate()}
        />
        <Action
          icon={FileText}
          title="Última auditoria (JSON)"
          desc="Última rodada concluída com sucesso e todos os achados."
          actionLabel={exportAuditMut.isPending ? "Gerando…" : "Baixar JSON"}
          disabled={exportAuditMut.isPending}
          onClick={() => exportAuditMut.mutate()}
        />
      </Section>

      <Section title="Retenção & limpeza">
        <Action
          icon={Trash2}
          tone="destructive"
          title="Limpar auditorias com mais de 90 dias"
          desc="Remove rodadas antigas e seus achados (cascade)."
          actionLabel={purgeAuditMut.isPending ? "Limpando…" : "Limpar"}
          disabled={purgeAuditMut.isPending}
          onClick={() => setConfirm("audit")}
        />
      </Section>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as rodadas de auditoria anteriores a 90 dias e seus achados serão apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === "audit") purgeAuditMut.mutate();
                setConfirm(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/15 text-primary grid place-items-center">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[15px] font-semibold tabular-nums">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">{title}</div>
      <div className="panel divide-y divide-border">{children}</div>
    </div>
  );
}

function Action({
  icon: Icon,
  title,
  desc,
  actionLabel,
  onClick,
  tone = "default",
  disabled,
}: {
  icon: typeof Download;
  title: string;
  desc: string;
  actionLabel: string;
  onClick: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium">{title}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">{desc}</div>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`shrink-0 h-8 px-3 rounded-md text-[12px] font-medium transition disabled:opacity-50 ${tone === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
