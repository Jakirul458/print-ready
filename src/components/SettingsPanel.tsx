import { useState } from "react";
import { PAPER_SIZES } from "@/utils/imageProcessing";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface PrintSettings {
  paperSize: string;
  copies: number;
  copiesPerImage: number[];
  removeBackground: boolean;
  customPaperW: number;
  customPaperH: number;
}

interface SettingsPanelProps {
  settings: PrintSettings;
  onChange: (s: PrintSettings) => void;
  imageCount?: number;
  imagePreviews?: string[];
}

export default function SettingsPanel({ settings, onChange, imageCount = 1, imagePreviews = [] }: SettingsPanelProps) {
  const update = (partial: Partial<PrintSettings>) => onChange({ ...settings, ...partial });

  const [copyMode, setCopyModeState] = useState<"same" | "individual">("same");

  const setCopyMode = (mode: string) => {
    setCopyModeState(mode as "same" | "individual");
    if (mode === "same") {
      const val = settings.copiesPerImage[0] ?? 4;
      update({ copies: val, copiesPerImage: Array(imageCount).fill(val) });
    }
  };

  const updateAllCopies = (value: number) => {
    update({ copies: value, copiesPerImage: Array(imageCount).fill(value) });
  };

  const updateImageCopies = (index: number, value: number) => {
    const newCopies = [...settings.copiesPerImage];
    newCopies[index] = value;
    update({ copiesPerImage: newCopies });
  };

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-foreground text-lg">Print Settings</h3>

      {/* Background removal */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="removeBg"
          checked={settings.removeBackground}
          onCheckedChange={(checked) => update({ removeBackground: !!checked })}
        />
        <Label htmlFor="removeBg" className="text-sm cursor-pointer">Remove Background (white)</Label>
      </div>

      {/* Copies section */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground font-medium">Copies per image</Label>

        {imageCount > 1 && (
          <RadioGroup value={copyMode} onValueChange={setCopyMode} className="flex gap-4 mb-2">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="same" id="copySame" />
              <Label htmlFor="copySame" className="text-xs cursor-pointer">Same for all</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="individual" id="copyIndividual" />
              <Label htmlFor="copyIndividual" className="text-xs cursor-pointer">Individual</Label>
            </div>
          </RadioGroup>
        )}

        {copyMode === "same" ? (
          <Input
            type="number"
            min={1}
            max={50}
            value={settings.copiesPerImage[0] ?? settings.copies}
            onChange={(e) => {
              const val = e.target.value;
              const num = val === "" ? 0 : parseInt(val) || 1;
              updateAllCopies(num);
            }}
            onBlur={() => {
              const v = settings.copiesPerImage[0] ?? settings.copies;
              if (!v || v < 1) updateAllCopies(1);
            }}
          />
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {Array.from({ length: imageCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                {imagePreviews[i] && (
                  <img
                    src={imagePreviews[i]}
                    alt={`Image ${i + 1}`}
                    className="w-10 h-10 rounded object-cover border border-border/50"
                  />
                )}
                <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                  Image {i + 1}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.copiesPerImage[i] ?? 4}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateImageCopies(i, val === "" ? 0 : parseInt(val) || 1);
                  }}
                  onBlur={() => {
                    if (!settings.copiesPerImage[i] || settings.copiesPerImage[i] < 1) {
                      updateImageCopies(i, 1);
                    }
                  }}
                  className="w-20"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paper size */}
      <div>
        <Label className="text-xs text-muted-foreground">Paper Size</Label>
        <Select value={settings.paperSize} onValueChange={(v) => update({ paperSize: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PAPER_SIZES).map(([key, size]) => (
              <SelectItem key={key} value={key}>{size.name}</SelectItem>
            ))}
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.paperSize === "Custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Paper W (px)</Label>
            <Input type="number" value={settings.customPaperW} onChange={(e) => update({ customPaperW: parseInt(e.target.value) || 2480 })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Paper H (px)</Label>
            <Input type="number" value={settings.customPaperH} onChange={(e) => update({ customPaperH: parseInt(e.target.value) || 3508 })} />
          </div>
        </div>
      )}
    </div>
  );
}
