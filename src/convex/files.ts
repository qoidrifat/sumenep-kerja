import { mutation } from "./_generated/server";

/** URL upload satu kali pakai untuk foto profil/hasil kerja mitra. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
