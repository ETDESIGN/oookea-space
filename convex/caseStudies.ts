import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";

// ─── Case Studies ───────────────────────────────────────────────
// Completed projects curated into an editorial archive. Admin publishes
// a project as a case study with a cover image and story; clients browse
// their own studio's completed work.

export const caseStudies = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);

    // Published case studies — clients see only their own; admins see all
    const all = await ctx.db
      .query("caseStudies")
      .order("desc")
      .collect();

    const clientProjectIds = new Set<string>();
    if (user.role !== "admin") {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
      projects.forEach((p) => clientProjectIds.add(p._id));
    }

    return all.filter((cs) => user.role === "admin" || clientProjectIds.has(cs.projectId));
  },
});

export const publishCaseStudy = m({
  args: {
    token: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    year: v.number(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { token, ...args }) => {
    await requireAdmin(ctx, token);
    // one case study per project: upsert
    const existing = await ctx.db
      .query("caseStudies")
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("caseStudies", { ...args, createdAt: Date.now() });
  },
});

export const unpublishCaseStudy = m({
  args: { token: v.string(), id: v.id("caseStudies") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});
