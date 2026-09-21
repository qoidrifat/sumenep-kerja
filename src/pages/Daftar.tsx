import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  ImagePlus,
  Loader2,
  MessageCircle,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { formatRupiah } from "@/lib/format";
import {
  generateAdminErrorReportLink,
  generateVerificationConfirmLink,
  sanitizePhoneNumber,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type IdStorage = Id<"_storage">;

/** Batas galeri: 3 foto @1MB — ringan di sinyal pelosok, hemat storage. */
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 1 * 1024 * 1024;

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; current: number; total: number }
  | { kind: "submitting" }
  | { kind: "success"; slug: string; name: string; phone: string }
  | { kind: "error"; message: string; stage?: string; lock: boolean };

export default function Daftar() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useQuery(api.directory.listCategories);
  const landmarks = useQuery(api.directory.listLandmarks);

  const registerVendor = useMutation(api.vendors.registerVendor);
  const markVerificationConfirmed = useMutation(api.vendors.markVerificationConfirmed);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // true setelah warga menekan "Kirim Laporan" — popup terkunci tidak bisa
  // ditutup sebelum laporan dikirim (khusus error sistem).
  const [reportSent, setReportSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  // Field states — dikontrol penuh agar validasi sederhana & jelas.
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [phone, setPhone] = useState("");
  const [landmarkSlug, setLandmarkSlug] = useState("");
  const [addressText, setAddressText] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [is24h, setIs24h] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const busy = status.kind === "uploading" || status.kind === "submitting";

  // Sanitasi otomatis: hanya angka, maksimal 15 digit.
  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 15));
  };

  const handleFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    if (imageFiles.length + incoming.length > MAX_PHOTOS) {
      setStatus({
        kind: "error",
        message: `Maksimal ${MAX_PHOTOS} foto.`,
        lock: false,
      });
      return;
    }
    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        setStatus({
          kind: "error",
          message: "File harus berupa gambar.",
          lock: false,
        });
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setStatus({
          kind: "error",
          message: "Ukuran tiap foto maksimal 1 MB.",
          lock: false,
        });
        return;
      }
    }
    setImageFiles((prev) => [...prev, ...incoming]);
    setImagePreviews((prev) => [
      ...prev,
      ...incoming.map((file) => URL.createObjectURL(file)),
    ]);
    if (status.kind === "error") setStatus({ kind: "idle" });
  };

  const removePhoto = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setReportSent(false);

    if (!categorySlug) {
      setStatus({
        kind: "error",
        message: "Silakan pilih kategori layanan.",
        lock: false,
      });
      return;
    }
    if (!landmarkSlug) {
      setStatus({
        kind: "error",
        message: "Silakan pilih patokan lokasi terdekat.",
        lock: false,
      });
      return;
    }
    if (!is24h && ((openTime && !closeTime) || (!openTime && closeTime))) {
      setStatus({
        kind: "error",
        message:
          "Lengkapi jam buka dan jam tutup, atau kosongkan keduanya bila tidak tentu.",
        lock: false,
      });
      return;
    }

    // Validasi awal di klien (cermin aturan server) agar gagal cepat SEBELUM
    // mengunggah foto — hemat kuota warga di sinyal lemah.
    if (name.trim().length < 3) {
      setStatus({
        kind: "error",
        message: "Nama usaha minimal 3 karakter.",
        lock: false,
      });
      return;
    }
    if (addressText.trim().length < 5) {
      setStatus({
        kind: "error",
        message: "Alamat lengkap wajib diisi.",
        lock: false,
      });
      return;
    }
    const sanitizedPhone = sanitizePhoneNumber(phone);
    if (
      sanitizedPhone.length < 10 ||
      sanitizedPhone.length > 15 ||
      !sanitizedPhone.startsWith("62")
    ) {
      setStatus({
        kind: "error",
        message: "Nomor WhatsApp tidak valid. Contoh: 081234567890",
        lock: false,
      });
      return;
    }

    // Unggah satu file dengan retry: sinyal seluler pelosok sering putus
    // sesaat ("Failed to fetch"). Setiap percobaan memakai upload URL baru
    // karena URL lama bisa kedaluwarsa/terpakai.
    const uploadOnePhoto = async (imageFile: File): Promise<IdStorage> => {
      const MAX_ATTEMPTS = 3;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": imageFile.type },
            body: imageFile,
          });
          if (!result.ok && (result.status >= 500 || result.status === 408 || result.status === 429)) {
            throw new Error(`HTTP ${result.status}`);
          }
          if (!result.ok) throw new Error("Gagal mengunggah foto. Coba lagi.");
          const json = (await result.json()) as { storageId?: unknown };
          if (typeof json.storageId !== "string" || !json.storageId) {
            throw new Error("Gagal mengunggah foto. Coba lagi.");
          }
          return json.storageId as IdStorage;
        } catch (error) {
          lastError = error;
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) =>
              setTimeout(resolve, 800 * attempt),
            );
          }
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Gagal mengunggah foto. Periksa sinyal lalu coba lagi.");
    };

    let failedStage = "Mengirim formulir";
    try {
      // 1. Unggah foto satu per satu (jika ada) ke penyimpanan Convex.
      //    POST ke upload URL mengembalikan `{ storageId: Id<"_storage>" }`
      //    — bukan string ID langsung — jadi ekstrak field-nya.
      let imageStorageIds: IdStorage[] | undefined;
      if (imageFiles.length > 0) {
        failedStage = "Mengunggah foto";
        imageStorageIds = [];
        for (let i = 0; i < imageFiles.length; i++) {
          setStatus({
            kind: "uploading",
            current: i + 1,
            total: imageFiles.length,
          });
          imageStorageIds.push(await uploadOnePhoto(imageFiles[i]));
        }
      }

      // 2. Daftarkan mitra. Koordinat otomatis diduplikasi dari patokan
      //    landmark yang dipilih — warga tidak perlu memasang pin GPS.
      //    Jam kerja diserialisasi ke format kanonis yang dipahami badge
      //    Buka/Tutup ("Buka 08.00 - Tutup 17.00" / "Buka 24 jam").
      failedStage = "Mendaftarkan usaha";
      setStatus({ kind: "submitting" });
      const toDotted = (t: string) => t.replace(":", ".");
      const workingHours = is24h
        ? "Buka 24 jam"
        : openTime && closeTime
          ? `Buka ${toDotted(openTime)} - Tutup ${toDotted(closeTime)}`
          : undefined;
      const { slug } = await registerVendor({
        name,
        categorySlug,
        phoneNumber: phone,
        landmarkSlug,
        addressText,
        minPrice: minPrice ? Number(minPrice) : undefined,
        workingHours,
        imageStorageIds,
      });

      setStatus({
        kind: "success",
        slug,
        name: name.trim(),
        phone: phone,
      });
      setConfirmSent(false);
      window.scrollTo({ top: 0 });
    } catch (error) {
      // ConvexError.data diteruskan backend ke klien bahkan di deployment
      // produksi (pesan Error biasa disensor jadi "Server Error" di sana).
      // "Failed to fetch" (bahasa browser saat jaringan putus) diterjemahkan
      // ke bahasa warga.
      let message = "Terjadi kesalahan. Silakan coba lagi.";
      if (error instanceof ConvexError) {
        message = String(error.data ?? message);
      } else if (error instanceof Error && error.message) {
        message =
          error.message === "Failed to fetch"
            ? "Gagal mengunggah foto karena sinyal terputus. Periksa sinyal internet lalu coba lagi."
            : error.message;
      }
      setStatus({
        kind: "error",
        message,
        stage: failedStage,
        lock: true,
      });
    }
  };

  const closeErrorDialog = () => {
    if (status.kind !== "error") return;
    // Popup terkunci (error sistem) hanya bisa ditutup setelah laporan dikirim.
    if (status.lock && !reportSent) return;
    setReportSent(false);
    setStatus({ kind: "idle" });
  };

  const pageUrl =
    typeof window !== "undefined" ? window.location.href : "/daftar";

  const jamKerjaText = is24h
    ? "Buka 24 jam"
    : openTime && closeTime
      ? `Buka ${openTime.replace(":", ".")} - Tutup ${closeTime.replace(":", ".")}`
      : "-";

  const formLines = [
    `- Nama usaha: ${name.trim() || "-"}`,
    `- Kategori: ${categorySlug || "-"}`,
    `- Nomor WhatsApp: ${phone || "-"}`,
    `- Patokan: ${landmarkSlug || "-"}`,
    `- Alamat: ${addressText.trim() || "-"}`,
    `- Biaya mulai: ${minPrice ? `Rp${new Intl.NumberFormat("id-ID").format(Number(minPrice))}` : "-"}`,
    `- Jam kerja: ${jamKerjaText}`,
    `- Jumlah foto: ${imageFiles.length}`,
  ];

  const errorReportHref =
    status.kind === "error"
      ? generateAdminErrorReportLink({
          errorMessage: status.message,
          pageUrl,
          stage: status.stage ?? "-",
          formLines,
        })
      : null;

  if (status.kind === "success") {
    const cardUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/v/${status.slug}`
        : "";
    const confirmHref =
      cardUrl
        ? generateVerificationConfirmLink({
            cardUrl,
            vendorName: status.name,
            phoneNumber: status.phone,
          })
        : null;

    return (
      <AppShell withNav={false}>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-12 text-emerald-600" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-gray-900">
            Pendaftaran Berhasil!
          </h1>
          <p className="mt-2 max-w-sm text-base text-gray-600">
            <span className="font-semibold text-gray-900">{status.name}</span>{" "}
            sekarang tampil di pencarian warga Sumenep.
          </p>

          {/* Status verifikasi — selalu pending saat baru mendaftar. */}
          <div className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Hourglass className="size-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-amber-800">
                  Status: Menunggu Konfirmasi
                </p>
                <p className="mt-1 text-sm text-amber-800/90">
                  {confirmSent
                    ? "Terima kasih! Admin akan memverifikasi melalui WhatsApp dalam 1×24 jam."
                    : "Verifikasi nomor WhatsApp Anda untuk mendapat badge ✓ Mitra Terverifikasi."}
                </p>
              </div>
            </div>
            {!confirmSent && confirmHref && (
              <a
                href={confirmHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setConfirmSent(true);
                  void markVerificationConfirmed({ slug: status.slug }).catch(
                    () => {
                      // Non-blocking — kegagalan hanya berarti badge
                      // "Menunggu" tidak muncul di kartu.
                    },
                  );
                }}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                Konfirmasi via WhatsApp
              </a>
            )}
          </div>

          <div className="mt-6 w-full space-y-3">
            <Link
              to={`/v/${status.slug}`}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <BadgeCheck className="size-5" aria-hidden="true" />
              Lihat Kartu Usaha Saya
            </Link>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Daftarkan Usaha Gratis
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Cukup 1 menit — tanpa akun, langsung tampil di pencarian warga.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pt-3 pb-8">
        {status.kind === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-700"
          >
            {status.message}
          </div>
        )}

        {/* Nama usaha */}
        <div>
          <label
            htmlFor="nama-usaha"
            className="mb-1.5 block text-base font-semibold text-gray-900"
          >
            Nama Usaha / Nama Penyedia Jasa <span className="text-red-600">*</span>
          </label>
          <input
            id="nama-usaha"
            type="text"
            required
            minLength={3}
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Bengkel Listrik Cak Misbun"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none"
          />
        </div>

        {/* Kategori */}
        <div>
          <label
            htmlFor="kategori"
            className="mb-1.5 block text-base font-semibold text-gray-900"
          >
            Kategori Layanan <span className="text-red-600">*</span>
          </label>
          <select
            id="kategori"
            required
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="min-h-[48px] w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none"
          >
            <option value="" disabled>
              Pilih kategori…
            </option>
            {(categories ?? []).map((category) => (
              <option key={category._id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nomor WhatsApp */}
        <div>
          <label
            htmlFor="nomor-wa"
            className="mb-1.5 block text-base font-semibold text-gray-900"
          >
            Nomor WhatsApp Aktif <span className="text-red-600">*</span>
          </label>
          <input
            id="nomor-wa"
            type="tel"
            inputMode="numeric"
            required
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="081234567890"
            className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-600">
            Pelanggan akan langsung chat ke nomor ini.
          </p>
        </div>

        {/* Patokan landmark */}
        <div>
          <span className="mb-1.5 block text-base font-semibold text-gray-900">
            Patokan Lokasi Terdekat <span className="text-red-600">*</span>
          </span>
          <div className="grid grid-cols-1 gap-2">
            {(landmarks ?? []).map((landmark) => {
              const active = landmarkSlug === landmark.slug;
              return (
                <button
                  key={landmark._id}
                  type="button"
                  onClick={() => setLandmarkSlug(landmark.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-base transition-colors",
                    active
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700 ring-2 ring-blue-500/30"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300",
                  )}
                >
                  <span>
                    {landmark.name}
                    {landmark.description && (
                      <span className="mt-0.5 block text-sm font-normal text-gray-600">
                        {landmark.description}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-5 shrink-0",
                      active ? "text-blue-600" : "text-gray-400",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Lokasi usaha Anda otomatis mengikuti patokan ini — tidak perlu pin
            GPS.
          </p>
        </div>

        {/* Alamat lengkap */}
        <div>
          <label
            htmlFor="alamat"
            className="mb-1.5 block text-base font-semibold text-gray-900"
          >
            Alamat Lengkap / Patokan Jalan <span className="text-red-600">*</span>
          </label>
          <textarea
            id="alamat"
            required
            rows={3}
            maxLength={500}
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="Contoh: Jl. Rangkiang Sumun 21, samping toko sembako Barokah"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none"
          />
        </div>

        {/* Harga & jam kerja */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="harga"
              className="mb-1.5 block text-base font-semibold text-gray-900"
            >
              Biaya Mulai Dari (Rp)
            </label>
            <input
              id="harga"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="30000"
              className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none"
            />
            {minPrice && Number(minPrice) > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                Tampil sebagai: Mulai {formatRupiah(Number(minPrice))}
              </p>
            )}
          </div>
          <div>
            <span className="mb-1.5 block text-base font-semibold text-gray-900">
              Jam Kerja
            </span>
            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={is24h}
                onChange={(e) => setIs24h(e.target.checked)}
                className="size-6 shrink-0 accent-blue-600"
              />
              <span className="text-base font-medium text-gray-900">
                Buka 24 jam
              </span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="jam-buka"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Jam buka
                </label>
                <input
                  id="jam-buka"
                  type="time"
                  value={openTime}
                  disabled={is24h}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor="jam-tutup"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Jam tutup
                </label>
                <input
                  id="jam-tutup"
                  type="time"
                  value={closeTime}
                  disabled={is24h}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/30 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Kosongkan bila jam tidak tentu — badge buka/tutup tidak ditampilkan.
            </p>
          </div>
        </div>

        {/* Foto */}
        <div>
          <span className="mb-1.5 block text-base font-semibold text-gray-900">
            Foto Profil / Hasil Kerja ({imageFiles.length}/{MAX_PHOTOS})
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />
          {imagePreviews.length > 0 && (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {imagePreviews.map((preview, index) => (
                <div
                  key={`${index}-${imageFiles[index]?.name ?? "foto"}`}
                  className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <img
                    src={preview}
                    alt={`Pratinjau foto usaha ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label={`Hapus foto ${index + 1}`}
                    className="absolute top-1 right-1 flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-black/60 text-base font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageFiles.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-base font-medium text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              Pilih Foto (opsional, maks {MAX_PHOTOS}, @1 MB)
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={busy || categories === undefined || landmarks === undefined}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              {status.kind === "uploading"
                ? `Mengunggah foto ${status.current}/${status.total}…`
                : "Mendaftarkan…"}
            </>
          ) : (
            <>
              <ImagePlus className="size-5" aria-hidden="true" />
              Daftarkan Usaha Saya
            </>
          )}
        </button>
        <p className="text-center text-sm text-gray-600">
          Gratis selamanya. Data Anda hanya digunakan agar warga bisa menemukan
          usaha Anda.
        </p>
      </form>

      {/* Pop-up error fullscreen: menutupi halaman + blur, terkunci sampai
          laporan dikirim (khusus error sistem). */}
      {status.kind === "error" && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="daftar-error-title"
          aria-describedby="daftar-error-desc"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
              Pendaftaran Gagal
              {status.stage ? ` — ${status.stage}` : ""}
            </p>
            <h2
              id="daftar-error-title"
              className="mt-3 text-xl font-extrabold text-gray-900"
            >
              Mohon maaf, terjadi kendala
            </h2>
            <p
              id="daftar-error-desc"
              className="mt-2 text-base break-words font-medium text-gray-700"
            >
              {status.message}
            </p>

            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
              <p className="font-bold text-gray-900">Lokasi error:</p>
              <p className="break-all text-gray-700">{pageUrl}</p>
              <p className="mt-2 font-bold text-gray-900">
                Data yang sudah Anda isi:
              </p>
              <ul className="mt-1 space-y-0.5 text-gray-700">
                <li>Nama usaha: {name.trim() || "-"}</li>
                <li>Kategori: {categorySlug || "-"}</li>
                <li>Patokan: {landmarkSlug || "-"}</li>
                <li>
                  Biaya:{" "}
                  {minPrice
                    ? `Rp${new Intl.NumberFormat("id-ID").format(Number(minPrice))}`
                    : "-"}
                  {" · "}Jam: {jamKerjaText}
                </li>
                <li>Foto: {imageFiles.length} file</li>
              </ul>
            </div>

            <p className="mt-3 text-base font-semibold text-gray-900">
              Mohon kirim laporan ke admin agar segera dibantu.
            </p>

            {reportSent && (
              <p
                role="status"
                className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-700"
              >
                ✓ Laporan terbuka di WhatsApp. Admin akan menindaklanjuti —
                Anda sekarang bisa menutup pesan ini.
              </p>
            )}

            <div className="mt-4 space-y-2">
              {errorReportHref && !reportSent && (
                <a
                  href={errorReportHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setReportSent(true)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:brightness-95"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Kirim Laporan ke Admin
                </a>
              )}
              <button
                type="button"
                onClick={closeErrorDialog}
                disabled={status.lock && !reportSent}
                title={
                  status.lock && !reportSent
                    ? "Kirim laporan ke admin terlebih dahulu untuk menutup"
                    : undefined
                }
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tutup
              </button>
              {status.lock && !reportSent && (
                <p className="text-center text-sm text-gray-600">
                  Kirim laporan ke admin terlebih dahulu untuk menutup pesan
                  ini.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
