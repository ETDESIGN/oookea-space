import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, requireAdmin, scopeClientId } from "./auth";
// ─── Projects ───────────────────────────────────────────────────

export const listProjects = q({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    if (scope.clientId) {
      return await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", scope.clientId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const getProject = q({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const user = await requireUser(ctx, token);
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!project) return null;
    // Clients may only read their own projects
    if (user.role !== "admin" && project.clientId !== user._id) return null;
    return project;
  },
});

export const createProject = m({
  args: {
    token: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    brief: v.optional(v.string()),
    category: v.string(),
    clientId: v.id("users"),
    startDate: v.string(),
    deadline: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args_) => {
    await requireAdmin(ctx, args_.token);
    const { token: _t, ...args } = args_;
    const now = Date.now();
    return await ctx.db.insert("projects", {
      ...args,
      status: "active",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = m({
  args: {
    token: v.string(),
    id: v.id("projects"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("on-hold"), v.literal("draft"))),
    progress: v.optional(v.number()),
    brief: v.optional(v.string()),
    deadline: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, ...updates }) => {
    await requireAdmin(ctx, token);
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...cleanUpdates, updatedAt: Date.now() });
  },
});

// ─── Deliverables ───────────────────────────────────────────────

export const listDeliverables = q({
  args: { token: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { token, projectId }) => {
    const user = await requireUser(ctx, token);
    const project = await ctx.db.get(projectId);
    if (!project) return [];
    if (user.role !== "admin" && project.clientId !== user._id) return [];
    return await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const addDeliverable = m({
  args: { token: v.string(), projectId: v.id("projects"), title: v.string(), order: v.number() },
  handler: async (ctx, { token, ...args }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.insert("deliverables", {
      ...args,
      completed: false,
    });
  },
});

// Only admins toggle deliverable completion — it's the studio's progress tracker
export const toggleDeliverable = m({
  args: { token: v.string(), id: v.id("deliverables"), completed: v.boolean() },
  handler: async (ctx, { token, id, completed }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, { completed });
  },
});

