import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ===== Keamanan: sesi dashboard admin & pembatas laju =====
    //
    // Passphrase admin TIDAK pernah dikirim ulang pada setiap panggilan dan
    // TIDAK pernah disimpan mentah. Login menukar passphrase (di-hash,
    // dibandingkan constant-time) dengan token acak 256-bit; yang disimpan di
    // sini hanya SHA-256 dari token tersebut.
    adminSessions: defineTable({
      tokenHash: v.string(),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
      .index("by_token_hash", ["tokenHash"])
      .index("by_expires_at", ["expiresAt"]),

    // Penghitung jendela tetap (fixed window) per kunci. Dibersihkan berkala
    // oleh cron di convex/crons.ts.
    rateLimits: defineTable({
      key: v.string(),
      windowStart: v.number(),
      count: v.number(),
    }).index("by_key", ["key"]),

    // ===== SumenepKerja directory tables =====

    // Kategori layanan (Servis & Teknik, Hajatan & Acara, ...)
    categories: defineTable({
      name: v.string(),
      slug: v.string(),
      iconName: v.optional(v.string()),
      sortOrder: v.optional(v.number()),
    })
      .index("by_slug", ["slug"])
      .index("by_sort_order", ["sortOrder"]),

    // Patokan lokasi lokal Sumenep (landmark-first navigation)
    landmarks: defineTable({
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      lat: v.number(),
      lng: v.number(),
    }).index("by_slug", ["slug"]),

    // Kecamatan se-Kabupaten Sumenep (hyperlocal SEO). Data resmi Kemendagri;
    // koordinat = titik perkiraan pusat kecamatan untuk penempatan otomatis.
    districts: defineTable({
      name: v.string(),
      slug: v.string(),
      lat: v.number(),
      lng: v.number(),
      // Deskripsi asli 2-3 kalimat (ciri khas wilayah) — mencegah halaman
      // kecamatan menjadi konten tipis di mata Google.
      description: v.optional(v.string()),
      sortOrder: v.optional(v.number()),
    })
      .index("by_slug", ["slug"])
      .index("by_sort_order", ["sortOrder"]),

    // Mitra / vendor. Coordinates are ALWAYS copied from the chosen
    // landmark at registration so the vendor is instantly discoverable.
    vendors: defineTable({
      categoryId: v.id("categories"),
      landmarkId: v.optional(v.id("landmarks")),
      // Hyperlocal SEO: kecamatan mitra, ditetapkan otomatis dari koordinat
      // (kecamatan terdekat) saat registrasi & backfill seed.
      districtId: v.optional(v.id("districts")),
      name: v.string(),
      slug: v.string(),
      phoneNumber: v.string(), // E.164 tanpa tanda + (misal: 628123456789)
      addressText: v.string(),
      lat: v.number(),
      lng: v.number(),
      minPrice: v.optional(v.number()),
      workingHours: v.optional(v.string()),
      rating: v.optional(v.number()), // nilai ulasan (mis. 4.9), dari data sumber
      reviewCount: v.optional(v.number()), // jumlah ulasan warga
      imageId: v.optional(v.id("_storage")),
      imageIds: v.optional(v.array(v.id("_storage"))),
      whatsappClicks: v.optional(v.number()),
      recommendCount: v.optional(v.number()),
      isVerified: v.optional(v.boolean()),
      // Alur klaim mitra: "pending" = terdaftar/belum klaim, "confirmed" =
      // mitra sudah mengirim konfirmasi via WhatsApp, menunggu persetujuan admin.
      //
      // PENTING: field ini HANYA boleh ditulis oleh mutation admin. Sinyal
      // permintaan dari mitra/warga disimpan terpisah di `claimRequestedAt`
      // supaya pihak luar tidak bisa mengubah tampilan kartu publik.
      verificationStatus: v.optional(
        v.union(v.literal("pending"), v.literal("confirmed")),
      ),
      // Waktu (epoch ms) saat seseorang menekan "Konfirmasi via WhatsApp" /
      // "Klaim Kartu". Rate-limited; hanya memengaruhi antrean dashboard admin.
      claimRequestedAt: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
    })
      .index("by_slug", ["slug"])
      .index("by_category_id", ["categoryId"])
      .index("by_is_active", ["isActive"])
      .index("by_landmark_id", ["landmarkId"]),
  },
  {
    // Validasi skema aktif: dokumen yang tidak sesuai `defineSchema` ditolak
    // oleh database, sehingga data rusak (mis. dari mutation tanpa validasi
    // lengkap) tidak pernah masuk. Semua field opsional tetap `v.optional(...)`.
    schemaValidation: true,
  },
);

export default schema;
