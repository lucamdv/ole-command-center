import { createFileRoute } from "@tanstack/react-router";
import { Bell, Database, KeyRound, Plug, User, Users } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · OLÉ COPILOT" },
      { name: "description", content: "Preferências da plataforma, integrações e equipe." },
    ],
  }),
  component: ConfigPage,
});

const SECTIONS = [
  { icon: User, title: "Perfil", desc: "Dados pessoais, idioma, fuso horário." },
  { icon: Bell, title: "Notificações", desc: "Alertas em tempo real, e-mails, frequência." },
  { icon: Users, title: "Equipe", desc: "Membros, papéis e permissões granulares." },
  { icon: Plug, title: "Integrações", desc: "Supabase, N8N, motor de auditoria, APIs." },
  { icon: Database, title: "Dados & retenção", desc: "Backups, arquivamento e políticas." },
  { icon: KeyRound, title: "Segurança", desc: "MFA, sessões ativas, auditoria de acesso." },
];

function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Configurações</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Preferências da plataforma e integrações.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              className="rounded-xl border border-border bg-surface p-5 text-left hover:border-primary/40 hover:bg-surface-2/60 transition group"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center mb-3 group-hover:bg-primary/25 transition">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-[13.5px] font-semibold mb-1">{s.title}</div>
              <div className="text-[12px] text-muted-foreground">{s.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
