import { useState, useCallback } from "react";
import { Camera, Sparkles, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ImageEditor, { type EditedImage } from "@/components/ImageEditor";
import SettingsPanel, { type PrintSettings } from "@/components/SettingsPanel";
import ProcessingStatus from "@/components/ProcessingStatus";
import PreviewPanel from "@/components/PreviewPanel";
import NeuralBackground from "@/components/NeuralBackground";
import {
  loadImage,
  enhanceImage,
  applyWhiteBackground,
  generateLayout,
  inchesToPixels,
  PAPER_SIZES,
  type PaperSize,
} from "@/utils/imageProcessing";
import { generatePDF } from "@/utils/pdfExport";

const REMOVEBG_API_KEY = "U3CtodgQa77kR3zyN3eTT3fF";
const CM_PER_INCH = 2.54;

type AppStep = "upload" | "edit" | "settings" | "processing" | "preview";

interface UploadedImage {
  file: File;
  preview: string;
}

async function removeBackgroundWithAPI(imageBlob: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append("image_file", imageBlob);
  formData.append("size", "auto");
  formData.append("bg_color", "white");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": REMOVEBG_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Remove.bg API error: ${response.status} - ${errorText}`);
  }
  return response.blob();
}

function getCroppedCanvas(
  imageSrc: string,
  croppedArea: { x: number; y: number; width: number; height: number },
  outputW: number,
  outputH: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d")!;

      const getCenteredCrop = () => {
        const targetAspect = outputW / outputH;
        const imageAspect = img.naturalWidth / img.naturalHeight;

        if (imageAspect > targetAspect) {
          const sw = img.naturalHeight * targetAspect;
          return {
            sx: (img.naturalWidth - sw) / 2,
            sy: 0,
            sw,
            sh: img.naturalHeight,
          };
        }

        const sh = img.naturalWidth / targetAspect;
        return {
          sx: 0,
          sy: (img.naturalHeight - sh) / 2,
          sw: img.naturalWidth,
          sh,
        };
      };

      let source = getCenteredCrop();

      if (croppedArea.width > 0 && croppedArea.height > 0) {
        const sx = Math.max(0, Math.min(croppedArea.x, img.naturalWidth - 1));
        const sy = Math.max(0, Math.min(croppedArea.y, img.naturalHeight - 1));
        const sw = Math.max(1, Math.min(croppedArea.width, img.naturalWidth - sx));
        const sh = Math.max(1, Math.min(croppedArea.height, img.naturalHeight - sy));

        if (sw > 0 && sh > 0) {
          source = { sx, sy, sw, sh };
        }
      }

      const { sx, sy, sw, sh } = source;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

export default function Index() {
  const [step, setStep] = useState<AppStep>("upload");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [editedImages, setEditedImages] = useState<EditedImage[]>([]);
  const [settings, setSettings] = useState<PrintSettings>({
    paperSize: "A4",
    copies: 4,
    copiesPerImage: [],
    removeBackground: false,
    customPaperW: 2480,
    customPaperH: 3508,
  });
  const [processingSteps, setProcessingSteps] = useState<{ label: string; done: boolean; active: boolean }[]>([]);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);

  const handleAddImages = useCallback((files: File[]) => {
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const goToEdit = () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    setStep("edit");
  };

  const handleEditDone = (edited: EditedImage[]) => {
    setEditedImages(edited);
    // Initialize per-image copies if not set
    setSettings((prev) => ({
      ...prev,
      copiesPerImage: edited.map((_, i) => prev.copiesPerImage[i] ?? 4),
    }));
    setStep("settings");
  };

  const processPhotos = async () => {
    setStep("processing");
    const steps = [
      { label: "Cropping images", done: false, active: true },
      ...(editedImages.some((e) => e.enhance.enabled)
        ? [{ label: "Enhancing images", done: false, active: false }]
        : []),
      ...(settings.removeBackground
        ? [{ label: "Removing backgrounds", done: false, active: false }]
        : []),
      { label: "Generating layout", done: false, active: false },
      { label: "Creating PDF", done: false, active: false },
    ];
    setProcessingSteps([...steps]);
    setProgress(5);

    let stepIdx = 0;

    try {
      // Use first image's crop settings for layout dimensions
      const first = editedImages[0].cropSettings;
      const wInches = first.unit === "cm" ? first.width / CM_PER_INCH : first.width;
      const hInches = first.unit === "cm" ? first.height / CM_PER_INCH : first.height;
      const dpi = first.dpi;
      const photoW = inchesToPixels(wInches, dpi);
      const photoH = inchesToPixels(hInches, dpi);

      // Crop
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < editedImages.length; i++) {
        const ed = editedImages[i];
        const edW = ed.cropSettings.unit === "cm" ? ed.cropSettings.width / CM_PER_INCH : ed.cropSettings.width;
        const edH = ed.cropSettings.unit === "cm" ? ed.cropSettings.height / CM_PER_INCH : ed.cropSettings.height;
        const outW = inchesToPixels(edW, ed.cropSettings.dpi);
        const outH = inchesToPixels(edH, ed.cropSettings.dpi);
        const canvas = await getCroppedCanvas(ed.originalSrc, ed.croppedArea, outW, outH);
        canvases.push(canvas);
        setProgress(5 + ((i + 1) / editedImages.length) * 15);
      }
      steps[stepIdx].done = true;
      steps[stepIdx].active = false;
      stepIdx++;
      setProcessingSteps([...steps]);

      // Enhance
      let processed = canvases;
      if (editedImages.some((e) => e.enhance.enabled)) {
        steps[stepIdx].active = true;
        setProcessingSteps([...steps]);
        const enhanced: HTMLCanvasElement[] = [];
        for (let i = 0; i < processed.length; i++) {
          const ed = editedImages[i];
          if (ed.enhance.enabled) {
            const c = processed[i];
            const ctx = c.getContext("2d")!;
            const imageData = ctx.getImageData(0, 0, c.width, c.height);
            const result = enhanceImage(
              imageData,
              ed.enhance.brightness + ed.enhance.exposure,
              ed.enhance.contrast,
              ed.enhance.sharpen,
              ed.enhance.saturation,
              ed.enhance.warmth
            );
            const out = document.createElement("canvas");
            out.width = c.width;
            out.height = c.height;
            out.getContext("2d")!.putImageData(result, 0, 0);
            enhanced.push(out);
          } else {
            enhanced.push(processed[i]);
          }
          setProgress(20 + ((i + 1) / processed.length) * 20);
        }
        processed = enhanced;
        steps[stepIdx].done = true;
        steps[stepIdx].active = false;
        stepIdx++;
        setProcessingSteps([...steps]);
      }

      // Background removal
      if (settings.removeBackground) {
        steps[stepIdx].active = true;
        setProcessingSteps([...steps]);
        const bgRemoved: HTMLCanvasElement[] = [];
        for (let i = 0; i < processed.length; i++) {
          const blob = await new Promise<Blob>((res) =>
            processed[i].toBlob((b) => res(b!), "image/png")
          );
          const resultBlob = await removeBackgroundWithAPI(blob);
          const url = URL.createObjectURL(resultBlob);
          const img = await loadImage(url);
          URL.revokeObjectURL(url);
          const canvas = document.createElement("canvas");
          canvas.width = processed[i].width;
          canvas.height = processed[i].height;
          const whiteCanvas = applyWhiteBackground(canvas);
          const wctx = whiteCanvas.getContext("2d")!;
          wctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          bgRemoved.push(whiteCanvas);
          setProgress(40 + ((i + 1) / processed.length) * 25);
        }
        processed = bgRemoved;
        steps[stepIdx].done = true;
        steps[stepIdx].active = false;
        stepIdx++;
        setProcessingSteps([...steps]);
      }

      // Layout
      steps[stepIdx].active = true;
      setProcessingSteps([...steps]);

      const paper: PaperSize =
        settings.paperSize === "Custom"
          ? { name: "Custom", widthPx: settings.customPaperW, heightPx: settings.customPaperH }
          : PAPER_SIZES[settings.paperSize];

      const layoutResult = generateLayout(processed, settings.copiesPerImage, paper, photoW, photoH);
      setProgress(85);
      steps[stepIdx].done = true;
      steps[stepIdx].active = false;
      stepIdx++;

      // Done
      steps[stepIdx].active = true;
      setProcessingSteps([...steps]);
      setPages(layoutResult.pages);
      setProgress(100);
      steps[stepIdx].done = true;
      steps[stepIdx].active = false;
      setProcessingSteps([...steps]);

      setStep("preview");
      toast.success("Photos processed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Processing failed. Please try again.");
      setStep("settings");
    }
  };

  const handleDownload = () => {
    const paper: PaperSize =
      settings.paperSize === "Custom"
        ? { name: "Custom", widthPx: settings.customPaperW, heightPx: settings.customPaperH }
        : PAPER_SIZES[settings.paperSize];

    const blob = generatePDF(pages, paper);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "passport-photos.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setEditedImages([]);
    setPages([]);
    setStep("upload");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <NeuralBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">Passport Photo Generator</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Free · Unlimited · No watermarks</p>
            </div>
          </div>
          {step !== "upload" && (
            <Button variant="outline" size="sm" onClick={resetAll} className="border-border/50 hover:bg-muted">
              Start Over
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 container max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Upload */}
        {step === "upload" && (
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
            <div className="text-center space-y-3 sm:space-y-4 pt-4 sm:pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                100% Free & Unlimited
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground leading-tight">
                Create Print-Ready<br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Passport Photos
                </span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Upload your photos, crop & enhance, then download a perfectly formatted PDF.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { icon: Zap, label: "Instant Processing" },
                { icon: Shield, label: "Privacy First" },
                { icon: Sparkles, label: "Auto Enhance" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border/50 text-xs sm:text-sm text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </div>
              ))}
            </div>

            <ImageUploader images={images} onAdd={handleAddImages} onRemove={handleRemoveImage} />

            {images.length > 0 && (
              <div className="flex justify-center">
                <Button size="lg" onClick={goToEdit} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground px-8 shadow-lg shadow-primary/25">
                  Edit & Crop ({images.length} {images.length === 1 ? "photo" : "photos"})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Edit */}
        {step === "edit" && (
          <div className="max-w-2xl mx-auto">
            <ImageEditor
              images={images}
              onDone={handleEditDone}
              onBack={() => setStep("upload")}
            />
          </div>
        )}

        {/* Settings */}
        {step === "settings" && (
          <div className="max-w-lg mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Print Settings</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Set copies, paper size, and background removal.</p>
            </div>
            <div className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 shadow-xl shadow-black/20">
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                imageCount={editedImages.length}
                imagePreviews={editedImages.map((e) => e.originalSrc)}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("edit")} className="border-border/50">
                ← Back to Edit
              </Button>
              <Button size="lg" onClick={processPhotos} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground px-8 shadow-lg shadow-primary/25">
                Generate Photo Sheet
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="max-w-md mx-auto animate-fade-in">
            <ProcessingStatus steps={processingSteps} progress={progress} />
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <PreviewPanel pages={pages} onDownload={handleDownload} />
          </div>
        )}
      </main>

      <footer className="relative z-10 py-4 sm:py-6 text-center">
        <a
          href="https://alpinewebs.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors duration-300"
        >
          Developed by <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AlpineDev</span>
        </a>
      </footer>
    </div>
  );
}
