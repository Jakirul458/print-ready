import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, Link } from "lucide-react";

export interface CropSettings {
  width: number;
  height: number;
  unit: "inch" | "cm";
  dpi: number;
}

export interface EnhanceSettings {
  enabled: boolean;
  brightness: number;
  contrast: number;
  sharpen: number;
  saturation: number;
  warmth: number;
  exposure: number;
}

export interface EditedImage {
  originalSrc: string;
  croppedArea: Area;
  crop: { x: number; y: number };
  zoom: number;
  cropSettings: CropSettings;
  enhance: EnhanceSettings;
}

interface ImageEditorProps {
  images: { file: File; preview: string }[];
  onDone: (edited: EditedImage[]) => void;
  onBack: () => void;
}

const CM_PER_INCH = 2.54;

export default function ImageEditor({ images, onDone, onBack }: ImageEditorProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sameSizeForAll, setSameSizeForAll] = useState(true);
  const [editedImages, setEditedImages] = useState<EditedImage[]>(() => {
    const defaultCrop: import("./ImageEditor").CropSettings = { width: 1.1, height: 1.4, unit: "inch", dpi: 300 };
    const defaultEnhance: EnhanceSettings = {
      enabled: false, brightness: 0, contrast: 0, sharpen: 20, saturation: 0, warmth: 0, exposure: 0,
    };
    return images.map((img, i) => ({
      originalSrc: img.preview,
      croppedArea: { x: 0, y: 0, width: 0, height: 0 },
      crop: { x: 0, y: 0 },
      zoom: 1,
      // First image gets default, rest copy from first (will be synced if sameSizeForAll)
      cropSettings: i === 0 ? { ...defaultCrop } : { ...defaultCrop },
      enhance: { ...defaultEnhance },
    }));
  });

  const current = editedImages[currentIdx];
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const latestCropsRef = useRef<Area[]>(images.map(() => ({ x: 0, y: 0, width: 0, height: 0 })));

  const widthInInches = current.cropSettings.unit === "cm"
    ? current.cropSettings.width / CM_PER_INCH
    : current.cropSettings.width;
  const heightInInches = current.cropSettings.unit === "cm"
    ? current.cropSettings.height / CM_PER_INCH
    : current.cropSettings.height;
  const aspect = widthInInches / heightInInches;

  const updateCurrent = useCallback((partial: Partial<EditedImage>) => {
    setEditedImages((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], ...partial };
      return next;
    });
  }, [currentIdx]);

  const updateCropSettings = (partial: Partial<CropSettings>) => {
    if (sameSizeForAll) {
      // Apply to all images
      const newSettings = { ...current.cropSettings, ...partial };
      setEditedImages((prev) =>
        prev.map((img) => ({
          ...img,
          cropSettings: newSettings,
        }))
      );
    } else {
      updateCurrent({ cropSettings: { ...current.cropSettings, ...partial } });
    }
  };

  const updateEnhance = (partial: Partial<EnhanceSettings>) => {
    updateCurrent({ enhance: { ...current.enhance, ...partial } });
  };

  const syncCurrentCrop = useCallback((croppedAreaPixels: Area) => {
    latestCropsRef.current[currentIdx] = croppedAreaPixels;
    updateCurrent({ croppedArea: croppedAreaPixels });
  }, [currentIdx, updateCurrent]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    syncCurrentCrop(croppedAreaPixels);
  }, [syncCurrentCrop]);

  // Live preview with enhance filters
  useEffect(() => {
    if (!current.enhance.enabled) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 200;
      const scale = Math.min(size / img.width, size / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;

      const b = current.enhance.brightness;
      const c = current.enhance.contrast;
      const s = current.enhance.saturation;
      const e = current.enhance.exposure;
      const w = current.enhance.warmth;

      const brightnessVal = 1 + (b + e) / 100;
      const contrastVal = 1 + c / 100;
      const saturateVal = 1 + s / 100;

      ctx.filter = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturateVal})`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (w !== 0) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = Math.abs(w) / 200;
        ctx.fillStyle = w > 0 ? "#ff8800" : "#0044ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.filter = "none";
    };
    img.src = current.originalSrc;
  }, [current.enhance, current.originalSrc]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Edit & Crop Photos</h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Image {currentIdx + 1} of {images.length} — drag to position
        </p>
      </div>

      <div className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl shadow-black/20">
        {/* Same size toggle */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <Checkbox
              id="sameSizeAll"
              checked={sameSizeForAll}
              onCheckedChange={(checked) => {
                setSameSizeForAll(!!checked);
                if (checked) {
                  // Apply current image's size to all
                  const cs = current.cropSettings;
                  setEditedImages((prev) =>
                    prev.map((img) => ({ ...img, cropSettings: { ...cs } }))
                  );
                }
              }}
            />
            <Label htmlFor="sameSizeAll" className="text-xs cursor-pointer font-medium text-primary flex items-center gap-1">
              <Link className="h-3 w-3" />
              Same size for all images
            </Label>
          </div>
        )}

        {/* Crop size inputs */}
        <div className="space-y-3 mb-4">
          <Label className="text-sm font-medium text-foreground">Crop Size</Label>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Width</Label>
              <Input
                type="number"
                step={0.1}
                min={0.3}
                max={20}
                value={current.cropSettings.width}
                onChange={(e) => updateCropSettings({ width: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Height</Label>
              <Input
                type="number"
                step={0.1}
                min={0.3}
                max={20}
                value={current.cropSettings.height}
                onChange={(e) => updateCropSettings({ height: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Select value={current.cropSettings.unit} onValueChange={(v) => updateCropSettings({ unit: v as "inch" | "cm" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inch">Inch</SelectItem>
                  <SelectItem value="cm">CM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DPI</Label>
              <Input
                type="number"
                step={1}
                min={72}
                max={600}
                value={current.cropSettings.dpi}
                onChange={(e) => updateCropSettings({ dpi: parseInt(e.target.value) || 300 })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Output: {Math.round(widthInInches * current.cropSettings.dpi)} × {Math.round(heightInInches * current.cropSettings.dpi)} px
            {sameSizeForAll && images.length > 1 && <span className="text-primary ml-1">(all images)</span>}
          </p>
        </div>

        {/* Cropper */}
        <div className="relative w-full rounded-lg overflow-hidden bg-black/50" style={{ height: "min(50vh, 350px)" }}>
          <Cropper
            image={current.originalSrc}
            crop={current.crop}
            zoom={current.zoom}
            aspect={aspect}
            onCropChange={(crop) => updateCurrent({ crop })}
            onZoomChange={(zoom) => updateCurrent({ zoom })}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={5}
            zoomWithScroll={false}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <span className="text-xs text-muted-foreground">{current.zoom.toFixed(1)}x</span>
          </div>
          <Slider
            min={1}
            max={5}
            step={0.05}
            value={[current.zoom]}
            onValueChange={([v]) => updateCurrent({ zoom: v })}
          />
        </div>

        {/* Enhance section */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enhanceCheck"
              checked={current.enhance.enabled}
              onCheckedChange={(checked) => updateEnhance({ enabled: !!checked })}
            />
            <Label htmlFor="enhanceCheck" className="text-sm cursor-pointer font-medium">Enhance Image</Label>
          </div>

          {current.enhance.enabled && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-lg overflow-hidden border border-border/50 bg-black/30 p-1">
                  <canvas ref={previewCanvasRef} className="max-w-[200px] max-h-[200px] rounded" />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">Live Preview</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pl-2 border-l-2 border-primary/20">
                {[
                  { label: "Brightness", key: "brightness" as const, min: -50, max: 50 },
                  { label: "Contrast", key: "contrast" as const, min: -50, max: 50 },
                  { label: "Sharpen", key: "sharpen" as const, min: 0, max: 100 },
                  { label: "Saturation", key: "saturation" as const, min: -50, max: 50 },
                  { label: "Exposure", key: "exposure" as const, min: -50, max: 50 },
                  { label: "Warmth", key: "warmth" as const, min: -50, max: 50 },
                ].map(({ label, key, min, max }) => (
                  <div key={key}>
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <span className="text-xs text-muted-foreground">{current.enhance[key]}</span>
                    </div>
                    <Slider
                      min={min}
                      max={max}
                      step={1}
                      value={[current.enhance[key]]}
                      onValueChange={([v]) => updateEnhance({ [key]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox id="removeBgEditor" checked={current.enhance.enabled && false} disabled />
          <Label htmlFor="removeBgEditor" className="text-xs text-muted-foreground cursor-pointer">
            Remove Background — set in next step
          </Label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="border-border/50">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
                className="border-border/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{currentIdx + 1}/{images.length}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === images.length - 1}
                onClick={() => {
                  const nextIdx = currentIdx + 1;
                  // Carry current crop settings to next image if not sameSizeForAll
                  if (!sameSizeForAll) {
                    setEditedImages((prev) => {
                      const next = [...prev];
                      next[nextIdx] = { ...next[nextIdx], cropSettings: { ...prev[currentIdx].cropSettings } };
                      return next;
                    });
                  }
                  setCurrentIdx(nextIdx);
                }}
                className="border-border/50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={() => onDone(
            editedImages.map((image, index) => ({
              ...image,
              croppedArea: latestCropsRef.current[index] ?? image.croppedArea,
            }))
          )}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25"
        >
          <Check className="h-4 w-4 mr-1" /> Done Editing
        </Button>
      </div>
    </div>
  );
}
