/**
 * Tipe kategori yang didukung untuk personalisasi pesan WhatsApp
 */
import { ADMIN_WHATSAPP_NUMBER } from "./config";

export type ServiceCategoryType =
  | "servis-teknik"
  | "hajatan-acara"
  | "kuliner"
  | "transportasi"
  | "umum";

export interface WhatsAppLinkParams {
  /** Nomor telepon vendor (contoh: "0812-3456-7890", "+6281234567890", atau "6281234567890") */
  phoneNumber: string;
  /** Nama vendor atau teknisi */
  vendorName: string;
  /** Kategori layanan untuk menentukan template pesan */
  categorySlug?: ServiceCategoryType | string;
  /** Nama patokan landmark aktif (contoh: "Dekat Taman Bunga", "Jl. Trunojoyo") */
  landmarkName?: string;
  /** Kebutuhan spesifik/kendala/menu (opsional, misal: "Pompa air mati", "Bebek bumbu hitam") */
  itemOrIssue?: string;
}

/**
 * Membersihkan format nomor telepon ke format standar WhatsApp internasional (E.164 tanpa tanda +)
 * Contoh: "0812-3456-7890" -> "6281234567890"
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return "";

  // Hapus semua karakter selain angka
  let cleaned = phone.replace(/\D/g, "");

  // Ubah awalan 0 menjadi 62 (kode negara Indonesia)
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  // Jika pengguna langsung memasukkan 812xxx tanpa 0 atau 62
  else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

/**
 * True bila nomor layak dipakai WhatsApp (seluler Indonesia: 62-8xx…).
 * Nomor darat/kantor (mis. "(0328) 664843", "(021) 57959817") menghasilkan
 * tautan wa.me rusak — harus diperlakukan seperti "tanpa nomor WA" di UI.
 */
export function isWhatsAppNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const sanitized = sanitizePhoneNumber(phone);
  return sanitized.startsWith("62") && sanitized.length >= 11 && sanitized[2] === "8";
}

/**
 * Menghasilkan URL WhatsApp dinamis dengan draf pesan otomatis ramah mitra usia 30+
 */
export function generateWhatsAppLink({
  phoneNumber,
  vendorName,
  categorySlug = "umum",
  landmarkName,
  itemOrIssue,
}: WhatsAppLinkParams): string {
  const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
  if (!sanitizedNumber) return "#";

  const locationText = landmarkName ? `area ${landmarkName}` : "wilayah Sumenep";
  let message = "";

  switch (categorySlug) {
    case "servis-teknik": {
      const issue = itemOrIssue || "Peralatan/fasilitas";
      message =
        `Halo Pak/Cak ${vendorName}, saya menemukan kontak Anda di SumenepKerja.\n\n` +
        `${issue} saya di rumah (${locationText}) butuh perbaikan.\n\n` +
        `Apakah hari ini ada jadwal luang untuk pengecekan ke lokasi? Terima kasih.`;
      break;
    }

    case "hajatan-acara": {
      const eventNeed = itemOrIssue || "layanan hajatan";
      message =
        `Halo ${vendorName}, saya lihat profil usaha Anda di SumenepKerja.\n\n` +
        `Mau menanyakan ketersediaan tanggal dan daftar harga (${eventNeed}) untuk acara di ${locationText}.\n\n` +
        `Apakah masih ada slot kosong yang bisa dibooking? Terima kasih.`;
      break;
    }

    case "kuliner": {
      const menu = itemOrIssue ? `menu ${itemOrIssue}` : "makanan/minuman";
      message =
        `Halo ${vendorName}, saya mau pesan ${menu} lewat katalog SumenepKerja.\n\n` +
        `Apakah hari ini masih ada porsi/stok tersedia? Terima kasih!`;
      break;
    }

    case "transportasi": {
      message =
        `Halo Pak/Cak ${vendorName}, saya menemukan kontak Anda di SumenepKerja.\n\n` +
        `Mau menanyakan ketersediaan jasa angkut/pikap untuk rute sekitar ${locationText}.\n\n` +
        `Apakah unitnya sedang luang hari ini?`;
      break;
    }

    case "umum":
    default: {
      message =
        `Halo ${vendorName}, saya menemukan kontak usaha Anda di SumenepKerja.\n\n` +
        `Apakah layanan Anda untuk ${locationText} saat ini sedang buka dan aktif? Terima kasih.`;
      break;
    }
  }

  return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Membuat tautan wa.me ke ADMIN dengan pesan siap-kirim untuk alur klaim /
 * konfirmasi verifikasi mitra. Pesan dikirim dari WhatsApp milik mitra
 * sendiri, sehingga pengiriman itu sekaligus membuktikan kepemilikan nomor.
 */
function generateAdminVerificationLink(params: {
  cardUrl: string;
  vendorName: string;
  phoneNumber?: string | null;
  intro: string;
}): string {
  const ownerLine = params.phoneNumber
    ? `Nomor WhatsApp saya: ${sanitizePhoneNumber(params.phoneNumber)}\n\n`
    : "";
  const message =
    `Halo Admin SumenepKerja,\n\n` +
    `${params.intro}\n\n` +
    `Kartu digital: ${params.cardUrl}\n\n` +
    ownerLine +
    `Terima kasih.`;

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Tautan "Laporkan Error ke Admin" — template profesional yang tersinkron
 * dengan keadaan error: waktu, URL halaman, tahap, pesan error asli, dan
 * ringkasan form yang sudah diisi warga agar admin bisa menindaklanjuti
 * tanpa bertanya ulang.
 */
export function generateAdminErrorReportLink(params: {
  errorMessage: string;
  pageUrl?: string | null;
  stage?: string;
  formLines?: string[];
}): string {
  const when = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const lines = [
    "*LAPORAN ERROR — SumenepKerja*",
    "",
    "Yth. Admin SumenepKerja, saya mengalami kendala dan mohon bantuan.",
    "",
    `Waktu: ${when}`,
    `Halaman: ${params.pageUrl ?? "-"}`,
    `Tahap: ${params.stage ?? "-"}`,
    "",
    "Pesan error:",
    params.errorMessage,
  ];
  if (params.formLines && params.formLines.length > 0) {
    lines.push("", "Data yang sudah saya isi:", ...params.formLines);
  }
  lines.push("", "Terima kasih.");

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/**
 * Tautan "Bagikan ke Tetangga" — warga menyebar kartu usaha lewat WhatsApp.
 * Tanpa nomor tujuan (`wa.me/?text=`) sehingga WhatsApp membuka pemilih
 * kontak/grup milik pengirim sendiri.
 *
 * `shareUrl` adalah halaman share `/s/<slug>` (bukan `/v/<slug>` langsung)
 * agar crawler WhatsApp membaca OG tags (judul + foto usaha) untuk pratinjau
 * link. Manusia yang membuka link tersebut otomatis diarahkan ke kartu.
 */
export function generateShareLink(params: {
  shareUrl: string;
  vendorName: string;
  categoryName?: string | null;
  landmarkName?: string | null;
}): string {
  const place = params.landmarkName
    ? ` dekat ${params.landmarkName}`
    : " di Sumenep";
  const category = params.categoryName ? ` (${params.categoryName})` : "";
  const message =
    `Halo, saya menemukan "${params.vendorName}"${category}${place} di SumenepKerja.\n\n` +
    `Lihat kartunya di sini:\n${params.shareUrl}\n\n` +
    `Barangkali butuh jasanya. Terima kasih.`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Tautan "Laporkan data salah" — warga mengoreksi kartu mitra lewat WhatsApp
 * admin. Pesan terisi otomatis (nama usaha, slug, link kartu); warga tinggal
 * melanjutkan mengetik masalah yang ditemukan di bawahnya.
 */
export function generateCorrectionReportLink(params: {
  cardUrl: string;
  vendorName: string;
  vendorSlug: string;
}): string {
  const message =
    `*KOREKSI DATA — SumenepKerja*\n\n` +
    `Yth. Admin SumenepKerja, saya menemukan data yang kurang tepat:\n\n` +
    `Usaha: ${params.vendorName}\n` +
    `Slug: ${params.vendorSlug}\n` +
    `Kartu: ${params.cardUrl}\n\n` +
    `Masalah yang saya temukan:\n` +
    `(tulis di sini, contoh: nomor tidak aktif / alamat pindah / sudah tutup)\n\n` +
    `Terima kasih.`;

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Tautan "Klaim Kartu Saya" — untuk mitra yang kartunya sudah terdaftar
 * (misalnya dari data direktori) dan ingin mengambil alih kartunya.
 */
export function generateClaimLink(params: {
  cardUrl: string;
  vendorName: string;
  phoneNumber?: string | null;
}): string {
  return generateAdminVerificationLink({
    ...params,
    intro: `Saya pemilik usaha "${params.vendorName}" dan ingin MENGKLAIM kartu digital saya di SumenepKerja.`,
  });
}

/**
 * Tautan "Konfirmasi via WhatsApp" — untuk mitra yang baru mendaftar mandiri
 * lewat /daftar dan ingin mempercepat verifikasi badge ✓ Terverifikasi.
 */
export function generateVerificationConfirmLink(params: {
  cardUrl: string;
  vendorName: string;
  phoneNumber?: string | null;
}): string {
  return generateAdminVerificationLink({
    ...params,
    intro: `Saya baru saja mendaftarkan usaha "${params.vendorName}" dan ingin KONFIRMASI verifikasi nomor WhatsApp ini.`,
  });
}
