import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Halaman share per-kartu (`/s/<slug>`) untuk pratinjau link WhatsApp.
 *
 * Crawler WhatsApp tidak menjalankan JavaScript, jadi SPA tidak bisa
 * menyajikan OG tags dinamis sendiri. Route ini mengembalikan HTML ringan
 * berisi `og:title/description/image` + redirect (meta refresh + JS) ke
 * halaman kartu `/v/<slug>` untuk manusia.
 *
 * Env `SITE_URL` = origin frontend (mis. https://sumenepkerja.com).
 * Setel via: `bunx convex env set SITE_URL https://sumenepkerja.com`
 */

const FALLBACK_SITE_URL = "https://sumenepkerja.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n: number): string {
  return `Mulai Rp${new Intl.NumberFormat("id-ID").format(n)}`;
}

function sharePage(args: {
  title: string;
  description: string;
  image: string;
  shareUrl: string;
  cardUrl: string;
}): Response {
  const title = escapeHtml(args.title);
  const description = escapeHtml(args.description);
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="SumenepKerja" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${escapeHtml(args.image)}" />
<meta property="og:url" content="${escapeHtml(args.shareUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${escapeHtml(args.cardUrl)}" />
<meta http-equiv="refresh" content="0;url=${escapeHtml(args.cardUrl)}" />
</head>
<body>
<p>Membuka kartu usaha… <a href="${escapeHtml(args.cardUrl)}">klik di sini bila tidak otomatis</a>.</p>
<script>location.replace(${JSON.stringify(args.cardUrl)});</script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const shareCard = httpAction(async (ctx, req) => {
  const reqUrl = new URL(req.url);
  const slug = decodeURIComponent(
    reqUrl.pathname.replace(/^\/s\//, "").split("/")[0] ?? "",
  ).trim();
  const siteUrl = (process.env.SITE_URL ?? FALLBACK_SITE_URL).replace(
    /\/$/,
    "",
  );

  if (!slug) {
    return new Response(null, { status: 302, headers: { Location: siteUrl } });
  }

  const cardUrl = `${siteUrl}/v/${encodeURIComponent(slug)}`;
  const shareUrl = `${reqUrl.origin}/s/${encodeURIComponent(slug)}`;
  const vendor = await ctx.runQuery(api.vendors.getBySlug, { slug });

  if (!vendor) {
    return sharePage({
      title: "Usaha tidak ditemukan — SumenepKerja",
      description:
        "Tautan mungkin salah atau usaha sudah tidak aktif. Cari jasa & usaha lokal Sumenep di SumenepKerja.",
      image: `${siteUrl}/logo-sumenepkerja.png`,
      shareUrl,
      cardUrl: siteUrl,
    });
  }

  const parts = [vendor.categoryName, vendor.addressText];
  if (vendor.landmarkName) {
    parts.push(
      /^dekat\s/i.test(vendor.landmarkName)
        ? vendor.landmarkName
        : `dekat ${vendor.landmarkName}`,
    );
  }
  if (vendor.minPrice != null && vendor.minPrice > 0) {
    parts.push(formatPrice(vendor.minPrice));
  }

  return sharePage({
    title: `${vendor.name} — ${vendor.categoryName} | SumenepKerja`,
    description: parts.join(" · "),
    image: vendor.imageUrl ?? `${siteUrl}/logo-sumenepkerja.png`,
    shareUrl,
    cardUrl,
  });
});
