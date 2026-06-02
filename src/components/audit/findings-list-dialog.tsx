import { useMemo, useState } from "react";
import { Copy, FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { LatestAudit } from "@/lib/audit/types";
import { exportAuditPdf } from "@/lib/audit/export-pdf";
import { toast } from "sonner";

export function FindingsListDialog({
  latest,
  trigger,
}: {
  latest: LatestAudit;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("__all__");

  const tipos = useMemo(
    () => Array.from(new Set(latest.findings.map((f) => f.tipo_erro))).sort(),
    [latest.findings],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return latest.findings.filter((f) => {
      if (tipo !== "__all__" && f.tipo_erro !== tipo) return false;
      if (term && !f.apolice.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [latest.findings, q, tipo]);

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Apólice copiada");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-[15px]">
            Consolidado de achados — {latest.findings.length} ocorrências
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número de apólice…"
              className="pl-8 h-9 text-[12.5px]"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9 w-[240px] text-[12.5px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportAuditPdf(latest)}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-surface z-10">
              <TableRow>
                <TableHead className="text-[11px]">Apólice</TableHead>
                <TableHead className="text-[11px]">Tipo de erro</TableHead>
                <TableHead className="text-[11px]">Endosso</TableHead>
                <TableHead className="text-[11px]">Início</TableHead>
                <TableHead className="text-[11px]">Fim</TableHead>
                <TableHead className="text-[11px]">Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-[11.5px] align-top">
                    <div className="flex items-start gap-1.5">
                      <span className="break-all">{f.apolice}</span>
                      <button
                        type="button"
                        onClick={() => copy(f.apolice)}
                        className="opacity-50 hover:opacity-100 shrink-0"
                        title="Copiar"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] align-top">{f.tipo_erro}</TableCell>
                  <TableCell className="text-[12px] font-mono align-top">
                    {f.endosso ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px] font-mono align-top">
                    {f.data_inicio ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px] font-mono align-top">
                    {f.data_fim ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground align-top">
                    {f.detalhes?.motivo ?? f.detalhes?.detalhe ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[12px] text-muted-foreground">
                    Nenhum achado para o filtro atual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
