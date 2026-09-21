/**
 * Pendaftaran service worker — hanya di production agar dev tidak pernah
 * menyajikan bundle basi dari cache.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW adalah peningkatan progresif — gagal daftar tidak mengganggu app.
    });
  });
}
