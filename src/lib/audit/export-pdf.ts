import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AuditHistoryItem, LatestAudit } from "./types";
import {
  bucketByMonth,
  countBySeverity,
  errorTypeBreakdown,
  groupByApolice,
  groupByEndosso,
  normalizeFinding,
  runSeries,
  severityOf,
} from "./derive";
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
  info: [37, 99, 235] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  apoliceBg: [241, 245, 249] as [number, number, number],
  grid: [226, 232, 240] as [number, number, number],
  chartBg: [248, 250, 252] as [number, number, number],
};

export function exportAuditPdf(latest: LatestAudit, history: AuditHistoryItem[] = []) {
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
    body: [
      [
        formatInt(total),
        formatInt(aprov),
        formatInt(reprov),
        formatInt(sev.erros),
        formatInt(sev.alertas),
        formatPct(conformidade, 1),
      ],
    ],
    margin: { left: margin, right: margin },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 22;

  // Top apólices (resumo tabular agora com motivos e endossos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Apolices com inconsistencias (${grouped.length})`, margin, cursorY);

  autoTable(doc, {
    startY: cursorY + 8,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: COLORS.danger, textColor: 255 },
    head: [["#", "Apolice", "Endossos", "Principais motivos", "Erros", "Alertas", "Total"]],
    body: grouped.map((g, i) => {
      const s = countBySeverity(g.findings);
      const endossos =
        Array.from(
          new Set(g.findings.map((f) => normalizeFinding(f).endosso).filter(Boolean)),
        ).join(", ") || "—";
      const motivos = Array.from(
        new Set(
          g.findings
            .map((f) => {
              const n = normalizeFinding(f);
              return n.motivo || n.detalhe || f.tipo_erro;
            })
            .filter(Boolean),
        ),
      )
        .slice(0, 3)
        .join(" · ");
      return [
        String(i + 1),
        g.apolice,
        endossos,
        motivos,
        String(s.erros),
        String(s.alertas),
        String(g.total),
      ];
    }),
    columnStyles: {
      0: { cellWidth: 22, halign: "right" },
      1: { cellWidth: 165, font: "courier" },
      2: { cellWidth: 70, font: "courier", fontSize: 7.5 },
      3: { cellWidth: 165 },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 40, halign: "right" },
      6: { cellWidth: 35, halign: "right" },
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const chip = `${s.erros} erros  ·  ${s.alertas} alertas  ·  ${g.total} total`;
    doc.setTextColor(...COLORS.danger);
    doc.text(chip, pageWidth - margin - 8, cursorY + 17, { align: "right" });
    cursorY += 32;

    for (const f of g.findings) {
      const sv = severityOf(f);
      const nrm = normalizeFinding(f);
      const detalhesRaw = (f.detalhes ?? {}) as unknown as Record<string, unknown>;
      const detalheErro =
        (typeof detalhesRaw.detalhe_erro === "string" && detalhesRaw.detalhe_erro.trim()) || "";
      const endossoCom =
        (typeof detalhesRaw.endosso_com_erro === "string" && detalhesRaw.endosso_com_erro.trim()) ||
        nrm.endosso ||
        "";

      const tipoTxt = f.tipo_erro ?? "";
      const tag = sv === "erro" ? "[ERRO]" : sv === "alerta" ? "[ALERTA]" : "[INFO]";
      const tagColor = sv === "erro" ? COLORS.danger : sv === "alerta" ? COLORS.warn : COLORS.muted;

      const textX = margin + 56;
      const textW = usableWidth - 60;

      // Linhas a renderizar
      const lines: {
        label?: string;
        text: string;
        color?: [number, number, number];
        bold?: boolean;
      }[] = [];
      lines.push({ text: tipoTxt, bold: true });
      if (nrm.motivo) lines.push({ label: "Motivo:", text: nrm.motivo });
      if (detalheErro && detalheErro !== nrm.motivo)
        lines.push({ label: "Detalhe do erro:", text: detalheErro });
      if (nrm.detalhe && nrm.detalhe !== nrm.motivo && nrm.detalhe !== detalheErro)
        lines.push({ label: "Detalhe:", text: nrm.detalhe });
      if (endossoCom) lines.push({ label: "Endosso com erro:", text: endossoCom });
      if (nrm.endossoAnterior && nrm.endossoAnterior !== "N/A")
        lines.push({ label: "Endosso anterior:", text: nrm.endossoAnterior });
      if (f.data_inicio || f.data_fim) {
        const meta = [
          f.data_inicio ? `Início ${f.data_inicio}` : null,
          f.data_fim ? `Fim ${f.data_fim}` : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        lines.push({ label: "Vigência:", text: meta });
      }
      if (lines.length === 1) lines.push({ text: "Sem mensagem adicional.", color: COLORS.muted });

      // Pré-calcula altura
      let h = 6;
      const wrapped = lines.map((l) => {
        const prefix = l.label ? `${l.label} ` : "";
        const w = doc.splitTextToSize(prefix + l.text, textW);
        h += w.length * 10.5;
        return w;
      });
      h += 4;

      if (cursorY + h > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      // Tag de severidade
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...tagColor);
      doc.text(tag, margin + 4, cursorY + 10);

      // Linhas
      let y = cursorY + 10;
      wrapped.forEach((w, idx) => {
        const l = lines[idx];
        doc.setFont("helvetica", l.bold ? "bold" : "normal");
        doc.setFontSize(l.bold ? 10 : 9);
        doc.setTextColor(...(l.color ?? COLORS.text));
        doc.text(w, textX, y);
        y += w.length * 10.5;
      });

      cursorY = y + 4;
    }

    cursorY += 8;
  }

  // --- ANALYTICS / CHARTS ---
  doc.addPage();
  renderAnalyticsPage(doc, latest, history, { margin, pageWidth, pageHeight, usableWidth });

  // Rodapé com paginação
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 16, {
      align: "right",
    });
    doc.text("OLE COPILOT — Relatorio de Auditoria", margin, pageHeight - 16);
  }

  doc.save(`auditoria-OLE-${fileTimestamp()}.pdf`);
}

// ---------- Analytics rendering ----------

interface PageDims {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  usableWidth: number;
}

function renderAnalyticsPage(
  doc: jsPDF,
  latest: LatestAudit,
  history: AuditHistoryItem[],
  dims: PageDims,
) {
  const { margin, pageWidth, pageHeight, usableWidth } = dims;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.text("Analytics e Graficos", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    "Visao consolidada dos principais indicadores desta auditoria e comparativo historico.",
    margin,
    y + 10,
  );
  y += 28;

  const colW = (usableWidth - 16) / 2;
  const chartH = 170;

  // 1) Severidade — barras horizontais
  const sev = countBySeverity(latest.findings);
  drawCard(doc, margin, y, colW, chartH, "Distribuicao por severidade");
  drawHBarChart(doc, margin + 12, y + 32, colW - 24, chartH - 44, [
    { label: "Erros", value: sev.erros, color: COLORS.danger },
    { label: "Alertas", value: sev.alertas, color: COLORS.warn },
    { label: "Info", value: sev.infos, color: COLORS.info },
  ]);

  // 2) Top tipos de erro
  const breakdown = errorTypeBreakdown(latest.findings).slice(0, 6);
  drawCard(doc, margin + colW + 16, y, colW, chartH, "Top tipos de erro");
  drawHBarChart(
    doc,
    margin + colW + 28,
    y + 32,
    colW - 24,
    chartH - 44,
    breakdown.map((b) => ({ label: b.tipo, value: b.count, color: COLORS.danger })),
  );

  y += chartH + 16;

  // 3) Top endossos
  const endossos = groupByEndosso(latest.findings).slice(0, 6);
  drawCard(doc, margin, y, colW, chartH, "Top endossos com inconsistencia");
  drawHBarChart(
    doc,
    margin + 12,
    y + 32,
    colW - 24,
    chartH - 44,
    endossos.map((e) => ({
      label: e.endosso,
      value: e.total,
      color: e.erros > 0 ? COLORS.danger : COLORS.warn,
    })),
  );

  // 4) Achados por mês de vigência
  const months = bucketByMonth(latest.findings);
  drawCard(doc, margin + colW + 16, y, colW, chartH, "Achados por mes de vigencia");
  drawVBarChart(
    doc,
    margin + colW + 28,
    y + 32,
    colW - 24,
    chartH - 44,
    months.map((m) => ({ label: m.label, value: m.count, color: COLORS.info })),
  );

  y += chartH + 16;

  // 5) Histórico — linha (precisa de uma página inteira se couber)
  const runs = runSeries(history);
  if (runs.length > 0) {
    const fullH = 200;
    if (y + fullH > pageHeight - margin - 30) {
      doc.addPage();
      y = margin;
    }
    drawCard(doc, margin, y, usableWidth, fullH, "Evolucao historica das auditorias");
    drawLineChart(
      doc,
      margin + 12,
      y + 32,
      usableWidth - 24,
      fullH - 44,
      runs.map((r) => ({ label: r.label, aprovados: r.approved, reprovados: r.rejected })),
    );
    y += fullH + 16;
  }

  // 6) Tabela analítica de tipos de erro
  if (breakdown.length > 0) {
    if (y + 60 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text("Detalhamento por tipo de erro", margin, y);
    autoTable(doc, {
      startY: y + 6,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: COLORS.header, textColor: 255 },
      head: [["Tipo", "Ocorrencias", "Apolices afetadas", "Share"]],
      body: errorTypeBreakdown(latest.findings).map((b) => {
        const totalFindings = latest.findings.length || 1;
        return [
          b.tipo,
          String(b.count),
          String(b.apolices),
          formatPct((b.count / totalFindings) * 100, 1),
        ];
      }),
      margin: { left: margin, right: margin },
    });
  }

  void pageWidth;
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string) {
  doc.setFillColor(...COLORS.chartBg);
  doc.setDrawColor(...COLORS.grid);
  doc.roundedRect(x, y, w, h, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text(title, x + 12, y + 18);
}

interface BarDatum {
  label: string;
  value: number;
  color: [number, number, number];
}

function drawHBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: BarDatum[]) {
  if (data.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sem dados", x, y + 12);
    return;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelW = 110;
  const barAreaW = w - labelW - 40;
  const rowH = Math.min(20, h / data.length);
  data.forEach((d, i) => {
    const cy = y + i * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    const label = doc.splitTextToSize(d.label, labelW)[0] ?? "";
    doc.text(label, x, cy + rowH * 0.65);
    const bw = (d.value / max) * barAreaW;
    doc.setFillColor(...d.color);
    doc.roundedRect(x + labelW, cy + rowH * 0.2, Math.max(bw, 1), rowH * 0.55, 2, 2, "F");
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(String(d.value), x + labelW + bw + 4, cy + rowH * 0.65);
  });
}

function drawVBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: BarDatum[]) {
  if (data.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sem dados de vigencia", x, y + 12);
    return;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const plotH = h - 18;
  const gap = 6;
  const bw = Math.max(8, (w - gap * (data.length + 1)) / data.length);
  // baseline
  doc.setDrawColor(...COLORS.grid);
  doc.line(x, y + plotH, x + w, y + plotH);
  data.forEach((d, i) => {
    const bh = (d.value / max) * (plotH - 12);
    const bx = x + gap + i * (bw + gap);
    const by = y + plotH - bh;
    doc.setFillColor(...d.color);
    doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text);
    doc.text(String(d.value), bx + bw / 2, by - 2, { align: "center" });
    doc.setTextColor(...COLORS.muted);
    doc.text(d.label, bx + bw / 2, y + plotH + 10, { align: "center" });
  });
}

interface LinePoint {
  label: string;
  aprovados: number;
  reprovados: number;
}

function drawLineChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: LinePoint[]) {
  if (data.length === 0) return;
  const plotH = h - 24;
  const max = Math.max(...data.flatMap((d) => [d.aprovados, d.reprovados]), 1);
  // grid horizontal (4 linhas)
  doc.setDrawColor(...COLORS.grid);
  for (let i = 0; i <= 4; i++) {
    const gy = y + (plotH / 4) * i;
    doc.line(x, gy, x + w, gy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(String(Math.round((max * (4 - i)) / 4)), x - 4, gy + 3, { align: "right" });
  }
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const px = (i: number) => x + (data.length > 1 ? step * i : w / 2);
  const py = (v: number) => y + plotH - (v / max) * plotH;

  const drawSeries = (key: "aprovados" | "reprovados", color: [number, number, number]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    for (let i = 1; i < data.length; i++) {
      doc.line(px(i - 1), py(data[i - 1][key]), px(i), py(data[i][key]));
    }
    doc.setFillColor(...color);
    data.forEach((d, i) => {
      doc.circle(px(i), py(d[key]), 1.8, "F");
    });
  };
  drawSeries("aprovados", COLORS.success);
  drawSeries("reprovados", COLORS.danger);

  // labels eixo X (até 8)
  const stride = Math.max(1, Math.ceil(data.length / 8));
  data.forEach((d, i) => {
    if (i % stride !== 0 && i !== data.length - 1) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(d.label, px(i), y + plotH + 10, { align: "center" });
  });

  // Legenda
  const legendY = y + h - 4;
  doc.setFillColor(...COLORS.success);
  doc.circle(x + 4, legendY - 3, 2.5, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.text("Aprovados", x + 12, legendY);
  doc.setFillColor(...COLORS.danger);
  doc.circle(x + 80, legendY - 3, 2.5, "F");
  doc.text("Reprovados", x + 88, legendY);
}
