import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { SESSION_TTL_MS, requireUser, requireAdmin, scopeClientId } from "./auth";

// (password hashing + sessions live here; other modules import from _shared)
// ─── Password Hashing ───────────────────────────────────────────
// Format history:
//   v0 (legacy):  bare sha256 hex                      — no salt, fast
//   v1:           "salt:sha256(salt+password)" hex     — salted, fast
//   v2 (current): "pbkdf2$iter$salt$hash"              — PBKDF2-SHA256, 100k iters
// verifyPassword accepts all three; successful logins transparently upgrade
// the stored hash to the current format.

const PBKDF2_ITERATIONS = 100_000;

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash a password with the current (v2) format. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomSalt();
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against any historical format.
 * Returns { ok, needsUpgrade } so callers can transparently re-hash.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  // v0: bare sha256 hex
  if (!stored.includes(":") && !stored.includes("$") && /^[0-9a-f]{64}$/.test(stored)) {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return { ok: hex === stored, needsUpgrade: true };
  }
  // v2: pbkdf2$iter$salt$hash
  if (stored.startsWith("pbkdf2$")) {
    const [, iterStr, salt, hash] = stored.split("$");
    const computed = await pbkdf2Iter(password, salt, parseInt(iterStr, 10));
    return { ok: computed === hash, needsUpgrade: parseInt(iterStr, 10) < PBKDF2_ITERATIONS };
  }
  // v1: salt:sha256(salt+password)
  const idx = stored.indexOf(":");
  if (idx > 0) {
    const salt = stored.slice(0, idx);
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(salt + password));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return { ok: salt + ":" + hex === stored, needsUpgrade: true };
  }
  return { ok: false, needsUpgrade: true };
}

async function pbkdf2Iter(password: string, salt: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    // verifyPassword handles all historical formats (v0/v1/v2)
    const { ok: valid, needsUpgrade } = await verifyPassword(password, user.passwordHash);
    if (valid && needsUpgrade) {
      // Transparent one-time upgrade to the current format
      await ctx.db.patch(user._id, {
        passwordHash: await hashPassword(password),
      });
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
    // Track for client health
    await ctx.db.patch(user._id, { lastLoginAt: now });

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


// ─── Pre-login brand lookup ─────────────────────────────────────
// Public: given an email, return ONLY the co-brand display fields.
// Used by the login screen to render the client lockup. Reveals
// nothing sensitive (no existence oracle beyond branding).
export const getBrandForEmail = q({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;
    return {
      name: user.company ?? user.name,
      brandLogo: user.brandLogo ?? null,
      brandColor: user.brandColor ?? null,
    };
  },
});

// Admin: set a client's brand assets
export const setClientBrand = m({
  args: {
    token: v.string(),
    clientId: v.id("users"),
    brandLogo: v.optional(v.string()),
    brandColor: v.optional(v.string()),
  },
  handler: async (ctx, { token, clientId, brandLogo, brandColor }) => {
    await requireAdmin(ctx, token);
    const patch: Record<string, string | undefined> = {};
    if (brandLogo !== undefined) patch.brandLogo = brandLogo;
    if (brandColor !== undefined) patch.brandColor = brandColor;
    await ctx.db.patch(clientId, patch);
    return true;
  },
});


// ─── Pre-login gallery (safe) ────────────────────────────────────
// Public: given an email, return up to 5 of THAT client's image file URLs
// for the login gallery. No names, no metadata beyond image URLs.
export const getGalleryForEmail = q({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;
    const files = await ctx.db
      .query("files")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .filter((q) => q.eq(q.field("type"), "image"))
      .order("desc")
      .take(5);
    const urls: string[] = [];
    for (const f of files) {
      if (f.storageId) {
        const url = await ctx.storage.getUrl(f.storageId);
        if (url) urls.push(url);
      }
    }
    return urls;
  },
});


// ─── Session lookup (for API routes) ────────────────────────────
export const getUserBySession = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company ?? null,
    };
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
    const { ok: valid } = await verifyPassword(currentPassword, target.passwordHash);
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

