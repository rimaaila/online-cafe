'use client';
// Browser-side image compression (keeps the upload under Vercel's ~4.5 MB request limit).

async function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, type, quality));
  if (blob && blob.type === type) return blob;
  // Browser does not support WebP encoding: fall back to JPEG
  const jpeg: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!jpeg) throw new Error('Could not compress image');
  return jpeg;
}

export async function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height)); // never upscale
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const out = await encode(canvas, 'image/webp', quality);
  // Keep the original if re-encoding made it bigger and we did not resize
  if (scale === 1 && out.size >= file.size && file.size < 3.5 * 1024 * 1024) return file;
  return out;
}

// Product photos: high quality (visually lossless) full image + small thumbnail
export const compressProductFull = (f: File) => compressImage(f, 2000, 0.93);
export const compressProductThumb = (f: File) => compressImage(f, 400, 0.8);
// Receipts: smaller, still readable
export const compressReceipt = (f: File) => compressImage(f, 1600, 0.75);
