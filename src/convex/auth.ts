// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { emailOtp } from "./auth/emailOtp";

// BUG-7 audit: provider Anonymous dikeluarkan. Sebelumnya siapa pun bisa
// membuat akun anonim tanpa batas untuk fitur yang tidak membutuhkan akun —
// murni menambah attack surface tanpa manfaat bisnis. Jalur masuk yang
// tersisa: OTP email (emailOtp) dan token federasi Freebuff (auth.config.ts).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp],
});