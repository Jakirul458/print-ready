// import { useState, useCallback, useEffect, useRef } from "react";
// import Cropper from "react-easy-crop";
// import type { Area } from "react-easy-crop";

// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Slider } from "@/components/ui/slider";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import {
//   ChevronLeft,
//   ChevronRight,
//   Check,
//   Link,
//   Wand2,
// } from "lucide-react";

// export interface CropSettings {
//   width: number;
//   height: number;
//   unit: "inch" | "cm";
//   dpi: number;
// }

// export interface EnhanceSettings {
//   enabled: boolean;
//   brightness: number;
//   contrast: number;
//   sharpen: number;
//   saturation: number;
//   warmth: number;
//   exposure: number;
//   curve: number;
// }

// export interface EditedImage {
//   originalSrc: string;
//   croppedArea: Area;
//   crop: { x: number; y: number };
//   zoom: number;
//   cropSettings: CropSettings;
//   enhance: EnhanceSettings;
// }

// interface ImageEditorProps {
//   images: { file: File; preview: string }[];
//   onDone: (edited: EditedImage[]) => void;
//   onBack: () => void;
// }

// const CM_PER_INCH = 2.54;

// export default function ImageEditor({
//   images,
//   onDone,
//   onBack,
// }: ImageEditorProps) {
//   const [currentIdx, setCurrentIdx] = useState(0);
//   const [sameSizeForAll, setSameSizeForAll] = useState(true);

//   const [editedImages, setEditedImages] = useState<EditedImage[]>(() => {
//     const defaultCrop: CropSettings = {
//       width: 1.1,
//       height: 1.4,
//       unit: "inch",
//       dpi: 300,
//     };

//     const defaultEnhance: EnhanceSettings = {
//       enabled: false,
//       brightness: 0,
//       contrast: 0,
//       sharpen: 20,
//       saturation: 0,
//       warmth: 0,
//       exposure: 0,
//       curve: 0,
//     };

//     return images.map((img) => ({
//       originalSrc: img.preview,
//       croppedArea: { x: 0, y: 0, width: 0, height: 0 },
//       crop: { x: 0, y: 0 },
//       zoom: 1,
//       cropSettings: { ...defaultCrop },
//       enhance: { ...defaultEnhance },
//     }));
//   });

//   const current = editedImages[currentIdx];

//   const previewCanvasRef = useRef<HTMLCanvasElement>(null);

//   const latestCropsRef = useRef<Area[]>(
//     images.map(() => ({
//       x: 0,
//       y: 0,
//       width: 0,
//       height: 0,
//     }))
//   );

//   const widthInInches =
//     current.cropSettings.unit === "cm"
//       ? current.cropSettings.width / CM_PER_INCH
//       : current.cropSettings.width;

//   const heightInInches =
//     current.cropSettings.unit === "cm"
//       ? current.cropSettings.height / CM_PER_INCH
//       : current.cropSettings.height;

//   const aspect = widthInInches / heightInInches;

//   const updateCurrent = useCallback(
//     (partial: Partial<EditedImage>) => {
//       setEditedImages((prev) => {
//         const next = [...prev];
//         next[currentIdx] = {
//           ...next[currentIdx],
//           ...partial,
//         };
//         return next;
//       });
//     },
//     [currentIdx]
//   );

//   const updateCropSettings = (
//     partial: Partial<CropSettings>
//   ) => {
//     if (sameSizeForAll) {
//       const newSettings = {
//         ...current.cropSettings,
//         ...partial,
//       };

//       setEditedImages((prev) =>
//         prev.map((img) => ({
//           ...img,
//           cropSettings: newSettings,
//         }))
//       );
//     } else {
//       updateCurrent({
//         cropSettings: {
//           ...current.cropSettings,
//           ...partial,
//         },
//       });
//     }
//   };

//   const updateEnhance = (
//     partial: Partial<EnhanceSettings>
//   ) => {
//     updateCurrent({
//       enhance: {
//         ...current.enhance,
//         ...partial,
//       },
//     });
//   };

//   const syncCurrentCrop = useCallback(
//     (croppedAreaPixels: Area) => {
//       latestCropsRef.current[currentIdx] =
//         croppedAreaPixels;

//       updateCurrent({
//         croppedArea: croppedAreaPixels,
//       });
//     },
//     [currentIdx, updateCurrent]
//   );

//   const onCropComplete = useCallback(
//     (_: Area, croppedAreaPixels: Area) => {
//       syncCurrentCrop(croppedAreaPixels);
//     },
//     [syncCurrentCrop]
//   );

//   // ENHANCE PREVIEW
//   useEffect(() => {
//     if (!current.enhance.enabled) return;

//     const canvas = previewCanvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const img = new Image();

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;

//       const {
//         brightness,
//         contrast,
//         saturation,
//         exposure,
//         warmth,
//         curve,
//       } = current.enhance;

//       const brightnessVal =
//         1 + (brightness + exposure) / 100;

//       const contrastVal = 1 + contrast / 100;

//       const saturationVal =
//         1 + saturation / 100;

//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       ctx.filter = `
//         brightness(${brightnessVal})
//         contrast(${contrastVal})
//         saturate(${saturationVal})
//       `;

//       ctx.drawImage(img, 0, 0);

//       // Warmth
//       if (warmth !== 0) {
//         ctx.globalCompositeOperation = "soft-light";

//         ctx.fillStyle =
//           warmth > 0
//             ? `rgba(255,140,0,${Math.abs(warmth) / 200})`
//             : `rgba(0,100,255,${Math.abs(warmth) / 200})`;

//         ctx.fillRect(
//           0,
//           0,
//           canvas.width,
//           canvas.height
//         );

//         ctx.globalCompositeOperation =
//           "source-over";
//       }

//       // CURVE EFFECT
//       if (curve !== 0) {
//         const imageData = ctx.getImageData(
//           0,
//           0,
//           canvas.width,
//           canvas.height
//         );

//         const data = imageData.data;

//         for (let i = 0; i < data.length; i += 4) {
//           data[i] = Math.min(
//             255,
//             data[i] + curve
//           );

//           data[i + 1] = Math.min(
//             255,
//             data[i + 1] + curve
//           );

//           data[i + 2] = Math.min(
//             255,
//             data[i + 2] + curve
//           );
//         }

//         ctx.putImageData(imageData, 0, 0);
//       }

//       ctx.filter = "none";
//     };

//     img.src = current.originalSrc;
//   }, [current]);

//   return (
//     <div className="space-y-4 animate-fade-in">
//       {/* HEADER */}
//       <div className="text-center">
//         <h2 className="text-2xl font-bold">
//           Edit & Crop Photos
//         </h2>

//         <p className="text-sm text-muted-foreground">
//           Image {currentIdx + 1} of {images.length}
//         </p>
//       </div>

//       {/* MAIN CONTAINER */}
//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
//         {/* LEFT SIDE */}
//         <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-xl">
//           {/* SAME SIZE */}
//           {images.length > 1 && (
//             <div className="flex items-center gap-2 mb-4">
//               <Checkbox
//                 id="sameSizeAll"
//                 checked={sameSizeForAll}
//                 onCheckedChange={(checked) => {
//                   setSameSizeForAll(!!checked);
//                 }}
//               />

//               <Label
//                 htmlFor="sameSizeAll"
//                 className="flex items-center gap-1 text-sm"
//               >
//                 <Link className="h-4 w-4" />
//                 Same size for all images
//               </Label>
//             </div>
//           )}

//           {/* SIZE CONTROLS */}
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
//             <div>
//               <Label>Width</Label>

//               <Input
//                 type="number"
//                 value={current.cropSettings.width}
//                 onChange={(e) =>
//                   updateCropSettings({
//                     width:
//                       parseFloat(
//                         e.target.value
//                       ) || 1,
//                   })
//                 }
//               />
//             </div>

//             <div>
//               <Label>Height</Label>

//               <Input
//                 type="number"
//                 value={current.cropSettings.height}
//                 onChange={(e) =>
//                   updateCropSettings({
//                     height:
//                       parseFloat(
//                         e.target.value
//                       ) || 1,
//                   })
//                 }
//               />
//             </div>

//             <div>
//               <Label>Unit</Label>

//               <Select
//                 value={current.cropSettings.unit}
//                 onValueChange={(v) =>
//                   updateCropSettings({
//                     unit: v as
//                       | "inch"
//                       | "cm",
//                   })
//                 }
//               >
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>

//                 <SelectContent>
//                   <SelectItem value="inch">
//                     Inch
//                   </SelectItem>

//                   <SelectItem value="cm">
//                     CM
//                   </SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <Label>DPI</Label>

//               <Input
//                 type="number"
//                 value={current.cropSettings.dpi}
//                 onChange={(e) =>
//                   updateCropSettings({
//                     dpi:
//                       parseInt(
//                         e.target.value
//                       ) || 300,
//                   })
//                 }
//               />
//             </div>
//           </div>

//           {/* BIG IMAGE */}
//           <div
//             className="relative w-full overflow-hidden rounded-2xl bg-black"
//             style={{
//               height: "75vh",
//             }}
//           >
//             {current.enhance.enabled ? (
//               <canvas
//                 ref={previewCanvasRef}
//                 className="w-full h-full object-contain"
//               />
//             ) : (
//               <Cropper
//                 image={current.originalSrc}
//                 crop={current.crop}
//                 zoom={current.zoom}
//                 aspect={aspect}
//                 onCropChange={(crop) =>
//                   updateCurrent({ crop })
//                 }
//                 onZoomChange={(zoom) =>
//                   updateCurrent({ zoom })
//                 }
//                 onCropComplete={
//                   onCropComplete
//                 }
//                 minZoom={1}
//                 maxZoom={5}
//                 zoomWithScroll={false}
//               />
//             )}
//           </div>

//           {/* ZOOM */}
//           <div className="mt-4">
//             <div className="flex justify-between text-xs mb-1">
//               <span>Zoom</span>
//               <span>
//                 {current.zoom.toFixed(1)}x
//               </span>
//             </div>

//             <Slider
//               min={1}
//               max={5}
//               step={0.05}
//               value={[current.zoom]}
//               onValueChange={([v]) =>
//                 updateCurrent({
//                   zoom: v,
//                 })
//               }
//             />
//           </div>
//         </div>

//         {/* RIGHT SIDE TOOLBAR */}
//         <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-xl overflow-y-auto max-h-[85vh]">
//           <div className="flex items-center gap-2 mb-5">
//             <Wand2 className="h-5 w-5 text-primary" />

//             <h3 className="font-semibold text-lg">
//               Enhance Tools
//             </h3>
//           </div>

//           <div className="flex items-center gap-2 mb-5">
//             <Checkbox
//               id="enhanceCheck"
//               checked={
//                 current.enhance.enabled
//               }
//               onCheckedChange={(
//                 checked
//               ) =>
//                 updateEnhance({
//                   enabled: !!checked,
//                 })
//               }
//             />

//             <Label htmlFor="enhanceCheck">
//               Enable Enhance
//             </Label>
//           </div>

//           {current.enhance.enabled && (
//             <div className="space-y-5">
//               {[
//                 {
//                   label: "Brightness",
//                   key: "brightness",
//                   min: -50,
//                   max: 50,
//                 },
//                 {
//                   label: "Contrast",
//                   key: "contrast",
//                   min: -50,
//                   max: 50,
//                 },
//                 {
//                   label: "Sharpen",
//                   key: "sharpen",
//                   min: 0,
//                   max: 100,
//                 },
//                 {
//                   label: "Saturation",
//                   key: "saturation",
//                   min: -50,
//                   max: 50,
//                 },
//                 {
//                   label: "Exposure",
//                   key: "exposure",
//                   min: -50,
//                   max: 50,
//                 },
//                 {
//                   label: "Warmth",
//                   key: "warmth",
//                   min: -50,
//                   max: 50,
//                 },
//                 {
//                   label: "Curve",
//                   key: "curve",
//                   min: -80,
//                   max: 80,
//                 },
//               ].map(
//                 ({
//                   label,
//                   key,
//                   min,
//                   max,
//                 }) => (
//                   <div key={key}>
//                     <div className="flex justify-between mb-1">
//                       <Label className="text-sm">
//                         {label}
//                       </Label>

//                       <span className="text-xs text-muted-foreground">
//                         {
//                           current.enhance[
//                             key as keyof EnhanceSettings
//                           ] as number
//                         }
//                       </span>
//                     </div>

//                     <Slider
//                       min={min}
//                       max={max}
//                       step={1}
//                       value={[
//                         current.enhance[
//                           key as keyof EnhanceSettings
//                         ] as number,
//                       ]}
//                       onValueChange={(
//                         [v]
//                       ) =>
//                         updateEnhance({
//                           [key]: v,
//                         })
//                       }
//                     />
//                   </div>
//                 )
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* NAVIGATION */}
//       <div className="flex items-center justify-between">
//         <Button
//           variant="outline"
//           onClick={onBack}
//         >
//           <ChevronLeft className="h-4 w-4 mr-1" />
//           Back
//         </Button>

//         <div className="flex items-center gap-2">
//           {images.length > 1 && (
//             <>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 disabled={currentIdx === 0}
//                 onClick={() =>
//                   setCurrentIdx(
//                     (i) => i - 1
//                   )
//                 }
//               >
//                 <ChevronLeft className="h-4 w-4" />
//               </Button>

//               <span className="text-xs text-muted-foreground">
//                 {currentIdx + 1}/
//                 {images.length}
//               </span>

//               <Button
//                 variant="outline"
//                 size="sm"
//                 disabled={
//                   currentIdx ===
//                   images.length - 1
//                 }
//                 onClick={() =>
//                   setCurrentIdx(
//                     (i) => i + 1
//                   )
//                 }
//               >
//                 <ChevronRight className="h-4 w-4" />
//               </Button>
//             </>
//           )}
//         </div>

//         <Button
//           onClick={() =>
//             onDone(
//               editedImages.map(
//                 (
//                   image,
//                   index
//                 ) => ({
//                   ...image,
//                   croppedArea:
//                     latestCropsRef.current[
//                       index
//                     ] ??
//                     image.croppedArea,
//                 })
//               )
//             )
//           }
//           className="bg-gradient-to-r from-primary to-accent"
//         >
//           <Check className="h-4 w-4 mr-1" />
//           Done Editing
//         </Button>
//       </div>
//     </div>
//   );
// }


























import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ChevronLeft,
  ChevronRight,
  Check,
  Link,
  Wand2,
} from "lucide-react";

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
  curve: number;
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

export default function ImageEditor({
  images,
  onDone,
  onBack,
}: ImageEditorProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sameSizeForAll, setSameSizeForAll] = useState(true);

  const [editedImages, setEditedImages] = useState<EditedImage[]>(() => {
    const defaultCrop: CropSettings = {
      width: 1.1,
      height: 1.4,
      unit: "inch",
      dpi: 300,
    };

    const defaultEnhance: EnhanceSettings = {
      enabled: false,
      brightness: 0,
      contrast: 0,
      sharpen: 20,
      saturation: 0,
      warmth: 0,
      exposure: 0,
      curve: 0,
    };

    return images.map((img) => ({
      originalSrc: img.preview,
      croppedArea: { x: 0, y: 0, width: 0, height: 0 },
      crop: { x: 0, y: 0 },
      zoom: 1,
      cropSettings: { ...defaultCrop },
      enhance: { ...defaultEnhance },
    }));
  });

  const current = editedImages[currentIdx];

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const latestCropsRef = useRef<Area[]>(
    images.map(() => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }))
  );

  const widthInInches =
    current.cropSettings.unit === "cm"
      ? current.cropSettings.width / CM_PER_INCH
      : current.cropSettings.width;

  const heightInInches =
    current.cropSettings.unit === "cm"
      ? current.cropSettings.height / CM_PER_INCH
      : current.cropSettings.height;

  const aspect = widthInInches / heightInInches;

  const updateCurrent = useCallback(
    (partial: Partial<EditedImage>) => {
      setEditedImages((prev) => {
        const next = [...prev];
        next[currentIdx] = {
          ...next[currentIdx],
          ...partial,
        };
        return next;
      });
    },
    [currentIdx]
  );

  const updateCropSettings = (
    partial: Partial<CropSettings>
  ) => {
    if (sameSizeForAll) {
      const newSettings = {
        ...current.cropSettings,
        ...partial,
      };

      setEditedImages((prev) =>
        prev.map((img) => ({
          ...img,
          cropSettings: newSettings,
        }))
      );
    } else {
      updateCurrent({
        cropSettings: {
          ...current.cropSettings,
          ...partial,
        },
      });
    }
  };

  const updateEnhance = (
    partial: Partial<EnhanceSettings>
  ) => {
    updateCurrent({
      enhance: {
        ...current.enhance,
        ...partial,
      },
    });
  };

  const syncCurrentCrop = useCallback(
    (croppedAreaPixels: Area) => {
      latestCropsRef.current[currentIdx] =
        croppedAreaPixels;

      updateCurrent({
        croppedArea: croppedAreaPixels,
      });
    },
    [currentIdx, updateCurrent]
  );

  const onCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      syncCurrentCrop(croppedAreaPixels);
    },
    [syncCurrentCrop]
  );

  // ENHANCE PREVIEW
  useEffect(() => {
    if (!current.enhance.enabled) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      const {
        brightness,
        contrast,
        saturation,
        exposure,
        warmth,
        curve,
      } = current.enhance;

      const brightnessVal =
        1 + (brightness + exposure) / 100;

      const contrastVal = 1 + contrast / 100;

      const saturationVal =
        1 + saturation / 100;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.filter = `
        brightness(${brightnessVal})
        contrast(${contrastVal})
        saturate(${saturationVal})
      `;

      ctx.drawImage(img, 0, 0);

      // Warmth
      if (warmth !== 0) {
        ctx.globalCompositeOperation = "soft-light";

        ctx.fillStyle =
          warmth > 0
            ? `rgba(255,140,0,${Math.abs(warmth) / 200})`
            : `rgba(0,100,255,${Math.abs(warmth) / 200})`;

        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.globalCompositeOperation =
          "source-over";
      }

      // CURVE EFFECT
      if (curve !== 0) {
        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(
            255,
            data[i] + curve
          );

          data[i + 1] = Math.min(
            255,
            data[i + 1] + curve
          );

          data[i + 2] = Math.min(
            255,
            data[i + 2] + curve
          );
        }

        ctx.putImageData(imageData, 0, 0);
      }

      ctx.filter = "none";
    };

    img.src = current.originalSrc;
  }, [current]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* HEADER */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          Edit & Crop Photos
        </h2>

        <p className="text-sm text-muted-foreground">
          Image {currentIdx + 1} of {images.length}
        </p>
      </div>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* LEFT SIDE */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-xl">
          {/* SAME SIZE */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="sameSizeAll"
                checked={sameSizeForAll}
                onCheckedChange={(checked) => {
                  setSameSizeForAll(!!checked);
                }}
              />

              <Label
                htmlFor="sameSizeAll"
                className="flex items-center gap-1 text-sm"
              >
                <Link className="h-4 w-4" />
                Same size for all images
              </Label>
            </div>
          )}

          {/* SIZE CONTROLS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div>
              <Label>Width</Label>

              <Input
                type="number"
                value={current.cropSettings.width}
                onChange={(e) =>
                  updateCropSettings({
                    width:
                      parseFloat(
                        e.target.value
                      ) || 1,
                  })
                }
              />
            </div>

            <div>
              <Label>Height</Label>

              <Input
                type="number"
                value={current.cropSettings.height}
                onChange={(e) =>
                  updateCropSettings({
                    height:
                      parseFloat(
                        e.target.value
                      ) || 1,
                  })
                }
              />
            </div>

            <div>
              <Label>Unit</Label>

              <Select
                value={current.cropSettings.unit}
                onValueChange={(v) =>
                  updateCropSettings({
                    unit: v as
                      | "inch"
                      | "cm",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="inch">
                    Inch
                  </SelectItem>

                  <SelectItem value="cm">
                    CM
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>DPI</Label>

              <Input
                type="number"
                value={current.cropSettings.dpi}
                onChange={(e) =>
                  updateCropSettings({
                    dpi:
                      parseInt(
                        e.target.value
                      ) || 300,
                  })
                }
              />
            </div>
          </div>

          {/* BIG IMAGE */}
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-black"
            style={{
              height: "75vh",
            }}
          >
            {current.enhance.enabled ? (
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full object-contain"
              />
            ) : (
              <Cropper
                image={current.originalSrc}
                crop={current.crop}
                zoom={current.zoom}
                aspect={aspect}
                onCropChange={(crop) =>
                  updateCurrent({ crop })
                }
                onZoomChange={(zoom) =>
                  updateCurrent({ zoom })
                }
                onCropComplete={
                  onCropComplete
                }
                minZoom={1}
                maxZoom={5}
                zoomWithScroll={false}
              />
            )}
          </div>

          {/* ZOOM */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Zoom</span>
              <span>
                {current.zoom.toFixed(1)}x
              </span>
            </div>

            <Slider
              min={1}
              max={5}
              step={0.05}
              value={[current.zoom]}
              onValueChange={([v]) =>
                updateCurrent({
                  zoom: v,
                })
              }
            />
          </div>
        </div>

        {/* RIGHT SIDE TOOLBAR */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-xl overflow-y-auto max-h-[85vh]">
          <div className="flex items-center gap-2 mb-5">
            <Wand2 className="h-5 w-5 text-primary" />

            <h3 className="font-semibold text-lg">
              Enhance Tools
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-5">
            <Checkbox
              id="enhanceCheck"
              checked={
                current.enhance.enabled
              }
              onCheckedChange={(
                checked
              ) =>
                updateEnhance({
                  enabled: !!checked,
                })
              }
            />

            <Label htmlFor="enhanceCheck">
              Enable Enhance
            </Label>
          </div>

          {current.enhance.enabled && (
            <div className="space-y-5">
              {[
                {
                  label: "Brightness",
                  key: "brightness",
                  min: -50,
                  max: 50,
                },
                {
                  label: "Contrast",
                  key: "contrast",
                  min: -50,
                  max: 50,
                },
                {
                  label: "Sharpen",
                  key: "sharpen",
                  min: 0,
                  max: 100,
                },
                {
                  label: "Saturation",
                  key: "saturation",
                  min: -50,
                  max: 50,
                },
                {
                  label: "Exposure",
                  key: "exposure",
                  min: -50,
                  max: 50,
                },
                {
                  label: "Warmth",
                  key: "warmth",
                  min: -50,
                  max: 50,
                },
                {
                  label: "Curve",
                  key: "curve",
                  min: -80,
                  max: 80,
                },
              ].map(
                ({
                  label,
                  key,
                  min,
                  max,
                }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">
                        {label}
                      </Label>

                      <span className="text-xs text-muted-foreground">
                        {
                          current.enhance[
                            key as keyof EnhanceSettings
                          ] as number
                        }
                      </span>
                    </div>

                    <Slider
                      min={min}
                      max={max}
                      step={1}
                      value={[
                        current.enhance[
                          key as keyof EnhanceSettings
                        ] as number,
                      ]}
                      onValueChange={(
                        [v]
                      ) =>
                        updateEnhance({
                          [key]: v,
                        })
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() =>
                  setCurrentIdx(
                    (i) => i - 1
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-xs text-muted-foreground">
                {currentIdx + 1}/
                {images.length}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  currentIdx ===
                  images.length - 1
                }
                onClick={() =>
                  setCurrentIdx(
                    (i) => i + 1
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={() =>
            onDone(
              editedImages.map(
                (
                  image,
                  index
                ) => ({
                  ...image,
                  croppedArea:
                    latestCropsRef.current[
                      index
                    ] ??
                    image.croppedArea,
                })
              )
            )
          }
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Check className="h-4 w-4 mr-1" />
          Done Editing
        </Button>
      </div>
    </div>
  );
}