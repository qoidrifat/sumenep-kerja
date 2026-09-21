import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "sk-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Banner "Pasang di HP" — muncul hanya bila browser menyediakan install
 * prompt (Chrome/Android). Setelah dipasang atau ditutup, tidak muncul lagi.
 * iOS tidak menyediakan event ini; di sana PWA dipasang manual via Share.
 */
export function InstallBanner() {
  const [deferred, setDeferred] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Penyimpanan dibatasi — cukup sembunyikan sesi ini.
    }
    setDismissed(true);
  };

  const install = async () => {
    await deferred.prompt().catch(() => {});
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") dismiss();
    setDeferred(null);
  };

  return (
    <section aria-label="Pasang aplikasi" className="px-4 pt-3">
      <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Download className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900">Pasang di HP</p>
          <p className="text-sm text-gray-600">
            Buka SumenepKerja lebih cepat, tetap terbuka saat sinyal lemah.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void install()}
          className="flex min-h-[48px] shrink-0 items-center rounded-xl bg-blue-600 px-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Pasang
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup tawaran pasang aplikasi"
          className="flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-blue-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
