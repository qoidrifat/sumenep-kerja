/** Status verifikasi mitra sebagaimana tampil di UI. */
export type VendorVerificationStatus = "verified" | "confirmed" | "pending" | "unclaimed";

/** Bentuk data yang dikembalikan query vendors.browse (satu kartu mitra). */
export interface VendorListItem {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  addressText: string;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string | null;
  minPrice: number | null;
  workingHours: string | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  imageUrls: string[];
  isVerified: boolean;
  verificationStatus: VendorVerificationStatus;
  whatsappClicks: number;
  recommendCount: number;
  distanceMeters: number | null;
  distanceDisplay: string | null;
}

/** Bentuk data lengkap untuk halaman kartu digital /v/[slug]. */
export interface VendorDetail extends VendorListItem {
  landmarkName: string | null;
  landmarkSlug: string | null;
}

/** Kategori + jumlah mitra aktif (untuk halaman Katalog Usaha). */
export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  iconName: string | null;
  count: number;
}
