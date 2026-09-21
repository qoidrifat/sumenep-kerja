import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LandmarkOption {
  _id: string;
  name: string;
  slug: string;
}

interface LandmarkPillsProps {
  landmarks: LandmarkOption[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}

/** Filter patokan lokal — warga Sumenep navigasi pakai landmark, bukan radius. */
export function LandmarkPills({ landmarks, activeSlug, onSelect }: LandmarkPillsProps) {
  return (
    <div
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
      role="group"
      aria-label="Pilih patokan lokasi"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={activeSlug === null}
        className={cn(
          "flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-base font-medium transition-colors",
          activeSlug === null
            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700",
        )}
      >
        <MapPin className="size-4 shrink-0" aria-hidden="true" />
        Semua Kota
      </button>

      {landmarks.map((landmark) => {
        const active = activeSlug === landmark.slug;
        return (
          <button
            key={landmark._id}
            type="button"
            onClick={() => onSelect(landmark.slug)}
            aria-pressed={active}
            className={cn(
              "flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-base font-medium transition-colors",
              active
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700",
            )}
          >
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {landmark.name}
          </button>
        );
      })}
    </div>
  );
}
