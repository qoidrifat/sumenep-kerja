import {
  BatteryCharging,
  Building2,
  Car,
  Cpu,
  CookingPot,
  HeartPulse,
  Info,
  KeyRound,
  Landmark,
  MoreHorizontal,
  Package,
  ShieldCheck,
  Signal,
  Smartphone,
  Snowflake,
  Store,
  Tent,
  Truck,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Pemetaan icon_name di tabel categories ke komponen Lucide. */
const ICONS: Record<string, LucideIcon> = {
  Wrench,
  WrenchIcon: Wrench,
  Zap,
  ZapIcon: Zap,
  Snowflake,
  SnowflakeIcon: Snowflake,
  BatteryCharging,
  Car,
  CarIcon: Car,
  Cpu,
  CookingPot,
  KeyRound,
  ShieldCheck,
  Signal,
  SignalIcon: Signal,
  Smartphone,
  SmartphoneIcon: Smartphone,
  Package,
  HeartPulse,
  Landmark,
  Building2,
  Info,
  Store,
  Tent,
  Utensils: UtensilsCrossed,
  UtensilsCrossed,
  Truck,
  MoreHorizontal,
};

export function getCategoryIcon(iconName?: string | null): LucideIcon {
  if (iconName && ICONS[iconName]) return ICONS[iconName];
  return Store;
}

export interface CategoryTheme {
  /** Kelas gradient Tailwind untuk thumbnail/kartu */
  gradient: string;
  /** Kelas chip Tailwind (bg + text + border) */
  chip: string;
}

const THEMES: Record<string, CategoryTheme> = {
  // BUG-6 audit: tema untuk kategori yang tidak ada di SEED_CATEGORIES
  // (hajatan-acara, kuliner, transportasi) dihapus. Kategori siap pakai bila
  // nanti benar-benar ditambahkan ke seed.
  "servis-teknik": {
    gradient: "from-blue-500 to-blue-700",
    chip: "border-blue-100 bg-blue-50 text-blue-700",
  },
  "bengkel-kendaraan": {
    gradient: "from-red-500 to-red-700",
    chip: "border-red-100 bg-red-50 text-red-700",
  },
  "toko-elektronik": {
    gradient: "from-cyan-500 to-cyan-700",
    chip: "border-cyan-100 bg-cyan-50 text-cyan-700",
  },
  "toko-hp": {
    gradient: "from-purple-500 to-purple-700",
    chip: "border-purple-100 bg-purple-50 text-purple-700",
  },
  "listrik-pembangkit": {
    gradient: "from-yellow-500 to-amber-600",
    chip: "border-amber-100 bg-amber-50 text-amber-700",
  },
  pendingin: {
    gradient: "from-sky-500 to-sky-700",
    chip: "border-sky-100 bg-sky-50 text-sky-700",
  },
  "telekomunikasi-kurir": {
    gradient: "from-indigo-500 to-indigo-700",
    chip: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
  "rumah-tangga-kunci": {
    gradient: "from-rose-500 to-rose-700",
    chip: "border-rose-100 bg-rose-50 text-rose-700",
  },
  "layanan-telekomunikasi": {
    gradient: "from-indigo-500 to-indigo-700",
    chip: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
  "jasa-kurir": {
    gradient: "from-amber-500 to-amber-700",
    chip: "border-amber-100 bg-amber-50 text-amber-700",
  },
  umum: {
    gradient: "from-slate-500 to-slate-700",
    chip: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const FALLBACK: CategoryTheme = {
  gradient: "from-blue-500 to-blue-700",
  chip: "border-blue-100 bg-blue-50 text-blue-700",
};

export function getCategoryTheme(slug?: string | null): CategoryTheme {
  if (slug && THEMES[slug]) return THEMES[slug];
  return FALLBACK;
}
