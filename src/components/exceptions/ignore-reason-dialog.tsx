import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useExceptionTags } from "@/hooks/use-exception-tags";
import { readableOn } from "@/components/exceptions/reason-chip";

export interface IgnoreReasonResult {
  motivo: string;
  reason_tag_id: string | null;
}

/**
 * Diálogo compartilhado para registrar/editar o motivo de uma exceção.
 * Só permite confirmar com uma tag selecionada ou um motivo digitado.
 */
export function IgnoreReasonDialog({
  open,
  onOpenChange,
  title = "Registrar exceção",
  targetLabel,
  description,
  confirmLabel = "Registrar exceção",
  initialMotivo = "",
  initialTagId = null,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  targetLabel?: string;
  description?: string;
  confirmLabel?: string;
  initialMotivo?: string;
  initialTagId?: string | null;
  pending?: boolean;
  onConfirm: (result: IgnoreReasonResult) => void;
}) {
  const { data: tags = [] } = useExceptionTags();
  const [tagId, setTagId] = useState<string | null>(initialTagId);
  const [motivo, setMotivo] = useState(initialMotivo);

  useEffect(() => {
    if (open) {
      setTagId(initialTagId);
      setMotivo(initialMotivo);
    }
  }, [open, initialTagId, initialMotivo]);

  const selected = tags.find((t) => t.id === tagId) ?? null;
  const trimmed = motivo.trim();
  const canConfirm = !!selected || trimmed.length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({
      motivo: trimmed || (selected ? selected.name : ""),
      reason_tag_id: selected ? selected.id : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <EyeOff className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            {description ??
              "O motivo é obrigatório. Selecione uma tag pronta e/ou descreva o motivo."}
          </DialogDescription>
        </DialogHeader>

        {targetLabel && (
          <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[12.5px]">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-2">
              Alvo
            </span>
            <span className="font-mono break-all">{targetLabel}</span>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Tags de motivo
          </p>
          {tags.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Nenhuma tag cadastrada. Crie tags em Configurações → Exceções.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = tagId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTagId(active ? null : t.id)}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none transition ${
                      active ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: t.color,
                      color: readableOn(t.color),
                      ...(active ? { boxShadow: `0 0 0 2px ${t.color}` } : {}),
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Motivo personalizado {selected ? "(opcional)" : "(obrigatório)"}
          </p>
          <Textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={
              selected ? "Complemente o motivo, se quiser…" : "Descreva o motivo da exceção…"
            }
            className="text-[12.5px] resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right">{motivo.length}/500</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="h-9 text-[12.5px]" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="h-9 text-[12.5px]"
            disabled={!canConfirm || pending}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
