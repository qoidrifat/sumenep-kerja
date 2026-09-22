import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import { registerServiceWorker } from "@/lib/pwa";
import { InstrumentationProvider } from "@/instrumentation";

registerServiceWorker();

// Lazy load route components for better code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Kategori = lazy(() => import("./pages/Kategori.tsx"));
const Daftar = lazy(() => import("./pages/Daftar.tsx"));
const VendorProfile = lazy(() => import("./pages/VendorProfile.tsx"));
const StickerQR = lazy(() => import("./pages/StickerQR.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-app flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-app flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// ---------------------------------------------------------------------------
// MED-6 audit: komunikasi postMessage dengan halaman host dibatasi origin.
//
// Sebelumnya: (a) jejak navigasi dikirim ke parent dengan target "*" — situs
// mana pun yang meng-embed aplikasi ini menerima riwayat navigasi pengguna;
// (b) pesan "navigate" inbound diterima tanpa cek origin — situs mana pun
// bisa mengendalikan tombol back/forward pengguna.
// ---------------------------------------------------------------------------
const ALLOWED_HOST_ORIGINS = new Set([
  "https://freebuff.com",
  "https://app.vly.sh",
  "https://vly.sh",
]);

/** Origin parent bila aplikasi di-embed DAN parent ada di daftar izin. */
function allowedParentOrigin(): string | null {
  if (typeof window === "undefined" || window.parent === window) return null;
  try {
    const referrerOrigin = new URL(document.referrer).origin;
    if (ALLOWED_HOST_ORIGINS.has(referrerOrigin)) return referrerOrigin;
    // Embed same-origin (mis. wrapper preview lokal) tetap diizinkan.
    if (referrerOrigin === window.location.origin) return referrerOrigin;
    return null;
  } catch {
    return null;
  }
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    const target = allowedParentOrigin();
    if (!target) return;
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      target,
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Hanya pesan dari parent ter-otorisasi yang diproses.
      if (!ALLOWED_HOST_ORIGINS.has(event.origin) && event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      {/* BUG-8 audit: InstrumentationProvider sebelumnya dead code — pelaporan
          error produksi tidak pernah aktif. Dipasang di sini di dalam
          RootErrorBoundary (yang tetap menjadi benteng terakhir) sehingga
          error render + global error/unhandledrejection dilaporkan ke Vly. */}
      <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/kategori" element={<Kategori />} />
              <Route path="/daftar" element={<Daftar />} />
              <Route path="/v/:slug" element={<VendorProfile />} />
              <Route path="/qr" element={<StickerQR />} />
              <Route path="/admin" element={<Admin />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/" />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
      </InstrumentationProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
