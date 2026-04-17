import { useCallback, useRef } from "react";
import { Upload, ImagePlus, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  images: { file: File; preview: string }[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

export default function ImageUploader({ images, onAdd, onRemove }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length) onAdd(files);
    },
    [onAdd]
  );

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onAdd(files);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-primary/30 rounded-xl p-6 sm:p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 bg-card/50 backdrop-blur-sm"
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
        </div>
        <p className="text-foreground font-medium text-sm sm:text-base">Drop images here or click to browse</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Supports JPG, PNG, WebP</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {/* Camera capture button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => cameraRef.current?.click()}
          className="border-border/50 gap-2"
        >
          <Camera className="h-4 w-4" />
          Capture by Camera
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border/50 aspect-square bg-muted shadow-md hover:shadow-lg transition-shadow duration-200">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border/50 rounded-lg aspect-square flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          >
            <ImagePlus className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
