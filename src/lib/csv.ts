/** Utilitários de CSV compatíveis com Excel pt-BR (`;`, BOM UTF-8, CRLF). */

export const CSV_SEP = ";";

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(CSV_SEP);
}

/** Junta linhas com CRLF e prefixa BOM para o Excel reconhecer UTF-8. */
export function csvDocument(rows: unknown[][]): string {
  return "\uFEFF" + rows.map(csvRow).join("\r\n") + "\r\n";
}

/** Número em formato pt-BR (vírgula decimal, sem separador de milhar). */
export function csvNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  return n.toFixed(decimals).replace(".", ",");
}

/** Data em dd/mm/aaaa (ignora fuso ao ler ISO simples). */
export function csvDate(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Data e hora em dd/mm/aaaa hh:mm (horário de Brasília). */
export function csvDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}
