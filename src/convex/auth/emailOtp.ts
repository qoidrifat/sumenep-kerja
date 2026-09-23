import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

/**
 * Endpoint pengiriman OTP (relay email milik Freebuff).
 *
 * Klarifikasi resmi tim Freebuff (laporan Discord, Sep 2026): key
 * `fb_email_*` BUKAN secret milik project ini, melainkan SHARED KEY milik
 * Freebuff untuk relay sign-in email — bagian dari template standar yang
 * dibawa semua aplikasi Freebuff. Keberadaannya di repository (termasuk git
 * history, commit 75692b9) TIDAK membocorkan apa pun tentang project,
 * deployment Convex, maupun user. Nothing to revoke, nothing to rotate;
 * relay dilindungi abuse controls di sisi Freebuff.
 *
 * Key tetap dibaca dari env (`EMAIL_API_KEY`) dan tidak pernah dicatat ke
 * log sebagai higiene standar — bukan karena key-nya sensitif.
 */
const OTP_ENDPOINT = "https://auth.freebuff.app/send_otp";

/** Batas waktu pengiriman OTP (ms) agar sign-in tidak menggantung. */
const SEND_TIMEOUT_MS = 15_000;

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      // Fail-closed dengan pesan yang tidak membocorkan nama env var.
      throw new Error(
        "Layanan pengiriman kode verifikasi belum dikonfigurasi. Hubungi pemelihara sistem.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

    try {
      const response = await fetch(OTP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          to: email,
          otp: token,
          appName: process.env.VLY_APP_NAME || "SumenepKerja",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Hanya status HTTP yang dicatat — TIDAK ada header/body permintaan,
        // sehingga API key tidak pernah ikut ke pesan error atau log.
        console.error(
          `[emailOtp] Pengiriman OTP gagal dengan status ${response.status}.`,
        );
        throw new Error(
          "Gagal mengirim kode verifikasi. Coba lagi beberapa saat lagi.",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[emailOtp] Pengiriman OTP melewati batas waktu.");
        throw new Error("Pengiriman kode verifikasi terlalu lama. Coba lagi.");
      }
      if (
        error instanceof Error &&
        error.message.startsWith("Gagal mengirim kode verifikasi")
      ) {
        throw error;
      }
      console.error("[emailOtp] Pengiriman OTP gagal (kesalahan jaringan).");
      throw new Error(
        "Gagal mengirim kode verifikasi karena masalah jaringan. Coba lagi.",
      );
    } finally {
      clearTimeout(timeout);
    }
  },
});

