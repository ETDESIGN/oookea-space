import { v } from "convex/values";
import { mutation as m, query as q } from "./_generated/server";
import { requireAdmin } from "./auth";

// ─── R3e: Incidents — one object per outage ────────────────────────
// Auto-lifecycle lives in pings.ts recordPing (DOWN opens, UP resolves
// in the same transaction). This module: admin list + enrichment.

/** Admin: incident list, newest first. */
export const listIncidents = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const apps = await ctx.db.query("apps").collect();
    const nameOf = new Map(apps.map((a) => [a._id, a.name]));
    const rows = await ctx.db.query("incidents").collect();
    return rows
      .map((r) => ({ ...r, appName: nameOf.get(r.appId) ?? "Unknown" }))
      .sort((a, b) => b.startedAt - a.startedAt);
  },
});

/** Admin: enrich an incident (impact text, severity, status, timeline note). */
export const updateIncident = m({
  args: {
    token: v.string(),
    id: v.id("incidents"),
    impact: v.optional(v.string()),
    severity: v.optional(v.union(v.literal("minor"), v.literal("major"), v.literal("critical"))),
    status: v.optional(
      v.union(
        v.literal("investigating"),
        v.literal("monitoring"),
        v.literal("resolved")
      )
    ),
    addUpdate: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, addUpdate, ...fields }) => {
    await requireAdmin(ctx, token);
    const inc = await ctx.db.get(id);
    if (!inc) throw new Error("NOT_FOUND");
    const updates = addUpdate
      ? [...(inc.updates ?? []), { at: Date.now(), body: addUpdate }]
      : inc.updates;
    const patch: Record<string, unknown> = { ...fields, updates };
    if (fields.status === "resolved" && !inc.resolvedAt) patch.resolvedAt = Date.now();
    if (fields.status && fields.status !== "resolved") patch.resolvedAt = undefined;
    await ctx.db.patch(id, patch);
  },
});

/** Admin: remove a false-positive incident (e.g. probe blip during deploys). */
export const deleteIncident = m({
  args: { token: v.string(), id: v.id("incidents") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});
