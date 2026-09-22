/**
 * Override env khusus KLIEN (browser). JANGAN diimpor dari folder `convex/`
 * atau modul yang diimpor backend — `import.meta` membuat push Convex gagal
 * ("Uncaught TypeError: import.meta unsupported").
 */
import { ADMIN_WHATSAPP_NUMBER as ADMIN_WHATSAPP_NUMBER_FALLBACK } from "./config";

/**
 * Nomor WhatsApp admin aktif — dari VITE_ADMIN_WHATSAPP_NUMBER bila di-set,
 * selain itu fallback konstanta produksi (lib/config.ts).
 */
export const ADMIN_WHATSAPP_NUMBER =
  (import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER as string | undefined)?.replace(
    /\D/g,
    "",
  ) || ADMIN_WHATSAPP_NUMBER_FALLBACK;
