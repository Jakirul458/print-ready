// import { Download, Printer, ChevronLeft, ChevronRight } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useState } from "react";

// interface PreviewPanelProps {
//   pages: HTMLCanvasElement[];
//   onDownload: () => void;
// }

// export default function PreviewPanel({ pages, onDownload }: PreviewPanelProps) {
//   const [current, setCurrent] = useState(0);

//   if (pages.length === 0) return null;

//   const handlePrint = () => {
//     const printWindow = window.open("", "_blank");
//     if (!printWindow) return;

//     const imagesHtml = pages
//       .map(
//         (canvas) =>
//           `<img src="${canvas.toDataURL("image/jpeg", 0.95)}" style="width:100%;page-break-after:always;display:block;" />`
//       )
//       .join("");

//     printWindow.document.write(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>Print Passport Photos</title>
//           <style>
//             @page { margin: 0; }
//             body { margin: 0; padding: 0; }
//             img { max-width: 100%; height: auto; }
//             img:last-child { page-break-after: avoid; }
//           </style>
//         </head>
//         <body>${imagesHtml}</body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.onload = () => {
//       printWindow.print();
//     };
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
//         <h3 className="font-semibold text-foreground text-lg">Preview</h3>
//         <div className="flex items-center gap-2">
//           <Button onClick={handlePrint} variant="outline" className="border-border/50">
//             <Printer className="h-4 w-4 mr-2" /> Print
//           </Button>
//           <Button onClick={onDownload} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25">
//             <Download className="h-4 w-4 mr-2" /> Download PDF
//           </Button>
//         </div>
//       </div>

//       <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm p-2 shadow-xl shadow-black/20">
//         <img
//           src={pages[current].toDataURL("image/jpeg", 0.8)}
//           alt={`Page ${current + 1}`}
//           className="w-full rounded-lg"
//         />
//       </div>

//       {pages.length > 1 && (
//         <div className="flex items-center justify-center gap-3">
//           <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setCurrent(current - 1)} className="border-border/50">
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
//           <span className="text-sm text-muted-foreground">
//             Page {current + 1} of {pages.length}
//           </span>
//           <Button variant="outline" size="sm" disabled={current === pages.length - 1} onClick={() => setCurrent(current + 1)} className="border-border/50">
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// }


import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PreviewPanelProps {
  pages: HTMLCanvasElement[];
  onDownload: () => void;
}

export default function PreviewPanel({
  pages,
  onDownload,
}: PreviewPanelProps) {
  const [current, setCurrent] = useState(0);

  if (pages.length === 0) return null;

  const handlePrint = async () => {
    try {
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        alert("Please allow popups for printing.");
        return;
      }

      const imagesHtml = pages
        .map(
          (canvas, index) => `
            <img
              src="${canvas.toDataURL("image/jpeg", 1.0)}"
              alt="Page ${index + 1}"
              class="print-page"
            />
          `
        )
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Passport Photos</title>

            <style>
              @page {
                margin: 0;
                size: auto;
              }

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 0;
                background: white;
              }

              .print-page {
                width: 100%;
                display: block;
                page-break-after: always;
              }

              .print-page:last-child {
                page-break-after: auto;
              }
            </style>
          </head>

          <body>
            ${imagesHtml}
          </body>
        </html>
      `);

      printWindow.document.close();

      // wait for images to fully render
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();

        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 700);
    } catch (error) {
      console.error("Print failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground text-lg">
          Preview
        </h3>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-border/50"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>

          <Button
            onClick={onDownload}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm p-2 shadow-xl shadow-black/20">
        <img
          src={pages[current].toDataURL("image/jpeg", 0.9)}
          alt={`Page ${current + 1}`}
          className="w-full rounded-lg"
        />
      </div>

      {/* Pagination */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setCurrent((prev) => prev - 1)}
            className="border-border/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {current + 1} of {pages.length}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={current === pages.length - 1}
            onClick={() => setCurrent((prev) => prev + 1)}
            className="border-border/50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}