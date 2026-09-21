import { PlusCircle, Store } from "lucide-react";
import { Link } from "react-router";

/**
 * Banner akuisisi mitra — wajib tampil di beranda, tepat di atas footer/bottom bar.
 * Home page tetap berfokus pada pencari jasa; banner ini hanya jalur masuk mitra.
 */
export function JoinBanner() {
  return (
    <section className="px-4 pt-2 pb-4">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Store className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug">
              Punya Usaha atau Jasa di Sumenep?
            </h2>
            <p className="mt-1 text-base leading-snug text-blue-100">
              Daftarkan usaha Anda gratis. Cukup 1 menit langsung tampil di
              pencarian warga.
            </p>
          </div>
        </div>
        <Link
          to="/daftar"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          <PlusCircle className="size-5" aria-hidden="true" />
          Daftarkan Usaha Saya Gratis
        </Link>
      </div>

      <p className="mt-6 pb-2 text-center text-sm text-gray-600">
        SumenepKerja — menghubungkan warga dengan jasa &amp; usaha lokal.
      </p>
    </section>
  );
}
