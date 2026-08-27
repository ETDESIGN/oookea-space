import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";

// ─── Brand Kit ───────────────────────────────────────────────────
// Per-client source of truth for their brand: logos, palette,
// typography, tone of voice. Clients view their own; admins edit any.

export const getBrandKit = q({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const user = await requireUser(ctx, token);
    // Clients can only read their own kit; admins can read anyone's
    const owner = clientId ?? user._id;
    if (user.role !== "admin" && owner !== user._id) throw new Error("FORBIDDEN");
    const kit = await ctx.db
      .query("brandKits")
      .withIndex("by_client", (q) => q.eq("clientId", owner))
      .first();
    return kit ?? null;
  },
});

export const upsertBrandKit = m({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    tagline: v.optional(v.string()),
    primaryLogo: v.optional(v.string()),      // storage URL
    primaryLogoName: v.optional(v.string()),
    monoLogo: v.optional(v.string()),
    monoLogoName: v.optional(v.string()),
    logoLockupNote: v.optional(v.string()),   // usage rules, clear-space, min size
    colors: v.optional(
      v.array(
        v.object({
          name: v.string(),
          hex: v.string(),
          usage: v.optional(v.string()),
        })
      )
    ),
    fonts: v.optional(
      v.array(
        v.object({
          role: v.string(),                    // Display / Body / Mono
          family: v.string(),
          note: v.optional(v.string()),
        })
      )
    ),
    toneOfVoice: v.optional(v.string()),
    usageNotes: v.optional(v.string()),
  },
  handler: async (ctx, { token, clientId, ...kit }) => {
    const user = await requireUser(ctx, token);
    const owner = clientId ?? user._id;
    if (user.role !== "admin" && owner !== user._id) throw new Error("FORBIDDEN");

    const existing = await ctx.db
      .query("brandKits")
      .withIndex("by_client", (q) => q.eq("clientId", owner))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, kit);
      return existing._id;
    }
    return await ctx.db.insert("brandKits", {
      clientId: owner,
      ...kit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
