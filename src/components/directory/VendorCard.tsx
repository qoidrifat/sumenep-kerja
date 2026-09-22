import { Link } from "react-router";
import { BadgeCheck, Clock, MapPin, Star, ThumbsUp } from "lucide-react";
import { createElement } from "react";
import { getCategoryIcon, getCategoryTheme } from "@/lib/category-ui";
import { formatRupiah } from "@/lib/format";
import { isWhatsAppNumber } from "@/lib/whatsapp";
import type { VendorListItem } from "@/types/vendor";
import { WhatsAppButton } from "./WhatsAppButton";
import { OpenBadge } from "./OpenBadge";

interface VendorCardProps {
  vendor: VendorListItem;
  activeLandmarkName?: string | null;
}

export function VendorCard({ vendor, activeLandmarkName }: VendorCardProps) {
  const theme = getCategoryTheme(vendor.categorySlug);

  // BUG-1 audit: ikon kategori tidak boleh di-bind ke variabel komponen
  // berhuruf besar saat render (`const CategoryIcon = ...` →
  // react-hooks/static-components + remount saat iconName berubah).
  // Fungsi kecil yang mengembalikan ELEMEN (bukan komponen) menjawab keduanya.
  const iconFor = (className: string) =>
    createElement(getCategoryIcon(vendor.categoryIcon), {
      className,
      "aria-hidden": true,
    });

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <Link
          to={`/v/${vendor.slug}`}
          aria-label={`Lihat profil ${vendor.name}`}
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br text-white shadow-sm"
        >
          {vendor.imageUrl ? (
            <img
              src={vendor.imageUrl}
              alt={`Foto ${vendor.name}`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`flex size-full items-center justify-center bg-gradient-to-br ${theme.gradient}`}
            >
              {iconFor("size-7")}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-base font-bold leading-snug text-gray-900">
              <Link to={`/v/${vendor.slug}`} className="hover:text-blue-700">
                <span className="line-clamp-2">{vendor.name}</span>
              </Link>
            </h3>
            {vendor.distanceDisplay && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                <MapPin className="size-3.5" aria-hidden="true" />
                {vendor.distanceDisplay}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-medium ${theme.chip}`}
            >
              {iconFor("size-3.5")}
              {vendor.categoryName}
            </span>
            {vendor.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Terverifikasi
              </span>
            )}
            <OpenBadge workingHours={vendor.workingHours} />
            {vendor.recommendCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700">
                <ThumbsUp className="size-3.5" aria-hidden="true" />
                {new Intl.NumberFormat("id-ID").format(vendor.recommendCount)}
              </span>
            )}
            {vendor.rating !== null && vendor.reviewCount !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700">
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                {new Intl.NumberFormat("id-ID", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(vendor.rating)}
                <span className="font-normal text-amber-700/80">
                  ({new Intl.NumberFormat("id-ID").format(vendor.reviewCount)})
                </span>
              </span>
            )}
          </div>

          <p className="mt-1.5 line-clamp-1 text-sm text-gray-600">
            {/* Hyperlocal SEO: nama kecamatan tampil di kartu (teks yang
                dirayapi Google) dan memperjelas wilayah mitra bagi warga. */}
            {vendor.districtName ? `Kec. ${vendor.districtName} · ` : ""}
            {vendor.addressText}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
        {vendor.minPrice != null && vendor.minPrice > 0 ? (
          <p className="text-sm font-semibold text-gray-900">
            Mulai {formatRupiah(vendor.minPrice)}
          </p>
        ) : (
          <p className="text-sm text-gray-600">Hubungi</p>
        )}
        {vendor.workingHours && (
          <p className="flex min-w-0 items-center gap-1 text-sm text-gray-600">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{vendor.workingHours}</span>
          </p>
        )}
      </div>

      {isWhatsAppNumber(vendor.phoneNumber) ? (
        <div className="px-4 pb-4">
          <WhatsAppButton
            vendorId={vendor.id}
            vendorName={vendor.name}
            phoneNumber={vendor.phoneNumber}
            categorySlug={vendor.categorySlug}
            landmarkName={activeLandmarkName}
          />
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium text-gray-600">
            Nomor WhatsApp belum tersedia
          </div>
        </div>
      )}
    </article>
  );
}
