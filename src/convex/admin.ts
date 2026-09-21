import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sanitizePhoneNumber } from "../lib/whatsapp";

// ---------------------------------------------------------------------------
// Autentikasi admin sederhana: passphrase disimpan sebagai env var Convex
// (ADMIN_PASSCODE), TIDAK pernah di-hardcode di sini. Dashboard klien mengirim
// passphrase pada setiap panggilan; server memverifikasi sebelum menjawab.
// ---------------------------------------------------------------------------

/** Verifikasi passphrase admin terhadap env var ADMIN_PASSCODE. */
function assertAdminPasscode(passcode: string): void {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    throw new Error(
      "Passphrase admin belum dikonfigurasi. Jalankan: bunx convex env set ADMIN_PASSCODE <nilai>",
    );
  }
  if (passcode !== expected) {
    throw new Error("Passphrase salah.");
  }
}

// Derivasi status yang konsisten untuk SEMUA vendor — termasuk dokumen lama
// yang belum punya field verificationStatus (di-seed sebelum field ada):
//   verified   = isVerified === true
//   confirmed  = belum verified, tapi sudah kirim konfirmasi (field = "confirmed")
//   pending    = sisanya (belum klaim) — termasuk verificationStatus undefined
function isVerifiedVendor(v: { isVerified?: boolean }): boolean {
  return v.isVerified === true;
}
function isConfirmedVendor(v: {
  isVerified?: boolean;
  verificationStatus?: "pending" | "confirmed";
}): boolean {
  return !isVerifiedVendor(v) && v.verificationStatus === "confirmed";
}
function isPendingClaimVendor(v: {
  isVerified?: boolean;
  verificationStatus?: "pending" | "confirmed";
}): boolean {
  return !isVerifiedVendor(v) && !isConfirmedVendor(v);
}

/** Cek passphrase + statistik ringkas (dipakai saat login). */
export const verifyPasscode = mutation({
  args: { passcode: v.string() },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);

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
    return { ok: true as const, stats };
  },
});

/** Seluruh data mitra + kategori untuk tabel dashboard. */
export const getDashboardData = query({
  args: { passcode: v.string() },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);

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
          verificationStatus: v.verificationStatus ?? null,
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
// Mutasi pengelolaan (semua wajib passphrase admin)
// ---------------------------------------------------------------------------

/** Setujui verifikasi satu mitra → badge ✓ Terverifikasi. */
export const approveVendor = mutation({
  args: { passcode: v.string(), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);
    await ctx.db.patch(args.vendorId, {
      isVerified: true,
      // Status "verified" direpresentasikan oleh isVerified=true.
      verificationStatus: undefined,
    });
    return { ok: true as const };
  },
});

/** Tolak verifikasi → kembali ke "pending" (badge kuning hilang). */
export const rejectVerification = mutation({
  args: { passcode: v.string(), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);
    await ctx.db.patch(args.vendorId, {
      isVerified: false,
      verificationStatus: "pending",
    });
    return { ok: true as const };
  },
});

/** Aktifkan / nonaktifkan mitra (nonaktif = hilang dari katalog publik). */
export const setVendorActive = mutation({
  args: {
    passcode: v.string(),
    vendorId: v.id("vendors"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);
    await ctx.db.patch(args.vendorId, { isActive: args.isActive });
    return { ok: true as const };
  },
});

/** Edit data inti mitra langsung dari dashboard. */
export const updateVendor = mutation({
  args: {
    passcode: v.string(),
    vendorId: v.id("vendors"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    addressText: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    workingHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Mitra tidak ditemukan.");

    const patch: Partial<typeof vendor> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 3) throw new Error("Nama usaha minimal 3 karakter.");
      patch.name = name;
    }
    if (args.phoneNumber !== undefined) {
      // Sanitasi server-side sama seperti pendaftaran mandiri.
      patch.phoneNumber = sanitizePhoneNumber(args.phoneNumber);
    }
    if (args.addressText !== undefined) {
      const address = args.addressText.trim();
      if (address.length < 5) throw new Error("Alamat terlalu pendek.");
      patch.addressText = address;
    }
    if (args.minPrice !== undefined) {
      patch.minPrice = args.minPrice > 0 ? args.minPrice : undefined;
    }
    if (args.workingHours !== undefined) {
      patch.workingHours = args.workingHours.trim() || undefined;
    }

    await ctx.db.patch(args.vendorId, patch);
    return { ok: true as const };
  },
});

/** Hapus mitra permanen (dengan konfirmasi di sisi klien). */
export const deleteVendor = mutation({
  args: { passcode: v.string(), vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    assertAdminPasscode(args.passcode);
    await ctx.db.delete(args.vendorId);
    return { ok: true as const };
  },
});
