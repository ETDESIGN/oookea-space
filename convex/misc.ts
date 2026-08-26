import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, requireAdmin, scopeClientId } from "./auth";
// ─── Modules ────────────────────────────────────────────────────

export const listModules = q({
  args: { token: v.string(), clientId: v.id("users") },
  handler: async (ctx, { token, clientId }) => {
    const user = await requireUser(ctx, token);
    if (user.role !== "admin" && clientId !== user._id) return [];
    return await ctx.db
      .query("modules")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();
  },
});

export const toggleModule = m({
  args: { token: v.string(), id: v.id("modules"), enabled: v.boolean() },
  handler: async (ctx, { token, id, enabled }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, { enabled });
  },
});

export const updateModuleConfig = m({
  args: { token: v.string(), id: v.id("modules"), config: v.any() },
  handler: async (ctx, { token, id, config }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, { config });
  },
});

export const addModule = m({
  args: {
    token: v.string(),
    clientId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.string(),
    embedUrl: v.optional(v.string()),
    config: v.optional(v.any()),
    enabled: v.boolean(),
  },
  handler: async (ctx, { token, ...args }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.insert("modules", { ...args, createdAt: Date.now() });
  },
});

// ─── Activity ───────────────────────────────────────────────────

export const listActivity = q({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, clientId, projectId, limit }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    let results;
    if (scope.clientId) {
      results = await ctx.db
        .query("activity")
        .withIndex("by_client", (q) => q.eq("clientId", scope.clientId!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db.query("activity").order("desc").collect();
    }
    if (projectId) {
      results = results.filter((a) => a.projectId === projectId);
    }
    if (limit) {
      results = results.slice(0, limit);
    }
    return results;
  },
});

export const logActivity = m({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    type: v.union(v.literal("comment"), v.literal("update"), v.literal("upload"), v.literal("milestone"), v.literal("invoice")),
    message: v.string(),
  },
  handler: async (ctx, { token, ...args }) => {
    // userId comes from the session, never from the caller
    const user = await requireUser(ctx, token);
    return await ctx.db.insert("activity", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

// ─── Seed Data ──────────────────────────────────────────────────
// SECURITY: seed functions are disabled in production. They were publicly callable,
// letting anyone wipe the DB via resetAndSeed. Re-enable only for local dev.

export const seed = m({
  args: {},
  handler: async (ctx) => {
    throw new Error("DISABLED: seed functions are blocked in production. Use the Convex dashboard or local dev.");
  },
});

export const resetAndSeed = m({
  args: {},
  handler: async (ctx) => {
    throw new Error("DISABLED: seed functions are blocked in production. Use the Convex dashboard or local dev.");
  },
});
