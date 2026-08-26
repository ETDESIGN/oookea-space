import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";


// ─── Shareable Review Links ─────────────────────────────────────
// Public, password-protected links for stakeholders without accounts.
// Admins create them; viewers authenticate with the link password.

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const createReviewLink = m({
  args: {
    token: v.string(),
    projectId: v.id("projects"),
    deliverableId: v.optional(v.id("deliverables")),
    title: v.string(),
    password: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, { token, projectId, deliverableId, title, password, expiresInDays }) => {
    const admin = await requireAdmin(ctx, token);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    const { hashPassword } = await import("./users");
    const linkToken = genToken();
    const now = Date.now();
    await ctx.db.insert("reviewLinks", {
      token: linkToken,
      projectId,
      deliverableId,
      title,
      passwordHash: await hashPassword(password),
      createdById: admin._id,
      expiresAt: now + (expiresInDays ?? 30) * 24 * 60 * 60 * 1000,
      views: 0,
      createdAt: now,
    });
    return linkToken;
  },
});

export const revokeReviewLink = m({
  args: { token: v.string(), linkToken: v.string() },
  handler: async (ctx, { token, linkToken }) => {
    await requireAdmin(ctx, token);
    const link = await ctx.db
      .query("reviewLinks")
      .withIndex("by_token", (q) => q.eq("token", linkToken))
      .first();
    if (link) {
      await ctx.db.delete(link._id);
      const comments = await ctx.db
        .query("reviewComments")
        .withIndex("by_link", (q) => q.eq("linkToken", linkToken))
        .collect();
      for (const c of comments) await ctx.db.delete(c._id);
    }
    return true;
  },
});

export const listReviewLinks = q({
  args: { token: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { token, projectId }) => {
    await requireAdmin(ctx, token);
    return await ctx.db
      .query("reviewLinks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
  },
});

// ─── Public access (no session — password is the credential) ────

export const openReviewLink = q({
  args: { linkToken: v.string() },
  handler: async (ctx, { linkToken }) => {
    // Returns metadata only; content requires the password check below.
    const link = await ctx.db
      .query("reviewLinks")
      .withIndex("by_token", (q) => q.eq("token", linkToken))
      .first();
    if (!link || link.expiresAt < Date.now()) return null;
    const project = await ctx.db.get(link.projectId);
    if (!project) return null;
    return {
      title: link.title,
      projectTitle: project.title,
      projectDescription: project.description,
      expiresAt: link.expiresAt,
    };
  },
});

export const unlockReviewLink = m({
  args: { linkToken: v.string(), password: v.string() },
  handler: async (ctx, { linkToken, password }) => {
    const link = await ctx.db
      .query("reviewLinks")
      .withIndex("by_token", (q) => q.eq("token", linkToken))
      .first();
    if (!link || link.expiresAt < Date.now()) return null;

    const { verifyPassword } = await import("./users");
    const { ok } = await verifyPassword(password, link.passwordHash);
    if (!ok) return null;

    // Track view
    await ctx.db.patch(link._id, {
      views: link.views + 1,
      lastViewedAt: Date.now(),
    });

    const project = await ctx.db.get(link.projectId);
    const deliverables = await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", link.projectId))
      .order("asc")
      .collect();

    return {
      title: link.title,
      project: project
        ? {
            title: project.title,
            description: project.description,
            progress: project.progress,
            deadline: project.deadline,
          }
        : null,
      deliverables: deliverables.map((d) => ({
        title: d.title,
        status: d.approvalStatus ?? (d.completed ? "approved" : "pending"),
        approvalNote: d.approvalNote,
      })),
    };
  },
});

export const addReviewComment = m({
  args: { linkToken: v.string(), authorName: v.string(), body: v.string() },
  handler: async (ctx, { linkToken, authorName, body }) => {
    const link = await ctx.db
      .query("reviewLinks")
      .withIndex("by_token", (q) => q.eq("token", linkToken))
      .first();
    if (!link || link.expiresAt < Date.now()) throw new Error("Link expired");

    const now = Date.now();
    await ctx.db.insert("reviewComments", {
      linkToken,
      authorName: authorName.slice(0, 60) || "Anonymous",
      body: body.slice(0, 2000),
      createdAt: now,
    });

    // Notify the creator + log activity
    await ctx.db.insert("notifications", {
      userId: link.createdById,
      type: "project",
      title: `💬 New review comment`,
      body: `${authorName.slice(0, 40)}: ${body.slice(0, 100)}`,
      link: `/admin/projects`,
      read: false,
      createdAt: now,
    });
    const project = await ctx.db.get(link.projectId);
    if (project) {
      await ctx.db.insert("activity", {
        clientId: project.clientId,
        projectId: project._id,
        type: "comment",
        message: `${authorName} commented via review link: "${body.slice(0, 80)}"`,
        createdAt: now,
      });
    }
    return true;
  },
});

export const listReviewComments = q({
  args: { linkToken: v.string() },
  handler: async (ctx, { linkToken }) => {
    return await ctx.db
      .query("reviewComments")
      .withIndex("by_link", (q) => q.eq("linkToken", linkToken))
      .order("asc")
      .collect();
  },
});
