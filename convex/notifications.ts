import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { requireUser, requireAdmin } from "./auth";

// ─── Notifications ──────────────────────────────────────────────
// Real-time per-user notifications. Created server-side by message/invoice/file
// events; read state tracked per user.

export const listNotifications = q({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    const user = await requireUser(ctx, token);
    let items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    if (limit) items = items.slice(0, limit);
    return items;
  },
});

export const unreadCount = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    return unread.length;
  },
});

export const markRead = m({
  args: { token: v.string(), id: v.id("notifications") },
  handler: async (ctx, { token, id }) => {
    const user = await requireUser(ctx, token);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== user._id) throw new Error("FORBIDDEN");
    await ctx.db.patch(id, { read: true });
  },
});

export const markAllRead = m({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    for (const n of unread) await ctx.db.patch(n._id, { read: true });
    return unread.length;
  },
});

/** Internal helper — called by sendMessage/updateInvoiceStatus etc. Not exposed for direct client use of arbitrary recipients. */
async function notify(
  ctx: any,
  userId: any,
  type: "message" | "invoice" | "project" | "file",
  title: string,
  body?: string,
  link?: string
) {
  await ctx.db.insert("notifications", {
    userId,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: Date.now(),
  });
}
export { notify };
