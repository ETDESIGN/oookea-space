import { v } from "convex/values";
import { mutation as m, query as q } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── R3c: Client health + commitments ──────────────────────────────
// Transparent rules (no fake AI): health = last meaningful contact +
// overdue invoices + open commitments. Renewal risk made practical.

const DAY = 86_400_000;

/** Admin: one health row per active client, worst first. */
export const clientHealth = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const clients = (await ctx.db.query("users").collect()).filter(
      (c) => c.role === "client" && c.status === "active"
    );
    const threads = await ctx.db.query("threads").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const commitments = await ctx.db.query("commitments").collect();

    const lastThreadMsg = new Map<string, number>();
    for (const t of threads) {
      const key = t.clientId as unknown as string;
      const prev = lastThreadMsg.get(key) ?? 0;
      lastThreadMsg.set(key, Math.max(prev, t.lastMessageAt));
    }

    const rows = clients.map((c) => {
      const id = c._id as unknown as string;
      const lastLogin = c.lastLoginAt ?? 0;
      const lastMsg = lastThreadMsg.get(id) ?? 0;
      const lastContactAt = Math.max(lastLogin, lastMsg, c.createdAt);
      const daysQuiet = Math.floor((now - lastContactAt) / DAY);

      const cInvoices = invoices.filter((i) => i.clientId === c._id);
      const overdue = cInvoices.filter((i) => i.status === "overdue");
      const oldestOverdue = overdue.reduce<string | null>(
        (min, i) => (!min || i.dueDate < min ? i.dueDate : min),
        null
      );
      const openCommitments = commitments.filter(
        (w) => w.clientId === c._id && (w.status === "open" || w.status === "waiting_client")
      ).length;

      // Transparent health rules
      const overdueLong = oldestOverdue ? today > oldestOverdue && now - new Date(oldestOverdue).getTime() > 30 * DAY : false;
      const health =
        daysQuiet > 35 || overdueLong
          ? "red"
          : daysQuiet > 21 || overdue.length > 0
            ? "yellow"
            : "green";

      return {
        id: c._id,
        name: c.name,
        company: c.company ?? null,
        daysQuiet,
        lastContactAt: lastContactAt || null,
        overdueInvoices: overdue.length,
        oldestOverdue,
        openCommitments,
        health: health as "red" | "yellow" | "green",
      };
    });

    const rank = { red: 0, yellow: 1, green: 2 } as const;
    return rows.sort((a, b) => rank[a.health] - rank[b.health] || b.daysQuiet - a.daysQuiet);
  },
});

/** Admin: commitments with client names, open/waiting first, by due date. */
export const listCommitments = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    const rows = await ctx.db.query("commitments").collect();
    const users = await ctx.db.query("users").collect();
    const nameOf = new Map(users.map((u) => [u._id, u.name]));
    const order = { open: 0, waiting_client: 1, done: 2, cancelled: 3 } as const;
    return rows
      .map((w) => ({ ...w, clientName: w.clientId ? nameOf.get(w.clientId) ?? null : null }))
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] || a.dueDate.localeCompare(b.dueDate)
      );
  },
});

export const createCommitment = m({
  args: {
    token: v.string(),
    title: v.string(),
    clientId: v.optional(v.id("users")),
    dueDate: v.string(),
    nextAction: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...fields }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    const now = Date.now();
    return await ctx.db.insert("commitments", {
      ...fields,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setCommitmentStatus = m({
  args: {
    token: v.string(),
    id: v.id("commitments"),
    status: v.union(
      v.literal("open"),
      v.literal("waiting_client"),
      v.literal("done"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, { token, id, status }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    await ctx.db.patch(id, {
      status,
      waitingSince: status === "waiting_client" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});
