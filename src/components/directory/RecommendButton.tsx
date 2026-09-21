import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, Loader2, ThumbsUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface RecommendButtonProps {
  vendorId: string;
  vendorSlug: string;
  recommendCount: number;
}

function storageKey(slug: string): string {
  return `sk-recommended:${slug}`;
}

function hasVoted(slug: string): boolean {
  try {
    return localStorage.getItem(storageKey(slug)) === "1";
  } catch {
    return false;
  }
}

/**
 * Tombol "jempol" rekomendasi warga — satu ketukan per perangkat, tanpa akun.
 * Anti-spam best-effort via localStorage; kegagalan jaringan ditelan diam-diam
 * dan tombol tetap bisa ditekan ulang. Counter ter-update otomatis (reaktif).
 */
export function RecommendButton({
  vendorId,
  vendorSlug,
  recommendCount,
}: RecommendButtonProps) {
  const recommend = useMutation(api.vendors.recommendVendor);
  const [voted, setVoted] = useState(() => hasVoted(vendorSlug));
  const [busy, setBusy] = useState(false);

  const countText = new Intl.NumberFormat("id-ID").format(recommendCount);

  const handleClick = async () => {
    if (voted || busy) return;
    setBusy(true);
    try {
      await recommend({ vendorId: vendorId as Id<"vendors"> });
      try {
        localStorage.setItem(storageKey(vendorSlug), "1");
      } catch {
        // Penyimpanan penuh/dibatasi — suara sudah tercatat di server.
      }
      setVoted(true);
    } catch {
      // Gagal diam-diam — pengguna bisa menekan ulang.
    } finally {
      setBusy(false);
    }
  };

  if (voted) {
    return (
      <div className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-700">
        <Check className="size-5" aria-hidden="true" />
        Anda merekomendasikan · {countText} warga
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className={cn(
        "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700",
        busy && "cursor-wait opacity-70",
      )}
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <ThumbsUp className="size-5" aria-hidden="true" />
      )}
      {busy ? "Mengirim…" : `Rekomendasikan · ${countText} warga`}
    </button>
  );
}
