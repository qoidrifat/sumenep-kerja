# SumenepKerja — Direktori Jasa & Usaha Lokal Sumenep

> Menghubungkan warga Sumenep dengan tukang, teknisi, dan usaha mikro lokal — **tanpa aplikasi tambahan, tanpa akun, langsung chat WhatsApp.**

[![Stack](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20Vite%207%20%C2%B7%20Convex%20%C2%B7%20Tailwind%20v4-blue)](#tech-stack)
[![PWA](https://img.shields.io/badge/PWA-installable%20%C2%B7%20offline%20shell-emerald)](#progresif-web-app)
[![License](https://img.shields.io/badge/lisensi-proprietary-orange)](#lisensi)

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur Unggulan](#fitur-unggulan)
- [Tech Stack](#tech-stack)
- [Desain System](#desain-system)
- [Struktur Proyek](#struktur-proyek)
- [Mulai Cepat](#mulai-cepat)
- [Environment Variables](#environment-variables)
- [Deploy Produksi](#deploy-produksi)
- [Rute Aplikasi](#rute-aplikasi)
- [Dashboard Admin](#dashboard-admin)
- [Quality Gates](#quality-gates)
- [Lisensi](#lisensi)

---

## Tentang

**SumenepKerja** adalah direktori hyper-lokal untuk layanan, tukang, dan UMKM di Sumenep, Madura. Warga menemukan penyedia jasa lewat patokan lokasi yang mereka kenal (Taman Bunga, Pasar Anom, Masjid Jamik, …) lalu menghubungi langsung via WhatsApp — tanpa booking, tanpa keranjang, tanpa pembayaran di aplikasi. Transaksi terjadi offline antara warga dan mitra.

**Prinsip produk:**

| Prinsip | Artinya |
|---|---|
| Zero friction | Tanpa akun, tanpa login untuk warga maupun mitra pendaftar |
| WhatsApp-first | Semua konversi bermuara ke chat WhatsApp |
| Usia 30+ | Target sentuh ≥ 48px, teks ≥ 16px, bahasa Indonesia sehari-hari |
| Anti-pattern | Tanpa booking/kalender, tanpa checkout, tanpa payment gateway, tanpa dashboard vendor |

---

## Fitur Unggulan

- **Tombol WhatsApp Pintar** — draf pesan otomatis per kategori (servis, hajatan, kuliner, transportasi, umum) + pencatatan klik non-blocking untuk analitik engagement.
- **Filter Patokan Lokal** — pil landmark yang memfilter sekaligus mengurutkan mitra berdasarkan jarak haversine, dan menyuntikkan nama patokan ke draf WhatsApp.
- **Pendaftaran Mandiri (`/daftar`)** — formulir 1 menit tanpa auth; koordinat otomatis diduplikasi dari landmark terpilih; slug unik anti-bentrok; galeri hingga **3 foto** (@1 MB).
- **Kartu Digital Mitra (`/v/[slug]`)** — halaman siap-QR (`?ref=sticker`) dengan badge verifikasi, harga, jam kerja, tombol telpon, **bagikan ke tetangga**, dan **rekomendasi warga** (satu ketuk per perangkat, tanpa moderasi).
- **Badge Buka/Tutup Otomatis** — disimpulkan dari jam kerja (termasuk format kanonis `Buka 08.00 - Tutup 17.00` dan shift malam); ambigu → tidak tampil badge, teks asli tetap ditunjukkan.
- **Pratinjau Link WhatsApp (OG tags)** — route `/s/<slug>` menyajikan meta per-kartu untuk crawler WA, manusia otomatis di-redirect ke kartu.
- **Pelaporan Error via WhatsApp Admin** — popup error pada pendaftaran dengan tombol lapor yang mengisi pesan admin otomatis (waktu, tahap, konteks form, pesan error).
- **Progresif Web App** — service worker (cangkang offline + stale-while-revalidate aset), banner "Pasang di HP", ikon maskable.
- **QR Sticker (`/qr`)** — generator stiker cetak untuk ditempel di warung mitra.
- **Dashboard Admin (`/admin`)** — meja triage verifikasi bertema *Warm Brutalism*: 7 metrik, filter antrean, setujui/tolak, cek WA cepat, aktif/nonaktif, edit, hapus. Login passphrase via env.

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19 · Vite 7 · react-router v7 · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui (new-york) · Radix UI · lucide-react |
| Backend | Convex (query · mutation · HTTP router · file storage · Convex Auth) |
| Package manager | Bun |
| Hosting (produksi) | Vercel (frontend statis) + Convex Cloud (backend) |

---

## Desain System

- **Halaman publik:** kartu putih bersih, border `gray-200`, kontras tinggi; hijau WhatsApp `#25D366` **eksklusif** untuk aksi chat; biru `#2563EB` untuk navigasi/CTA lain; container mobile `max-w-md`; unit viewport dinamis (`min-h-dvh`, tanpa `100vh`); safe-area insets untuk notch & gesture bar.
- **Dashboard admin:** tema terisolasi *Warm Brutalism* (kanvas krem `#FAF7EE`, border hitam 2px, hard shadow, aksen oranye `#FF5A26`) di bawah scope `.admin-workspace` — halaman publik tidak terpengaruh.

---

## Struktur Proyek

```
├── src/
│   ├── pages/            # Home, Kategori, Daftar, VendorProfile, StickerQR, Admin, Auth
│   ├── components/
│   │   ├── directory/    # VendorCard, WhatsAppButton, RecommendButton, OpenBadge, …
│   │   ├── layout/       # AppShell (header, bottom-nav)
│   │   └── ui/           # Primitif shadcn/ui
│   ├── convex/           # Schema, vendors, directory, admin, files, share (OG), auth
│   └── lib/              # whatsapp, open-hours, format, pwa, config
├── public/               # manifest PWA, ikon, sw.js
├── main.ts               # Server statis Deno/Hono (non-Vercel)
└── convex.json           # functions: src/convex/
```

---

## Mulai Cepat

**Prasyarat:** [Bun](https://bun.sh) + akun [Convex](https://convex.dev).

```bash
# 1. Install dependensi
bun install

# 2. Hubungkan Convex (membuat deployment dev + mengisi .env.local)
bunx convex dev

# 3. Jalankan frontend (terminal lain)
bun run dev
```

Buka `http://localhost:5173`. Backend dev di `http://127.0.0.1:3210`, dashboard Convex di `https://dashboard.convex.dev`.

> `bunx convex dev` dan `bun run dev` adalah proses watch-mode yang tidak pernah selesai — jalankan di background/terminal terpisah, jangan sebagai foreground blocking di agen CLI.

---

## Environment Variables

Salin `.env.example` ke `.env.local` (file ini di-ignore git). Variabel frontend memakai prefix `VITE_`:

| Variabel | Lokasi | Keterangan |
|---|---|---|
| `VITE_CONVEX_URL` | Vercel / `.env.local` | URL API Convex (dev: `http://127.0.0.1:3210`) |
| `VITE_CONVEX_SITE_URL` | Vercel / `.env.local` | URL HTTP actions Convex (dev: `http://127.0.0.1:3211`) — dipakai tombol Bagikan |
| `SITE_URL` | Env Convex (`convex env set`) | Origin frontend untuk redirect `/s/<slug>` |
| `ADMIN_PASSCODE` | Env Convex | Passphrase login `/admin` — **wajib diganti di produksi** |
| `CONVEX_SITE_URL` | Env Convex | Origin frontend untuk JWT Convex Auth |
| `VLY_CONVEX_AUTH_ISSUER` | Env Convex | Issuer federasi freebuff (default `https://freebuff.com`) |

---

## Deploy Produksi

```bash
# Backend — deploy fungsi ke production deployment
npx convex deploy --yes

# Set env produksi (contoh)
bunx convex env set --prod SITE_URL https://<domain-vercel>.vercel.app
bunx convex env set --prod ADMIN_PASSCODE "<passphrase-kuat>"
bunx convex env set --prod VLY_CONVEX_AUTH_ISSUER https://freebuff.com
```

**Vercel:** Build Command `bun run build` (`tsc -b && vite build`), Output Directory `dist`, dan file `vercel.json` berisi SPA rewrite ke `/index.html` agar rute `/v/:slug`, `/daftar`, `/kategori`, `/qr`, `/admin` dapat dibuka langsung. Isi env `VITE_CONVEX_URL` + `VITE_CONVEX_SITE_URL` dengan URL **produksi** (`.convex.cloud` / `.convex.site`).

> Deployment dev berisi seed 61 vendor contoh (`ensureSeedData`). Pastikan data produksi disiapkan/disensor sesuai kebutuhan sebelum diumumkan.

---

## Rute Aplikasi

| Rute | Keterangan |
|---|---|
| `/` | Beranda: pencarian, pil patokan, katalog mitra |
| `/kategori` | Katalog usaha per kategori |
| `/daftar` | Formulir pendaftaran mandiri (publik, tanpa auth) |
| `/v/:slug` | Kartu digital mitra (+ `?ref=sticker` untuk kunjungan QR) |
| `/s/:slug` | Halaman share OG (disajikan Convex, redirect ke kartu) |
| `/qr?vendor=:slug` | Generator QR sticker cetak |
| `/admin` | Dashboard moderasi (passphrase) |
| `/auth` | Masuk/daf
...[truncated 911 chars]