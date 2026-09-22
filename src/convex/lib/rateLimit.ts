/**
 * Pembatas laju (rate limiter) berbasis tabel — jendela tetap (fixed window).
 *
 * Kenapa berbasis tabel Convex dan bukan in-memory: fungsi Convex berjalan di
 * isolate yang bisa didaur ulang kapan saja, jadi state in-memory tidak dapat
 * diandalkan. Mutation Convex bersifat serializable, sehingga pola
 * baca-ubah-tulis di bawah ini aman dari race condition tanpa perlu lock.
 *
 * Catatan penting: Convex TIDAK mengekspos IP klien ke mutation/query, jadi
 * pembatas ini bekerja per kunci logis (nomor telepon, id vendor, atau global),
 * bukan per IP. Untuk pembatasan per-IP gunakan lapisan edge (Cloudflare /
 * Vercel WAF) — lihat AUDIT-REPORT.md.
 */
import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

export interface RateLimitRule {
  /** Maksimum permintaan yang diizinkan dalam satu jendela. */
  limit: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
}

/** Pesan seragam — tidak membocorkan sisa kuota atau keberadaan kunci. */
export const RATE_LIMIT_MESSAGE =
  "Terlalu banyak permintaan. Mohon tunggu sebentar lalu coba lagi.";

/**
 * Naikkan penghitung untuk `key` dan lempar `ConvexError` bila kuota habis.
 *
 * Bila melempar, seluruh transaksi mutation di-rollback — termasuk
 * penambahan penghitung — sehingga penghitung berhenti tepat di batas dan
 * tidak pernah overflow.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  key: string,
  { limit, windowMs }: RateLimitRule,
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing || now - existing.windowStart >= windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= limit) {
    throw new ConvexError(RATE_LIMIT_MESSAGE);
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/** Aturan siap pakai — dikumpulkan di satu tempat agar mudah ditinjau. */
export const LIMITS = {
  /** Login admin: 15 percobaan / 15 menit (global). */
  adminLogin: { limit: 15, windowMs: 15 * 60 * 1000 },
  /** Pendaftaran mitra per nomor telepon: 3 / jam. */
  registerPerPhone: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Pendaftaran mitra global: 60 / jam (circuit breaker anti-spam massal). */
  registerGlobal: { limit: 60, windowMs: 60 * 60 * 1000 },
  /** Permintaan URL upload per identitas: 20 / jam. */
  uploadUrl: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Permintaan URL upload global: 120 / jam. */
  uploadUrlGlobal: { limit: 120, windowMs: 60 * 60 * 1000 },
  /** Rekomendasi per vendor: 5 / jam. */
  recommendPerVendor: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Klik WhatsApp per vendor: 120 / jam. */
  whatsappClickPerVendor: { limit: 120, windowMs: 60 * 60 * 1000 },
  /** Permintaan verifikasi per vendor: 3 / jam. */
  claimRequestPerVendor: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Bootstrap seed global: 5 / jam. */
  seedGlobal: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;
