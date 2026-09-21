/** Format angka menjadi Rupiah tanpa desimal, contoh: 30000 -> "Rp30.000" */
export function formatRupiah(value: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}
