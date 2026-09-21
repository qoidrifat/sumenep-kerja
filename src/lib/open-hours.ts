/**
 * Status buka/tutup otomatis dari teks jam kerja bebas.
 *
 * `workingHours` diisi warga sebagai teks bebas ("Tutup pukul 21.00",
 * "Buka 24 jam", "Istirahat 12.00, buka kembali 13.00"), jadi parser ini
 * best-effort dan KONSERVATIF: hanya mengklaim buka/tutup bila polanya
 * jelas. Bila tidak bisa disimpulkan, kembalikan `null` agar UI tidak
 * menampilkan badge yang salah (teks asli tetap ditampilkan).
 */

export type OpenStatus =
  | { open: true; label: string }
  | { open: false; label: string };

const DAY_NAMES =
  /senin|selasa|rabu|kamis|jum[ae]'?at|sabtu|minggu|ahad/i;

function toMinutes(hour: string, minute: string): number {
  return Number(hour) * 60 + Number(minute);
}

function formatHour(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}.${minute}`;
}

/**
 * Menyimpulkan status buka/tutup dari teks jam kerja.
 *
 * @param workingHours teks jam kerja (boleh null/undefined)
 * @param now waktu acuan — default waktu perangkat saat ini (WIB diasumsikan
 *   dari zona waktu perangkat warga Sumenep). Parameter ini ada agar mudah
 *   diuji.
 * @returns status + label, atau `null` bila tidak bisa disimpulkan.
 */
export function getOpenStatus(
  workingHours: string | null | undefined,
  now: Date = new Date(),
): OpenStatus | null {
  if (!workingHours || !workingHours.trim()) return null;
  const text = workingHours.trim();

  // "Buka 24 jam" — selalu buka.
  if (/buka\s*24\s*jam/i.test(text)) {
    return { open: true, label: "Buka 24 Jam" };
  }

  // Jadwal menyebut hari tertentu ("Tutup Selasa ...", "Buka Sabtu ...") —
  // terlalu ambigu untuk disimpulkan tanpa tanggal. Menyerah dengan aman.
  if (DAY_NAMES.test(text)) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Format kanonis dari formulir /daftar: "Buka 08.00 - Tutup 17.00".
  // Satu-satunya format yang intervalnya diketahui pasti kedua ujungnya.
  const rangeMatch = text.match(
    /buka\s*(pukul\s*)?(\d{1,2})[.:](\d{2})\s*[-–]\s*tutup\s*(pukul\s*)?(\d{1,2})[.:](\d{2})/i,
  );
  if (rangeMatch) {
    const [, , openH, openM, , closeH, closeM] = rangeMatch;
    const open = toMinutes(openH, openM);
    const close = toMinutes(closeH, closeM);
    const overnight = close <= open;
    const isOpen = overnight
      ? nowMinutes >= open || nowMinutes < close
      : nowMinutes >= open && nowMinutes < close;
    if (isOpen) {
      return {
        open: true,
        label: `Buka · Tutup ${formatHour(closeH, closeM)}`,
      };
    }
    if (!overnight && nowMinutes < open) {
      return {
        open: false,
        label: `Tutup · Buka ${formatHour(openH, openM)}`,
      };
    }
    return { open: false, label: "Tutup Sekarang" };
  }

  // "Istirahat 12.00, buka kembali 13.00" — sedang istirahat bila `now`
  // berada dalam rentang istirahat.
  const breakMatch = text.match(
    /istirahat\s*(\d{1,2})[.:](\d{2})\s*,?\s*buka kembali\s*(\d{1,2})[.:](\d{2})/i,
  );
  if (breakMatch) {
    const [, startH, startM, endH, endM] = breakMatch;
    if (
      nowMinutes >= toMinutes(startH, startM) &&
      nowMinutes < toMinutes(endH, endM)
    ) {
      return {
        open: false,
        label: `Istirahat · Buka ${formatHour(endH, endM)}`,
      };
    }
    // Di luar jam istirahat — lanjut ke aturan jam tutup bila ada.
  }

  // "Tutup pukul 21.00" — buka bila sekarang sebelum jam tutup.
  const closeMatch = text.match(
    /tutup\s*(pukul\s*)?(\d{1,2})[.:](\d{2})/i,
  );
  if (closeMatch) {
    const [, , closeH, closeM] = closeMatch;
    if (nowMinutes < toMinutes(closeH, closeM)) {
      return {
        open: true,
        label: `Buka · Tutup ${formatHour(closeH, closeM)}`,
      };
    }
    return { open: false, label: "Tutup Sekarang" };
  }

  // Hanya "Buka pukul X" tanpa jam tutup, atau pola tak dikenal —
  // tidak cukup info untuk mengklaim.
  return null;
}
