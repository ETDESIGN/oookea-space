import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, requireAdmin, scopeClientId } from "./auth";
// ─── File Storage ───────────────────────────────────────────────

export const generateUploadUrl = m({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = q({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// ─── Files ──────────────────────────────────────────────────────

export const listFiles = q({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { token, clientId, projectId }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    if (scope.clientId) {
      return await ctx.db
        .query("files")
        .withIndex("by_client", (q) => q.eq("clientId", scope.clientId!))
        .order("desc")
        .collect();
    }
    if (projectId) {
      return await ctx.db
        .query("files")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("files").order("desc").collect();
  },
});

// Clients may only register files under their own account; admins any client.
export const createFile = m({
  args: {
    token: v.string(),
    name: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    type: v.union(v.literal("image"), v.literal("document"), v.literal("video"), v.literal("design"), v.literal("archive"), v.literal("other")),
    size: v.number(),
    mimeType: v.string(),
    storageId: v.optional(v.string()),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, { token, ...args }) => {
    const user = await requireUser(ctx, token);
    if (user.role !== "admin" && args.clientId !== user._id) {
      throw new Error("FORBIDDEN");
    }
    return await ctx.db.insert("files", { ...args, createdAt: Date.now() });
  },
});

// Only the owning client or an admin may delete a file record
export const deleteFile = m({
  args: { token: v.string(), id: v.id("files") },
  handler: async (ctx, { token, id }) => {
    const user = await requireUser(ctx, token);
    const file = await ctx.db.get(id);
    if (!file) return;
    if (user.role !== "admin" && file.clientId !== user._id) throw new Error("FORBIDDEN");
    // Best-effort: remove the stored blob too
    if (file.storageId) {
      try {
        await ctx.storage.delete(file.storageId as Id<"_storage">);
      } catch {
        // blob already gone — ignore
      }
    }
    await ctx.db.delete(id);
  },
});

