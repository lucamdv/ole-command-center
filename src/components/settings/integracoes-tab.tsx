import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, AlertCircle, Copy, Zap, ExternalLink, FlaskConical, Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  getIntegrationsStatus,
  pingAuditWebhook,
  pingMotorPolicies,
  type IntegrationStatus,
} from "@/lib/settings.functions";
import { relativeTime } from "@/lib/format";
import { useCurrentRole } from "@/hooks/use-current-role";
import { useWebhookMode } from "@/hooks/use-webhook-mode";


export function IntegracoesTab() {
  const fetchFn = useServerFn(getIntegrationsStatus);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: () => fetchFn(),
    refetchInterval: 30_000,
  });

  const { data: roleInfo } = useCurrentRole();
  const isAdmin = !!roleInfo?.isAdmin;
  const { mode, setMode } = useWebhookMode();

  const pingMotor = useServerFn(pingMotorPolicies);
  const pingAudit = useServerFn(pingAuditWebhook);

  const motorMut = useMutation({
    mutationFn: () => pingMotor({ data: { mode } }),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: (e: Error) => toast.error(e.message),
  });
  const auditMut = useMutation({
    mutationFn: () => pingAudit({ data: { mode } }),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="text-[13px] text-muted-foreground">Carregando integrações…</div>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {isAdmin && (
        <div className="panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {mode === "production" ? (
                  <Rocket className="h-4 w-4 text-success" />
                ) : (
                  <FlaskConical className="h-4 w-4 text-warning" />
                )}
                <div className="text-[13.5px] font-semibold">Modo do webhook (somente para você)</div>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5">
                Com o modo de produção ativo, os disparos usam o caminho
                <code className="mx-1 px-1 py-0.5 rounded bg-surface border border-border font-mono text-[11px]">/webhook/</code>
                do n8n. Desativado, usam
                <code className="mx-1 px-1 py-0.5 rounded bg-surface border border-border font-mono text-[11px]">/webhook-test/</code>
                (exige “Listen for test event”). Essa preferência é salva apenas neste usuário/navegador e
                não afeta os outros usuários nem os disparos automáticos.
              </p>
              <div className={`text-[11.5px] mt-2 ${mode === "production" ? "text-success" : "text-warning"}`}>
                Atualmente: {mode === "production" ? "Produção" : "Teste"}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={mode === "production"}
              aria-label="Ativar modo de produção do webhook"
              onClick={() => {
                const next = mode === "production" ? "test" : "production";
                setMode(next);
                toast.success(
                  next === "production"
                    ? "Modo de produção ativado para você"
                    : "Modo de teste ativado para você",
                );
              }}
              className={`shrink-0 relative h-6 w-11 rounded-full transition ${
                mode === "production" ? "bg-primary" : "bg-surface-2 border border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                  mode === "production" ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
      {(data ?? []).map((it) => (

        <IntegrationCard
          key={it.id}
          item={it}
          onPing={
            it.id === "motor_policies"
              ? () => motorMut.mutate()
              : it.id === "n8n_audit"
                ? () => auditMut.mutate()
                : undefined
          }
          pingPending={
            (it.id === "motor_policies" && motorMut.isPending) ||
            (it.id === "n8n_audit" && auditMut.isPending)
          }
          onRefresh={() => refetch()}
        />
      ))}
      <p className="text-[11.5px] text-muted-foreground pt-2">
        Os webhooks são gerenciados via secrets do backend. Para alterar URLs, atualize as variáveis
        <code className="mx-1 px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px]">N8N_MOTOR_POLICIES_URL</code>
        e
        <code className="mx-1 px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px]">N8N_AUDIT_WEBHOOK_URL</code>
        no painel de backend.
      </p>
    </div>
  );
}

function IntegrationCard({
  item,
  onPing,
  pingPending,
  onRefresh,
}: {
  item: IntegrationStatus;
  onPing?: () => void;
  pingPending?: boolean;
  onRefresh: () => void;
}) {
  const Status = !item.configured
    ? { Icon: XCircle, color: "text-destructive", label: "Não configurado" }
    : item.lastStatus === "error"
      ? { Icon: AlertCircle, color: "text-destructive", label: "Erro na última execução" }
      : item.lastStatus === "success" || item.id === "audit_callback"
        ? { Icon: CheckCircle2, color: "text-success", label: item.id === "audit_callback" ? "Pronto" : "Operacional" }
        : { Icon: AlertCircle, color: "text-warning", label: item.lastStatus ?? "Aguardando primeiro evento" };

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Status.Icon className={`h-4 w-4 ${Status.color}`} />
            <div className="text-[13.5px] font-semibold">{item.label}</div>
          </div>
          <div className={`text-[11.5px] mt-1 ${Status.color}`}>{Status.label}</div>
          {item.lastDetail && (
            <div className="text-[12px] text-muted-foreground mt-2 truncate">{item.lastDetail}</div>
          )}
          {item.lastAt && (
            <div className="text-[10.5px] text-muted-foreground/80 font-mono mt-0.5">
              Última atividade: {relativeTime(item.lastAt)}
            </div>
          )}
          {item.publicCallback && (
            <div className="mt-3 flex items-center gap-2">
              <code className="text-[11px] font-mono bg-background border border-border rounded px-2 py-1 truncate flex-1">
                {item.publicCallback}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(item.publicCallback!);
                  toast.success("URL copiada");
                }}
                className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-surface-2 transition"
                title="Copiar URL"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {onPing && (
            <button
              onClick={onPing}
              disabled={!item.configured || pingPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <Zap className="h-3 w-3" />
              {pingPending ? "Testando…" : "Testar"}
            </button>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[12px] hover:bg-surface-2 transition"
          >
            <ExternalLink className="h-3 w-3" />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
