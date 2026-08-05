import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportRow {
  policy_number: string;
  last_sequencial_endosso_used: number | null;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportEndorsementsCsv(rows: ExportRow[]) {
  const header = "PolicyNumber;last_sequencial_endosso_used";
  const body = rows
    .map((r) => `${r.policy_number};${r.last_sequencial_endosso_used ?? ""}`)
    .join("\n");
  const blob = new Blob([`\uFEFF${header}\n${body}\n`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ultimos-endossos-${stamp()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEndorsementsPdf(rows: ExportRow[], generatedAt?: string | null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Extrator de Últimos Endossos", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${rows.length} apólices  ·  gerado em ${new Date().toLocaleString("pt-BR")}${
      generatedAt ? `  ·  extração de ${new Date(generatedAt).toLocaleString("pt-BR")}` : ""
    }`,
    40,
    46,
  );

  autoTable(doc, {
    startY: 84,
    head: [["PolicyNumber", "last_sequencial_endosso_used"]],
    body: rows.map((r) => [r.policy_number, String(r.last_sequencial_endosso_used ?? "—")]),
    styles: { fontSize: 8, cellPadding: 4, textColor: [15, 23, 42] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  doc.save(`ultimos-endossos-${stamp()}.pdf`);
}
