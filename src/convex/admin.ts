import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { isWhatsAppNumber, sanitizePhoneNumber } from "../lib/whatsapp";
import {
  assertAdmin,
  createAdminSession,
  revokeAdminSession,
} from "./lib/adminAuth";
import { enforceRateLimit, LIMITS } from "./lib/rateLimit";

// ---------------------------------------------------------------------------
// Autentikasi dashboard admin.
//
// Audit (AUDIT-REPORT.md CRIT-3) menemukan tiga masalah pada desain lama:
//   1. passphrase dikirim ulang sebagai argumen pada SETIAP panggilan —
//      termasuk query, sehingga ikut tersimpan di setiap subscription dan
//      terlihat di log fungsi maupun frame WebSocket DevTools;
//   2. tanpa pembatas laju sama sekali → bisa di-brute-force;
//   3. pesan error membedakan "belum diset" vs "salah" dan membocorkan
//      perintah shell internal ke pemanggil anonim.
//
// Desain sekarang: `loginAdmin` menukar passphrase (di-hash, dibandingkan
// constant-time) dengan token sesi acak 256-bit sekali pakai-jangka-panjang.
// Seluruh fungsi dashboard menerima `sessionToken`, bukan passphrase.
// Jalur yang lebih kuat (tanpa rahasia bersama) adalah pengguna Convex Auth
// dengan `users.role === "admin"` — lihat `lib/adminAuth.ts`.
// ---------------------------------------------------------------------------

/** Derivasi status yang konsisten untuk SEMUA vendor — termasuk dokumen lama
 *  yang belum punya field verificationStatus (di-seed sebelum field ada):
 *   verified   = isVerified === true
 *   confirmed  = belum verified, tapi ada permintaan klaim/konfirmasi
 *   pending    = sisanya (belum klaim)
 *
 * `verificationStatus` HANYA ditulis admin; permintaan dari mitra/warga masuk
 * ke `claimRequestedAt` sehingga pihak luar tidak dapat mengubah tampilan
 * kartu publik orang lain (lihat schema.ts). */
function isVerifiedVendor(v: { isVerified?: boolean }): boolean {
  return v.isVerified === true;
}
function isConfirmedVendor(v: {
  isVerified?: boolean;
  verificationStatus?: "pending" | "confirmed";
  claimRequestedAt?: number;
}): boolean {
  if (isVerifiedVendor(v)) return false;
  return v.verificationStatus === "confirmed" || v.claimRequestedAt !== undefined;
}
function isPendingClaimVendor(v: {
  isVerified?: boolean;
  verificationStatus?: "pending" | "confirmed";
  claimRequestedAt?: number;
}): boolean {
  return !isVerifiedVendor(v) && !isConfirmedVendor(v);
}


/**
 * Login dashboard: tukar passphrase dengan token sesi + statistik ringkas.
 *
 * Passphrase hanya melewati jaringan SEKALI. Setelah ini klien memakai
 * `sessionToken`. Pembatas laju global mencegah brute-force.
 */
export const loginAdmin = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, args) => {
    await enforceRateLimit(ctx, "admin:login", LIMITS.adminLogin);

    const session = await createAdminSession(ctx, args.passcode);

    const vendors = await ctx.db.query("vendors").collect();
    const stats = {
      total: vendors.length,
      verified: vendors.filter(isVerifiedVendor).length,
      confirmed: vendors.filter(isConfirmedVendor).length,
      pending: vendors.filter(isPendingClaimVendor).length,
      inactive: vendors.filter((v) => v.isActive === false).length,
      noPhone: vendors.filter((v) => !v.phoneNumber).length,
      totalClicks: vendors.reduce((sum, v) => sum + (v.whatsappClicks ?? 0), 0),
    };
    return {
      ok: true as const,
      token: session.token,
      expiresAt: session.expiresAt,
      stats,
    };
  },
});

/** Logout: cabut sesi di server sehingga token tidak bisa dipakai lagi. */
export const logoutAdmin = mutation({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.sessionToken) {
      await revokeAdminSession(ctx, args.sessionToken);
    }
    return { ok: true as const };
  },
});

/** Seluruh data mitra + kategori untuk tabel dashboard. */
export const getDashboardData = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);

    const [vendors, categories, landmarks] = await Promise.all([
      ctx.db.query("vendors").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("landmarks").collect(),
    ]);

    const categoriesById = new Map(categories.map((c) => [c._id, c]));
    const landmarksById = new Map(landmarks.map((l) => [l._id, l]));

    const rows = await Promise.all(
      vendors
        .sort((a, b) => b._creationTime - a._creationTime)
        .map(async (v) => ({
          id: v._id,
          name: v.name,
          slug: v.slug,
          phoneNumber: v.phoneNumber,
          addressText: v.addressText,
          categoryName: categoriesById.get(v.categoryId)?.name ?? "—",
          categorySlug: categoriesById.get(v.categoryId)?.slug ?? "",
          landmarkName: v.landmarkId
            ? (landmarksById.get(v.landmarkId)?.name ?? null)
            : null,
          minPrice: v.minPrice ?? null,
          workingHours: v.workingHours ?? null,
          rating: v.rating ?? null,
          reviewCount: v.reviewCount ?? null,
          isVerified: v.isVerified === true,
          // Dipetakan ke bentuk lama agar tabel dashboard tidak perlu berubah:
          // "confirmed" = perlu ditinjau (permintaan mitra ATAU penandaan admin).
          verificationStatus: isVerifiedVendor(v)
            ? null
            : isConfirmedVendor(v)
              ? ("confirmed" as const)
              : ("pending" as const),
          claimRequestedAt: v.claimRequestedAt ?? null,
          whatsappClicks: v.whatsappClicks ?? 0,
          isActive: v.isActive !== false,
          hasImage: v.imageId !== undefined,
          createdAt: v._creationTime,
        })),
    );

    return { vendors: rows };
  },
});


// ---------------------------------------------------------------------------
// Mutasi pengelolaan (semua wajib sesi admin — token, BUKAN passphrase)
// ---------------------------------------------------------------------------

/** Setujui verifikasi satu mitra → badge ✓ Terverifikasi. */
export const approveVendor = mutation({
  args: { sessionToken: v.optional(v.string()), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);
    await ctx.db.patch(args.vendorId, {
      isVerified: true,
      // Status "verified" direpresentasikan oleh isVerified=true.
      verificationStatus: undefined,
      claimRequestedAt: undefined,
    });
    return { ok: true as const };
  },
});

/** Tolak verifikasi → kembali ke "Belum Klaim" (badge kuning hilang). */
export const rejectVerification = mutation({
  args: { sessionToken: v.optional(v.string()), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);
    await ctx.db.patch(args.vendorId, {
      isVerified: false,
      verificationStatus: "pending",
      claimRequestedAt: undefined,
    });
    return { ok: true as const };
  },
});

/** Aktifkan / nonaktifkan mitra (nonaktif = hilang dari katalog publik). */
export const setVendorActive = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    vendorId: v.id("vendors"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);
    await ctx.db.patch(args.vendorId, { isActive: args.isActive });
    return { ok: true as const };
  },
});

/** Edit data inti mitra langsung dari dashboard. */
export const updateVendor = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    addressText: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    workingHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);

    const vendor = await ctx.db.get(args.vendorId);
    // ConvexError = pesan untuk pengguna dashboard (lihat MED-4 audit).
    if (!vendor) throw new ConvexError("Mitra tidak ditemukan.");

    const patch: Partial<typeof vendor> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 3) throw new ConvexError("Nama usaha minimal 3 karakter.");
      if (name.length > 150) throw new ConvexError("Nama usaha maksimal 150 karakter.");
      patch.name = name;
    }
    if (args.phoneNumber !== undefined) {
      // Sumber kebenaran yang sama dengan pendaftaran mandiri (HIGH-2):
      // harus nomor seluler Indonesia yang layak WhatsApp.
      const phone = sanitizePhoneNumber(args.phoneNumber);
      if (!isWhatsAppNumber(phone)) {
        throw new ConvexError(
          "Nomor WhatsApp seluler tidak valid. Contoh: 081234567890",
        );
      }
      patch.phoneNumber = phone;
    }
    if (args.addressText !== undefined) {
      const address = args.addressText.trim();
      if (address.length < 5) throw new ConvexError("Alamat terlalu pendek.");
      if (address.length > 500) throw new ConvexError("Alamat maksimal 500 karakter.");
      patch.addressText = address;
    }
    if (args.minPrice !== undefined) {
      if (args.minPrice < 0 || args.minPrice > 1_000_000_000_000) {
        throw new ConvexError("Harga tidak wajar.");
      }
      patch.minPrice = args.minPrice > 0 ? args.minPrice : undefined;
    }
    if (args.workingHours !== undefined) {
      const hours = args.workingHours.trim();
      if (hours.length > 100) {
        throw new ConvexError("Jam kerja maksimal 100 karakter.");
      }
      patch.workingHours = hours || undefined;
    }

    await ctx.db.patch(args.vendorId, patch);
    return { ok: true as const };
  },
});

/**
 * Hapus mitra permanen (dengan konfirmasi di sisi klien).
 * Foto-foto mitra ikut dihapus dari `_storage` agar tidak menjadi berkas yatim.
 */
export const deleteVendor = mutation({
  args: { sessionToken: v.optional(v.string()), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.sessionToken);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError("Mitra tidak ditemukan.");

    // Hapus semua foto yang direferensikan (galeri baru + imageId lawas).
    const storageIds = new Set<Id<"_storage">>();
    if (vendor.imageId) storageIds.add(vendor.imageId);
    for (const id of vendor.imageIds ?? []) storageIds.add(id);
    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
      } catch (error) {
        // Berkas mungkin sudah dihapus pembersih yatim — jangan gagalkan
        // penghapusan mitra karena itu; cukup catat.
        console.warn(
          `[deleteVendor] Gagal menghapus berkas ${storageId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    await ctx.db.delete(args.vendorId);
    return { ok: true as const };
  },
});

