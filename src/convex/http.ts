import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { shareCard } from "./share";
import { robots, sitemap } from "./seo";

const http = httpRouter();

auth.addHttpRoutes(http);

// Halaman share OG tags per-kartu: /s/<slug> → redirect ke /v/<slug>.
http.route({ pathPrefix: "/s/", method: "GET", handler: shareCard });

// SEO: sitemap.xml dinamis (seluruh mitra aktif) + robots.txt.
http.route({ path: "/sitemap.xml", method: "GET", handler: sitemap });
http.route({ path: "/robots.txt", method: "GET", handler: robots });

export default http;
