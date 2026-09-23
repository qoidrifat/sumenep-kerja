import { useEffect } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { setSeoMeta } from "@/lib/seo";

/**
 * Hyperlocal SEO: indeks seluruh kecamatan (`/kecamatan`).
 * Pintu masuk ke 27 halaman landing kecamatan — membantu Google menemukan
 * semua halaman wilayah melalui satu halaman hub.
 */
export default function DistrictsIndex() {
  const districts = useQuery(api.vendors.getDistricts);

  useEffect(() => {
    setSeoMeta({
      title: "Jasa & Usaha per Kecamatan di Sumenep | SumenepKerja",
      description:
        "Direktori jasa & usaha lokal berdasarkan kecamatan di Kabupaten Sumenep: Kota Sumenep, Kalianget, Lenteng, Batang Batang, dan 23 kecamatan lainnya.",
      path: "/kecamatan",
    });
  }, []);

  return (
    <AppShell>
      <section className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Usaha per Kecamatan
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Pilih kecamatan Anda — 27 kecamatan se-Kabupaten Sumenep.
        </p>
      </section>

      <section
        aria-label="Daftar kecamatan"
        className="px-4 pt-3 pb-4"
      >
        {districts === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {districts.map((d) => (
            <Link
              key={d.id}
              to={`/kecamatan/${d.slug}`}
              className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-gray-900">{d.name}</p>
                <p className="text-sm text-gray-600">
                  {d.count > 0 ? `${d.count} usaha & jasa` : "Belum ada mitra"}
                </p>
                {d.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
                    {d.description}
                  </p>
                )}
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-gray-500"
                aria-hidden="true"
              />
            </Link>
          ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
