// VLY Integrations Configuration
// See /integrations.md for usage documentation
//
// BUG-8 audit: `process.env` tidak tersedia di browser (Vite). Nilai env
// publik harus lewat `import.meta.env` (berawalan VITE_); fallback process.env
// hanya diakses bila global `process` benar-benar ada (konteks Node/SSR),
// sehingga file ini aman diimpor dari kode browser maupun server.

import { createVlyIntegrations } from '@vly-ai/integrations';

/** Baca env var lintas konteks: VITE_XXX (browser) lalu XXX (Node/SSR). */
function envVar(name: string): string | undefined {
  const fromVite = (import.meta.env as Record<string, string | undefined>)[
    `VITE_${name}`
  ];
  if (fromVite) return fromVite;
  if (typeof process !== "undefined") {
    return process.env[name];
  }
  return undefined;
}

export const vly = createVlyIntegrations({
  deploymentToken: envVar("VLY_INTEGRATION_KEY")!,
  debug: envVar("NODE_ENV") === "development",
});
