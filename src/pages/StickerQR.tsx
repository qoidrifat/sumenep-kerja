import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import QRCode from "react-qr-code";
import { Check, Printer, QrCode, Search, Square, StickyNote } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { getCategoryIcon, getCategoryTheme } from "@/lib/category-ui";
import { isWhatsAppNumber } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { VendorListItem } from "@/types/vendor";

/** URL kartu digital dengan penanda sumber pindai sticker. */
function cardUrl(origin: string, slug: string): string {
  return `${origin}/v/${slug}?ref=sticker`;
}

/** Satu sticker siap potong: logo sponsor besar, QR, nama usaha, ajakan pindai. */
function Sticker({ vendor, origin }: { vendor: VendorListItem; origin: string }) {
  const url = cardUrl(origin, vendor.slug);
  return (
    <div className="sticker mx-auto w-[320px] rounded-2xl border-2 border-gray-900 bg-white p-5 text-center shadow-sm">
      {/* Logo sponsor besar — identitas platform pemilik sticker ini. */}
      <img
        src="/logo-header.png"
        alt="SumenepKerja.com"
        width={310}
        height={80}
        className="mx-auto h-20 w-auto"
        loading="eager"
      />
      <p className="mt-2 text-sm font-semibold text-gray-900">
        Layanan resmi kami sekarang online —
      </p>
      <div className="mt-3 flex justify-center rounded-xl border border-gray-200 bg-white p-3">
        <QRCode value={url} size={160} />
      </div>
      <p className="mt-3 text-base font-extrabold leading-snug text-gray-900">
        {vendor.name}
      </p>
      <p className="text-sm text-gray-600">{vendor.categoryName}</p>
      <div className="mt-3 rounded-xl bg-[#25D366] px-4 py-2.5 text-base font-bold text-white">
        Pindai → Chat WhatsApp Langsung
      </div>
    </div>
  );
}

export default function StickerQR() {
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get("vendor");

  const allVendors = useQuery(api.vendors.browse, { limit: 100 }) ?? [];
  // Sticker tanpa nomor WhatsApp (atau nomor darat) tidak berguna —
  // hanya mitra dengan nomor seluler valid yang masuk daftar.
  const vendors = useMemo(
    () => allVendors.filter((v) => isWhatsAppNumber(v.phoneNumber)),
    [allVendors],
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [origin, setOrigin] = useState("https://sumenepkerja.com");

  useEffect(() => {
    document.title = "QR Sticker Mitra — SumenepKerja";
    setOrigin(window.location.origin);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) || v.categoryName.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const selectedVendors = vendors.filter((v) => selected.includes(v.slug));

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handlePrint = () => {
    document.body.classList.add("print-sticker");
    const cleanup = () => document.body.classList.remove("print-sticker");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    setTimeout(cleanup, 1000);
  };

  return (
    <AppShell>
      {/* Panel kontrol — disembunyikan saat mencetak */}
      <section className="no-print px-4 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <QrCode className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              QR Sticker Mitra
            </h1>
            <p className="text-sm text-gray-600">
              Cetak sticker pindai untuk ditempel di konter usaha.
            </p>
          </div>
        </div>
      </section>

      {/* Pilih usaha */}
      <section className="no-print px-4 pt-2 pb-4" aria-label="Pilih usaha">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama usaha…"
            aria-label="Cari usaha untuk sticker"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-12 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:ring-3 focus:ring-blue-500/40 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-gray-900">
            {selected.length} dipilih
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(filtered.map((v) => v.slug))}
              className="min-h-[48px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700"
            >
              Pilih semua
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
              className="min-h-[48px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kosongkan
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-base text-gray-600">
              Tidak ada usaha yang cocok dengan pencarian.
            </p>
          ) : (
            filtered.map((vendor) => {
              const active = selected.includes(vendor.slug);
              const Icon = getCategoryIcon(vendor.categoryIcon);
              const theme = getCategoryTheme(vendor.categorySlug);
              return (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => toggle(vendor.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      theme.gradient,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-gray-900">
                      {vendor.name}
                    </span>
                    <span className="block truncate text-sm text-gray-600">
                      {vendor.categoryName}
                    </span>
                  </span>
                  {active ? (
                    <Check className="size-5 shrink-0 text-blue-600" aria-hidden="true" />
                  ) : (
                    <Square className="size-5 shrink-0 text-gray-300" aria-hidden="true" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={selectedVendors.length === 0}
          className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Printer className="size-5" aria-hidden="true" />
          Cetak {selectedVendors.length > 0 ? `${selectedVendors.length} ` : ""}Sticker
        </button>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tips: di dialog cetak, pilih ukuran kertas &amp; skala 100% agar QR tetap
          mudah dipindai.
        </p>
      </section>

      {/* Pratinjau sticker — yang ikut tercetak */}
      <section
        className="sticker-sheet space-y-6 px-4 pt-2 pb-8"
        aria-label="Pratinjau sticker"
      >
        <h2 className="no-print flex items-center gap-2 text-base font-bold text-gray-900">
          <StickyNote className="size-5 text-blue-600" aria-hidden="true" />
          Pratinjau sticker ({selectedVendors.length})
        </h2>
        {selectedVendors.length === 0 ? (
          <div className="no-print rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <p className="text-base font-semibold text-gray-900">
              Belum ada sticker dipilih
            </p>
            <p className="mt-1 text-base text-gray-600">
              Pilih usaha di daftar atas, pratinjau muncul di sini.
            </p>
          </div>
        ) : (
          selectedVendors.map((vendor) => (
            <Sticker key={vendor.id} vendor={vendor} origin={origin} />
          ))
        )}
        <p className="no-print pt-2 text-center text-sm text-gray-600">
          Butuh sticker untuk usaha lain?{" "}
          <Link to="/" className="font-semibold text-blue-700 hover:underline">
            Kembali ke katalog
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
