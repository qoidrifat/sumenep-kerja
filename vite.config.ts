import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vlyPlugin(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy, which
    // triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    // Enable source maps for better debugging (disable in production if needed)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // BUG-4 audit: `manualChunks` berbentuk objek tidak efektif di sini —
        // entri 'convex-vendor': ['convex'] tidak pernah cocok karena modul yang
        // diimpor adalah subpath (convex/react, convex/browser), sehingga chunk
        // jadi kosong (1 byte) dan react+convex+app menumpuk di index (433 kB).
        // Bentuk FUNGSI memetakan berdasarkan path modul di node_modules.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // React + router: berubah paling jarang → chunk cache jangka panjang.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("node_modules/react-router")
          ) {
            return "react-vendor";
          }
          // Convex client + convex auth (semua subpath convex/*).
          if (
            id.includes("node_modules/convex/") ||
            id.includes("node_modules/@convex-dev/")
          ) {
            return "convex-vendor";
          }
          // Animasi.
          if (id.includes("node_modules/framer-motion")) {
            return "framer-motion";
          }
          // Sisa vendor dibiarkan mengikuti pemecahan otomatis Rollup agar
          // tidak terbentuk chunk kosong / chunk raksasa buatan.
          return undefined;
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'esnext',
    // Minify options - using esbuild (faster than terser)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    // Only scan the app entry HTML; avoids crawling unrelated *.html files
    // if a legacy snapshot accidentally contains leaked package folders.
    entries: ['index.html'],
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      '@convex-dev/auth/react',
      'framer-motion',
    ],
  },
  // Performance hints
  server: {
    // LOW-2 audit: bind ke semua interface HANYA di lingkungan WebContainer
    // (VLY_ENV). Untuk dev lokal, batasi ke localhost agar dev server tidak
    // terbuka ke seluruh jaringan LAN.
    host: process.env.VLY_ENV ? true : "localhost",
    port: 5173,
    // Keep HMR on, but disable full-screen error overlay
    hmr: {
      overlay: false,
    },
  },
});
