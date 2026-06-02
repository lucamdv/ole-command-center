import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LatestAudit } from "./types";
import { countBySeverity, groupByApolice, severityOf } from "./derive";
import { formatDateTime, formatInt, formatPct } from "@/lib/format";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fileTimestamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const COLORS = {
  header: [15, 23, 42] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warn: [202, 138, 4] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  apoliceBg: [241, 245, 249] as [number, number, number],
};

export function exportAuditPdf(latest: LatestAudit) {
  const { run, findings } = latest;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const sev = countBySeverity(findings);
  const grouped = groupByApolice(findings);

  // --- Cabeçalho de página 1 ---
  doc.setFillColor(...COLORS.header);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Relatorio Consolidado de Auditoria", margin, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `OLE COPILOT  ·  ${formatDateTime(run.data_auditoria ?? run.created_at)}  ·  Status: ${run.status_geral ?? "—"}`,
    margin,
    50,
  );

  // Banner de resumo
  doc.setTextColor(...COLORS.text);
  const total = run.total_processado ?? 0;
  const aprov = run.aprovados ?? 0;
  const reprov = run.reprovados ?? 0;
  const conformidade = total > 0 ? (aprov / total) * 100 : 0;

  autoTable(doc, {
    startY: 90,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 7, halign: "center" },
    headStyles: { fillColor: COLORS.header, textColor: 255, fontStyle: "bold" },
    head: [["Total processado", "OK", "Intervencoes", "Erros", "Alertas", "Conformidade"]],
    body: [[
      formatInt(total),
      formatInt(aprov),
      formatInt(reprov),
      formatInt(sev.erros),
      formatInt(sev.alertas),
      formatPct(conformidade, 1),
    ]],
    margin: { left: margin, right: margin },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 22;

  // Top apólices (resumo tabular)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Apolices com inconsistencias (${grouped.length})`, margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: COLORS.danger, textColor: 255 },
    head: [["#", "Apolice", "Erros", "Alertas", "Total"]],
    body: grouped.map((g, i) => {
      const s = countBySeverity(g.findings);
      return [String(i + 1), g.apolice, String(s.erros), String(s.alertas), String(g.total)];
    }),
    columnStyles: {
      0: { cellWidth: 28, halign: "right" },
      1: { cellWidth: 270, font: "courier" },
      2: { cellWidth: 45, halign: "right" },
      3: { cellWidth: 50, halign: "right" },
      4: { cellWidth: 45, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // --- Detalhamento estilo Notion: sessão por apólice ---
  doc.addPage();
  cursorY = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.text);
  doc.text("Detalhamento por Apolice", margin, cursorY);
  cursorY += 18;

  for (const g of grouped) {
    const s = countBySeverity(g.findings);

    // Estimar altura: header (28) + 22 por achado
    const blockEstimate = 32 + g.findings.length * 28;
    if (cursorY + 60 > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }

    // Header da apólice
    doc.setFillColor(...COLORS.apoliceBg);
    doc.rect(margin, cursorY, usableWidth, 26, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("APOLICE", margin + 8, cursorY + 11);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text(g.apolice, margin + 8, cursorY + 22);
    // chip total à direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const chip = `${s.erros} erros  ·  ${s.alertas} alertas`;
    doc.setTextColor(...COLORS.danger);
    doc.text(chip, pageWidth - margin - 8, cursorY + 17, { align: "right" });
    cursorY += 32;

    // Bullets dos achados
    for (const f of g.findings) {
      const sv = severityOf(f);
      const tipoTxt = f.tipo_erro ?? "";
      const motivo = f.detalhes?.motivo ?? f.detalhes?.detalhe ?? "";
      const tag = sv === "erro" ? "[ERRO]" : sv === "alerta" ? "[ALERTA]" : "[INFO]";
      const tagColor = sv === "erro" ? COLORS.danger : sv === "alerta" ? COLORS.warn : COLORS.muted;

      const lineText = `${tipoTxt} — ${motivo}`;
      const wrapped = doc.splitTextToSize(lineText, usableWidth - 60);
      const blockH = wrapped.length * 11 + (f.endosso || f.data_inicio || f.data_fim ? 11 : 0) + 6;

      if (cursorY + blockH > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      // Tag de severidade
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...tagColor);
      doc.text(tag, margin + 4, cursorY + 8);

      // Texto principal
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.text);
      doc.text(wrapped, margin + 56, cursorY + 8);

      let lineY = cursorY + 8 + wrapped.length * 11;
      if (f.endosso || f.data_inicio || f.data_fim) {
        const meta = [
          f.endosso ? `Endosso ${f.endosso}` : null,
          f.data_inicio ? f.data_inicio : null,
          f.data_fim ? `→ ${f.data_fim}` : null,
        ].filter(Boolean).join("  ·  ");
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(meta, margin + 56, lineY);
        lineY += 11;
      }
      cursorY = lineY + 4;
    }

    cursorY += 8;
    void blockEstimate;
  }

  // Rodapé com paginação
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: "right" });
    doc.text("OLE COPILOT — Relatorio de Auditoria", margin, pageHeight - 16);
  }

  doc.save(`auditoria-OLE-${fileTimestamp()}.pdf`);
}
