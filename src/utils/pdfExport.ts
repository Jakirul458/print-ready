import jsPDF from "jspdf";
import type { PaperSize } from "./imageProcessing";

export function generatePDF(pages: HTMLCanvasElement[], paper: PaperSize): Blob {
  const widthMM = (paper.widthPx / 300) * 25.4;
  const heightMM = (paper.heightPx / 300) * 25.4;

  const pdf = new jsPDF({
    orientation: widthMM > heightMM ? "landscape" : "portrait",
    unit: "mm",
    format: [widthMM, heightMM],
  });

  pages.forEach((canvas, i) => {
    if (i > 0) pdf.addPage([widthMM, heightMM]);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(dataUrl, "JPEG", 0, 0, widthMM, heightMM);
  });

  return pdf.output("blob");
}
