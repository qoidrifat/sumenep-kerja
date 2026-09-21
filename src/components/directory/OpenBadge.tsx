import { getOpenStatus } from "@/lib/open-hours";
import { cn } from "@/lib/utils";

interface OpenBadgeProps {
  workingHours: string | null | undefined;
  className?: string;
}

/**
 * Badge "Buka/Tutup" otomatis dari teks jam kerja.
 * Tidak merender apa pun bila status tidak bisa disimpulkan —
 * teks jam kerja asli tetap ditampilkan oleh pemanggil.
 */
export function OpenBadge({ workingHours, className }: OpenBadgeProps) {
  const status = getOpenStatus(workingHours);
  if (!status) return null;

  const dotColor = status.open ? "bg-emerald-500" : "bg-gray-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-semibold",
        status.open
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-gray-100 text-gray-600",
        className,
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", dotColor)}
        aria-hidden="true"
      />
      {status.label}
    </span>
  );
}
