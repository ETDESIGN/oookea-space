import { v } from "convex/values";
import {
  query as q,
  mutation as m,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";

// ─── Mission Control: Integrations ────────────────────────────────
// One row per provider. Credentials live in Convex env vars (set via
// dashboard/CLI tomorrow) — this table only tracks state + health.

export const listIntegrations = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.query("integrations").collect();
  },
});

export const upsertIntegration = m({
  args: {
    token: v.string(),
    provider: v.string(),
    name: v.string(),
    credentialRef: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, ...args }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (p) => p.eq("provider", args.provider))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        credentialRef: args.credentialRef ?? existing.credentialRef,
        webhookSecret: args.webhookSecret ?? existing.webhookSecret,
        enabled: args.enabled ?? existing.enabled,
      });
      return existing._id;
    }
    return await ctx.db.insert("integrations", {
      provider: args.provider,
      name: args.name,
      credentialRef: args.credentialRef,
      webhookSecret: args.webhookSecret,
      enabled: args.enabled ?? true,
      status: "unknown",
      createdAt: Date.now(),
    });
  },
});

export const removeIntegration = m({
  args: { token: v.string(), id: v.id("integrations") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

// ─── Events (audit trail feed on the dashboard) ───────────────────

export const listEvents = q({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("integrationEvents")
      .withIndex("by_created")
      .order("desc")
      .take(limit ?? 20);
    return rows;
  },
});

// ─── Internal machinery (webhooks / actions / crons) ─────────────

/** Look up one integration by provider — used to verify webhook secrets. */
export const getByProviderInternal = internalQuery({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_provider", (p) => p.eq("provider", provider))
      .first();
  },
});

/** Session-token check callable from actions (no db ctx there). */
export const validateAdminInternal = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    try {
      const admin = await requireAdmin(ctx, token);
      return { ok: true, name: admin.name };
    } catch {
      return { ok: false, name: null };
    }
  },
});

/**
 * Record an inbound/pushed event + bump the integration's health.
 * provider is resolved internally so callers can't write to arbitrary rows.
 */
export const recordEventInternal = internalMutation({
  args: {
    provider: v.string(),
    event: v.string(),
    ok: v.boolean(),
    summary: v.string(),
    payload: v.optional(v.any()),
    setStatus: v.optional(v.union(v.literal("ok"), v.literal("error"), v.literal("setup"))),
  },
  handler: async (ctx, { provider, event, ok, summary, payload, setStatus }) => {
    const now = Date.now();
    const integ = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (p) => p.eq("provider", provider))
      .first();
    if (!integ) return null;
    await ctx.db.insert("integrationEvents", {
      integrationId: integ._id,
      provider,
      event,
      ok,
      summary,
      payload,
      createdAt: now,
    });
    await ctx.db.patch(integ._id, {
      lastEventAt: now,
      lastEventOk: ok,
      lastError: ok ? undefined : summary,
      ...(setStatus ? { status: setStatus } : {}),
    });
    return true;
  },
});

/** Manual "Sync now" from the dashboard — admin-gated, runs the provider refresh. */
type SyncResult = { status: "ok" | "setup" | "error"; detail: string };

export const requestSync = action({
  args: {
    token: v.string(),
    provider: v.union(
      v.literal("vercel"),
      v.literal("netlify"),
      v.literal("cloudflare"),
      v.literal("github")
    ),
  },
  handler: async (ctx, { token, provider }): Promise<SyncResult> => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    if (provider === "vercel")
      return (await ctx.runAction(internal.snapshots.refreshVercel, {})) as SyncResult;
    if (provider === "netlify")
      return (await ctx.runAction(internal.snapshots.refreshNetlify, {})) as SyncResult;
    if (provider === "cloudflare")
      return (await ctx.runAction(internal.snapshots.refreshCloudflare, {})) as SyncResult;
    return (await ctx.runAction(internal.snapshots.refreshGithub, {})) as SyncResult;
  },
});
