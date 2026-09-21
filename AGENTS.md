# AGENTS.md — SUMENEPKERJA.COM

You are building **SumenepKerja**, a hyper-local PWA directory for local services, handymen, and micro-SMEs in Sumenep, Madura. Primary goal: connect local citizens with vendors via WhatsApp directly with zero friction, and give local providers an effortless onboarding path.

**Stack note (authoritative for this repo):** backend is **Convex** (tables, queries, mutations, file storage) — not Supabase. The original spec's PostGIS RPCs are implemented as Convex queries with haversine distance; `increment_vendor_click` is `vendors/incrementWhatsAppClick`; photo storage uses Convex file storage (no bucket setup needed).

---

## 🚫 ANTI-PATTERNS (WHAT NOT TO BUILD)
Do NOT build the following under any circumstances:
- **NO In-App Booking Systems / Calendars.**
- **NO Shopping Carts / Checkout Flows.**
- **NO In-App Payment Gateways (Midtrans, Xendit, etc.).** Transactions happen offline between customer and vendor.
- **NO Complex Vendor Dashboards / Authentication.** Vendors manage leads purely through their personal WhatsApp app. Zero learning curve.

---

## 👥 TARGET AUDIENCE & DESIGN SYSTEM (CRITICAL: USIA 30+)
Both service seekers and vendors are local residents aged 30+. Many are not accustomed to complex modern app patterns.

1. **Design Style: Modern (Crisp Product Polish):**
   - Clean white elevation cards, subtle clean borders (`border-gray-200`), crisp high-contrast elements.
   - Do NOT use low-contrast styles, glassmorphism, claymorphism, or heavy brutalist designs.
2. **Accessibility First:**
   - **Base Font Size:** minimum 16px (`text-base`) for body text. 14px (`text-sm`) strictly for secondary metadata. Sans-serif only (Inter / system).
   - **Touch Targets:** ALL interactive elements minimum 48×48px (`min-h-[48px]`).
   - **High Contrast:** `text-gray-900` on white/light-gray. No low-contrast pastel or muted gray text on white.
3. **Color Hierarchy:**
   - **WhatsApp Green (`#25D366`):** RESERVED EXCLUSIVELY for "Chat WhatsApp Sekarang" actions.
   - **Brand Blue (`#2563EB` / `blue-600`):** navigation, active landmark pills, non-WhatsApp buttons.
   - **Neutral:** `bg-gray-100` page background, `bg-white` elevation cards.
4. **Layout & Interaction:**
   - Mobile-first container: `max-w-md mx-auto`, page background `bg-gray-50`.
   - **Sticky Bottom Navigation:** fixed bottom bar, icon + text labels (🏠 Beranda, 🗂 Kategori, ➕ Pasang Jasa).
   - **Explicit Labels:** never icon-only buttons. Always pair icons with Indonesian text.
5. **Local Copywriting (Bahasa Indonesia Sehari-hari):** "Pilih Patokan Lokasi", "Chat WhatsApp Sekarang", "Simpan Kontak", "Daftarkan Usaha Gratis", "Katalog Usaha".

---

## 📱 COMPREHENSIVE MOBILE RESPONSIVENESS & DEVICE COMPATIBILITY (CRITICAL)

The application MUST render flawlessly across the entire spectrum of Android and iOS devices without layout breaking, text clipping, or hidden interactive elements.

### 1. Tested Device Spectrum & Breakpoint Matrix
1. **Ultra-Compact / Legacy Viewports (320px – 360px width):**
   - *Target Devices:* iPhone 5, iPhone SE (1st gen), Galaxy A12, compact budget phones.
   - *Rules:*
     - Never use fixed horizontal widths (`w-[350px]`). Always use fluid widths (`w-full`, `max-w-full`).
     - Buttons and card contents must wrap gracefully (`flex-wrap`, `min-w-0`).
     - Allow text in badges, tags, and category chips to wrap or shrink without triggering a horizontal scrollbar.
2. **Standard & Modern Tall Viewports (375px – 430px width, aspect ratio up to 21:9):**
   - *Target Devices:* iPhone X through iPhone 17 series (Mini, Plus, Pro, Pro Max, Air), Pixel 5 through Pixel 10 Pro, Samsung Galaxy S20 through S26 Ultra, Note 20 Ultra, Xiaomi 11i/12, Oppo Find X3 Pro, OnePlus Nord 2, Infinix Hot series.
   - *Rules:*
     - The main mobile layout container MUST be constrained with `w-full max-w-md mx-auto`.
     - Layouts must breathe vertically on tall screens without unnatural, broken whitespace.
3. **Foldables & Dual-State Screens (Cover & Unfolded Views):**
   - *Target Devices:* Galaxy Z Flip / Z Fold series, Motorola Razr series, Google Pixel Fold / Pixel 10 Fold.
   - *Rules:*
     - When folded (narrow cover screen): handle narrow aspect ratios without overlapping elements.
     - When unfolded (tablet-like viewport > 600px): center the app within `max-w-md` so cards and buttons do not stretch awkwardly across a tablet-width canvas.

### 2. Viewport Height & Mobile Browser URL Bar Handling
Mobile browsers (Safari iOS, Chrome/Samsung Internet Android) expand and collapse their bottom bars dynamically during scroll.
- **NEVER use `100vh`, `h-screen`, or `min-h-screen` for screen wrappers.** These cause floating buttons and bottom navigation to be covered by the browser's native UI.
- **ALWAYS use dynamic viewport units:**
  - Page wrapper: `min-h-dvh` (fallback `min-h-[100svh]`).
  - Full dynamic canvas coverage: `min-h-dvh w-full max-w-md mx-auto bg-gray-50`.

### 3. Safe-Area Insets (Notches, Dynamic Island & Home Gesture Indicators)
- **HTML Meta Viewport:** `viewport-fit=cover` must be set:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  ```
- **Sticky Bottom Navigation & Floating Buttons:** must account for the bottom home indicator:
  ```html
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
    <div class="max-w-md mx-auto flex items-center justify-around h-16"><!-- Nav items --></div>
  </nav>
  ```
- The floating WhatsApp CTA block on `/v/[slug]` uses `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
- Sticky top header accounts for the notch with `pt-[env(safe-area-inset-top)]`.
- Content container padding: main scrollable containers keep enough bottom padding (utility `pb-safe-nav` = `6rem + env(safe-area-inset-bottom)`) so content is never obscured behind the sticky bottom navigation.

### 4. Text Wrapping, System Font Scaling & Touch Targets
Users aged 30+ frequently enable enlarged system font scaling (accessibility text sizes):
- **Never fix container heights on elements containing dynamic text:**
  - ❌ `h-12` on buttons or cards with labels.
  - ✅ `min-h-[48px] py-3 px-4` so buttons can expand vertically if text wraps to two lines.
- **Truncation Safety:** for long vendor names or addresses, use `truncate` / `line-clamp-2` with `min-w-0` on the flex parent to prevent card horizontal blowout.
- **Horizontal Scroll Prevention:** apply `overflow-x-hidden` on the outermost app shell to prevent accidental side-swiping on 320px screens.

---

## ⭐ FLAGSHIP FEATURES SPECIFICATION

### 1. Tombol WhatsApp Pintar (Contextual Deep-Link)
Every vendor card and profile page MUST feature a full-width green button **"Chat WhatsApp Sekarang"**. On click:
1. Fire a **non-blocking** background call to `vendors/incrementWhatsAppClick(vendorId)` (failures swallowed silently).
2. Open `https://wa.me/<phone>?text=<encoded>` using `generateWhatsAppLink()` from `src/lib/whatsapp.ts` — the return line MUST be a real template literal:
   ```ts
   return `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
   ```
   (Never a markdown-style string.) Message templates per category (servis-teknik, hajatan-acara, kuliner, transportasi, umum) inject the vendor name and active landmark, exactly as in `src/lib/whatsapp.ts`.

### 2. Filter Patokan Lokal (Landmark-First Navigation)
Horizontal scrollable 48px pills below the search bar: Semua Kota + the five seeded landmarks (Taman Bunga/Adipura, Jl. Trunojoyo, Pasar Anom Baru, Keraton/Labang Mesem, Masjid Jamik). Selecting one filters vendors ordered by proximity to that landmark's coordinates and injects the landmark name into the WhatsApp draft.

### 3. Banner Ajakan Bergabung (Home)
Prominent blue gradient banner above the footer/bottom bar: title "Punya Usaha atau Jasa di Sumenep?", subtitle "Daftarkan usaha Anda gratis. Cukup 1 menit langsung tampil di pencarian warga.", CTA button `+ Daftarkan Usaha Saya Gratis` → `/daftar`.

### 4. Formulir Pendaftaran Mandiri (`/daftar`)
Single-page, zero-auth form. Mandatory: Nama Usaha, Kategori (select from `categories`), Nomor WhatsApp Aktif (numeric-sanitized), Patokan Landmark (tappable selector), Alamat Lengkap (textarea), Biaya Mulai Dari (number). Optional: jam kerja, foto (≤5 MB).
- **CRITICAL — Automatic Coordinate Duplication:** users aged 30+ cannot drop GPS pins. The `registerVendor` mutation MUST copy the selected landmark's coordinates into the vendor row — `lat`/`lng` are never null.
- **Automatic Slug Generation:** `slug` is UNIQUE NOT NULL. Generate from `slugify(name)`; on collision append timestamp + random suffix (`slugify(name)-<ts4>-<rand2>`) so inserts never violate the unique constraint.
- **Photo Storage (optional path):** upload is optional; when absent, cards and profile pages fall back to a category-specific gradient + icon placeholder. (Implementation: Convex file storage via `files/generateUploadUrl`; no bucket to create.)

### 5. Halaman Profil Mitra / Kartu Digital (`/v/[slug]`)
Landing target for physical QR stickers (`/v/<slug>?ref=sticker`): fast standalone page with hero image (or category placeholder), `✓ Mitra Terverifikasi` badge, category chip, contact counter, address + landmark, starting price, working hours, sticky bottom **"💬 Chat WhatsApp Sekarang"**, and secondary `[ 📞 Simpan Nomor Telepon ]` (`tel:` link).

### 6. Pelacak Klik WhatsApp (Analytics Counter)
`vendors.whatsappClicks INT` incremented by `incrementWhatsAppClick` for monthly partner engagement summaries.

---

## 🤖 AGENT CODING STANDARDS
1. **Fallback Koordinat saat Form Submit:** raw GPS from users 30+ is unreliable — always copy coordinates from the selected landmark into the vendor row.
2. **Strict Accessibility:** all tap targets ≥ `min-h-[48px]`, body text never below 16px, high-contrast interactive states.
3. **Zero-Empty State:** meaningful fallback UI when a landmark/category has 0 vendors ("Belum ada jasa di sekitar sini, coba pilih patokan lain").
4. **Number Sanitization:** always `sanitizePhoneNumber()` before generating WhatsApp URLs (also server-side in `registerVendor`).
5. **Encoding Safety:** always `encodeURIComponent()` message strings.
6. **Performance & CLS:** skeleton loaders matching exact card dimensions; lists render without layout shift.
7. **Device Responsiveness:** follow section 📱 above — `min-h-dvh` (never `100vh`/`min-h-screen`), `viewport-fit=cover`, safe-area insets on fixed bars, `overflow-x-hidden` on the outer shell, fluid widths with `min-w-0`/`flex-wrap` for 320px screens, `max-w-md mx-auto` centering for unfolded foldables.
8. **Slug Uniqueness:** never trust business names to be unique — timestamp-suffix fallback on collision.
