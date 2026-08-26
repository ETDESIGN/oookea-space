import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";

// ─── Pin-to-comment on deliverables ─────────────────────────────
// Optional visual annotation layer for deliverables that have an image
// attached (artUrl). The classic deliverable rendering stays untouched.

export const listPins = q({
  args: { token: v.string(), deliverableId: v.id("deliverables") },
  handler: async (ctx, { token, deliverableId }) => {
    const user = await requireUser(ctx, token);
    const d = await ctx.db.get(deliverableId);
    if (!d) return [];
    const project = await ctx.db.get(d.projectId);
    if (!project) return [];
    if (user.role !== "admin" && project.clientId !== user._id) return [];
    return await ctx.db
      .query("deliverablePins")
      .withIndex("by_deliverable", (q) => q.eq("deliverableId", deliverableId))
      .order("asc")
      .collect();
  },
});

export const addPin = m({
  args: {
    token: v.string(),
    deliverableId: v.id("deliverables"),
    x: v.number(),
    y: v.number(),
    body: v.string(),
  },
  handler: async (ctx, { token, deliverableId, x, y, body }) => {
    const user = await requireUser(ctx, token);
    const d = await ctx.db.get(deliverableId);
    if (!d) throw new Error("Deliverable not found");
    const project = await ctx.db.get(d.projectId);
    if (!project) throw new Error("Project not found");
    if (user.role !== "admin" && project.clientId !== user._id) throw new Error("FORBIDDEN");

    const pinId = await ctx.db.insert("deliverablePins", {
      deliverableId,
      x,
      y,
      authorId: user._id,
      authorName: user.name,
      body: body.slice(0, 500),
      resolved: false,
      createdAt: Date.now(),
    });

    // Notify the other party
    const notifyUserId = user.role === "admin" ? project.clientId : undefined;
    if (user.role === "admin") {
      await ctx.db.insert("notifications", {
        userId: notifyUserId!,
        type: "project",
        title: `New annotation on ${d.title}`,
        body: body.slice(0, 100),
        link: `/projects/${project.slug}`,
        read: false,
        createdAt: Date.now(),
      });
    } else {
      const admins = await ctx.db
        .query("users")
        .filter((qa) => qa.eq(qa.field("role"), "admin"))
        .collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "project",
          title: `📌 ${user.name} annotated ${d.title}`,
          body: body.slice(0, 100),
          link: `/admin/projects`,
          read: false,
          createdAt: Date.now(),
        });
      }
    }
    return pinId;
  },
});

export const togglePinResolved = m({
  args: { token: v.string(), pinId: v.id("deliverablePins"), resolved: v.boolean() },
  handler: async (ctx, { token, pinId, resolved }) => {
    const user = await requireUser(ctx, token);
    const pin = await ctx.db.get(pinId);
    if (!pin) throw new Error("Pin not found");
    const d = await ctx.db.get(pin.deliverableId);
    const project = d ? await ctx.db.get(d.projectId) : null;
    if (!project) throw new Error("Project not found");
    if (user.role !== "admin" && project.clientId !== user._id) throw new Error("FORBIDDEN");
    await ctx.db.patch(pinId, { resolved });
  },
});

// ─── Deliverable art + versions ─────────────────────────────────

export const setDeliverableArt = m({
  args: {
    token: v.string(),
    deliverableId: v.id("deliverables"),
    artUrl: v.string(),
    artName: v.optional(v.string()),
  },
  handler: async (ctx, { token, deliverableId, artUrl, artName }) => {
    const user = await requireUser(ctx, token);
    const d = await ctx.db.get(deliverableId);
    if (!d) throw new Error("Deliverable not found");
    // Admins attach art; clients may too if it's their project
    const project = await ctx.db.get(d.projectId);
    if (!project) throw new Error("Project not found");
    if (user.role !== "admin" && project.clientId !== user._id) throw new Error("FORBIDDEN");

    const version = (d.version ?? 0) + 1;
    await ctx.db.patch(deliverableId, {
      artUrl,
      artName,
      version,
      // new art resets the approval state for re-review
      approvalStatus: "pending",
      approvedBy: undefined,
      approvedAt: undefined,
      approvalNote: undefined,
      completed: false,
    });
    return version;
  },
});
