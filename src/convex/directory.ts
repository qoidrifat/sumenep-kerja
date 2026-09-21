import { query } from "./_generated/server";

/** Semua kategori layanan, diurutkan berdasarkan sortOrder. */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("categories").collect();
    return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

/** Semua patokan lokasi (landmark) di Sumenep. */
export const listLandmarks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("landmarks").collect();
  },
});
