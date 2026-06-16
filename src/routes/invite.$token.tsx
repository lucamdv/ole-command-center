import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { lookupInvite, consumeInvite } from "@/lib/invites.functions";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const navigate = useNavigate();
  const lookup = useServerFn(lookupInvite);
  const consume = useServerFn(consumeInvite);

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "invalid"; reason: string }
    | { status: "ready"; email: string; role: string }
  >({ status: "loading" });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    lookup({ data: { token } })
      .then((res) => {
        if (res.valid) setState({ status: "ready", email: res.email, role: res.role });
        else setState({ status: "invalid", reason: res.reason });
      })
      .catch(() => setState({ status: "invalid", reason: "error" }));
  }, [token, lookup]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    try {
      await consume({ data: { token, full_name: fullName, password } });
      toast.success("Conta criada! Faça login para continuar.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao aceitar convite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-[24px] font-semibold tracking-tight">OLÉ COPILOT</div>
          <div className="text-[13px] text-muted-foreground">Aceitar convite</div>
        </div>

        {state.status === "loading" && (
          <div className="text-center text-[13px] text-muted-foreground">Validando convite…</div>
        )}

        {state.status === "invalid" && (
          <div className="text-center space-y-3">
            <div className="text-[14px] text-destructive">
              {state.reason === "expired" && "Este convite expirou."}
              {state.reason === "used" && "Este convite já foi utilizado."}
              {state.reason === "revoked" && "Este convite foi revogado."}
              {state.reason === "not_found" && "Convite não encontrado."}
              {state.reason === "error" && "Erro ao validar o convite."}
            </div>
            <Button variant="outline" onClick={() => navigate({ to: "/auth" })}>
              Ir para login
            </Button>
          </div>
        )}

        {state.status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-muted/30 border border-border p-3 text-[12px]">
              Convite para <strong>{state.email}</strong> · perfil{" "}
              <strong>{state.role}</strong>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
