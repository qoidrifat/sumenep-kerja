import { useEffect } from "react";
import { Link } from "react-router";
import { Compass } from "lucide-react";

export default function NotFound() {
  useEffect(() => {
    document.title = "Halaman tidak ditemukan — SumenepKerja";
  }, []);

  return (
    <div className="flex min-h-app flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-white shadow-sm">
        <Compass className="size-10 text-blue-600" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-base text-gray-600">
        Tautan yang Anda buka salah atau sudah dipindahkan.
      </p>
      <Link
        to="/"
        className="mt-6 flex min-h-[48px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
