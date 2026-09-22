/**
 * Nomor WhatsApp admin SumenepKerja (format internasional tanpa tanda +) —
 * NILAI FALLBACK.
 *
 * LOW-5 audit: nilai produksi di-override lewat env publik Vite
 * (VITE_ADMIN_WHATSAPP_NUMBER di .env.local / dashboard Vercel) — lihat
 * `lib/env.ts`. File ini sengaja MURNI (tanpa `import.meta`) karena juga
 * diimpor kode backend Convex (vendors.ts, admin.ts via lib/whatsapp.ts),
 * dan bundler Convex tidak mendukung `import.meta`.
 *
 * Dipakai oleh semua tombol klaim & konfirmasi verifikasi mitra:
 * - "Klaim Kartu Saya" di halaman /v/[slug]
 * - "Konfirmasi via WhatsApp" di layar sukses /daftar
 */
export const ADMIN_WHATSAPP_NUMBER = "6287869512332";
