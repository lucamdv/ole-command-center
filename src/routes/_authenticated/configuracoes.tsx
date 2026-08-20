import { createFileRoute } from "@tanstack/react-router";
import { Bell, Clock, Database, EyeOff, Plug, Target, User } from "lucide-react";
import { useMemo, useState } from "react";
import { PerfilTab } from "@/components/settings/perfil-tab";
import { NotificacoesTab } from "@/components/settings/notificacoes-tab";
import { IntegracoesTab } from "@/components/settings/integracoes-tab";
import { DadosTab } from "@/components/settings/dados-tab";
import { AutomacaoTab } from "@/components/settings/automacao-tab";

import { ExcecoesTab } from "@/components/settings/excecoes-tab";
import { MetasTab } from "@/components/settings/metas-tab";
import { useCurrentRole } from "@/hooks/use-current-role";
import { PageHeader } from "@/components/layout/page-header";


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
  { id: "perfil", label: "Perfil", icon: User, Component: PerfilTab, adminOnly: false },
  { id: "metas", label: "Metas de KPI", icon: Target, Component: MetasTab, adminOnly: false },
  { id: "notificacoes", label: "Notificações", icon: Bell, Component: NotificacoesTab, adminOnly: false },
  { id: "excecoes", label: "Exceções", icon: EyeOff, Component: ExcecoesTab, adminOnly: false },
  { id: "integracoes", label: "Integrações", icon: Plug, Component: IntegracoesTab, adminOnly: true },
  { id: "automacao", label: "Automação", icon: Clock, Component: AutomacaoTab, adminOnly: true },
  { id: "dados", label: "Dados & Retenção", icon: Database, Component: DadosTab, adminOnly: true },

] as const;


function ConfigPage() {
  const { data: roleInfo } = useCurrentRole();
  const isAdmin = !!roleInfo?.isAdmin;
  const tabs = useMemo(() => TABS.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("perfil");
  const Active = (tabs.find((t) => t.id === active) ?? tabs[0]).Component;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plataforma"
        title="Configurações"
        description="Preferências do operador, integrações com motores e gestão de dados."
      />

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="segmented w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-surface text-foreground shadow-soft border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="panel p-4 sm:p-5">
        <Active />
      </div>
    </div>
  );
}
