import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useChartPrefs, useProfile } from "@/hooks/use-settings";



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
  const { prefs: chartPrefs, update: updateChartPrefs } = useChartPrefs();


  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome do operador">
          <input
            value={profile.nome}
            readOnly
            title="Gerenciado pelo administrador"
            className="w-full h-9 px-3 rounded-md border border-border bg-surface/40 text-[13px] text-muted-foreground cursor-not-allowed focus:outline-none"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={profile.email}
            readOnly
            title="Gerenciado pelo administrador"
            className="w-full h-9 px-3 rounded-md border border-border bg-surface/40 text-[13px] text-muted-foreground cursor-not-allowed focus:outline-none"
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

      <div>
        <div className="text-[12px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Visualização de gráficos
        </div>
        <label className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface/60 p-3 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">Ocultar gráficos sem dados suficientes</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              Quando ativo, gráficos sem informação relevante são escondidos e um aviso discreto
              lista quais ficaram de fora.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={chartPrefs.hideEmptyCharts}
            onClick={() => updateChartPrefs({ hideEmptyCharts: !chartPrefs.hideEmptyCharts })}
            className={`relative shrink-0 h-5 w-9 rounded-full transition ${chartPrefs.hideEmptyCharts ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${chartPrefs.hideEmptyCharts ? "left-4.5" : "left-0.5"}`}
            />
          </button>
        </label>
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
