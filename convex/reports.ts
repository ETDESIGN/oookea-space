import { v } from "convex/values";
import { mutation as m, query as q } from "./_generated/server";
import { requireAdmin, requireUser, scopeClientId } from "./auth";

// ─── R3d: Client value reports — report in the client's numbers ────
// E generates a draft; the engine pre-fills metrics from real data
// (probe uptime, completed commitments, paid invoices, resolved
// incidents). E edits the plain-English story, publishes → client
// portal. Retention collateral, zero accounting jargon.

const DAY = 86_400_000;

/** Admin: generate a draft pre-filled from real data for a period. */
export const generateDraft = m({
  args: {
    token: v.string(),
    clientId: v.optional(v.id("users")),
    periodStart: v.string(), // "2026-10-01"
    periodEnd: v.string(),
    appIds: v.optional(v.array(v.id("apps"))),
  },
  handler: async (ctx, { token, clientId, periodStart, periodEnd, appIds }) => {
    await requireAdmin(ctx, token);
    const now = Date.now();

    // Uptime from probe rollups in the window
    const checks = await ctx.db.query("appChecks").collect();
    const inWindow = checks.filter(
      (c) =>
        c.day >= periodStart &&
        c.day <= periodEnd &&
        (!appIds || appIds.length === 0 || appIds.some((id) => id === c.appId))
    );
    const pings = inWindow.reduce((s, c) => s + c.pings, 0);
    const fails = inWindow.reduce((s, c) => s + c.fails, 0);
    const uptimePct = pings > 0 ? (100 * (pings - fails)) / pings : null;

    // Work completed: commitments closed in the window
    const commitments = await ctx.db.query("commitments").collect();
    const startMs = new Date(periodStart + "T00:00:00Z").getTime();
    const endMs = new Date(periodEnd + "T23:59:59Z").getTime();
    const doneCount = commitments.filter(
      (w) =>
        w.status === "done" &&
        w.updatedAt >= startMs &&
        w.updatedAt <= endMs &&
        (!clientId || w.clientId === undefined || w.clientId === clientId)
    ).length;

    // Incidents resolved in the window (service reliability story)
    const incidents = await ctx.db.query("incidents").collect();
    const resolvedIncidents = incidents.filter(
      (i) => i.resolvedAt && i.resolvedAt >= startMs && i.resolvedAt <= endMs
    ).length;

    // Money: invoices paid in the window (scope to client when given)
    const invoices = await ctx.db.query("invoices").collect();
    const paid = invoices.filter(
      (i) =>
        i.status === "paid" &&
        i.updatedAt >= startMs &&
        i.updatedAt <= endMs &&
        (!clientId || i.clientId === clientId)
    );
    const paidTotal = paid.reduce((s, i) => s + i.total, 0);

    const bits: string[] = [];
    if (uptimePct !== null) {
      bits.push(
        `Your services stayed online ${uptimePct.toFixed(uptimePct >= 99.95 ? 2 : 1)}% of the time`
      );
    }
    if (doneCount > 0) bits.push(`we completed ${doneCount} request${doneCount === 1 ? "" : "s"}`);
    if (resolvedIncidents > 0)
      bits.push(
        resolvedIncidents === 1
          ? "the one disruption was resolved quickly"
          : `${resolvedIncidents} disruptions came up and were all resolved`
      );
    if (paid.length > 0) bits.push(`${paid.length} invoice${paid.length === 1 ? " was" : "s were"} settled`);
    const summary =
      bits.length > 0
        ? `Between ${periodStart} and ${periodEnd}: ${bits.join(", ")}. Everything is documented below — and as always, reply anytime, a human reads it.`
        : `Between ${periodStart} and ${periodEnd}: a quiet period — nothing broke and nothing was pending. We used the time to keep things healthy under the hood.`;

    const metrics: { label: string; value: string; note?: string }[] = [];
    if (uptimePct !== null) metrics.push({ label: "Uptime", value: `${uptimePct.toFixed(2)}%` });
    metrics.push({ label: "Requests completed", value: String(doneCount) });
    if (resolvedIncidents > 0 || incidents.some((i) => i.resolvedAt))
      metrics.push({ label: "Incidents resolved", value: String(resolvedIncidents) });
    if (paid.length > 0)
      metrics.push({ label: "Invoices settled", value: String(paid.length), note: `$${paidTotal.toLocaleString()}` });

    return await ctx.db.insert("reports", {
      clientId,
      title: `Service report · ${periodStart} → ${periodEnd}`,
      periodStart,
      periodEnd,
      status: "draft",
      summary,
      wins: [],
      metrics,
      appIds,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Admin: all reports, newest first, with client names. */
export const listReports = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("reports").collect();
    const users = await ctx.db.query("users").collect();
    const nameOf = new Map(users.map((u) => [u._id, u.name]));
    return rows
      .map((r) => ({ ...r, clientName: r.clientId ? nameOf.get(r.clientId) ?? null : null }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Portal: published reports for the logged-in client (admin may scope). */
export const clientReports = q({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const user = await requireUser(ctx, token);
    const scope = scopeClientId(user, clientId);
    const id = scope.clientId ?? user._id;
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_client", (r) => r.eq("clientId", id))
      .collect();
    return rows
      .filter((r) => r.status === "published")
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  },
});

/** Admin: edit the story + publish. */
export const updateReport = m({
  args: {
    token: v.string(),
    id: v.id("reports"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    wins: v.optional(v.array(v.string())),
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, id, publish, ...fields }) => {
    await requireAdmin(ctx, token);
    const patch: Record<string, unknown> = { ...fields, updatedAt: Date.now() };
    if (publish) {
      patch.status = "published";
      patch.publishedAt = Date.now();
    }
    await ctx.db.patch(id, patch);
  },
});

export const deleteReport = m({
  args: { token: v.string(), id: v.id("reports") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});
