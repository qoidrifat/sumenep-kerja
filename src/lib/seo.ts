/**
 * Helper SEO sisi klien.
 *
 * Aplikasi ini SPA, jadi metadata halaman dikelola runtime lewat effect:
 * judul + description per rute, canonical, dan JSON-LD (schema.org) untuk
 * LocalBusiness agar kartu mitra dikenali Google sebagai entitas bisnis lokal.
 *
 * Catatan: crawler WhatsApp tidak menjalankan JS — untuk pratinjau link
 * WhatsApp, OG tags tetap disajikan server-side lewat halaman `/s/<slug>`
 * (convex/share.ts). Helper ini melengkapi Google & browser.
 *
 * Domain produksi dipatok supaya canonical konsisten dengan sitemap.xml
 * (convex/seo.ts) — jangan ganti secara terpisah.
 */

export const SITE_ORIGIN = "https://sumenepkerja.com";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Set title + meta description + canonical + OG dasar untuk halaman saat ini. */
export function setSeoMeta(params: {
  title: string;
  description: string;
  /** Path absolut, mis. `/v/bengkel-pak-ahmad`. */
  path: string;
}): void {
  const url = `${SITE_ORIGIN}${params.path}`;

  document.title = params.title;
  upsertMeta("name", "description", params.description);
  upsertLink("canonical", url);

  // Sinkron OG dasar (og:image biarkan milik halaman share server-side).
  upsertMeta("property", "og:title", params.title);
  upsertMeta("property", "og:description", params.description);
  upsertMeta("property", "og:url", url);
}

/**
 * Pasang / ganti satu blok JSON-LD dengan id terdaftar.
 * Google membaca JSON-LD yang diinjeksi runtime (render JS).
 */
export function setJsonLd(id: string, data: object | null): void {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data) return;

  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
