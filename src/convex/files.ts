import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { enforceRateLimit, LIMITS } from "./lib/rateLimit";

/**
 * Batas foto: 3 berkas, maksimal 1 MB per berkas, hanya gambar.
 *
 * Nilai ini WAJIB sama dengan `MAX_PHOTOS`/`MAX_PHOTO_BYTES` di
 * `src/pages/Daftar.tsx` — klien hanya kenyamanan, server yang menegakkan.
 */
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 1024 * 1024;

/** Tipe konten gambar yang diizinkan untuk galeri mitra. */
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

/**
 * Validasi metadata berkas di `_storage` SEBELUM id-nya disimpan ke vendor.
 *
 * Klien bisa memalsukan apa pun (ukuran, MIME, nama berkas), jadi pemeriksaan
 * di sini tidak bisa dilewati dengan mengabaikan `accept="image/*"` atau dengan
 * memanggil Convex HTTP API secara langsung.
 *
 * @throws ConvexError bila berkas tidak ada, kebesaran, atau bukan gambar.
 */
export async function assertValidImageStorageIds(
  ctx: MutationCtx,
  storageIds: readonly Id<"_storage">[],
): Promise<void> {
  if (storageIds.length === 0) return;

  if (storageIds.length > MAX_PHOTOS) {
    throw new ConvexError(`Maksimal ${MAX_PHOTOS} foto.`);
  }

  for (const storageId of storageIds) {
    const metadata = await ctx.db.system.get("_storage", storageId);

    if (!metadata) {
      throw new ConvexError(
        "Foto tidak ditemukan atau sudah kedaluwarsa. Unggah ulang foto Anda.",
      );
    }
    if (metadata.size > MAX_PHOTO_BYTES) {
      throw new ConvexError("Ukuran foto melebihi 1 MB. Coba foto lain.");
    }
    if (
      !metadata.contentType ||
      !ALLOWED_IMAGE_TYPES.has(metadata.contentType.toLowerCase())
    ) {
      throw new ConvexError("Berkas harus berupa gambar (JPG/PNG/WebP).");
    }
  }
}

/**
 * URL upload satu kali pakai untuk foto profil/hasil kerja mitra.
 *
 * Pendaftaran mitra memang tanpa akun (lihat AGENTS.md), tetapi URL upload
 * TIDAK boleh benar-benar anonim: tanpa pembatas, siapa pun bisa mengisi
 * penyimpanan Convex tanpa batas (biaya + DoS). Identitas Convex Auth (termasuk
 * anonim) dihitung sebagai identitas, dan pembatas global menjaga penyalahgunaan
 * massal. Batas ukuran/tipe ditegakkan saat berkas dipakai di `registerVendor`
 * melalui `assertValidImageStorageIds`.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getAuthUserId(ctx);
    const bucket = identity ? `id:${identity}` : "anon";

    await enforceRateLimit(ctx, `upload:${bucket}`, LIMITS.uploadUrl);
    await enforceRateLimit(ctx, "upload:global", LIMITS.uploadUrlGlobal);

    return await ctx.storage.generateUploadUrl();
  },
});

