import { Volume2, RotateCcw } from "lucide-react";
import { useNotifPrefs, playNotifBeep, type NotifPrefs } from "@/hooks/use-settings";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

const ITEMS: Array<{ key: keyof NotifPrefs; label: string; desc: string }> = [
  { key: "auditoria_concluida", label: "Auditoria concluída", desc: "Notifica ao fim de cada rodada bem-sucedida." },
  { key: "auditoria_erro", label: "Falha em auditoria", desc: "Alerta crítico quando o motor retorna erro." },
  { key: "sync_carteira", label: "Sincronização da carteira", desc: "Resultado de cada execução do MOTOR OLÉ." },
  { key: "achados_criticos", label: "Achados críticos", desc: "Gap de vigência, duplicidade, sobreposição." },
  { key: "apolices_atualizadas", label: "Apólices novas/atualizadas", desc: "Resumo desde sua última visita." },
];

export function NotificacoesTab() {
  const { prefs, update } = useNotifPrefs();
  const { resetReadHistory } = useNotifications();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="panel divide-y divide-border">
        {ITEMS.map((it) => (
          <Toggle
            key={it.key}
            label={it.label}
            desc={it.desc}
            checked={prefs[it.key] !== false}
            onChange={(v) => update({ [it.key]: v } as Partial<NotifPrefs>)}
          />
        ))}
        <Toggle
          label="Som ao receber notificação crítica"
          desc="Toca um beep curto para severidade alta/crítica."
          checked={prefs.som}
          onChange={(v) => {
            update({ som: v });
            if (v) playNotifBeep();
          }}
          icon={<Volume2 className="h-3.5 w-3.5" />}
        />
      </div>

      <button
        onClick={() => {
          resetReadHistory();
          toast.success("Histórico de leitura redefinido");
        }}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface hover:bg-surface-2 text-[12.5px] transition"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Resetar histórico de leitura
      </button>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  icon,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        <div className="text-[11.5px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-10 h-5.5 rounded-full transition relative ${checked ? "bg-primary" : "bg-muted"}`}
        style={{ height: 22, width: 40 }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-background shadow transition-transform"
          style={{ height: 18, width: 18, transform: checked ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}
