import { useState } from "react";
import { Check, Plus, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddExceptionTag,
  useExceptionTags,
  useRemoveExceptionTag,
  useUpdateExceptionTag,
} from "@/hooks/use-exception-tags";
import { useCurrentRole } from "@/hooks/use-current-role";
import { ReasonTagChip } from "@/components/exceptions/reason-chip";

const PALETTE = ["#2563EB", "#DC2626", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#DB2777", "#475569"];

export function ReasonTagsManager() {
  const { data: roleInfo } = useCurrentRole();
  const isAdmin = !!roleInfo?.isAdmin;
  const { data: tags = [], isLoading } = useExceptionTags();
  const add = useAddExceptionTag();
  const update = useUpdateExceptionTag();
  const remove = useRemoveExceptionTag();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(PALETTE[0]);

  const submit = () => {
    if (!name.trim()) return;
    add.mutate({ name: name.trim(), color }, { onSuccess: () => setName("") });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <Tags className="h-4 w-4" /> Tags de motivo
        </h3>
        <p className="text-[12.5px] text-muted-foreground mt-1 max-w-2xl">
          Motivos prontos, compartilhados por toda a equipe, usados ao registrar exceções na
          auditoria e no extrator de últimos endossos.
          {!isAdmin && " Apenas administradores podem criar, editar ou remover tags."}
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Nome da tag"
            maxLength={60}
            className="h-9 text-[12.5px] sm:w-[220px]"
          />
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border border-border transition ${
                  color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              aria-label="Cor personalizada"
              className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
            />
          </div>
          <Button
            className="h-9 gap-1 text-[12.5px]"
            disabled={add.isPending || !name.trim()}
            onClick={submit}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar tag
          </Button>
        </div>
      )}

      <div className="panel p-3">
        {isLoading && <p className="text-[12px] text-muted-foreground">Carregando…</p>}
        {!isLoading && tags.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground">Nenhuma tag cadastrada.</p>
        )}
        <ul className="space-y-2">
          {tags.map((t) =>
            editingId === t.id ? (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={60}
                  className="h-8 text-[12.5px] w-[200px]"
                />
                <input
                  type="color"
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value.toUpperCase())}
                  aria-label="Cor da tag"
                  className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11.5px] gap-1 text-primary"
                  disabled={update.isPending || !draftName.trim()}
                  onClick={() =>
                    update.mutate(
                      { id: t.id, name: draftName.trim(), color: draftColor },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                >
                  <Check className="h-3.5 w-3.5" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ) : (
              <li key={t.id} className="flex items-center gap-2">
                <ReasonTagChip tag={t} />
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(t.id);
                        setDraftName(t.name);
                        setDraftColor(t.color);
                      }}
                      className="text-[11.5px] text-muted-foreground hover:text-foreground"
                    >
                      Editar
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`Remover a tag "${t.name}"?`)) remove.mutate({ id: t.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
