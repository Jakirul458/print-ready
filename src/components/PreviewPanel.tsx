

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

  // PRINT WITHOUT POPUP BLOCKER
  const handlePrint = () => {
    // remove old print container if exists
    const existing =
      document.getElementById("print-container");

    if (existing) {
      existing.remove();
    }

    // create print container
    const printContainer =
      document.createElement("div");

    printContainer.id = "print-container";

    // generate image html
    const imagesHtml = pages
      .map(
        (canvas, index) => `
          <img
            src="${canvas.toDataURL(
              "image/jpeg",
              1.0
            )}"
            alt="Page ${index + 1}"
            class="print-page"
          />
        `
      )
      .join("");

    // inject styles + images
    printContainer.innerHTML = `
      <style id="print-styles">
        @media print {

          body * {
            visibility: hidden;
          }

          #print-container,
          #print-container * {
            visibility: visible;
          }

          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            z-index: 999999;
          }

          .print-page {
            width: 100%;
            display: block;
            page-break-after: always;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          @page {
            margin: 0;
            size: auto;
          }
        }
      </style>

      ${imagesHtml}
    `;

    document.body.appendChild(printContainer);

    // wait a bit for render
    setTimeout(() => {
      window.print();

      // cleanup after print
      setTimeout(() => {
        const container =
          document.getElementById(
            "print-container"
          );

        const styles =
          document.getElementById(
            "print-styles"
          );

        if (container) {
          container.remove();
        }

        if (styles) {
          styles.remove();
        }
      }, 1000);
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground text-lg">
          Preview
        </h3>

        <div className="flex items-center gap-2">
          {/* PRINT BUTTON */}
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-border/50"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>

          {/* DOWNLOAD BUTTON */}
          <Button
            onClick={onDownload}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* IMAGE PREVIEW */}
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm p-2 shadow-xl shadow-black/20">
        <img
          src={pages[current].toDataURL(
            "image/jpeg",
            0.95
          )}
          alt={`Page ${current + 1}`}
          className="w-full rounded-lg"
        />
      </div>

      {/* PAGE NAVIGATION */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() =>
              setCurrent((prev) => prev - 1)
            }
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
            disabled={
              current === pages.length - 1
            }
            onClick={() =>
              setCurrent((prev) => prev + 1)
            }
            className="border-border/50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}