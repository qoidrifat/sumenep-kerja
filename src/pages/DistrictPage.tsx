import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { ChevronLeft, SearchX } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { VendorCard } from "@/components/directory/VendorCard";
import { VendorListSkeleton } from "@/components/directory/VendorCardSkeleton";
import { setJsonLd, setSeoMeta } from "@/lib/seo";

/**
 * Hyperlocal SEO: halaman kecamatan (`/kecamatan/<slug>`).
 *
 * Menangkap pencarian warga yang menyebut nama wilayah secara langsung:
 * "jasa katering Kalianget", "sedot wc Lenteng", "bengkel Batang Batang".
 * Setiap kecamatan punya URL mandiri dengan title, description, canonical,
 * dan JSON-LD ItemList — terdaftar otomatis di sitemap dinamis.
 */
export default function DistrictPage() {
  const { slug } = useParams<{ slug: string }>();
  const data = useQuery(api.vendors.browseByDistrict,
    slug ? { districtSlug: slug } : "skip");
  const districts = useQuery(api.vendors.getDistricts);

  const district = data?.district ?? null;
  const vendors = data?.vendors;
  const districtCount = districts?.find((d) => d.slug === slug)?.count;

  useEffect(() => {
    if (district) {
      setSeoMeta({
        title: `Jasa & Usaha Kecamatan ${district.name} — Mitra Terdekat | SumenepKerja`,
        description:
          district.description ??
          `Direktori jasa & usaha di Kecamatan ${district.name}, Sumenep: ${
            districtCount ?? vendors?.length ?? 0
          } mitra lokal — teknisi, bengkel, dan layanan rumah tangga, langsung chat WhatsApp.`,
        path: `/kecamatan/${district.slug}`,
      });

      setJsonLd(
        "district-item-list",
        vendors
          ? {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Jasa & Usaha di Kecamatan ${district.name}, Sumenep`,
              description: district.description ?? undefined,
              numberOfItems: vendors.length,
              itemListElement: vendors.map((vendor, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `https://sumenepkerja.com/v/${vendor.slug}`,
                name: vendor.name,
              })),
            }
          : null,
      );
    }
    return () => setJsonLd("district-item-list", null);
  }, [district, vendors, districtCount]);

  return (
    <AppShell>
      <section className="px-4 pt-5 pb-2">
        <Link
          to="/kategori"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Katalog Usaha
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
          {district ? `Kecamatan ${district.name}` : "Kecamatan"}
        </h1>
        <p className="mt-1 text-base text-gray-600">
          {vendors === undefined
            ? "Memuat…"
            : vendors.length > 0
              ? `${vendors.length} usaha & jasa di kecamatan ini siap dihubungi via WhatsApp.`
              : "Belum ada mitra yang terdaftar di kecamatan ini."}
        </p>
        {district?.description && (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-gray-500">
            {district.description}
          </p>
        )}
      </section>

      <section aria-label="Daftar mitra" className="space-y-3 px-4 pt-3 pb-4">
        {data === null ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <SearchX className="mx-auto size-10 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-gray-900">
              Kecamatan tidak ditemukan
            </p>
            <p className="mt-1 text-base text-gray-600">
              Periksa tautan atau pilih kecamatan dari daftar katalog.
            </p>
          </div>
        ) : vendors === undefined ? (
          <VendorListSkeleton />
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <SearchX className="mx-auto size-10 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-gray-900">
              Belum ada mitra di kecamatan ini
            </p>
            <p className="mt-1 text-base text-gray-600">
              Jika usaha Anda ada di sini, daftarkan lewat menu Daftar — gratis.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                activeLandmarkName={null}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
