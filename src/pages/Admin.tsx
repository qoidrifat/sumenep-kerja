import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Hourglass,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Power,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bentuk baris dari admin.getDashboardData (mirror of backend shape). */
interface AdminVendorRow {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  addressText: string;
  categoryName: string;
  categorySlug: string;
  landmarkName: string | null;
  minPrice: number | null;
  workingHours: string | null;
  rating: number | null;
  reviewCount: number | null;
  isVerified: boolean;
  verificationStatus: "pending" | "confirmed" | null;
  claimRequestedAt: number | null;
  whatsappClicks: number;
  isActive: boolean;
  hasImage: boolean;
  createdAt: number;
}

type AdminStats = {
  total: number;
  verified: number;
  pending: number;
  confirmed: number;
  inactive: number;
  noPhone: number;
  totalClicks: number;
};

/** Status verifikasi → chip Warm Brutalism + label Indonesia. */
function StatusChip({ vendor }: { vendor: AdminVendorRow }) {
  if (!vendor.isActive) {
    return (
      <span className="adm-chip adm-chip-inactive inline-flex items-center gap-1 px-2 py-1 text-sm font-bold">
        <Power className="size-3.5" aria-hidden="true" />
        Nonaktif
      </span>
    );
  }
  if (vendor.isVerified) {
    return (
      <span className="adm-chip adm-chip-verified inline-flex items-center gap-1 px-2 py-1 text-sm font-bold">
        <BadgeCheck className="size-4" aria-hidden="true" />
        Terverifikasi
      </span>
    );
  }
  if (vendor.verificationStatus === "confirmed") {
    return (
      <span className="adm-chip adm-chip-confirmed inline-flex items-center gap-1 px-2 py-1 text-sm font-bold">
        <Hourglass className="size-4" aria-hidden="true" />
        Menunggu Konfirmasi
      </span>
    );
  }
  return (
    <span className="adm-chip adm-chip-pending inline-flex items-center gap-1 px-2 py-1 text-sm font-bold">
      <Clock className="size-4" aria-hidden="true" />
      Belum Klaim
    </span>
  );
}

/** Form inline edit satu baris mitra. */
function EditForm({
  vendor,
  sessionToken,
  onDone,
}: {
  vendor: AdminVendorRow;
  sessionToken: string;
  onDone: () => void;
}) {
  const updateVendor = useMutation(api.admin.updateVendor);
  const [name, setName] = useState(vendor.name);
  const [phone, setPhone] = useState(vendor.phoneNumber);
  const [addressText, setAddressText] = useState(vendor.addressText);
  const [minPrice, setMinPrice] = useState(
    vendor.minPrice ? String(vendor.minPrice) : "",
  );
  const [workingHours, setWorkingHours] = useState(vendor.workingHours ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateVendor({
        sessionToken,
        vendorId: vendor.id as never,
        name,
        phoneNumber: phone,
        addressText,
        minPrice: minPrice ? Number(minPrice) : undefined,
        workingHours: workingHours || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "adm-input min-h-[48px] w-full px-3 py-2.5 text-base shadow-none placeholder:text-gray-500 focus:outline-none";

  return (
    <div className="adm-panel-flat mt-3 space-y-3 p-3">
      {error && (
        <p role="alert" className="text-base font-bold text-red-700">
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor={`edit-nama-${vendor.id}`}
          className="mb-1 block text-sm font-semibold text-gray-900"
        >
          Nama Usaha
        </label>
        <input
          id={`edit-nama-${vendor.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label
          htmlFor={`edit-wa-${vendor.id}`}
          className="mb-1 block text-sm font-semibold text-gray-900"
        >
          Nomor WhatsApp
        </label>
        <input
          id={`edit-wa-${vendor.id}`}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
          className={inputCls}
        />
      </div>
      <div>
        <label
          htmlFor={`edit-alamat-${vendor.id}`}
          className="mb-1 block text-sm font-semibold text-gray-900"
        >
          Alamat
        </label>
        <textarea
          id={`edit-alamat-${vendor.id}`}
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          rows={2}
          className={cn(inputCls, "min-h-[64px]")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`edit-harga-${vendor.id}`}
            className="mb-1 block text-sm font-semibold text-gray-900"
          >
            Biaya Mulai (Rp)
          </label>
          <input
            id={`edit-harga-${vendor.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor={`edit-jam-${vendor.id}`}
            className="mb-1 block text-sm font-semibold text-gray-900"
          >
            Jam Kerja
          </label>
          <input
            id={`edit-jam-${vendor.id}`}
            type="text"
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            placeholder="Tutup pukul 17.00"
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="adm-btn adm-btn-primary flex min-h-[48px] flex-1 items-center justify-center gap-2 px-4 py-3 text-base font-extrabold disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          Simpan
        </button>
        <button
          type="button"
          onClick={onDone}
          className="adm-btn adm-btn-ghost flex min-h-[48px] items-center justify-center px-4 py-3 text-base font-bold"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/** Satu baris mitra (kartu expandable) di dashboard. */
function VendorRow({
  vendor,
  sessionToken,
}: {
  vendor: AdminVendorRow;
  sessionToken: string;
}) {
  const approve = useMutation(api.admin.approveVendor);
  const reject = useMutation(api.admin.rejectVerification);
  const setActive = useMutation(api.admin.setVendorActive);
  const remove = useMutation(api.admin.deleteVendor);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusyAction(label);
    setActionError(null);
    try {
      await fn();
      setConfirmDelete(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const btnBase =
    "adm-btn flex min-h-[48px] flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60";

  // Nomor sudah E.164 (62…) — tautan wa.me untuk validasi cepat sebelum setujui.
  const waCheckHref = vendor.phoneNumber
    ? `https://wa.me/${vendor.phoneNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="adm-panel p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-extrabold">
            {vendor.name}
          </span>
          <span className="mt-0.5 block truncate text-sm font-medium text-[#525252]">
            {vendor.categoryName}
            {vendor.landmarkName ? ` · ${vendor.landmarkName}` : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusChip vendor={vendor} />
        {vendor.phoneNumber ? (
          <span className="adm-chip adm-chip-clicks inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold">
            <Phone className="size-3.5" aria-hidden="true" />
            {vendor.phoneNumber}
          </span>
        ) : (
          <span className="adm-chip adm-chip-nophone inline-flex items-center gap-1 px-2 py-1 text-sm font-extrabold">
            Tanpa Nomor
          </span>
        )}
        {vendor.whatsappClicks > 0 && (
          <span className="adm-chip adm-chip-clicks inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold">
            <Eye className="size-3.5" aria-hidden="true" />
            {vendor.whatsappClicks} klik
          </span>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
          {actionError}
        </p>
      )}

      {expanded && (
        <div className="mt-3 border-t-2 border-[#121212] pt-3">
          <p className="text-sm font-medium text-[#525252]">
            {vendor.addressText}
            {vendor.minPrice != null && vendor.minPrice > 0
              ? ` · mulai ${formatRupiah(vendor.minPrice)}`
              : ""}
            {vendor.workingHours ? ` · ${vendor.workingHours}` : ""}
          </p>
          <p className="mt-1 text-sm font-semibold">/v/{vendor.slug}</p>

          {editing ? (
            <EditForm
              vendor={vendor}
              sessionToken={sessionToken}
              onDone={() => setEditing(false)}
            />
          ) : (
            <div className="mt-3 space-y-2">
              {confirmDelete ? (
                <div className="adm-panel-flat border-red-700 bg-red-50 p-3">
                  <p className="text-base font-extrabold text-red-800">
                    Hapus "{vendor.name}" permanen?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        run("delete", () =>
                          remove({ sessionToken, vendorId: vendor.id as never }),
                        )
                      }
                      disabled={busyAction !== null}
                      className={cn(btnBase, "bg-red-600 text-white")}
                    >
                      {busyAction === "delete" ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-4" aria-hidden="true" />
                      )}
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className={cn(btnBase, "adm-btn-ghost")}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {!vendor.isVerified && (
                    <button
                      type="button"
                      onClick={() =>
                        run("approve", () =>
                          approve({ sessionToken, vendorId: vendor.id as never }),
                        )
                      }
                      disabled={busyAction !== null}
                      className={cn(btnBase, "adm-btn-primary")}
                    >
                      {busyAction === "approve" ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="size-4" aria-hidden="true" />
                      )}
                      Setujui Verifikasi
                    </button>
                  )}
                  {vendor.verificationStatus === "confirmed" && (
                    <button
                      type="button"
                      onClick={() =>
                        run("reject", () =>
                          reject({ sessionToken, vendorId: vendor.id as never }),
                        )
                      }
                      disabled={busyAction !== null}
                      className={cn(
                        btnBase,
                        "adm-btn-ghost hover:bg-[#f3d3c3] hover:text-[#8a2e1b]",
                      )}
                    >
                      <X className="size-4" aria-hidden="true" />
                      Tolak
                    </button>
                  )}
                  {waCheckHref && (
                    <a
                      href={waCheckHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Cek WhatsApp ${vendor.name}`}
                      className={cn(btnBase, "adm-btn-dark flex-none px-4")}
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Cek WA
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      run("toggle", () =>
                        setActive({
                          sessionToken,
                          vendorId: vendor.id as never,
                          isActive: !vendor.isActive,
                        }),
                      )
                    }
                    disabled={busyAction !== null}
                    className={cn(
                      btnBase,
                      vendor.isActive ? "adm-btn-ghost" : "adm-btn-dark",
                    )}
                  >
                    {busyAction === "toggle" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Power className="size-4" aria-hidden="true" />
                    )}
                    {vendor.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className={cn(btnBase, "adm-btn-ghost")}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className={cn(
                      btnBase,
                      "adm-btn-ghost text-red-700 hover:bg-red-50",
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [passcodeInput, setPasscodeInput] = useState("");
  // Token sesi dari admin.loginAdmin — passphrase TIDAK disimpan di klien dan
  // TIDAK dikirim ulang pada setiap panggilan (CRIT-3 audit).
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [search, setSearch] = useState("");

  const loginAdmin = useMutation(api.admin.loginAdmin);
  const logoutAdmin = useMutation(api.admin.logoutAdmin);

  const data = useQuery(
    api.admin.getDashboardData,
    sessionToken ? { sessionToken } : "skip",
  );

  // Sesi kedaluwarsa → kembali ke layar login otomatis. `now` dihitung via
  // useState lazy (pola React yang benar untuk nilai waktu) — bukan Date.now()
  // langsung di body render, yang melanggar aturan purity react-hooks.
  const [now] = useState(() => Date.now());
  const sessionValid =
    sessionToken !== null &&
    (sessionExpiresAt === null || sessionExpiresAt > now);

  // Derivasi status konsisten dengan backend: vendor lama tanpa field
  // verificationStatus tetap terhitung "Belum Klaim".
  const stats: AdminStats | null = useMemo(() => {
    if (!data) return null;
    const v = data.vendors;
    return {
      total: v.length,
      verified: v.filter((x) => x.isVerified).length,
      confirmed: v.filter(
        (x) => !x.isVerified && x.verificationStatus === "confirmed",
      ).length,
      pending: v.filter(
        (x) => !x.isVerified && x.verificationStatus !== "confirmed",
      ).length,
      inactive: v.filter((x) => !x.isActive).length,
      noPhone: v.filter((x) => !x.phoneNumber).length,
      totalClicks: v.reduce((s, x) => s + x.whatsappClicks, 0),
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let list = data.vendors;
    if (filter === "confirmed") {
      list = list.filter(
        (x) => !x.isVerified && x.verificationStatus === "confirmed",
      );
    } else if (filter === "pending") {
      list = list.filter(
        (x) => !x.isVerified && x.verificationStatus !== "confirmed",
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.phoneNumber.includes(q) ||
          x.categoryName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      // Passphrase dikirim sekali di sini; responsnya berisi token sesi
      // 256-bit. Passphrase tidak pernah disimpan di klien.
      const result = await loginAdmin({ passcode: passcodeInput });
      setSessionToken(result.token);
      setSessionExpiresAt(result.expiresAt);
      setPasscodeInput("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    // Cabut sesi di server, lalu buang token dari memori.
    if (sessionToken) {
      void logoutAdmin({ sessionToken }).catch(() => {});
    }
    setSessionToken(null);
    setSessionExpiresAt(null);
  };

  const inputCls =
    "adm-input min-h-[48px] w-full px-4 py-3 text-base shadow-none placeholder:text-gray-500 focus:outline-none";

  // ---------------- Login ----------------
  if (!sessionValid) {
    return (
      <div className="admin-workspace min-h-app bg-[#faf7ee]">
        <div className="mx-auto flex min-h-app w-full flex-col justify-center px-4 py-10 max-w-md md:max-w-md lg:max-w-lg">
          <div className="adm-panel p-6">
            <div className="flex items-center justify-center">
              <div className="adm-btn flex size-14 items-center justify-center bg-[#ff5a26]">
                <ShieldAlert className="size-7" aria-hidden="true" />
              </div>
            </div>
            <h1 className="mt-4 text-center text-2xl font-black tracking-tight">
              Dashboard Admin
            </h1>
            <p className="mt-1 text-center text-base font-medium text-[#525252]">
              Kelola data mitra SumenepKerja.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-3">
              {loginError && (
                <div
                  role="alert"
                  className="adm-chip adm-chip-inactive px-4 py-3 text-base font-bold"
                >
                  {loginError}
                </div>
              )}
              <div>
                <label
                  htmlFor="admin-passcode"
                  className="mb-1.5 block text-base font-semibold text-gray-900"
                >
                  Passphrase Admin
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loginBusy}
                className="adm-btn adm-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 px-4 py-3 text-base font-extrabold disabled:opacity-60"
              >
                {loginBusy ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="size-5" aria-hidden="true" />
                )}
                Masuk Dashboard
              </button>
            </form>
            <p className="mt-4 text-center text-sm font-medium text-[#525252]">
              Passphrase disimpan di server (env var Convex ADMIN_PASSCODE_HASH)
              dan ditukar dengan token sesi 256-bit saat masuk — passphrase tidak
              pernah dikirim ulang pada setiap panggilan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Dashboard ----------------
  return (
<div className="admin-workspace min-h-app bg-[#faf7ee]">
        <div className="mx-auto min-h-app w-full max-w-md md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
        <header className="sticky top-0 z-40 border-b-2 border-[#121212] bg-[#fdfbf7] pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center border-2 border-[#121212] bg-[#ff5a26]">
                <LayoutDashboard className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-black">
                  Dashboard Admin
                </h1>
                <p className="text-sm font-bold">
                  Sumenep<span className="bg-[#ffe662] px-1">Kerja</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="adm-btn adm-btn-ghost flex min-h-[48px] items-center gap-1.5 px-3 py-2 text-sm font-extrabold"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </button>
          </div>
        </header>

        <main className="px-4 pt-4 pb-12">
          {/* Statistik */}
          {stats && (
            <section
              aria-label="Statistik mitra"
              className="grid grid-cols-2 gap-3"
            >
              {[
                {
                  label: "Menunggu Konfirmasi",
                  value: stats.confirmed,
                  queue: true,
                },
                { label: "Belum Klaim", value: stats.pending, queue: true },
                { label: "Total Mitra", value: stats.total, queue: false },
                {
                  label: "Terverifikasi",
                  value: stats.verified,
                  queue: false,
                },
                { label: "Nonaktif", value: stats.inactive, queue: false },
                { label: "Tanpa Nomor", value: stats.noPhone, queue: false },
                {
                  label: "Total Klik WA",
                  value: stats.totalClicks,
                  queue: false,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    "adm-panel-flat p-3",
                    s.queue && "adm-metric-queue",
                  )}
                >
                  <p className="text-2xl font-black">
                    {new Intl.NumberFormat("id-ID").format(s.value)}
                  </p>
                  <p className="text-sm font-bold">{s.label}</p>
                </div>
              ))}
            </section>
          )}

          {/* Filter + pencarian */}
          <section aria-label="Filter mitra" className="mt-4 space-y-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#525252]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, nomor, kategori…"
                aria-label="Cari mitra"
                className={cn(inputCls, "pl-12")}
              />
            </div>
            <div className="flex gap-2">
              {(
                [
                  { key: "all", label: "Semua" },
                  { key: "confirmed", label: "Perlu Disetujui" },
                  { key: "pending", label: "Belum Klaim" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  aria-pressed={filter === tab.key}
                  className={cn(
                    "adm-btn min-h-[48px] flex-1 px-3 py-2.5 text-sm font-extrabold",
                    filter === tab.key
                      ? "adm-btn-dark"
                      : "adm-btn-ghost",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* Daftar mitra */}
          <section aria-label="Daftar mitra" className="mt-4 space-y-4">
            {data === undefined ? (
              <div className="adm-panel-flat flex items-center justify-center gap-2 p-6 font-bold">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Memuat data…
              </div>
            ) : rows.length === 0 ? (
              <div className="adm-panel-flat border-dashed p-6 text-center">
                <Inbox className="mx-auto size-10" aria-hidden="true" />
                <p className="mt-2 text-base font-extrabold">
                  Tidak ada mitra
                </p>
                <p className="mt-1 text-sm font-medium text-[#525252]">
                  Coba ubah filter atau kata kunci pencarian.
                </p>
              </div>
            ) : (
              rows.map((vendor) => (
                <VendorRow
                  key={vendor.id}
                  vendor={vendor}
                  sessionToken={sessionToken}
                />
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
