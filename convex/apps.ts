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
  probeExclude: v.optional(v.boolean()),
  brandIcon: v.optional(v.string()),
  links: v.optional(
    v.array(
      v.object({
        label: v.string(),
        url: v.string(),
        kind: v.optional(v.string()), // app|repo|staging|dashboard|docs|chat|web
      })
    )
  ),
  info: v.optional(
    v.object({
      purpose: v.optional(v.string()),
      stack: v.optional(v.array(v.string())),
      domains: v.optional(v.array(v.string())),
      launched: v.optional(v.string()),
      owner: v.optional(v.string()),
      notes: v.optional(v.string()),
      blocks: v.optional(v.array(v.object({ title: v.string(), body: v.string() }))),
    })
  ),
  publicStatus: v.optional(
    v.object({
      slug: v.string(),
      enabled: v.boolean(),
      brandName: v.string(),
      logoUrl: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      tagline: v.optional(v.string()),
    })
  ),
  folders: v.optional(
    v.object({
      local: v.optional(v.string()),
      remote: v.optional(v.string()),
      docs: v.optional(v.string()),
      obsidian: v.optional(v.string()),
    })
  ),
  access: v.optional(
    v.object({
      demo: v.optional(
        v.object({
          url: v.optional(v.string()),
          user: v.optional(v.string()),
          pass: v.optional(v.string()),
          note: v.optional(v.string()),
        })
      ),
      admin: v.optional(
        v.object({
          url: v.optional(v.string()),
          user: v.optional(v.string()),
          pass: v.optional(v.string()),
          note: v.optional(v.string()),
        })
      ),
      keysRef: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
  ),
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
