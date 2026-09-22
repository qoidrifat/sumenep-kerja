import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Jadwal pemeliharaan (menutup rekomendasi "cron pembersih" pada CRIT-1 audit).
 *
 * Semua target adalah `internalMutation` di src/convex/maintenance.ts, jadi
 * tidak bisa dipanggil dari klien.
 */
const crons = cronJobs();

// Berkas yatim di `_storage` (foto yang diunggah tapi tidak direferensikan
// vendor, mis. pendaftaran dibatalkan di tengah jalan). Berjalan tiap 6 jam.
crons.interval(
  "bersihkan-berkas-yatim",
  { hours: 6 },
  internal.maintenance.cleanupOrphanStorage,
  {},
);

// Sesi dashboard admin yang kedaluwarsa — tiap 1 jam.
crons.interval(
  "bersihkan-sesi-admin-kedaluwarsa",
  { minutes: 60 },
  internal.maintenance.cleanupExpiredSessions,
  {},
);

// Penghitung rate limiter yang jendelanya lewat — tiap 24 jam.
crons.interval(
  "bersihkan-rate-limit-stale",
  { hours: 24 },
  internal.maintenance.cleanupStaleRateLimits,
  {},
);

export default crons;
