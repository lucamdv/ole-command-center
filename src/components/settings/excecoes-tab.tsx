import { useMemo, useState } from "react";
import { Check, EyeOff, Pencil, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDateTime } from "@/lib/format";

export function ExcecoesTab() {
  const { data: ignores = [], isLoading } = useAuditIgnores();
  const remove = useRemoveAuditIgnore();
  const update = useUpdateAuditIgnore();
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, motivo: string | null) => {
    setEditingId(id);
    setDraft(motivo ?? "");
  };
  const saveEdit = (id: string) => {
    update.mutate(
      { id, motivo: draft.trim() ? draft.trim() : null },
      { onSuccess: () => setEditingId(null) },
    );
  };


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ignores;
    return ignores.filter((i) =>
      `${i.apolice} ${i.tipo_erro ?? ""} ${i.motivo ?? ""}`.toLowerCase().includes(term),
    );
  }, [ignores, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <EyeOff className="h-4 w-4" /> Exceções de Auditoria
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-1 max-w-2xl">
            Achados aqui listados são ocultados nos relatórios de auditoria. Remover
            uma exceção faz o erro voltar a aparecer na próxima visualização do relatório.
          </p>
        </div>
        <div className="relative w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar apólice, tipo ou motivo…"
            className="pl-8 h-9 text-[12.5px]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Apólice</TableHead>
              <TableHead className="text-[11px]">Tipo de erro</TableHead>
              <TableHead className="text-[11px]">Motivo</TableHead>
              <TableHead className="text-[11px]">Criada em</TableHead>
              <TableHead className="text-[11px] w-[120px] text-right">Ação</TableHead>
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
                <TableCell className="text-[12.5px] text-muted-foreground max-w-[320px]">
                  {i.motivo || "—"}
                </TableCell>
                <TableCell className="text-[11.5px] font-mono text-muted-foreground">
                  {formatDateTime(i.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[11.5px] gap-1 text-muted-foreground hover:text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Remover a exceção da apólice ${i.apolice}?`)) {
                        remove.mutate({ id: i.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
