/**
 * Otorisasi dashboard admin.
 *
 * Dua jalur akses, keduanya tidak pernah menyimpan atau mengirim rahasia mentah
 * berulang kali:
 *
 * 1. **Jalur utama (disarankan):** pengguna `@convex-dev/auth` dengan
 *    `users.role === "admin"` — tanpa rahasia bersama sama sekali.
 * 2. **Jalur cadangan:** passphrase dashboard ditukar dengan token sesi acak
 *    256-bit saat login. Panggilan berikutnya mengirim token, bukan passphrase.
 *    Database hanya menyimpan SHA-256 token; passphrase dibandingkan
 *    constant-time terhadap hash dari env.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ROLES } from "../schema";

/** Masa berlaku sesi dashboard: 12 jam. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Pesan seragam untuk semua kegagalan autentikasi (anti user-enumeration). */
export const INVALID_CREDENTIALS = "Kredensial tidak valid.";

type DbCtx = QueryCtx | MutationCtx;

/**
 * Perbandingan string dalam waktu konstan.
 *
 * Panjang berbeda tetap diproses sampai `max(len)` dengan padding nol, sehingga
 * waktu eksekusi tidak membocorkan panjang rahasia (anti timing oracle).
 * `diff` di-seed dengan XOR panjang agar panjang berbeda selalu gagal.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  const len = Math.max(ab.length, bb.length, 1);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** SHA-256 dalam heksadesimal huruf kecil. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token acak 256-bit (64 karakter heksadesimal) dari CSPRNG. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash passphrase yang diharapkan, dari env deployment.
 *
 * `ADMIN_PASSCODE_HASH` (SHA-256 heksadesimal) adalah bentuk yang disarankan.
 * `ADMIN_PASSCODE` polos tetap didukung agar deployment lama tidak langsung
 * mati; nilainya di-hash saat runtime sehingga tidak pernah ikut tersimpan.
 */
async function expectedPasscodeHash(): Promise<string | null> {
  const configuredHash = process.env.ADMIN_PASSCODE_HASH;
  if (configuredHash) return configuredHash.trim().toLowerCase();

  const plain = process.env.ADMIN_PASSCODE;
  if (plain) {
    console.warn(
      "[adminAuth] ADMIN_PASSCODE polos terdeteksi. Sebaiknya ganti ke " +
        "ADMIN_PASSCODE_HASH (SHA-256) agar passphrase tidak tersimpan sebagai " +
        "env mentah.",
    );
    return await sha256Hex(plain);
  }
  return null;
}

/** True bila dashboard admin sudah dikonfigurasi sama sekali. */
export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE_HASH || process.env.ADMIN_PASSCODE);
}

/**
 * Tukar passphrase dengan token sesi. Passphrase hanya melewati jaringan satu
 * kali; setelah ini klien memegang token yang punya masa berlaku.
 */
export async function createAdminSession(
  ctx: MutationCtx,
  passcode: string,
): Promise<{ token: string; expiresAt: number }> {
  const expectedHash = await expectedPasscodeHash();
  if (!expectedHash) {
    // Fail-closed TANPA membocorkan nama env var atau perintah shell.
    throw new ConvexError(
      "Dashboard admin belum diaktifkan. Hubungi pemelihara sistem.",
    );
  }

  const providedHash = await sha256Hex(passcode);
  if (!timingSafeEqual(providedHash, expectedHash)) {
    throw new ConvexError(INVALID_CREDENTIALS);
  }

  const token = generateSessionToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await ctx.db.insert("adminSessions", { tokenHash, createdAt: now, expiresAt });

  return { token, expiresAt };
}

/** Validasi token sesi terhadap database (read-only, aman untuk query). */
export async function verifyAdminSession(
  ctx: DbCtx,
  sessionToken: string | undefined,
): Promise<boolean> {
  if (!sessionToken) return false;

  const tokenHash = await sha256Hex(sessionToken);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();

  if (!session) return false;
  return session.expiresAt > Date.now();
}

/**
 * Gerbang otorisasi untuk seluruh fungsi dashboard admin.
 * Melempar `ConvexError` bila pemanggil bukan admin.
 *
 * Aman dipanggil dari query maupun mutation — implementasinya read-only.
 */
export async function assertAdmin(
  ctx: DbCtx,
  sessionToken: string | undefined,
): Promise<void> {
  // Jalur 1: pengguna terautentikasi dengan role admin.
  const userId = await getAuthUserId(ctx);
  if (userId) {
    const user = await ctx.db.get(userId);
    if (user?.role === ROLES.ADMIN) return;
  }

  // Jalur 2: sesi dashboard.
  if (await verifyAdminSession(ctx, sessionToken)) return;

  throw new ConvexError(INVALID_CREDENTIALS);
}

/** Cabut satu sesi (logout). Mengembalikan `true` bila ada sesi yang dihapus. */
export async function revokeAdminSession(
  ctx: MutationCtx,
  sessionToken: string,
): Promise<boolean> {
  const tokenHash = await sha256Hex(sessionToken);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session) return false;
  await ctx.db.delete(session._id);
  return true;
}

