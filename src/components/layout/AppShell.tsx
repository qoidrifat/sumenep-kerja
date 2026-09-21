import { Link, useLocation } from "react-router";
import { Home, LayoutGrid, PlusCircle, Sparkles } from "lucide-react";
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/90"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-3">
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

/** Kerangka halaman mobile-first: kolom maksimal lebar HP + navigasi bawah. */
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
          "mx-auto flex min-h-app w-full max-w-md flex-col bg-gray-50 shadow-sm",
          withNav && "pb-safe-nav",
        )}
      >
        <AppHeader />
        <main className="flex-1">{children}</main>
        {withNav && <BottomNav />}
      </div>
    </div>
  );
}
