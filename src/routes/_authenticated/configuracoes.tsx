import { createFileRoute } from "@tanstack/react-router";
import { Bell, Database, Plug, User } from "lucide-react";
import { useState } from "react";
import { PerfilTab } from "@/components/settings/perfil-tab";
import { NotificacoesTab } from "@/components/settings/notificacoes-tab";
import { IntegracoesTab } from "@/components/settings/integracoes-tab";
import { DadosTab } from "@/components/settings/dados-tab";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · OLÉ COPILOT" },
      { name: "description", content: "Preferências da plataforma, integrações e retenção de dados." },
    ],
  }),
  component: ConfigPage,
});

const TABS = [
  { id: "perfil", label: "Perfil", icon: User, Component: PerfilTab },
  { id: "notificacoes", label: "Notificações", icon: Bell, Component: NotificacoesTab },
  { id: "integracoes", label: "Integrações", icon: Plug, Component: IntegracoesTab },
  { id: "dados", label: "Dados & Retenção", icon: Database, Component: DadosTab },
] as const;

function ConfigPage() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("perfil");
  const Active = TABS.find((t) => t.id === active)!.Component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Configurações</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Preferências do operador, integrações com motores e gestão de dados.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 h-10 text-[13px] font-medium border-b-2 -mb-px transition ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <Active />
    </div>
  );
}
