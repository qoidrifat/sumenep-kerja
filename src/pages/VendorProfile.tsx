import { useEffect, useState, createElement } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Eye,
  Flag,
  Hourglass,
  MapPin,
  Navigation,
  Phone,
  Share2,
  ShieldQuestion,
  Star,
  Tag,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/layout/AppShell";
import { WhatsAppButton } from "@/components/directory/WhatsAppButton";
import { RecommendButton } from "@/components/directory/RecommendButton";
import { OpenBadge } from "@/components/directory/OpenBadge";
import { getCategoryIcon, getCategoryTheme } from "@/lib/category-ui";
import { formatRupiah } from "@/lib/format";
import { ADMIN_WHATSAPP_NUMBER } from "@/lib/env";
import {
  generateClaimLink,
  generateCorrectionReportLink,
  generateShareLink,
  isWhatsAppNumber,
  sanitizePhoneNumber,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { VendorCardSkeleton } from "@/components/directory/VendorCardSkeleton";

export default function VendorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const vendor = useQuery(api.vendors.getBySlug, { slug: slug ?? "" });

  useEffect(() => {
    if (vendor) {
      document.title = `${vendor.name} — SumenepKerja`;
    }
  }, [vendor]);

  const [activePhoto, setActivePhoto] = useState(0);
  const [photoSlug, setPhotoSlug] = useState(slug);

  // Reset foto aktif saat berpindah kartu (komponen dipakai ulang per slug).
  // Penyesuaian state saat render — pola resmi React, tanpa effect berantai.
  if (photoSlug !== slug) {
    setPhotoSlug(slug);
    setActivePhoto(0);
  }

  // Galeri: imageUrls baru, fallback imageId lama untuk data lawas.
  const photos =
    vendor && vendor.imageUrls.length > 0
      ? vendor.imageUrls
      : vendor?.imageUrl
        ? [vendor.imageUrl]
        : [];
  const shownPhoto = photos[Math.min(activePhoto, photos.length - 1)];

  const hasPhone = isWhatsAppNumber(vendor?.phoneNumber);
  const telHref = vendor?.phoneNumber
    ? `tel:+${sanitizePhoneNumber(vendor.phoneNumber)}`
    : "#";

  // URL kartu untuk pesan klaim ke admin. Dibangun dari origin saat ini agar
  // tautan yang diterima admin selalu mengarah ke domain yang benar.
  const cardUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/v/${slug}`
      : "";
  const claimHref =
    vendor && cardUrl
      ? generateClaimLink({
          adminNumber: ADMIN_WHATSAPP_NUMBER,
          cardUrl,
          vendorName: vendor.name,
          phoneNumber: vendor.phoneNumber || null,
        })
      : null;
  // Halaman share /s/<slug> agar pratinjau WhatsApp memuat OG tags.
  // Fallback ke URL kartu bila env site belum disetel (mis. dev lokal).
  const convexSiteUrl = (
    import.meta.env.VITE_CONVEX_SITE_URL as string | undefined
  )?.replace(/\/$/, "");
  const sharePageUrl =
    convexSiteUrl && slug
      ? `${convexSiteUrl}/s/${encodeURIComponent(slug)}`
      : cardUrl;
  const shareHref =
    vendor && sharePageUrl
      ? generateShareLink({
          shareUrl: sharePageUrl,
          vendorName: vendor.name,
          categoryName: vendor.categoryName,
          landmarkName: vendor.landmarkName,
        })
      : null;

  if (vendor === undefined) {
    return (
      <div className="min-h-app bg-gray-200/70">
        <div className="mx-auto min-h-app w-full max-w-md bg-gray-50 shadow-sm">
          <AppHeader />
          <div className="p-4">
            <VendorCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (vendor === null) {
    return (
      <div className="min-h-app bg-gray-200/70">
        <div className="mx-auto min-h-app w-full max-w-md bg-gray-50 shadow-sm">
          <AppHeader />
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
            <Tag className="size-12 text-gray-400" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Usaha tidak ditemukan
            </h1>
            <p className="mt-2 text-base text-gray-600">
              Tautan mungkin salah atau usaha sudah tidak aktif.
            </p>
            <Link
              to="/"
              className="mt-6 flex min-h-[48px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-app bg-gray-200/70">
      <div className="mx-auto flex min-h-app w-full max-w-md flex-col bg-gray-50 shadow-sm">
        <AppHeader />
        <main className="flex-1">
          {/* Hero foto */}
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-800">
            {shownPhoto ? (
              <img
                src={shownPhoto}
                alt={`Foto ${vendor.name}`}
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="flex h-56 w-full items-center justify-center">
                <div
                  className={`flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${getCategoryTheme(vendor.categorySlug).gradient}`}
                >
                  <span className="text-4xl font-black text-white">
                    {vendor.name.charAt(0).toUpperCase()}
                    {vendor.name.split(" ")[1]?.charAt(0).toUpperCase() ?? ""}
                  </span>
                </div>
              </div>
            )}
            <Link
              to="/"
              aria-label="Kembali ke beranda"
              className="absolute top-4 left-4 flex size-12 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur hover:bg-white"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </Link>
          </div>

          {/* Pemilih foto galeri */}
          {photos.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto px-4 pt-3"
              role="group"
              aria-label="Pilih foto usaha"
            >
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setActivePhoto(index)}
                  aria-pressed={index === Math.min(activePhoto, photos.length - 1)}
                  aria-label={`Lihat foto ${index + 1} dari ${photos.length}`}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                    index === Math.min(activePhoto, photos.length - 1)
                      ? "border-blue-600 ring-2 ring-blue-500/30"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img
                    src={photo}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 px-4 pt-4">
            {/* Nama + badge */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-semibold ${getCategoryTheme(vendor.categorySlug).chip}`}
                >
                  {(() =>
                    createElement(getCategoryIcon(vendor.categoryIcon), {
                      className: "size-3.5",
                      "aria-hidden": true,
                    }))()}
                  {vendor.categoryName}
                </span>
                {vendor.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    Mitra Terverifikasi
                  </span>
                )}
                {!vendor.isVerified &&
                  vendor.verificationStatus === "confirmed" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
                      <Hourglass className="size-4" aria-hidden="true" />
                      Menunggu Konfirmasi Admin
                    </span>
                  )}
                {vendor.rating !== null && vendor.reviewCount !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
                    <Star className="size-4 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {new Intl.NumberFormat("id-ID", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }).format(vendor.rating)}
                    <span className="font-normal text-amber-700/80">
                      ({new Intl.NumberFormat("id-ID").format(vendor.reviewCount)} ulasan)
                    </span>
                  </span>
                )}
                {vendor.whatsappClicks > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {vendor.whatsappClicks} orang menghubungi
                  </span>
                )}
                <OpenBadge
                  workingHours={vendor.workingHours}
                  className="px-2.5 py-1"
                />
              </div>

              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-gray-900">
                {vendor.name}
              </h1>
              <p className="mt-2 flex items-start gap-1.5 text-base text-gray-600">
                <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {vendor.addressText}
                  {vendor.landmarkName && (
                    <span className="text-gray-500">
                      {" "}
                      · dekat {vendor.landmarkName}
                    </span>
                  )}
                </span>
              </p>
            </div>

            {/* Lokasi — peta perkiraan + rute. Koordinat selalu ada karena
                diduplikasi dari patokan landmark saat pendaftaran. */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <iframe
                title={`Peta lokasi ${vendor.name}`}
                src={`https://maps.google.com/maps?q=${vendor.lat},${vendor.lng}&z=16&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-48 w-full border-0"
              />
              <div className="p-3">
                <p className="text-sm text-gray-600">
                  Lokasi perkiraan
                  {vendor.landmarkName
                    ? ` mengikuti patokan ${vendor.landmarkName}`
                    : ""}
                  . Tanya titik pasnya lewat chat WhatsApp.
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Navigation className="size-5" aria-hidden="true" />
                  Lihat Arah ke Lokasi
                </a>
              </div>
            </div>

            {/* Harga & jam */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Tag className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Biaya mulai dari</p>
                  <p className="text-base font-bold text-gray-900">
                    {vendor.minPrice != null && vendor.minPrice > 0
                      ? formatRupiah(vendor.minPrice)
                      : "Hubungi"}
                  </p>
                </div>
              </div>
              {vendor.workingHours && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Clock className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Jam kerja</p>
                    <p className="text-base font-bold text-gray-900">
                      {vendor.workingHours}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Klaim kartu — hanya untuk mitra belum terverifikasi & belum klaim. */}
          {claimHref &&
            !vendor.isVerified &&
            vendor.verificationStatus === "pending" && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <ShieldQuestion className="size-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-gray-900">
                      Apakah Anda pemilik usaha ini?
                      </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Klaim kartu Anda untuk mendapat badge ✓ Mitra Terverifikasi.
                    </p>
                    <a
                      href={claimHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      <BadgeCheck className="size-5" aria-hidden="true" />
                      Klaim Kartu Saya
                    </a>
                  </div>
                </div>
              </section>
            )}

          {/* Rekomendasi warga — social proof satu ketukan, tanpa akun. */}
          {shareHref && (
            <section className="space-y-2 px-4" aria-label="Bagikan dan rekomendasi">
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
              >
                <Share2 className="size-5" aria-hidden="true" />
                Bagikan ke Tetangga
              </a>
              <RecommendButton
                vendorId={vendor.id}
                vendorSlug={vendor.slug}
                recommendCount={vendor.recommendCount}
              />
            </section>
          )}

          {/* Tombol aksi utama — sticky di bawah layar (halaman kartu mandiri) */}
          {hasPhone && (
            <div className="sticky bottom-0 z-20 mt-2 space-y-2 border-t border-gray-200 bg-gray-50/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
              <WhatsAppButton
                vendorId={vendor.id}
                vendorName={vendor.name}
                phoneNumber={vendor.phoneNumber}
                categorySlug={vendor.categorySlug}
                landmarkName={vendor.landmarkName}
              />
              <a
                href={telHref}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <Phone className="size-5" aria-hidden="true" />
                Simpan Nomor Telepon
              </a>
            </div>
          )}

          <div className="px-4 pt-2 pb-8 text-center">
            <p className="text-sm text-gray-600">
              Kartu digital oleh{" "}
              <Link to="/" className="font-semibold text-blue-700 hover:underline">
                SumenepKerja
              </Link>
            </p>
            <Link
              to={`/qr?vendor=${vendor.slug}`}
              className="mt-1 inline-flex min-h-[48px] items-center text-sm font-semibold text-blue-700 hover:underline"
            >
              Cetak QR sticker untuk usaha ini →
            </Link>
            <div>
              <a
                href={generateCorrectionReportLink({
                  adminNumber: ADMIN_WHATSAPP_NUMBER,
                  cardUrl,
                  vendorName: vendor.name,
                  vendorSlug: vendor.slug,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
              >
                <Flag className="size-4" aria-hidden="true" />
                Data kurang tepat? Laporkan ke admin
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
