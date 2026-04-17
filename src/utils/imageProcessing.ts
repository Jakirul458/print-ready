// Image processing utilities - all client-side

export const DPI = 300;

export interface PaperSize {
  name: string;
  widthPx: number;
  heightPx: number;
}

export const PAPER_SIZES: Record<string, PaperSize> = {
  "A3": { name: "A3", widthPx: 3508, heightPx: 4961 },
  "A4": { name: "A4", widthPx: 2480, heightPx: 3508 },
  "A5": { name: "A5", widthPx: 1748, heightPx: 2480 },
  "A6": { name: "A6", widthPx: 1240, heightPx: 1748 },
  "4x6": { name: "4×6 in", widthPx: 1200, heightPx: 1800 },
  "5x7": { name: "5×7 in", widthPx: 1500, heightPx: 2100 },
  "Letter": { name: "Letter", widthPx: 2550, heightPx: 3300 },
  "Legal": { name: "Legal", widthPx: 2550, heightPx: 4200 },
};

// 0.3cm margin at 300 DPI → 0.3 / 2.54 * 300 ≈ 35px
export const PAGE_MARGIN_PX = Math.round((0.3 / 2.54) * DPI);

export function inchesToPixels(inches: number, dpi: number = DPI): number {
  return Math.round(inches * dpi);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob"));
    }, type);
  });
}

export function enhanceImage(
  imageData: ImageData,
  brightness: number = 0,
  contrast: number = 0,
  sharpen: number = 0,
  saturation: number = 0,
  warmth: number = 0
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const w = imageData.width;
  const h = imageData.height;

  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightness;
    let g = data[i + 1] + brightness;
    let b = data[i + 2] + brightness;

    // Contrast
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;

    // Saturation
    if (saturation !== 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const sat = 1 + saturation / 100;
      r = gray + sat * (r - gray);
      g = gray + sat * (g - gray);
      b = gray + sat * (b - gray);
    }

    // Warmth
    if (warmth !== 0) {
      r += warmth * 0.5;
      b -= warmth * 0.5;
    }

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  if (sharpen > 0) {
    const original = new Uint8ClampedArray(data);
    const amount = sharpen / 100;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const neighbors =
            original[((y - 1) * w + x) * 4 + c] +
            original[((y + 1) * w + x) * 4 + c] +
            original[(y * w + (x - 1)) * 4 + c] +
            original[(y * w + (x + 1)) * 4 + c];
          const blur = neighbors / 4;
          const sharp = original[idx + c] + (original[idx + c] - blur) * amount;
          data[idx + c] = Math.max(0, Math.min(255, Math.round(sharp)));
        }
      }
    }
  }

  return new ImageData(data, w, h);
}

export function applyWhiteBackground(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

export interface LayoutResult {
  pages: HTMLCanvasElement[];
}

export function generateLayout(
  photos: HTMLCanvasElement[],
  copies: number | number[],
  paper: PaperSize,
  photoWidthPx: number,
  photoHeightPx: number,
  gapPx: number = 20
): LayoutResult {
  const marginPx = PAGE_MARGIN_PX;
  const allPhotos: HTMLCanvasElement[] = [];
  for (let pi = 0; pi < photos.length; pi++) {
    const count = Array.isArray(copies) ? (copies[pi] ?? 1) : copies;
    for (let i = 0; i < count; i++) {
      allPhotos.push(photos[pi]);
    }
  }

  const cols = Math.floor((paper.widthPx - 2 * marginPx + gapPx) / (photoWidthPx + gapPx));
  const rows = Math.floor((paper.heightPx - 2 * marginPx + gapPx) / (photoHeightPx + gapPx));
  const perPage = cols * rows;

  const pages: HTMLCanvasElement[] = [];
  const totalPages = Math.ceil(allPhotos.length / perPage);

  const gridWidth = cols * photoWidthPx + (cols - 1) * gapPx;
  const offsetX = Math.round((paper.widthPx - gridWidth) / 2);
  const offsetY = marginPx; // 0.3cm top margin

  for (let p = 0; p < totalPages; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = paper.widthPx;
    canvas.height = paper.heightPx;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < perPage; i++) {
      const idx = p * perPage + i;
      if (idx >= allPhotos.length) break;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = offsetX + col * (photoWidthPx + gapPx);
      const y = offsetY + row * (photoHeightPx + gapPx);
      ctx.drawImage(allPhotos[idx], x, y, photoWidthPx, photoHeightPx);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
    }
    pages.push(canvas);
  }

  return { pages };
}
