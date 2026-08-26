import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, requireAdmin, scopeClientId } from "./auth";
// ─── Messages ───────────────────────────────────────────────────

export const listThreads = q({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    if (scope.clientId) {
      return await ctx.db
        .query("threads")
        .withIndex("by_client", (q) => q.eq("clientId", scope.clientId!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("threads")
      .withIndex("by_last_message")
      .order("desc")
      .collect();
  },
});

export const getThreadMessages = q({
  args: { token: v.string(), threadId: v.id("threads") },
  handler: async (ctx, { token, threadId }) => {
    const user = await requireUser(ctx, token);
    const thread = await ctx.db.get(threadId);
    if (!thread) return [];
    if (user.role !== "admin" && thread.clientId !== user._id) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();
  },
});

export const createThread = m({
  args: {
    token: v.string(),
    subject: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { token, ...args }) => {
    const user = await requireUser(ctx, token);
    // Clients can only create threads for themselves
    if (user.role !== "admin" && args.clientId !== user._id) throw new Error("FORBIDDEN");
    const now = Date.now();
    return await ctx.db.insert("threads", {
      ...args,
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const sendMessage = m({
  args: {
    token: v.string(),
    threadId: v.id("threads"),
    body: v.string(),
  },
  handler: async (ctx, { token, threadId, body }) => {
    const user = await requireUser(ctx, token);
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found");
    if (user.role !== "admin" && thread.clientId !== user._id) throw new Error("FORBIDDEN");
    const now = Date.now();
    await ctx.db.patch(threadId, { lastMessageAt: now });
    const messageId = await ctx.db.insert("messages", {
      threadId,
      body,
      senderId: user._id,
      senderRole: user.role,
      createdAt: now,
    });

    // Notify the OTHER party in real time
    if (user.role === "admin") {
      // Admin replied → notify the client who owns the thread
      await ctx.db.insert("notifications", {
        userId: thread.clientId,
        type: "message",
        title: "New message from your team",
        body: body.slice(0, 120),
        link: "/messages",
        read: false,
        createdAt: now,
      });
    } else {
      // Client wrote → notify all admins
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "message",
          title: `New message from ${user.name}`,
          body: body.slice(0, 120),
          link: "/admin/messages",
          read: false,
          createdAt: now,
        });
      }
    }
    return messageId;
  },
});

