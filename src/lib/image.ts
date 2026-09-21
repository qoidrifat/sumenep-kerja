/**
 * Kompresi foto di browser sebelum diunggah — agar foto HP (umumnya 3–8 MB)
 * lolos batas 1 MB tanpa menaikkan kuota server.
 *
 * Strategi: skala sisi terpanjang ke maxDim + encode JPEG. Latar putih
 * diisi dulu agar PNG transparan tidak menjadi hitam saat jadi JPEG.
 * `createImageBitmap` menghormati orientasi EXIF sehingga foto tidak miring.
 */

export interface CompressOptions {
  maxDim?: number;
  quality?: number;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }
  // Fallback browser lama: elemen <img>.
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.src = url;
    await img.decode();
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodeJpeg(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas tidak didukung di peramban ini.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode gagal."))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Kompres satu file gambar. Mengembalikan file asli tanpa perubahan bila
 * sudah JPEG kecil (hemat CPU/ waktu di HP kentang).
 */
export async function compressImage(
  file: File,
  { maxDim = 1280, quality = 0.82 }: CompressOptions = {},
): Promise<File> {
  if (file.type === "image/jpeg" && file.size <= 1024 * 1024) return file;

  const bitmap = await loadBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const blob = await encodeJpeg(
      bitmap,
      bitmap.width * scale,
      bitmap.height * scale,
      quality,
    );
    const name = file.name.replace(/\.\w+$/, "") || "foto";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
