/**
 * Service worker SumenepKerja — offline dasar tanpa dependensi.
 *
 * Strategi:
 * - Navigasi: network-first, fallback ke app shell ("/") saat offline agar
 *   aplikasi tetap terbuka di sinyal pelosok.
 * - Aset same-origin: stale-while-revalidate (cepat + tetap segar).
 * - API Convex (cross-origin) & non-GET: selalu network-only — data direktori
 *   tidak pernah disajikan basi, mutasi tidak pernah di-cache.
 *
 * Data query tetap butuh koneksi; yang dijamin offline adalah cangkang
 * aplikasi (HTML/CSS/JS/ikon), bukan isi direktori.
 */

const CACHE = "sumenepkerja-v1";

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/logo-sumenepkerja.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Satu per satu agar satu file gagal tidak menggagalkan semuanya.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* abaikan file yang gagal di-cache */
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // API Convex & CDN pihak ketiga: selalu jaringan, tidak di-cache.
  if (url.origin !== self.location.origin) return;

  // Navigasi antar-halaman: coba jaringan dulu, jatuh ke app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          const shell = await cache.match("/");
          return shell ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Aset statis: sajikan cache sambil segarkan di latar.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    })(),
  );
});
