import { useMutation } from "convex/react";
import { MessageCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  vendorId: string;
  vendorName: string;
  phoneNumber: string;
  categorySlug?: string;
  landmarkName?: string | null;
  itemOrIssue?: string;
  className?: string;
}

/**
 * Tombol konversi utama: hijau WhatsApp penuh dengan draf pesan otomatis.
 * Klik dicatat non-blocking (tidak menunda pembukaan WhatsApp).
 */
export function WhatsAppButton({
  vendorId,
  vendorName,
  phoneNumber,
  categorySlug,
  landmarkName,
  itemOrIssue,
  className,
}: WhatsAppButtonProps) {
  const incrementClick = useMutation(api.vendors.incrementWhatsAppClick);

  const waUrl = generateWhatsAppLink({
    phoneNumber,
    vendorName,
    categorySlug,
    landmarkName: landmarkName ?? undefined,
    itemOrIssue,
  });

  const handleClick = () => {
    // Non-blocking: pelacakan gagal diam-diam, pengguna tetap menuju WhatsApp.
    incrementClick({ vendorId: vendorId as Id<"vendors"> }).catch(() => {});
  };

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#1FB857] active:bg-[#1AA84E]",
        className,
      )}
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      Chat WhatsApp Sekarang
    </a>
  );
}
