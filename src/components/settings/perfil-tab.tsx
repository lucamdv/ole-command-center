import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useProfile } from "@/hooks/use-settings";
import { toast } from "sonner";

const FUSOS = [
  "America/Sao_Paulo",
  "America/Recife",
  "America/Manaus",
  "America/Belem",
  "America/Cuiaba",
  "America/Noronha",
  "UTC",
];

export function PerfilTab() {
  const { profile, update } = useProfile();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome do operador">
          <input
            value={profile.nome}
            onChange={(e) => update({ nome: e.target.value })}
            onBlur={() => toast.success("Perfil atualizado")}
            className="w-full h-9 px-3 rounded-md border border-border bg-surface text-[13px] focus:outline-none focus:border-primary"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={profile.email}
            onChange={(e) => update({ email: e.target.value })}
            className="w-full h-9 px-3 rounded-md border border-border bg-surface text-[13px] focus:outline-none focus:border-primary"
          />
        </Field>
        <Field label="Fuso horário">
          <select
            value={profile.fuso}
            onChange={(e) => update({ fuso: e.target.value })}
            className="w-full h-9 px-3 rounded-md border border-border bg-surface text-[13px] focus:outline-none focus:border-primary"
          >
            {FUSOS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Idioma">
          <select
            value={profile.idioma}
            onChange={(e) => update({ idioma: e.target.value as "pt-BR" | "en-US" })}
            className="w-full h-9 px-3 rounded-md border border-border bg-surface text-[13px] focus:outline-none focus:border-primary"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">English (US) — em breve</option>
          </select>
        </Field>
      </div>

      <div>
        <div className="text-[12px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Tema</div>
        <div className="inline-flex rounded-lg border border-border p-1 bg-surface/60">
          {[
            { v: "light" as const, label: "Claro", icon: Sun },
            { v: "dark" as const, label: "Escuro", icon: Moon },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setTheme(opt.v)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-[12.5px] transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
          <button
            disabled
            className="flex items-center gap-1.5 px-3 h-8 rounded-md text-[12.5px] text-muted-foreground/50 cursor-not-allowed"
            title="Em breve"
          >
            <Monitor className="h-3.5 w-3.5" />
            Sistema
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
