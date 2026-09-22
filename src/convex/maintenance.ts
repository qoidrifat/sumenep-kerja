import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Pekerjaan pemeliharaan berkala — dijadwalkan oleh `src/convex/crons.ts`.
 * Semua bersifat `internalMutation`: tidak bisa dipanggil dari klien.
 *
 * Menutup rekomendasi audit CRIT-1 (pembersih berkas `_storage` yatim) dan
 * menangani sampah dari rate limiter & sesi admin.
 */

/** Berkas tanpa pemilik yang lebih tua dari ini dianggap yatim. */
const ORPHAN_FILE_AGE_MS = 24 * 60 * 60 * 1000;
/** Batas waktu penghapusan satu cron run (milidetik). */
const MAX_RUN_MS = 25_000;

/**
 * Hapus berkas `_storage` yang tidak direferensikan vendor mana pun dan sudah
 * lebih tua dari `ORPHAN_FILE_AGE_MS`. Ambang umur penting: saat pendaftaran,
 * foto diunggah dulu baru kemudian direferensikan `registerVendor` — tanpa
 * ambang, pembersih bisa menghapus foto yang sedang dalam proses.
 */
export const cleanupOrphanStorage = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const cutoff = startedAt - ORPHAN_FILE_AGE_MS;
    const batchSize = Math.min(Math.max(args.batchSize ?? 50, 1), 200);

    const referenced = new Set<string>();
    for (const vendor of await ctx.db.query("vendors").collect()) {
      if (vendor.imageId) referenced.add(vendor.imageId);
      for (const id of vendor.imageIds ?? []) referenced.add(id);
    }

    let scanned = 0;
    let deleted = 0;
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore && Date.now() - startedAt < MAX_RUN_MS) {
      const page = await ctx.db.system
        .query("_storage")
        .order("asc")
        .paginate({ numItems: batchSize, cursor: cursor ?? null });

      for (const file of page.page) {
        scanned++;
        if (referenced.has(file._id)) continue;
        // `_creationTime` ada di semua dokumen sistem.
        if (file._creationTime > cutoff) continue;
        try {
          await ctx.storage.delete(file._id);
          deleted++;
        } catch (error) {
          console.warn(
            `[cleanupOrphanStorage] Gagal menghapus ${file._id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      hasMore = !page.isDone;
      cursor = page.continueCursor;
    }

    return { scanned, deleted, done: !hasMore };
  },
});

/** Hapus sesi dashboard admin yang sudah kedaluwarsa. */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("adminSessions")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .take(200);

    for (const session of expired) {
      await ctx.db.delete(session._id);
    }
    return { deleted: expired.length };
  },
});

/**
 * Hapus baris rate limiter yang jendelanya sudah lewat. Baris lewat jendela
 * akan dibuat ulang otomatis saat dibutuhkan, jadi aman dibuang.
 */
export const cleanupStaleRateLimits = internalMutation({
  args: { olderThanMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const olderThanMs = args.olderThanMs ?? 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - olderThanMs;

    const stale = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("windowStart"), cutoff))
      .take(500);

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return { deleted: stale.length };
  },
});
