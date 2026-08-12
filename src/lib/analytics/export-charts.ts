import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function exportChartsPdf(nodes: HTMLElement[], periodLabel?: string | null) {
  if (nodes.length === 0) return;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const title = node.dataset.title ?? `Gráfico ${i + 1}`;
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: getComputedStyle(node).backgroundColor || "#0b0f1a",
      cacheBust: true,
    });

    if (i > 0) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, margin);

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((r) => {
      img.onload = () => r();
      img.onerror = () => r();
    });

    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2 - 30;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pageW - w) / 2;
    const y = margin + 16;
    doc.addImage(dataUrl, "PNG", x, y, w, h);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `OLÉ COPILOT — Analytics  ·  ${periodLabel ? `Período: ${periodLabel}  ·  ` : ""}${new Date().toLocaleString("pt-BR")}`,
      margin,
      pageH - 16,
    );
    doc.text(`Página ${i + 1} de ${nodes.length}`, pageW - margin, pageH - 16, {
      align: "right",
    });
  }

  doc.save(`analytics-graficos-${stamp()}.pdf`);
}
