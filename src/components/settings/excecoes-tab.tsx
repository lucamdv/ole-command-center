import { useMemo, useState } from "react";
import { EyeOff, Pencil, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAuditIgnores,
  useRemoveAuditIgnore,
  useUpdateAuditIgnore,
} from "@/hooks/use-audit-ignores";
import { useExceptionTags } from "@/hooks/use-exception-tags";
import { ReasonDisplay, ReasonTagChip } from "@/components/exceptions/reason-chip";

import { IgnoreReasonDialog } from "@/components/exceptions/ignore-reason-dialog";
import { ReasonTagsManager } from "@/components/settings/reason-tags-manager";
import { formatDateTime } from "@/lib/format";
import type { AuditIgnoreRow } from "@/lib/audit-ignores.functions";

export function ExcecoesTab() {
  const { data: ignores = [], isLoading } = useAuditIgnores();
  const { data: tags = [] } = useExceptionTags();
  const remove = useRemoveAuditIgnore();
  const update = useUpdateAuditIgnore();
  const [q, setQ] = useState("");
  const [errorFilter, setErrorFilter] = useState<string>("__all__");
  const [tagFilter, setTagFilter] = useState<string>("__all__");
  const [editing, setEditing] = useState<AuditIgnoreRow | null>(null);

  const errorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of ignores) {
      if (i.tipo_erro) set.add(i.tipo_erro);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [ignores]);

  const filtered = useMemo(() => {
    let result = ignores;
    const term = q.trim().toLowerCase();
    if (term) {
      result = result.filter((i) =>
        `${i.apolice} ${i.tipo_erro ?? ""} ${i.motivo ?? ""}`.toLowerCase().includes(term),
      );
    }
    if (errorFilter !== "__all__") {
      result = result.filter((i) => i.tipo_erro === errorFilter || (!i.tipo_erro && errorFilter === "__none__"));
    }
    if (tagFilter !== "__all__") {
      result = result.filter((i) =>
        tagFilter === "__none__" ? !i.reason_tag_id : i.reason_tag_id === tagFilter,
      );
    }
    return result;
  }, [ignores, q, errorFilter, tagFilter]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <EyeOff className="h-4 w-4" /> Exceções de Auditoria
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-1 max-w-2xl">
            Achados aqui listados são ocultados nos relatórios de auditoria. Remover
            uma exceção faz o erro voltar a aparecer na próxima visualização do relatório.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={errorFilter} onValueChange={setErrorFilter}>
            <SelectTrigger className="w-full sm:w-[220px] h-9 text-[12.5px]">
              <SelectValue placeholder="Filtrar por erro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos de erro</SelectItem>
              {errorOptions.length === 0 && (
                <SelectItem value="__all__" disabled>
                  Nenhum erro disponível
                </SelectItem>
              )}
              {errorOptions.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full sm:w-[220px] h-9 text-[12.5px]">
              <SelectValue placeholder="Filtrar por tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as tags</SelectItem>
              <SelectItem value="__none__">Sem tag</SelectItem>
              {tags.length === 0 && (
                <SelectItem value="__all__" disabled>
                  Nenhuma tag disponível
                </SelectItem>
              )}
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="inline-flex items-center gap-1.5">
                    <ReasonTagChip tag={t} /> {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar apólice, tipo ou motivo…"
              className="pl-8 h-9 text-[12.5px]"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Apólice</TableHead>
              <TableHead className="text-[11px]">Tipo de erro</TableHead>
              <TableHead className="text-[11px]">Motivo</TableHead>
              <TableHead className="text-[11px]">Criada em</TableHead>
              <TableHead className="text-[11px] w-[180px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[12px] text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-[12.5px] text-muted-foreground">
                  {ignores.length === 0
                    ? "Nenhuma exceção registrada. Use o botão Ignorar no relatório de auditoria para criar uma."
                    : "Nenhuma exceção corresponde à busca."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-[12px] break-all">{i.apolice}</TableCell>
                <TableCell className="text-[12.5px]">
                  {i.tipo_erro ? (
                    <span className="font-mono text-[11.5px]">{i.tipo_erro}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Todos os erros</span>
                  )}
                </TableCell>
                <TableCell className="text-[12.5px] max-w-[320px]">
                  <ReasonDisplay motivo={i.motivo} tagId={i.reason_tag_id} tags={tags} />
                </TableCell>
                <TableCell className="text-[11.5px] font-mono text-muted-foreground">
                  {formatDateTime(i.created_at)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[11.5px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(i)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar motivo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Remover a exceção da apólice ${i.apolice}?`)) {
                        remove.mutate({ id: i.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <IgnoreReasonDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Editar motivo da exceção"
        confirmLabel="Salvar motivo"
        targetLabel={
          editing
            ? editing.tipo_erro
              ? `${editing.tipo_erro} · apólice ${editing.apolice}`
              : `Todos os erros da apólice ${editing.apolice}`
            : undefined
        }
        initialMotivo={editing?.motivo ?? ""}
        initialTagId={editing?.reason_tag_id ?? null}
        pending={update.isPending}
        onConfirm={({ motivo, reason_tag_id }) => {
          if (!editing) return;
          update.mutate(
            { id: editing.id, motivo, reason_tag_id },
            { onSuccess: () => setEditing(null) },
          );
        }}
      />

      <div className="border-t border-border pt-6">
        <ReasonTagsManager />
      </div>
    </div>
  );
}
