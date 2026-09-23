import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { Search, SearchX, X } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { LandmarkPills } from "@/components/directory/LandmarkPills";
import { VendorCard } from "@/components/directory/VendorCard";
import { VendorListSkeleton } from "@/components/directory/VendorCardSkeleton";
import { InstallBanner } from "@/components/directory/InstallBanner";
import { JoinBanner } from "@/components/directory/JoinBanner";
import { setSeoMeta } from "@/lib/seo";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Deployment baru (dev/produksi) otomatis terisi dataset penuh sekali saja;
  // bila sudah ada isi (termasuk mitra baru dari /daftar), tidak ada yang diubah.
  const ensureSeed = useMutation(api.vendors.ensureSeedData);
  useEffect(() => {
    ensureSeed({}).catch(() => {});
  }, [ensureSeed]);

  // Patokan & kategori aktif tersimpan di URL agar bisa dibagikan.
  const landmarkParam = searchParams.get("patokan");
  const categoryParam = searchParams.get("kategori");
  const activeLandmarkSlug =
    landmarkParam && landmarkParam.trim() ? landmarkParam : null;
  const activeCategorySlug =
    categoryParam && categoryParam.trim() ? categoryParam : null;

  const [searchInput, setSearchInput] = useState("");

  const landmarks = useQuery(api.directory.listLandmarks) ?? [];
  const categories = useQuery(api.vendors.getCategoryCounts) ?? [];
  const vendors = useQuery(api.vendors.browse, {
    search: searchInput.trim() ? searchInput.trim() : undefined,
    landmarkSlug: activeLandmarkSlug ?? undefined,
    categorySlug: activeCategorySlug ?? undefined,
  });

  const activeLandmark = landmarks.find((l) => l.slug === activeLandmarkSlug);

  useEffect(() => {
    setSeoMeta({
      title: "SumenepKerja — Jasa & Usaha Lokal Sumenep",
      description:
        "Direktori jasa & usaha lokal Sumenep. Temukan teknisi, bengkel, dan layanan rumah tangga terdekat, langsung chat WhatsApp.",
      path: "/",
    });
  }, []);

  const setParam = (key: "patokan" | "kategori", value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
    window.scrollTo({ top: 0 });
  };

  return (
    <AppShell>
      {/* Hero + pencarian */}
      <section className="bg-gradient-to-b from-blue-600 to-blue-700 px-4 pt-5 pb-6 text-white">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">
          Cari jasa terdekat, langsung chat WhatsApp
        </h1>
        <p className="mt-1 text-base text-blue-100">
          Teknisi, hajatan, kuliner, angkut — sekitar patokan lokasi Anda.
        </p>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            inputMode="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari bengkel, katering, pikap…"
            aria-label="Cari jasa atau usaha"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white py-3 pr-12 pl-12 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:ring-3 focus:ring-blue-500/40 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Hapus kata kunci"
              className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* Filter patokan lokal */}
      <section
        aria-label="Filter patokan lokasi"
        className="overflow-x-clip bg-white pt-3 pb-3 shadow-sm"
      >
        <div className="px-4 pb-2">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Pilih Patokan Lokasi
          </h2>
        </div>
        <LandmarkPills
          landmarks={landmarks}
          activeSlug={activeLandmarkSlug}
          onSelect={(slug) => setParam("patokan", slug)}
        />
      </section>

      {/* Chip kategori cepat */}
      <section
        aria-label="Kategori layanan"
        className="border-b border-gray-200 bg-white px-4 pt-1 pb-3"
      >
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
          <button
            type="button"
            onClick={() => setParam("kategori", null)}
            aria-pressed={activeCategorySlug === null}
            className={cn(
              "flex min-h-[48px] shrink-0 items-center rounded-full border px-4 text-base font-medium transition-colors",
              activeCategorySlug === null
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400",
            )}
          >
            Semua
          </button>
          {categories.map((category) => {
            const active = activeCategorySlug === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setParam("kategori", category.slug)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-base font-medium transition-colors",
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400",
                )}
              >
                {category.name}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-sm",
                    active ? "bg-white/20" : "bg-gray-100",
                  )}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daftar mitra — grid di tablet & desktop, single-column di HP. */}
      <section aria-label="Daftar mitra" className="px-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">
            {activeLandmark ? `Sekitar ${activeLandmark.name}` : "Katalog Usaha"}
          </h2>
          {vendors !== undefined && (
            <span className="text-sm text-gray-600">{vendors.length} mitra</span>
          )}
        </div>

        {vendors === undefined ? (
          <VendorListSkeleton />
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <SearchX className="mx-auto size-10 text-gray-400" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-gray-900">
              Belum ada jasa di sekitar sini
            </p>
            <p className="mt-1 text-base text-gray-600">
              Coba pilih patokan lain atau hapus kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                activeLandmarkName={activeLandmark?.name ?? null}
              />
            ))}
          </div>
        )}
      </section>

      <InstallBanner />
      <JoinBanner />
    </AppShell>
  );
}
