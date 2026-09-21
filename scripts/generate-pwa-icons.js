/**
 * One-time asset pipeline: generate PWA icon variants + favicon from the
 * master brand assets in public/assets/.
 *
 * Run: bun scripts/generate-pwa-icons.js
 */
import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";

const ICON = "public/assets/SumenepKerja.com-icon.png";
const LOGO = "public/assets/SumenepKerja.com-logo.png";

await mkdir("public", { recursive: true });

// 1. Ikon PWA 192 & 512 dari ikon persegi master (purpose: any)
await sharp(ICON).resize(192, 192, { fit: "cover" }).png().toFile("public/pwa-192x192.png");
await sharp(ICON).resize(512, 512, { fit: "cover" }).png().toFile("public/pwa-512x512.png");

// 2. Maskable: konten aman di 80% tengah (safe zone) dengan latar biru gelap #1E3A8A
const maskable = await sharp(ICON)
  .resize(410, 410, { fit: "cover" }) // 80% dari 512
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#1E3A8A" },
})
  .composite([{ input: maskable, gravity: "center" }])
  .png()
  .toFile("public/pwa-512x512-maskable.png");

// 3. Apple touch icon 180×180 (iOS tidak membaca manifest)
await sharp(ICON).resize(180, 180, { fit: "cover" }).png().toFile("public/apple-touch-icon.png");

// 4. Favicon 48×48 untuk kualitas tajam di tab browser
await sharp(ICON).resize(48, 48, { fit: "cover" }).png().toFile("public/favicon.png");

// 5. Salin logo utama ke root public/ (arsip)
await copyFile(LOGO, "public/logo-sumenepkerja.png");

// 6. Varian logo header — whitespace pinggir dipangkas (trim) agar visual
//    logo mepet kiri header, lalu discale ke tinggi 192 (tajam untuk 48px @4x).
const trimmedLogo = await sharp(LOGO).trim({ threshold: 10 }).toBuffer();
const logoMeta = await sharp(trimmedLogo).metadata();
const headerH = 192;
const headerW = Math.round((logoMeta.width * headerH) / logoMeta.height);
await sharp(trimmedLogo)
  .resize({ height: headerH })
  .png()
  .toFile("public/logo-header.png");
console.log(`logo-header.png: ${headerW}x${headerH} (asli ter-trim: ${logoMeta.width}x${logoMeta.height})`);

console.log("PWA assets generated OK");
