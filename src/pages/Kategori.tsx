import { useEffect } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { getCategoryIcon, getCategoryTheme } from "@/lib/category-ui";

export default function Kategori() {
  const categories = useQuery(api.vendors.getCategoryCounts);

  useEffect(() => {
    document.title = "Katalog Usaha — SumenepKerja";
  }, []);

  return (
    <AppShell>
      <section className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Katalog Usaha
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Pilih kategori layanan yang Anda butuhkan.
        </p>
      </section>

      <section aria-label="Daftar kategori" className="space-y-3 px-4 pt-3 pb-4">
        {categories === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        ) : (
          categories.map((category) => {
            const Icon = getCategoryIcon(category.iconName);
            const theme = getCategoryTheme(category.slug);
            return (
              <Link
                key={category.id}
                to={`/?kategori=${category.slug}`}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300"
              >
                <div
                  className={`flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${theme.gradient}`}
                >
                  <Icon className="size-7" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-gray-900">
                    {category.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {category.count > 0
                      ? `${category.count} usaha & jasa`
                      : "Belum ada mitra"}
                  </p>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-gray-500"
                  aria-hidden="true"
                />
              </Link>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
