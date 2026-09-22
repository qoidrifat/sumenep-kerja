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
 * Halaman kategori per-slug (`/kategori/<slug>`).
 *
 * SEO hyperlocal: setiap kategori punya URL mandiri dengan title,
 * description, canonical, dan JSON-LD ItemList berisi mitranya —
 * sehingga Google bisa mengindeks "jasa servis AC di Sumenep" dst.
 * per halaman, bukan menumpuk semua kata kunci di beranda.
 * URL-nya terdaftar di sitemap dinamis (convex/seo.ts).
 */
export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const categories = useQuery(api.vendors.getCategoryCounts);
  const vendors = useQuery(api.vendors.browse, {
    categorySlug: slug ?? undefined,
  });

  const category = categories?.find((c) => c.slug === slug);

  useEffect(() => {
    if (category) {
      setSeoMeta({
        title: `${category.name} di Sumenep — Daftar Mitra | SumenepKerja`,
        description: `Temukan ${category.name.toLowerCase()} di Sumenep: ${category.count} usaha & jasa lokal terverifikasi, langsung chat WhatsApp tanpa perlu instal aplikasi.`,
        path: `/kategori/${category.slug}`,
      });

      // JSON-LD ItemList: daftar mitra dalam kategori sebagai entitas terstruktur.
      setJsonLd(
        "category-item-list",
        vendors
          ? {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${category.name} di Sumenep`,
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
    return () => setJsonLd("category-item-list", null);
  }, [category, vendors]);

  return (
    <AppShell>
      <section className="px-4 pt-5 pb-2">
        <Link
          to="/kategori"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Semua Kategori
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
          {category ? category.name : "Kategori"}
        </h1>
        <p className="mt-1 text-base text-gray-600">
          {category === undefined
            ? "Memuat…"
            : category.count > 0
              ? `${category.count} usaha & jasa siap dihubungi via WhatsApp.`
              : "Belum ada mitra di kategori ini."}
        </p>
      </section>

      <section aria-label="Daftar mitra" className="space-y-3 px-4 pt-3 pb-4">
        {vendors === undefined ? (
          <VendorListSkeleton />
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <SearchX
              className="mx-auto size-10 text-gray-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-semibold text-gray-900">
              Belum ada mitra di kategori ini
            </p>
            <p className="mt-1 text-base text-gray-600">
              Coba jelajahi kategori lain atau pilih patokan lokasi di beranda.
            </p>
          </div>
        ) : (
          vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              activeLandmarkName={null}
            />
          ))
        )}
      </section>
    </AppShell>
  );
}
