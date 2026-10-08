import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireAdmin } from "./auth";

// ─── Mission Control: Apps (the fleet / launcher) ──────────────────
// Admin-managed registry of every project/product/infra app.
// The UI derives live health from heartbeats + Vercel snapshot events.

export const listApps = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("apps").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

const appShape = {
  name: v.string(),
  description: v.optional(v.string()),
  category: v.union(
    v.literal("client"),
    v.literal("product"),
    v.literal("internal"),
    v.literal("infra"),
    v.literal("trading")
  ),
  icon: v.optional(v.string()),
  iconUrl: v.optional(v.string()),
  url: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
  vercelProject: v.optional(v.string()),
  heartbeatName: v.optional(v.string()),
  statusOverride: v.optional(
    v.union(
      v.literal("ok"),
      v.literal("issue"),
      v.literal("offline"),
      v.literal("planned")
    )
  ),
  statusNote: v.optional(v.string()),
  pinned: v.optional(v.boolean()),
  order: v.number(),
};

/** Upsert a batch by name (idempotent seeding + editing). */
export const upsertApps = m({
  args: { token: v.string(), apps: v.array(v.object(appShape)) },
  handler: async (ctx, { token, apps }) => {
    await requireAdmin(ctx, token);
    const now = Date.now();
    const results: string[] = [];
    for (const app of apps) {
      const existing = await ctx.db
        .query("apps")
        .filter((f) => f.eq(f.field("name"), app.name))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...app, updatedAt: now });
        results.push(existing._id);
      } else {
        results.push(
          await ctx.db.insert("apps", { ...app, createdAt: now, updatedAt: now })
        );
      }
    }
    return results;
  },
});

export const removeApp = m({
  args: { token: v.string(), id: v.id("apps") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});
