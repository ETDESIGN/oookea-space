import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";

// ─── Deliverable Approvals ──────────────────────────────────────
// Clients approve / reject / request changes on deliverables. Every decision is
// signed with the client's identity + timestamp. Progress auto-advances from
// approved ratios. Admins are notified of every decision.

export const decideDeliverable = m({
  args: {
    token: v.string(),
    id: v.id("deliverables"),
    decision: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("changes_requested")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, decision, note }) => {
    const user = await requireUser(ctx, token);
    const deliverable = await ctx.db.get(id);
    if (!deliverable) throw new Error("Deliverable not found");
    const project = await ctx.db.get(deliverable.projectId);
    if (!project) throw new Error("Project not found");

    // Only the owning client (or admin) may decide
    if (user.role !== "admin" && project.clientId !== user._id) {
      throw new Error("FORBIDDEN");
    }
    // Admins record decisions on behalf of clients but cannot self-approve
    // their own studio work silently — still allowed, just signed as admin.

    const now = Date.now();
    await ctx.db.patch(id, {
      approvalStatus: decision,
      approvedBy: user._id,
      approvedAt: now,
      approvalNote: note,
      completed: decision === "approved",
    });

    // Recompute project progress from approved deliverables
    const all = await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q2) => q2.eq("projectId", deliverable.projectId))
      .collect();
    const approved = all.filter((d) => d.approvalStatus === "approved").length;
    const progress = all.length > 0 ? Math.round((approved / all.length) * 100) : 0;
    await ctx.db.patch(deliverable.projectId, { progress, updatedAt: now });

    // Activity + notification for admins
    await ctx.db.insert("activity", {
      clientId: project.clientId,
      projectId: project._id,
      type: "milestone",
      message: `${user.name} ${decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "requested changes on"} "${deliverable.title}"${note ? ` — "${note.slice(0, 80)}"` : ""}`,
      userId: user._id,
      createdAt: now,
    });

    if (user.role !== "admin") {
      const admins = await ctx.db
        .query("users")
        .filter((qa) => qa.eq(qa.field("role"), "admin"))
        .collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "project",
          title: `${decision === "approved" ? "✅" : decision === "rejected" ? "❌" : "✏️"} ${deliverable.title}`,
          body: `${user.name} ${decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "requested changes on"} "${deliverable.title}"`,
          link: `/admin/projects`,
          read: false,
          createdAt: now,
        });
      }
    } else {
      await ctx.db.insert("notifications", {
        userId: project.clientId,
        type: "project",
        title: `Deliverable update: ${deliverable.title}`,
        body: `Your team marked "${deliverable.title}" as ${decision}`,
        link: `/projects/${project.slug}`,
        read: false,
        createdAt: now,
      });
    }

    return { progress };
  },
});

/** Admin: open a deliverable for client review (sets status pending). */
export const openForReview = m({
  args: { token: v.string(), id: v.id("deliverables") },
  handler: async (ctx, { token, id }) => {
    const admin = await requireAdmin(ctx, token);
    const d = await ctx.db.get(id);
    if (!d) throw new Error("Deliverable not found");
    const now = Date.now();
    await ctx.db.patch(id, { approvalStatus: "pending", approvedBy: undefined, approvedAt: undefined, approvalNote: undefined });
    const project = await ctx.db.get(d.projectId);
    if (project) {
      await ctx.db.insert("notifications", {
        userId: project.clientId,
        type: "project",
        title: `Ready for your review: ${d.title}`,
        body: `${admin.name} sent "${d.title}" for your approval.`,
        link: `/projects/${project.slug}`,
        read: false,
        createdAt: now,
      });
    }
    return true;
  },
});

export const listApprovals = q({
  args: { token: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { token, projectId }) => {
    const user = await requireUser(ctx, token);
    const project = await ctx.db.get(projectId);
    if (!project) return [];
    if (user.role !== "admin" && project.clientId !== user._id) return [];
    return await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q2) => q2.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});
