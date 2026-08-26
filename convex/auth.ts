import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── Session helpers ────────────────────────────────────────────
// Sessions are random tokens stored server-side. Every protected function
// validates the token and loads the caller's user record before doing work.

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthedUser {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "admin" | "client";
  status: "active" | "inactive";
  company?: string;
  phone?: string;
}

/** Validate a session token and return the active user. Throws on invalid/expired. */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<AuthedUser> {
  if (!token) throw new Error("UNAUTHENTICATED");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("UNAUTHENTICATED");
  }
  const user = await ctx.db.get(session.userId);
  if (!user || user.status !== "active") throw new Error("UNAUTHENTICATED");
  return user as unknown as AuthedUser;
}

/** Require an admin. Throws for clients. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<AuthedUser> {
  const user = await requireUser(ctx, token);
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

/**
 * Resolve the client scope for a request:
 * - admins may pass any clientId (or none = all)
 * - clients are FORCED to their own id regardless of what they pass
 */
export function scopeClientId(
  user: AuthedUser,
  requested?: Id<"users">
): { clientId?: Id<"users">; allClients: boolean } {
  if (user.role === "admin") {
    return requested ? { clientId: requested, allClients: false } : { allClients: true };
  }
  return { clientId: user._id, allClients: false };
}
