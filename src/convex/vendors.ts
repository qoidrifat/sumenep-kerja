import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { sanitizePhoneNumber } from "../lib/whatsapp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Jarak haversine (meter) antara dua titik koordinat. */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "850 m" di bawah 1 km, "2,4 km" di atasnya (format Indonesia). */
export function formatDistance(meters: number): string {
  if (meters < 50) return "< 50 m";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(km)} km`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * URL galeri foto: gabung `imageIds` baru + `imageId` lama (tanpa duplikat,
 * maksimal 3). Data lama yang hanya punya `imageId` tetap tampil.
 */
async function resolveGalleryUrls(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  imageId: Id<"_storage"> | undefined,
  imageIds: Id<"_storage">[] | undefined,
): Promise<string[]> {
  const ids = [...(imageIds ?? []), ...(imageId ? [imageId] : [])]
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .slice(0, 3);
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((url): url is string => url !== null);
}

// ---------------------------------------------------------------------------
// SEED: kategori, patokan lokasi, dan mitra (dataset Google Maps, Sep 2026)
// ---------------------------------------------------------------------------

const SEED_CATEGORIES = [
  { name: "Servis & Teknik", slug: "servis-teknik", iconName: "Wrench", sortOrder: 1 },
  { name: "Bengkel Kendaraan", slug: "bengkel-kendaraan", iconName: "Car", sortOrder: 2 },
  { name: "Toko Elektronik & Komputer", slug: "toko-elektronik", iconName: "Cpu", sortOrder: 3 },
  { name: "Toko & Servis HP", slug: "toko-hp", iconName: "Smartphone", sortOrder: 4 },
  { name: "Listrik & Pembangkit", slug: "listrik-pembangkit", iconName: "Zap", sortOrder: 5 },
  { name: "Pendingin (AC & Kulkas)", slug: "pendingin", iconName: "Snowflake", sortOrder: 6 },
  { name: "Telekomunikasi & Kurir", slug: "telekomunikasi-kurir", iconName: "Signal", sortOrder: 7 },
  { name: "Rumah Tangga & Kunci", slug: "rumah-tangga-kunci", iconName: "KeyRound", sortOrder: 8 },
  { name: "Layanan Lainnya", slug: "umum", iconName: "MoreHorizontal", sortOrder: 9 },
];

const SEED_LANDMARKS = [
  {
    name: "Dekat Taman Bunga (Adipura)",
    slug: "taman-adipura",
    description: "Pusat alun-alun kota dan sentra kuliner malam",
    lat: -7.0069,
    lng: 113.8617,
  },
  {
    name: "Sekitar Jl. Trunojoyo",
    slug: "jl-trunojoyo",
    description: "Koridor utama pertokoan, bengkel, dan perkantoran",
    lat: -7.0105,
    lng: 113.858,
  },
  {
    name: "Dekat Pasar Anom Baru",
    slug: "pasar-anom",
    description: "Sentra perdagangan grosir, logistik, dan jasa angkut",
    lat: -7.0135,
    lng: 113.855,
  },
  {
    name: "Area Keraton / Labang Mesem",
    slug: "area-keraton",
    description: "Pusat cagar budaya, butik batik, dan oleh-oleh khas",
    lat: -7.0047,
    lng: 113.8652,
  },
  {
    name: "Dekat Masjid Jamik",
    slug: "masjid-jamik",
    description: "Area religi, busana muslim, dan perlengkapan hajatan",
    lat: -7.0075,
    lng: 113.8601,
  },
];

type SeedVendor = {
  categorySlug: string;
  landmarkSlug: string;
  name: string;
  slug: string;
  /** E.164 tanpa tanda +; string kosong bila sumber tidak punya nomor HP. */
  phoneNumber: string;
  addressText: string;
  /** Koordinat asli dari data sumber (Google Maps). */
  lat: number;
  lng: number;
  minPrice?: number;
  workingHours?: string;
  rating?: number;
  reviewCount?: number;
  isVerified: boolean;
};

const SEED_VENDORS: SeedVendor[] = [
  {
    categorySlug: "pendingin",
    landmarkSlug: "jl-trunojoyo",
    name: "CV Calista Mega Teknik (AC Specialist)",
    slug: "cv-calista-mega-teknik-ac-specialist",
    phoneNumber: "628212312303",
    addressText: "Jl. Teuku Umar No.48",
    lat: -7.0046808,
    lng: 113.8516727,
    workingHours: "Tutup pukul 16.30",
    rating: 5.0,
    reviewCount: 6,
    isVerified: true,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Berkah Jaya Teknik",
    slug: "berkah-jaya-teknik",
    phoneNumber: "6287776758428",
    addressText: "Jl. Lumba Lumba No.2",
    lat: -7.0186249,
    lng: 113.8569714,
    workingHours: "Tutup pukul 17.00",
    rating: 4.3,
    reviewCount: 6,
    isVerified: false,
  },
  {
    categorySlug: "toko-hp",
    landmarkSlug: "jl-trunojoyo",
    name: "VCORE Service Laptop dan HP Sumenep",
    slug: "vcore-service-laptop-dan-hp-sumenep",
    phoneNumber: "62819850222",
    addressText: "Jalan KH Zainal Arifin, Sumenep, Jawa Timur 69414",
    lat: -7.0094964,
    lng: 113.8533408,
    workingHours: "Tutup pukul 21.00",
    rating: 4.9,
    reviewCount: 647,
    isVerified: true,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "taman-adipura",
    name: "Yasinta Teknik",
    slug: "yasinta-teknik",
    phoneNumber: "6282330602970",
    addressText: "Jl. Seludang No.25",
    lat: -7.0122449,
    lng: 113.8612771,
    workingHours: "Tutup pukul 16.00",
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Jufry Service AC Sumenep - Pamekasan. Mandiri Elektronik AC",
    slug: "jufry-service-ac-sumenep-mandiri-elektronik",
    phoneNumber: "6285259150191",
    addressText: "Area Pamekasan - melayani Sumenep & sekitarnya",
    lat: -7.0821552,
    lng: 113.8229508,
    workingHours: "Buka 24 jam",
    rating: 5.0,
    reviewCount: 62,
    isVerified: true,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "taman-adipura",
    name: "Sumenep Technical Support",
    slug: "sumenep-technical-support",
    phoneNumber: "6283165860968",
    addressText: "Sumenep (jasa panggilan)",
    lat: -7.036775,
    lng: 113.7985717,
    workingHours: "Tutup pukul 17.00",
    isVerified: false,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "taman-adipura",
    name: "SB Tehnik",
    slug: "sb-tehnik",
    phoneNumber: "6281917729075",
    addressText: "XVW2+M74, Jl. Garuda",
    lat: -7.0147394,
    lng: 113.8597405,
    workingHours: "Tutup pukul 22.00",
    rating: 5.0,
    reviewCount: 3,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "area-keraton",
    name: "Servis Kulkas dan AC Taufik",
    slug: "servis-kulkas-dan-ac-taufik",
    phoneNumber: "6281803233458",
    addressText: "Jl. Pendekar No.21",
    lat: -7.0041504,
    lng: 113.8639982,
    workingHours: "Tutup pukul 21.00",
    rating: 5.0,
    reviewCount: 3,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "TRIFAS TEKNIK",
    slug: "trifas-teknik",
    phoneNumber: "",
    addressText: "Jalan Mawar No.10, RT.4 RW.7",
    lat: -7.099236,
    lng: 113.8118423,
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "taman-adipura",
    name: "Teknisi Kompor Gas Sumenep SERVIS PANGGILAN",
    slug: "teknisi-kompor-gas-sumenep-servis-panggilan",
    phoneNumber: "6287761365447",
    addressText: "Perum (layanan panggilan ke rumah)",
    lat: -7.0075545,
    lng: 113.8295756,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 5,
    isVerified: false,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "jl-trunojoyo",
    name: "AW Tech Comp",
    slug: "aw-tech-comp",
    phoneNumber: "6287884536983",
    addressText: "Jl. Berlian RUKO",
    lat: -7.0065942,
    lng: 113.8575025,
    workingHours: "Tutup pukul 21.30",
    rating: 5.0,
    reviewCount: 17,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "taman-adipura",
    name: "Khanza Teknik Mesin Pendingin",
    slug: "khanza-teknik-mesin-pendingin",
    phoneNumber: "6285707084939",
    addressText: "Jl. Raya Gapura, RT.09/RW.04",
    lat: -6.9988629,
    lng: 113.8942143,
    workingHours: "Tutup pukul 15.00",
    rating: 5.0,
    reviewCount: 4,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "taman-adipura",
    name: "Putri Mobil Service Station",
    slug: "putri-mobil-service-station",
    phoneNumber: "628179315860",
    addressText: "Jl. Jokotole",
    lat: -7.0123484,
    lng: 113.8445534,
    workingHours: "Tutup pukul 16.30",
    rating: 4.9,
    reviewCount: 46,
    isVerified: true,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "jl-trunojoyo",
    name: "AW Tech",
    slug: "aw-tech",
    phoneNumber: "6287884536983",
    addressText: "Jl. Belimbing Gg. I No.6",
    lat: -7.0065175,
    lng: 113.8527965,
    workingHours: "Tutup pukul 21.00",
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "taman-adipura",
    name: "Roni Servis Pompa Air",
    slug: "roni-servis-pompa-air",
    phoneNumber: "6281935124020",
    addressText: "2RFP+4R7 (panggilan ke rumah)",
    lat: -6.9772019,
    lng: 113.8370473,
    workingHours: "Tutup pukul 21.00",
    rating: 5.0,
    reviewCount: 2,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Service AC Mobil IPUNG AC",
    slug: "service-ac-mobil-ipung-ac",
    phoneNumber: "6287750192728",
    addressText: "Jl. Raya Adirasa",
    lat: -7.0191809,
    lng: 113.8623507,
    workingHours: "Tutup pukul 16.00",
    rating: 4.8,
    reviewCount: 36,
    isVerified: true,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "pasar-anom",
    name: "NADA TEKNIK SUMENEP",
    slug: "nada-teknik-sumenep",
    phoneNumber: "6281999978782",
    addressText: "2297+CV7 (panggilan)",
    lat: -6.9811864,
    lng: 114.0147936,
    workingHours: "Buka 24 jam",
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "taman-adipura",
    name: "Mitra Setia Agung. CV (Dealer Honda)",
    slug: "mitra-setia-agung-cv-dealer-honda",
    phoneNumber: "6282143316414",
    addressText: "Jl. DR. Cipto No.2",
    lat: -7.0142207,
    lng: 113.859085,
    workingHours: "Tutup pukul 16.30",
    rating: 4.9,
    reviewCount: 1393,
    isVerified: true,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "area-keraton",
    name: "ULTRACOM SUMENEP",
    slug: "ultracom-sumenep",
    phoneNumber: "6287842220008",
    addressText: "Jl. Imam Bonjol No.27",
    lat: -7.0003078,
    lng: 113.8692962,
    workingHours: "Tutup pukul 21.00",
    rating: 5.0,
    reviewCount: 560,
    isVerified: true,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "jl-trunojoyo",
    name: "Bengkel Mobil Hari Motor",
    slug: "bengkel-mobil-hari-motor",
    phoneNumber: "",
    addressText: "Jl. KH. Wahid Hasyim / area Jl. Trunojoyo",
    lat: -7.007535,
    lng: 113.8532794,
    workingHours: "Tutup pukul 16.00",
    rating: 4.4,
    reviewCount: 92,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Tukang Service Kipas",
    slug: "tukang-service-kipas",
    phoneNumber: "",
    addressText: "Layanan panggilan (kipas & listrik rumah)",
    lat: -7.0467578,
    lng: 113.7528703,
    workingHours: "Buka 24 jam",
    isVerified: false,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "taman-adipura",
    name: "JAYA BAROKAH TEKNIK",
    slug: "jaya-barokah-teknik",
    phoneNumber: "6287752687168",
    addressText: "2V26+H8J",
    lat: -6.9985381,
    lng: 113.8607604,
    workingHours: "Buka Sabtu pukul 00.00",
    rating: 5.0,
    reviewCount: 2,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "area-keraton",
    name: "BOSS AC SUMENEP",
    slug: "boss-ac-sumenep",
    phoneNumber: "6282266497735",
    addressText: "XVQC+7XF, Jl. Kiyai H. Mansyur",
    lat: -7.0117714,
    lng: 113.8723785,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 62,
    isVerified: true,
  },
  {
    categorySlug: "toko-hp",
    landmarkSlug: "pasar-anom",
    name: "PROTECH iPhone & Android Repair",
    slug: "protech-iphone-android-repair",
    phoneNumber: "6282221533958",
    addressText: "Perumahan Bumi Sumekar Asri Kav.3, Jl. Raya Adirasa No.20",
    lat: -7.0189363,
    lng: 113.8610407,
    workingHours: "Tutup pukul 22.00",
    rating: 4.9,
    reviewCount: 36,
    isVerified: false,
  },
  {
    categorySlug: "toko-hp",
    landmarkSlug: "jl-trunojoyo",
    name: "35 Cell Sumenep Sparepart & Servis HP",
    slug: "35-cell-sumenep-sparepart-servis-hp",
    phoneNumber: "6282264781251",
    addressText: "Jl. Teuku Umar No.15",
    lat: -7.0052585,
    lng: 113.8535711,
    workingHours: "Tutup pukul 21.00",
    rating: 3.3,
    reviewCount: 19,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "DOKTER KULKAS",
    slug: "dokter-kulkas",
    phoneNumber: "6285331644844",
    addressText: "Jl (melayani panggilan ke rumah)",
    lat: -6.8905524,
    lng: 113.6550216,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 111,
    isVerified: true,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "area-keraton",
    name: "ASATU SOLUSINDO",
    slug: "asatu-solusindo",
    phoneNumber: "6287850305020",
    addressText: "Jl. Kh Mansyur No.16",
    lat: -7.0047569,
    lng: 113.8676629,
    workingHours: "Tutup pukul 16.30",
    rating: 4.9,
    reviewCount: 98,
    isVerified: true,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "area-keraton",
    name: "Cahaya Tehnik Servis Mesin Cuci dan Kulkas",
    slug: "cahaya-tehnik-servis-mesin-cuci-kulkas",
    phoneNumber: "",
    addressText: "XVX7+2MC, Jl. Kartini Jl. Akasia Gg. II",
    lat: -7.0024223,
    lng: 113.864251,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "jl-trunojoyo",
    name: "Putra Abadi. UD",
    slug: "putra-abadi-ud",
    phoneNumber: "",
    addressText: "Jl. KH. Wahid Hasyim / area Jl. Trunojoyo",
    lat: -7.0116753,
    lng: 113.8531917,
    workingHours: "Tutup pukul 18.00",
    rating: 3.9,
    reviewCount: 86,
    isVerified: false,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "pasar-anom",
    name: "CESTINDO (CCTV Store Madura) - Toko Komputer Gaming",
    slug: "cestindo-cctv-store-madura-toko-komputer-gaming",
    phoneNumber: "6287782898389",
    addressText: "Area Jl. Trunojoyo / KH. Wahid Hasyim",
    lat: -7.0125844,
    lng: 113.8579488,
    workingHours: "Tutup pukul 17.00",
    rating: 4.3,
    reviewCount: 35,
    isVerified: false,
  },
  {
    categorySlug: "umum",
    landmarkSlug: "jl-trunojoyo",
    name: "PT Synvora Teknologi Indonesia",
    slug: "pt-synvora-teknologi-indonesia",
    phoneNumber: "6281233107475",
    addressText: "Jl. Diponegoro No.109 B",
    lat: -7.00628,
    lng: 113.8563035,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "area-keraton",
    name: "i-ONE High Technology",
    slug: "i-one-high-technology",
    phoneNumber: "6285904347090",
    addressText: "XVV7+5QH, Jl. HOS Cokroaminoto",
    lat: -7.0070697,
    lng: 113.8644893,
    workingHours: "Tutup pukul 22.00",
    rating: 2.3,
    reviewCount: 3,
    isVerified: false,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "pasar-anom",
    name: "Toko IbuCOMP",
    slug: "toko-ibucomp",
    phoneNumber: "6281939031984",
    addressText: "Jl. KH. Wahid Hasyim No.7",
    lat: -7.0128899,
    lng: 113.8564992,
    workingHours: "Tutup pukul 17.00",
    rating: 4.3,
    reviewCount: 103,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "jl-trunojoyo",
    name: "N1 Autopro",
    slug: "n1-autopro",
    phoneNumber: "6281385600888",
    addressText: "Jl. Trunojoyo 300, depan Pengadilan Agama Kelas 1A",
    lat: -7.0336993,
    lng: 113.8509225,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 13,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "pasar-anom",
    name: "Sepeda Listrik Sumenep",
    slug: "sepeda-listrik-sumenep",
    phoneNumber: "6281939033383",
    addressText: "Jl. Trunojoyo No.43",
    lat: -7.0186472,
    lng: 113.8572867,
    workingHours: "Tutup pukul 16.00",
    rating: 5.0,
    reviewCount: 265,
    isVerified: true,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Santoso AC Mobil",
    slug: "santoso-ac-mobil",
    phoneNumber: "6285203508026",
    addressText: "XVQ4+56W, Jl. KH. Wahid Hasyim",
    lat: -7.0120121,
    lng: 113.855586,
    workingHours: "Tutup Selasa pukul 04.30",
    rating: 4.8,
    reviewCount: 5,
    isVerified: false,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "jl-trunojoyo",
    name: "Cellluler",
    slug: "cellluler",
    phoneNumber: "6285339110175",
    addressText: "Jl. Teuku Umar No.9",
    lat: -7.005523,
    lng: 113.8538306,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "pasar-anom",
    name: "Madura Indah Motor",
    slug: "madura-indah-motor",
    phoneNumber: "0328664843",
    addressText: "Jl. KH. Wahid Hasyim",
    lat: -7.0118346,
    lng: 113.8551805,
    workingHours: "Tutup pukul 16.30",
    rating: 4.0,
    reviewCount: 22,
    isVerified: false,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "taman-adipura",
    name: "Service Kompor Gas",
    slug: "service-kompor-gas",
    phoneNumber: "6285791532813",
    addressText: "2V29+8GW",
    lat: -6.9991268,
    lng: 113.8688218,
    workingHours: "Tutup pukul 16.00",
    rating: 4.9,
    reviewCount: 8,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "TRIFAS TEKNIK BUNGBUNGAN",
    slug: "trifas-teknik-bungbungan",
    phoneNumber: "",
    addressText: "WR26+9J2 (Bungbungan)",
    lat: -7.0991149,
    lng: 113.8115302,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "jl-trunojoyo",
    name: "My Bengkel Sumenep",
    slug: "my-bengkel-sumenep",
    phoneNumber: "",
    addressText: "Jl. Arya Wiraraja",
    lat: -7.028006,
    lng: 113.856082,
    workingHours: "Tutup pukul 18.00",
    rating: 4.9,
    reviewCount: 12,
    isVerified: false,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "pasar-anom",
    name: "Service Elektronik & Warung",
    slug: "service-elektronik-warung",
    phoneNumber: "",
    addressText: "Jl. Simpatiga Pamenyaan, Beluk Raja, Dasuk",
    lat: -6.8969783,
    lng: 113.7849232,
    workingHours: "Buka 24 jam",
    rating: 4.4,
    reviewCount: 8,
    isVerified: false,
  },
  {
    categorySlug: "telekomunikasi-kurir",
    landmarkSlug: "pasar-anom",
    name: "XL Center Sumenep (XL-Axis Center)",
    slug: "xl-center-sumenep-xl-axis-center",
    phoneNumber: "02157959817",
    addressText: "Jl. Trunojoyo No.214",
    lat: -7.01691,
    lng: 113.8576044,
    workingHours: "Tutup pukul 15.30",
    rating: 4.3,
    reviewCount: 312,
    isVerified: true,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "pasar-anom",
    name: "BAROKAH 25 ELECTRONIK",
    slug: "barokah-25-electronik",
    phoneNumber: "6285940795056",
    addressText: "Jalan Yayasan Darul Ulum Angsanah",
    lat: -7.0314801,
    lng: 113.7520992,
    workingHours: "Tutup pukul 17.00",
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "pasar-anom",
    name: "Dealer Yamaha Mandiri Motor Sumenep",
    slug: "dealer-yamaha-mandiri-motor-sumenep",
    phoneNumber: "6282244138999",
    addressText: "Jl. Trunojoyo No.57",
    lat: -7.0153254,
    lng: 113.858386,
    workingHours: "Tutup pukul 16.30",
    rating: 4.6,
    reviewCount: 105,
    isVerified: true,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "pasar-anom",
    name: "Agung Tehnik",
    slug: "agung-tehnik",
    phoneNumber: "628175098884",
    addressText: "Layanan panggilan 24 jam",
    lat: -6.9273143,
    lng: 113.7396946,
    workingHours: "Buka 24 jam",
    rating: 4.3,
    reviewCount: 3,
    isVerified: false,
  },
  {
    categorySlug: "toko-hp",
    landmarkSlug: "taman-adipura",
    name: "Zphonestore Sumenep",
    slug: "zphonestore-sumenep",
    phoneNumber: "6285731529533",
    addressText: "Jl. Halim Perdana Kusuma No.65b",
    lat: -7.0027326,
    lng: 113.8608201,
    workingHours: "Tutup pukul 22.00",
    rating: 5.0,
    reviewCount: 458,
    isVerified: true,
  },
  {
    categorySlug: "telekomunikasi-kurir",
    landmarkSlug: "pasar-anom",
    name: "GraPARI Telkomsel Sumenep",
    slug: "grapari-telkomsel-sumenep",
    phoneNumber: "6282141936667",
    addressText: "Area Jl. Trunojoyo",
    lat: -7.0172898,
    lng: 113.8575823,
    workingHours: "Tutup pukul 17.00",
    rating: 4.2,
    reviewCount: 285,
    isVerified: true,
  },
  {
    categorySlug: "toko-elektronik",
    landmarkSlug: "taman-adipura",
    name: "Inti Computer Sumenep",
    slug: "inti-computer-sumenep",
    phoneNumber: "6287812455554",
    addressText: "KPRI Kokon",
    lat: -6.951557,
    lng: 113.8717712,
    workingHours: "Tutup pukul 17.00",
    rating: 5.0,
    reviewCount: 35,
    isVerified: false,
  },
  {
    categorySlug: "bengkel-kendaraan",
    landmarkSlug: "jl-trunojoyo",
    name: "Sinar Baru Sumenep - AHASS 05290",
    slug: "sinar-baru-sumenep-ahass-05290",
    phoneNumber: "6285234703940",
    addressText: "Jl. Trunojoyo No.290B",
    lat: -7.0268581,
    lng: 113.8542047,
    workingHours: "Istirahat 12.00, buka kembali 13.00",
    rating: 4.9,
    reviewCount: 4755,
    isVerified: true,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Trifas Teknik (Bungbungan)",
    slug: "trifas-teknik-bungbungan-2",
    phoneNumber: "",
    addressText: "WR36+JWX (Bungbungan)",
    lat: -7.0958852,
    lng: 113.8123678,
    isVerified: false,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "pasar-anom",
    name: "Mukammal Teknisi",
    slug: "mukammal-teknisi",
    phoneNumber: "",
    addressText: "2WPV+F2 (panggilan)",
    lat: -6.9638023,
    lng: 113.942617,
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "umum",
    landmarkSlug: "pasar-anom",
    name: "Naavagreen Natural Skincare Sumenep",
    slug: "naavagreen-natural-skincare-sumenep",
    phoneNumber: "628112924921",
    addressText: "Jl. Trunojoyo No.43",
    lat: -7.018632,
    lng: 113.8574143,
    workingHours: "Tutup pukul 19.00",
    rating: 4.8,
    reviewCount: 204,
    isVerified: true,
  },
  {
    categorySlug: "rumah-tangga-kunci",
    landmarkSlug: "pasar-anom",
    name: "Kadi Ahli Kunci",
    slug: "kadi-ahli-kunci",
    phoneNumber: "6282301652307",
    addressText: "XQ8H+FMM",
    lat: -7.0338096,
    lng: 113.7791785,
    workingHours: "Tutup pukul 21.00",
    rating: 5.0,
    reviewCount: 7,
    isVerified: false,
  },
  {
    categorySlug: "telekomunikasi-kurir",
    landmarkSlug: "area-keraton",
    name: "SiCepat Ekspres Sumenep Kolor",
    slug: "sicepat-ekspres-sumenep-kolor",
    phoneNumber: "02130205050",
    addressText: "Area Jl. Kolor, Kota Sumenep",
    lat: -7.0154095,
    lng: 113.8667825,
    workingHours: "Tutup pukul 17.00",
    rating: 1.5,
    reviewCount: 303,
    isVerified: false,
  },
  {
    categorySlug: "pendingin",
    landmarkSlug: "pasar-anom",
    name: "Al-Ghifary Service AC Sumenep",
    slug: "al-ghifary-service-ac-sumenep",
    phoneNumber: "6285231040164",
    addressText: "Jl. Pesona Satelit Blok P8",
    lat: -7.0227644,
    lng: 113.8697004,
    rating: 5.0,
    reviewCount: 10,
    isVerified: false,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "pasar-anom",
    name: "TMK PRO AE",
    slug: "tmk-pro-ae",
    phoneNumber: "6287868756898",
    addressText: "3PM9+2W (panggilan)",
    lat: -6.9174663,
    lng: 113.7198003,
    workingHours: "Buka 24 jam",
    rating: 5.0,
    reviewCount: 1,
    isVerified: false,
  },
  {
    categorySlug: "umum",
    landmarkSlug: "taman-adipura",
    name: "KPU Kabupaten Sumenep",
    slug: "kpu-kabupaten-sumenep",
    phoneNumber: "6285704335499",
    addressText: "Area Kota Sumenep",
    lat: -7.001373,
    lng: 113.847087,
    workingHours: "Buka 24 jam",
    rating: 4.6,
    reviewCount: 69,
    isVerified: false,
  },
  {
    categorySlug: "umum",
    landmarkSlug: "jl-trunojoyo",
    name: "BPJS Ketenagakerjaan Sumenep",
    slug: "bpjs-ketenagakerjaan-sumenep",
    phoneNumber: "03286761051",
    addressText: "Jl. Arya Wiraraja No.39",
    lat: -7.0283611,
    lng: 113.8576352,
    workingHours: "Tutup pukul 17.00",
    rating: 4.7,
    reviewCount: 297,
    isVerified: false,
  },
  {
    categorySlug: "listrik-pembangkit",
    landmarkSlug: "taman-adipura",
    name: "AGEN PLN MOBILE SUMENEP",
    slug: "agen-pln-mobile-sumenep",
    phoneNumber: "628133013110",
    addressText: "Jl. Raya Gapura No.124",
    lat: -7.0003417,
    lng: 113.8901897,
    workingHours: "Tutup pukul 23.00",
    rating: 5.0,
    reviewCount: 3,
    isVerified: false,
  },
];

// ---------------------------------------------------------------------------
// SEED runner: isi dataset penuh secara idempotent (upsert per slug).
// ---------------------------------------------------------------------------

/**
 * Isi seluruh dataset (kategori, patokan, mitra). Aman dipanggil berkali-kali:
 * baris yang slug-nya sudah ada dilewati, jadi tidak pernah duplikat.
 */
async function upsertSeedData(ctx: MutationCtx) {
  const categoryIds = new Map<string, Id<"categories">>();
  for (const c of SEED_CATEGORIES) {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", c.slug))
      .unique();
    categoryIds.set(
      c.slug,
      existing ? existing._id : await ctx.db.insert("categories", c),
    );
  }

  const landmarkIds = new Map<string, Id<"landmarks">>();
  for (const l of SEED_LANDMARKS) {
    const existing = await ctx.db
      .query("landmarks")
      .withIndex("by_slug", (q) => q.eq("slug", l.slug))
      .unique();
    if (existing) {
      landmarkIds.set(l.slug, existing._id);
    } else {
      landmarkIds.set(l.slug, await ctx.db.insert("landmarks", l));
    }
  }

  for (const s of SEED_VENDORS) {
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", s.slug))
      .unique();
    if (existing) continue;
    await ctx.db.insert("vendors", {
      categoryId: categoryIds.get(s.categorySlug)!,
      landmarkId: landmarkIds.get(s.landmarkSlug),
      name: s.name,
      slug: s.slug,
      phoneNumber: s.phoneNumber,
      addressText: s.addressText,
      // Koordinat asli dari data sumber (Google Maps).
      lat: s.lat,
      lng: s.lng,
      minPrice: s.minPrice,
      workingHours: s.workingHours,
      rating: s.rating,
      reviewCount: s.reviewCount,
      whatsappClicks: 0,
      isVerified: s.isVerified,
      // isVerified=true (data sumber) = verified; sisanya "pending".
      verificationStatus: s.isVerified ? undefined : ("pending" as const),
      isActive: true,
    });
  }
}

/** Penggantian data penuh: semua vendor & kategori lama dihapus, lalu diisi ulang. */
export const replaceAllSeedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const vendor of await ctx.db.query("vendors").collect()) {
      await ctx.db.delete(vendor._id);
    }
    for (const category of await ctx.db.query("categories").collect()) {
      await ctx.db.delete(category._id);
    }
    await upsertSeedData(ctx);
  },
});

/**
 * Bootstrap otomatis: bila direktori masih kosong (deployment baru), isi dengan
 * dataset lengkap. Bila sudah ada isi — termasuk mitra baru dari /daftar —
 * tidak ada data yang disentuh. Dipanggil otomatis dari Beranda.
 */
export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const anyVendor = await ctx.db.query("vendors").first();
    if (anyVendor) return { seeded: false as const };
    await upsertSeedData(ctx);
    return { seeded: true as const };
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Katalog utama: cari mitra aktif, opsional difilter patokan lokasi + kategori +
 * kata kunci. Ketika patokan dipilih, hasil diurutkan berdasarkan jarak terdekat.
 */
export const browse = query({
  args: {
    search: v.optional(v.string()),
    landmarkSlug: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 100);

    const [allVendors, allCategories, landmarks] = await Promise.all([
      ctx.db.query("vendors").collect(),
      ctx.db.query("categories").collect(),
      args.landmarkSlug
        ? ctx.db
            .query("landmarks")
            .withIndex("by_slug", (q) => q.eq("slug", args.landmarkSlug!))
            .unique()
        : Promise.resolve(null),
    ]);

    const categoriesById = new Map(allCategories.map((c) => [c._id, c]));
    const searchLower = args.search?.trim().toLowerCase();

    let items = allVendors
      .filter((v) => v.isActive !== false)
      .map((vendor) => {
        const category = categoriesById.get(vendor.categoryId);
        return { vendor, category };
      })
      .filter(({ category }) => category !== undefined)
      .filter(({ vendor, category }) => {
        if (args.categorySlug && category!.slug !== args.categorySlug) return false;
        if (searchLower) {
          const haystack =
            `${vendor.name} ${vendor.addressText} ${category!.name}`.toLowerCase();
          if (!haystack.includes(searchLower)) return false;
        }
        return true;
      });

    // Urutkan: dekat patokan dulu -> paling sering dihubungi -> terbaru
    items = items.sort((a, b) => {
      if (landmarks) {
        const da = haversineMeters(landmarks.lat, landmarks.lng, a.vendor.lat, a.vendor.lng);
        const db = haversineMeters(landmarks.lat, landmarks.lng, b.vendor.lat, b.vendor.lng);
        return da - db;
      }
      const ca = a.vendor.whatsappClicks ?? 0;
      const cb = b.vendor.whatsappClicks ?? 0;
      if (ca !== cb) return cb - ca;
      return b.vendor._creationTime - a.vendor._creationTime;
    });

    const results = await Promise.all(
      items.slice(0, limit).map(async ({ vendor, category }) => {
        const distanceMeters = landmarks
          ? haversineMeters(landmarks.lat, landmarks.lng, vendor.lat, vendor.lng)
          : null;
        return {
          id: vendor._id,
          name: vendor.name,
          slug: vendor.slug,
          phoneNumber: vendor.phoneNumber,
          addressText: vendor.addressText,
          categoryName: category!.name,
          categorySlug: category!.slug,
          categoryIcon: category!.iconName ?? null,
          minPrice: vendor.minPrice ?? null,
          workingHours: vendor.workingHours ?? null,
          rating: vendor.rating ?? null,
          reviewCount: vendor.reviewCount ?? null,
          imageUrl: vendor.imageId ? await ctx.storage.getUrl(vendor.imageId) : null,
          imageUrls: await resolveGalleryUrls(ctx, vendor.imageId, vendor.imageIds),
          isVerified: vendor.isVerified === true,
          verificationStatus:
            vendor.verificationStatus ??
            (vendor.isVerified === true ? ("verified" as const) : ("pending" as const)),
          whatsappClicks: vendor.whatsappClicks ?? 0,
          recommendCount: vendor.recommendCount ?? 0,
          distanceMeters,
          distanceDisplay: distanceMeters !== null ? formatDistance(distanceMeters) : null,
        };
      }),
    );

    return results;
  },
});

/** Detail satu mitra berdasarkan slug, untuk halaman kartu digital /v/[slug]. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!vendor || vendor.isActive === false) return null;

    const category = await ctx.db.get(vendor.categoryId);
    const landmark = vendor.landmarkId ? await ctx.db.get(vendor.landmarkId) : null;

    return {
      id: vendor._id,
      name: vendor.name,
      slug: vendor.slug,
      phoneNumber: vendor.phoneNumber,
      addressText: vendor.addressText,
      categoryName: category?.name ?? "Layanan Umum",
      categorySlug: category?.slug ?? "umum",
      categoryIcon: category?.iconName ?? null,
      minPrice: vendor.minPrice ?? null,
      workingHours: vendor.workingHours ?? null,
      rating: vendor.rating ?? null,
      reviewCount: vendor.reviewCount ?? null,
      imageUrl: vendor.imageId ? await ctx.storage.getUrl(vendor.imageId) : null,
      imageUrls: await resolveGalleryUrls(ctx, vendor.imageId, vendor.imageIds),
      isVerified: vendor.isVerified === true,
      verificationStatus:
        vendor.verificationStatus ??
        (vendor.isVerified === true ? ("verified" as const) : ("pending" as const)),
      whatsappClicks: vendor.whatsappClicks ?? 0,
      recommendCount: vendor.recommendCount ?? 0,
      distanceMeters: null,
      distanceDisplay: null,
      landmarkName: landmark?.name ?? null,
      landmarkSlug: landmark?.slug ?? null,
    };
  },
});

/** Jumlah mitra aktif per kategori (untuk Katalog Usaha). */
export const getCategoryCounts = query({
  args: {},
  handler: async (ctx) => {
    const [categories, vendors] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("vendors").collect(),
    ]);
    const counts = new Map<string, number>();
    for (const vendor of vendors) {
      if (vendor.isActive === false) continue;
      const category = categories.find((c) => c._id === vendor.categoryId);
      if (category) counts.set(category.slug, (counts.get(category.slug) ?? 0) + 1);
    }
    return categories
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((c) => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        iconName: c.iconName ?? null,
        count: counts.get(c.slug) ?? 0,
      }));
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Argumen pendaftaran mandiri mitra (tanpa login). */
const registerArgs = {
  name: v.string(),
  categorySlug: v.string(),
  phoneNumber: v.string(),
  landmarkSlug: v.string(),
  addressText: v.string(),
  minPrice: v.optional(v.number()),
  workingHours: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  imageStorageIds: v.optional(v.array(v.id("_storage"))),
  // GPS opsional dari perangkat; bila tidak ada, koordinat patokan dipakai.
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
};

/**
 * Pendaftaran usaha mandiri.
 *
 * PENTING: koordinat GPS mentah dari warga usia 30+ tidak andal — bila argumen
 * lat/lng tidak tersedia, koordinat vendor diduplikasi otomatis dari patokan
 * landmark yang dipilih. Ini menjamin `lat`/`lng` tidak pernah kosong.
 */
export const registerVendor = mutation({
  args: registerArgs,
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 3) throw new Error("Nama usaha minimal 3 karakter.");
    if (args.addressText.trim().length < 5) {
      throw new Error("Alamat lengkap wajib diisi.");
    }

    const phone = sanitizePhoneNumber(args.phoneNumber);
    if (phone.length < 10 || phone.length > 15 || !phone.startsWith("62")) {
      throw new Error("Nomor WhatsApp tidak valid. Contoh: 081234567890");
    }

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();
    if (!category) throw new Error("Kategori layanan tidak ditemukan.");

    const landmark = await ctx.db
      .query("landmarks")
      .withIndex("by_slug", (q) => q.eq("slug", args.landmarkSlug))
      .unique();
    if (!landmark) throw new Error("Patokan lokasi wajib dipilih.");

    // Slug unik otomatis dari nama usaha. Bila bentrok, tambahkan stempel
    // waktu + acak agar kolom slug (unik & wajib) tidak pernah bentrok.
    let slug = slugify(name) || "usaha";
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}-${Math.random()
        .toString(36)
        .slice(2, 4)}`;
    }

    // Galeri: maksimal 3 foto @5MB (dibatasi di klien, dijaga juga di sini).
    const imageIds = args.imageStorageIds ?? [];
    if (imageIds.length > 3) {
      throw new Error("Maksimal 3 foto.");
    }
    const legacyIds = args.imageStorageId ? [args.imageStorageId] : [];
    const allImageIds = [...legacyIds, ...imageIds].slice(0, 3);

    const vendorId = await ctx.db.insert("vendors", {
      categoryId: category._id,
      landmarkId: landmark._id,
      name,
      slug,
      phoneNumber: phone,
      addressText: args.addressText.trim(),
      // GPS mentah bila valid; selain itu duplikasi otomatis dari patokan.
      lat: typeof args.lat === "number" && typeof args.lng === "number" ? args.lat : landmark.lat,
      lng: typeof args.lat === "number" && typeof args.lng === "number" ? args.lng : landmark.lng,
      minPrice: args.minPrice,
      workingHours: args.workingHours?.trim() || undefined,
      imageId: allImageIds[0],
      imageIds: allImageIds.length > 0 ? allImageIds : undefined,
      whatsappClicks: 0,
      recommendCount: 0,
      isVerified: false,
      verificationStatus: "pending" as const,
      isActive: true,
    });

    return { vendorId, slug };
  },
});

/**
 * Mitra menandai konfirmasi verifikasi dari sisi klien (misalnya setelah
 * menekan "Konfirmasi via WhatsApp" di layar sukses /daftar atau "Klaim Kartu
 * Saya" di /v/[slug]). Status berubah "pending" -> "confirmed" sehingga UI
 * menampilkan "⏳ Menunggu Konfirmasi". Admin kemudian memeriksa pesan
 * WhatsApp yang masuk lalu menyetujui lewat mutation internal.
 */
export const markVerificationConfirmed = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!vendor) throw new Error("Mitra tidak ditemukan.");

    // Sudah disetujui admin — tidak ada yang perlu diubah.
    if (vendor.isVerified === true) {
      return { verificationStatus: "verified" as const };
    }

    await ctx.db.patch(vendor._id, { verificationStatus: "confirmed" });
    return { verificationStatus: "confirmed" as const };
  },
});

/**
 * [Admin] Menyetujui verifikasi mitra setelah memeriksa pesan WhatsApp.
 * Dijalankan lewat CLI: `bun convex run vendors:approveVerification '{"slug":"..."}'`
 * atau perubahan massal: `{"slug":"...","all":true}` menyetujui semua "confirmed".
 */
export const approveVerification = internalMutation({
  args: { slug: v.optional(v.string()), all: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.all) {
      const pending = await ctx.db
        .query("vendors")
        .filter((q) => q.eq(q.field("verificationStatus"), "confirmed"))
        .collect();
      for (const vendor of pending) {
        await ctx.db.patch(vendor._id, {
          isVerified: true,
          // Status "verified" direpresentasikan oleh isVerified=true.
          verificationStatus: undefined,
        });
      }
      return { approved: pending.length };
    }

    if (!args.slug) throw new Error("Slug wajib diisi, atau gunakan all: true.");
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
      .unique();
    if (!vendor) throw new Error("Mitra tidak ditemukan.");
    await ctx.db.patch(vendor._id, {
      isVerified: true,
      // Status "verified" direpresentasikan oleh isVerified=true.
      verificationStatus: undefined,
    });
    return { approved: 1 };
  },
});

/**
 * Rekomendasi warga — satu ketukan "jempol" per perangkat (dijaga
 * localStorage di klien, tanpa akun). Kegagalan ditelan diam-diam.
 */
export const recommendVendor = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return;
    await ctx.db.patch(args.vendorId, {
      recommendCount: (vendor.recommendCount ?? 0) + 1,
    });
  },
});

/**
 * Pelacak klik WhatsApp — dipanggil non-blocking setiap tombol hijau ditekan.
 * Dipakai untuk ringkasan engagement bulanan mitra.
 */
export const incrementWhatsAppClick = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return;
    await ctx.db.patch(args.vendorId, {
      whatsappClicks: (vendor.whatsappClicks ?? 0) + 1,
    });
  },
});
