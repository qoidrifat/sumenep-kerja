import { Link, useLocation } from "react-router";
import { ArrowUpRight, Home, LayoutGrid, PlusCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="SumenepKerja.com — Beranda"
      className={cn(
        "block shrink-0 rounded-xl focus-visible:ring-3 focus-visible:ring-blue-500/50 focus-visible:outline-none",
        className,
      )}
    >
      <img
        src="/logo-header.png"
        alt="SumenepKerja.com"
        width={186}
        height={48}
        className="h-[48px] w-auto"
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <BrandMark />
        {/* Navigasi utama untuk layar besar (lg+); mobile/tab pakai BottomNav. */}
        <nav
          aria-label="Navigasi utama"
          className="ml-6 hidden items-center gap-1 lg:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-base font-semibold transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-700",
                )}
              >
                <Icon className="size-5" aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* Ornamen dekoratif — mengisi ruang kosong di sisi kanan header */}
        <div className="ml-auto flex items-center" aria-hidden="true">
          <span className="flex size-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
            <Sparkles className="size-5 text-blue-600" />
          </span>
        </div>
      </div>
    </header>
  );
}

const NAV_ITEMS = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/kategori", label: "Kategori", icon: LayoutGrid },
  { to: "/daftar", label: "Pasang Jasa", icon: PlusCircle },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:hidden"
    >
      <div
        className="mx-auto grid w-full max-w-md grid-cols-3 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-sm font-semibold transition-colors",
                active
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-blue-600",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Colophon — kredit pengembang ala halaman penutup buku cetak.
 *
 * Reveal sekali saat masuk viewport: dua garis rambut menggambar dirinya dari
 * berlian kecil di tengah, lalu teks naik tipis. Hover pada nama: underline
 * tergambar + panah bergeser diagonal. Semua animasi dimatikan otomatis bila
 * pengguna memakai prefers-reduced-motion.
 */
function DeveloperCredit() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer ref={ref} className="px-4 pt-2 pb-6">
      {/* Garis kolofon: menyebar dari berlian di tengah ke kedua sisi */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span
          className={cn(
            "h-px flex-1 origin-right bg-gradient-to-l from-blue-200 to-transparent transition-transform duration-700 ease-out",
            shown ? "scale-x-100" : "scale-x-0",
            "motion-reduce:scale-x-100 motion-reduce:transition-none",
          )}
        />
        <span className="size-1.5 rotate-45 rounded-[1px] bg-blue-300" />
        <span
          className={cn(
            "h-px flex-1 origin-left bg-gradient-to-r from-blue-200 to-transparent transition-transform duration-700 ease-out",
            shown ? "scale-x-100" : "scale-x-0",
            "motion-reduce:scale-x-100 motion-reduce:transition-none",
          )}
        />
      </div>

      <p
        className={cn(
          "mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 transition-all delay-150 duration-700 ease-out",
          shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
          "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        )}
      >
        <span className="text-[10px] font-semibold tracking-[0.22em] text-gray-400 uppercase">
          Dikembangkan oleh
          </span>
        <a
          href="https://qoidrifat.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative inline-flex items-center gap-0.5 rounded-sm pb-0.5 text-xs font-semibold text-gray-600 transition-colors hover:text-blue-700",
            "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none",
          )}
        >
          Qoid Rif&apos;at
          <ArrowUpRight
            className="size-3 text-blue-500 opacity-70 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden="true"
          />
          {/* Underline tergambar dari kiri saat hover */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
          />
        </a>
      </p>
    </footer>
  );
}

/** Kerangka halaman mobile-first; melebar bertahap untuk tablet & desktop. */
export function AppShell({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <div className="min-h-app w-full overflow-x-hidden bg-gray-200/70">
      <div
        className={cn(
          "mx-auto flex min-h-app w-full flex-col bg-gray-50 shadow-sm",
          // md 768+ tablet landscape → max-w-3xl (768px)
          // lg 1024+ iPad landscape / desktop kecil → max-w-4xl (896px)
          // xl 1280+ desktop → max-w-5xl (1024px)
          // 2xl 1536+ desktop besar → max-w-6xl (1152px)
          "max-w-md md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl",
          withNav && "pb-safe-nav lg:pb-0",
        )}
      >
        <AppHeader />
        <main className="flex-1">{children}</main>
        <DeveloperCredit />
        {withNav && <BottomNav />}
      </div>
    </div>
  );
}
