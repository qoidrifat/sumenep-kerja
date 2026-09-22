import { httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * SEO: `/sitemap.xml` dinamis & `/robots.txt`
 *
 * Katalog tumbuh setiap ada mitra baru, jadi sitemap dibangun on-request dari
 * DB (mitra aktif + halaman statis) alih-alih file statis yang cepat basi.
 * Setiap kali mitra baru bergabung, Google menemukan halamannya lewat
 * sitemap ini tanpa pendaftaran manual.
 *
 * Env `SITE_URL` = origin frontend produksi (mis. https://sumenepkerja.com).
 * Setel via: `bunx convex env set SITE_URL https://sumenepkerja.com`
 */

const FALLBACK_SITE_URL = "https://sumenepkerja.com";
const MAX_SITEMAP_VENDORS = 2000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Origin frontend untuk entri `<loc>` sitemap. Logika sama dengan share.ts
 * (http(s) absolut; localhost untuk dev; domain produksi yang dikenal),
 * tanpa console.error karena dipanggil dari internal query.
 */
function resolveSiteUrl(rawEnv: string | undefined): string {
  const raw = (rawEnv ?? FALLBACK_SITE_URL).replace(/\/$/, "");
  try {
    const parsed = new URL(raw);
    const isHttp = parsed.protocol === "https:" || parsed.protocol === "http:";
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isProduction = parsed.hostname === "sumenepkerja.com";
    if (!isHttp || (!isLocal && !isProduction)) {
      return FALLBACK_SITE_URL;
    }
    return raw;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** Tanggal ISO (YYYY-MM-DD) untuk elemen <lastmod>. */
function isoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Entri tunggal <url> dalam sitemap. */
interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

// ---------------------------------------------------------------------------
// Internal queries (tidak bisa dipanggil dari klien — hanya untuk sitemap)
// ---------------------------------------------------------------------------

export const listSitemapVendors = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .order("desc")
      .take(MAX_SITEMAP_VENDORS)
      .then((vendors) =>
        vendors.map((v) => ({
          slug: v.slug,
          lastmod: isoDate(v._creationTime),
        })),
      );
  },
});

/** Slug semua kategori untuk entri `/kategori/<slug>` di sitemap. */
export const listCategorySlugs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    return categories
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((c) => c.slug);
  },
});

/** Slug semua kecamatan untuk entri `/kecamatan/<slug>` di sitemap (hyperlocal). */
export const listDistrictSlugs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const districts = await ctx.db.query("districts").collect();
    return districts
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((d) => d.slug);
  },
});

// ---------------------------------------------------------------------------
// HTTP actions
// ---------------------------------------------------------------------------

export const sitemap = httpAction(async (ctx) => {
  const siteUrl = resolveSiteUrl(process.env.SITE_URL);

  // Halaman statis yang mengandung seluruh direktori + katalog.
  const staticEntries: SitemapEntry[] = [
    { loc: siteUrl, changefreq: "daily", priority: "1.0" },
    { loc: `${siteUrl}/kategori`, changefreq: "weekly", priority: "0.9" },
  ];

  const vendors = await ctx.runQuery(internal.seo.listSitemapVendors, {});
  const categorySlugs = await ctx.runQuery(internal.seo.listCategorySlugs, {});
  const districtSlugs = await ctx.runQuery(internal.seo.listDistrictSlugs, {});

  const categoryEntries: SitemapEntry[] = categorySlugs.map((slug) => ({
    loc: `${siteUrl}/kategori/${encodeURIComponent(slug)}`,
    changefreq: "weekly",
    priority: "0.8",
  }));

  // Hyperlocal: halaman landing per kecamatan (27 se-Kabupaten Sumenep).
  const districtEntries: SitemapEntry[] = [
    { loc: `${siteUrl}/kecamatan`, changefreq: "weekly", priority: "0.8" },
    ...districtSlugs.map((slug) => ({
      loc: `${siteUrl}/kecamatan/${encodeURIComponent(slug)}`,
      changefreq: "weekly" as const,
      priority: "0.7",
    })),
  ];

  const vendorEntries: SitemapEntry[] = vendors.map((v) => ({
    loc: `${siteUrl}/v/${encodeURIComponent(v.slug)}`,
    lastmod: v.lastmod,
    changefreq: "weekly",
    priority: "0.7",
  }));

  const allEntries = [
    ...staticEntries,
    ...categoryEntries,
    ...districtEntries,
    ...vendorEntries,
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    allEntries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${escapeXml(e.loc)}</loc>\n` +
          (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
          `    <changefreq>${e.changefreq}</changefreq>\n` +
          `    <priority>${e.priority}</priority>\n` +
          `  </url>\n`,
      )
      .join("") +
    `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const robots = httpAction(async () => {
  const siteUrl = resolveSiteUrl(process.env.SITE_URL);

  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    // Halaman privat / utilitas internal: tidak ada nilai indeks bagi publik.
    `Disallow: /admin\n` +
    `Disallow: /auth\n` +
    `Disallow: /qr\n` +
    `\n` +
    `Sitemap: ${siteUrl}/sitemap.xml\n`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
