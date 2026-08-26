import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { SESSION_TTL_MS, requireUser, requireAdmin, scopeClientId } from "./auth";

// ─── Password Hashing ───────────────────────────────────────────

async function hashPassword(password: string, salt?: string): Promise<string> {
  if (!salt) {
    salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // stored is "salt:hash" — re-hash with the SAME salt, never a fresh random one
  const [salt] = stored.split(":");
  if (!salt) return false;
  const inputHash = await hashPassword(password, salt);
  return inputHash === stored;
}

// Legacy format = bare sha256 hex (no colon). On successful login we transparently
// upgrade the stored hash to salted format — one-time migration per user, no bulk job needed.
function isLegacyHash(stored: string): boolean {
  return !stored.includes(":") && /^[0-9a-f]{64}$/.test(stored);
}

// ─── Users ──────────────────────────────────────────────────────

export const loginUser = m({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    // Accept both salted ("salt:hash") and legacy unsalted (bare sha256) hashes.
    // Legacy hashes are upgraded to salted on successful login.
    let valid = false;
    const stored = user.passwordHash;
    if (isLegacyHash(stored)) {
      const encoder = new TextEncoder();
      const digest = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(password)
      );
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      valid = hex === stored;
      if (valid) {
        // Transparent one-time upgrade to salted format
        await ctx.db.patch(user._id, {
          passwordHash: await hashPassword(password),
        });
      }
    } else {
      valid = await verifyPassword(password, stored);
    }
    if (!valid) return null;
    // Deactivated accounts cannot sign in
    if (user.status !== "active") return null;

    // Create a server-side session token (30-day TTL)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: now + SESSION_TTL_MS,
      createdAt: now,
    });

    return { ...user, sessionToken: token };
  },
});

export const logoutUser = m({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (session) await ctx.db.delete(session._id);
    return true;
  },
});

// Housekeeping: purge this user's expired sessions
export const purgeExpiredSessions = m({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("sessions")
      .withIndex("by_token")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();
    for (const s of expired) await ctx.db.delete(s._id);
    return expired.length;
  },
});

export const getCurrentUser = q({
  args: {},
  handler: async (ctx) => {
    return null;
  },
});

export const getUserById = q({
  args: { token: v.string(), id: v.id("users") },
  handler: async (ctx, { token, id }) => {
    const user = await requireUser(ctx, token);
    // Users may read their own record; admins may read anyone's.
    if (user.role !== "admin" && user._id !== id) return null;
    const target = await ctx.db.get(id);
    if (!target) return null;
    // Never leak password hashes to the client
    const { passwordHash: _ph, ...safe } = target as Record<string, unknown>;
    return safe;
  },
});

export const listClients = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const clients = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "client"))
      .collect();
    // Strip password hashes
    return clients.map(({ passwordHash: _ph, ...safe }) => safe);
  },
});

export const createClient = m({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check email doesn't exist
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("Email already registered");

    const passwordHash = await hashPassword(args.password);
    const { password: _, ...rest } = args;

    return await ctx.db.insert("users", {
      ...rest,
      passwordHash,
      role: "client",
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = m({
  args: {
    token: v.string(),
    id: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notifications: v.optional(v.object({
      invoiceEmail: v.boolean(),
      messageEmail: v.boolean(),
      projectUpdate: v.boolean(),
    })),
  },
  handler: async (ctx, { token, id, ...updates }) => {
    const user = await requireUser(ctx, token);
    // Users may only update their own profile (admins included)
    if (user._id !== id) throw new Error("FORBIDDEN");
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const changePassword = m({
  args: {
    token: v.string(),
    id: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, id, currentPassword, newPassword }) => {
    const user = await requireUser(ctx, token);
    if (user._id !== id) throw new Error("FORBIDDEN");
    const target = await ctx.db.get(id);
    if (!target) throw new Error("User not found");
    const valid = await verifyPassword(currentPassword, target.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
    if (newPassword.length < 6) throw new Error("New password must be at least 6 characters");
    const passwordHash = await hashPassword(newPassword);
    await ctx.db.patch(id, { passwordHash });
  },
});

export const updateClient = m({
  args: {
    token: v.string(),
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, { token, id, ...updates }) => {
    await requireAdmin(ctx, token);
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const resetClientPassword = m({
  args: { token: v.string(), id: v.id("users"), newPassword: v.string() },
  handler: async (ctx, { token, id, newPassword }) => {
    await requireAdmin(ctx, token);
    const user = await ctx.db.get(id);
    if (!user) throw new Error("User not found");
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
    const passwordHash = await hashPassword(newPassword);
    await ctx.db.patch(id, { passwordHash });
  },
});

export const deleteClient = m({
  args: { token: v.string(), id: v.id("users") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const user = await ctx.db.get(id);
    if (!user) throw new Error("User not found");
    if (user.role === "admin") throw new Error("Cannot delete admin user");

    // Delete related data in dependency order

    // 1. Get all projects for this client
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();

    // 2. Delete deliverables for each project
    for (const project of projects) {
      const deliverables = await ctx.db
        .query("deliverables")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const d of deliverables) await ctx.db.delete(d._id);
    }

    // 3. Delete invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const inv of invoices) await ctx.db.delete(inv._id);

    // 4. Delete files
    const files = await ctx.db
      .query("files")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);

    // 5. Delete thread messages, then threads
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const thread of threads) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const msg of messages) await ctx.db.delete(msg._id);
      await ctx.db.delete(thread._id);
    }

    // 6. Delete modules
    const modules = await ctx.db
      .query("modules")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const mod of modules) await ctx.db.delete(mod._id);

    // 7. Delete activity
    const allActivity = await ctx.db.query("activity").collect();
    const clientActivity = allActivity.filter((a) => a.clientId === id);
    for (const a of clientActivity) await ctx.db.delete(a._id);

    // 8. Delete projects
    for (const project of projects) await ctx.db.delete(project._id);

    // 9. Finally delete the user
    await ctx.db.delete(id);
  },
});

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

// ─── Invoices ───────────────────────────────────────────────────

export const listInvoices = q({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled"))),
  },
  handler: async (ctx, { token, clientId, status }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    let results;
    if (scope.clientId) {
      results = await ctx.db
        .query("invoices")
        .withIndex("by_client", (q) => q.eq("clientId", scope.clientId!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db.query("invoices").order("desc").collect();
    }
    if (status) {
      results = results.filter((inv) => inv.status === status);
    }
    return results;
  },
});

export const getInvoice = q({
  args: { token: v.string(), id: v.id("invoices") },
  handler: async (ctx, { token, id }) => {
    const user = await requireUser(ctx, token);
    const invoice = await ctx.db.get(id);
    if (!invoice) return null;
    if (user.role !== "admin" && invoice.clientId !== user._id) return null;
    return invoice;
  },
});

export const createInvoice = m({
  args: {
    token: v.string(),
    number: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    issueDate: v.string(),
    dueDate: v.string(),
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
    subtotal: v.number(),
    taxRate: v.number(),
    taxAmount: v.number(),
    total: v.number(),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args_) => {
    await requireAdmin(ctx, args_.token);
    const { token: _t, ...args } = args_;
    const now = Date.now();
    return await ctx.db.insert("invoices", {
      ...args,
      status: "draft",
      currency: args.currency || "USD",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInvoiceStatus = m({
  args: { token: v.string(), id: v.id("invoices"), status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled")) },
  handler: async (ctx, { token, id, status }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

// ─── File Storage ───────────────────────────────────────────────

export const generateUploadUrl = m({
  args: {},
  handler: async (ctx) => {
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
    return await ctx.db.insert("messages", {
      threadId,
      body,
      senderId: user._id,
      senderRole: user.role,
      createdAt: now,
    });
  },
});

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
