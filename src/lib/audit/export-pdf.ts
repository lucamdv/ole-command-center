import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LatestAudit } from "./types";
import { groupByApolice } from "./derive";
import { formatDateTime, formatInt, formatPct } from "@/lib/format";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fileTimestamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportAuditPdf(latest: LatestAudit) {
  const { run, findings } = latest;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 60, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("OLÉ COPILOT — Relatório de Auditoria", margin, 28);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Auditoria de ${formatDateTime(run.data_auditoria ?? run.created_at)}  ·  Status: ${run.status_geral ?? "—"}`,
    margin,
    46,
  );

  // Resumo
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", margin, 90);

  const total = run.total_processado ?? 0;
  const aprov = run.aprovados ?? 0;
  const reprov = run.reprovados ?? 0;
  const conformidade = total > 0 ? (aprov / total) * 100 : 0;

  autoTable(doc, {
    startY: 100,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    head: [["Total processado", "Aprovados", "Reprovados", "Conformidade"]],
    body: [[formatInt(total), formatInt(aprov), formatInt(reprov), formatPct(conformidade, 1)]],
    margin: { left: margin, right: margin },
  });

  // Top apólices
  const grouped = groupByApolice(findings);
  let cursorY = (doc as any).lastAutoTable.finalY + 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Apólices com inconsistências (${grouped.length})`, margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    head: [["#", "Apólice", "Erros", "Tipos"]],
    body: grouped.map((g, i) => [
      String(i + 1),
      g.apolice,
      String(g.total),
      g.tipos.join(" · "),
    ]),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 220, font: "courier" },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Detalhamento por achado
  cursorY = (doc as any).lastAutoTable.finalY + 24;
  if (cursorY > 720) {
    doc.addPage();
    cursorY = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Detalhamento (${findings.length} achados)`, margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    head: [["Apólice", "Tipo de erro", "Endosso", "Início", "Fim", "Detalhe"]],
    body: findings.map((f) => [
      f.apolice,
      f.tipo_erro,
      f.endosso ?? "—",
      f.data_inicio ?? "—",
      f.data_fim ?? "—",
      f.detalhes?.motivo ?? f.detalhes?.detalhe ?? "—",
    ]),
    columnStyles: {
      0: { cellWidth: 150, font: "courier" },
      1: { cellWidth: 90 },
      2: { cellWidth: 50 },
      3: { cellWidth: 55 },
      4: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const str = `Página ${doc.getCurrentPageInfo().pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(str, pageWidth - margin, doc.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });

  doc.save(`auditoria-OLE-${fileTimestamp()}.pdf`);
}
