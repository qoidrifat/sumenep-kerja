import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { shareCard } from "./share";

const http = httpRouter();

auth.addHttpRoutes(http);

// Halaman share OG tags per-kartu: /s/<slug> → redirect ke /v/<slug>.
http.route({ pathPrefix: "/s/", method: "GET", handler: shareCard });

export default http;
