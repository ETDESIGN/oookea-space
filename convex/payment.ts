import { v } from "convex/values";
import { mutation, query as q } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── R3b: Money view — payment settings + overview ─────────────────
// No payment processor (E's locked decision): invoices carry clean
// "how to pay" instructions; money movement stays off-platform.

/** Public: clients need this on their invoice pages. Bank details are the point. */
export const getPaymentSettings = q({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("paymentSettings").first()) ?? null;
  },
});

/** Admin: upsert the single settings row. */
export const savePaymentSettings = mutation({
  args: {
    token: v.string(),
    accountName: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    swiftBic: v.optional(v.string()),
    methods: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.string(),
          note: v.optional(v.string()),
        })
      )
    ),
    instructions: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...fields }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    const existing = await ctx.db.query("paymentSettings").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("paymentSettings", { ...fields, updatedAt: now });
  },
});

/** Admin: money overview for Mission Control + the invoices page. */
export const moneyOverview = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");

    const invoices = await ctx.db.query("invoices").collect();
    const today = new Date().toISOString().slice(0, 10);
    const sum = (rows: typeof invoices) => rows.reduce((s, i) => s + i.total, 0);

    const paid = invoices.filter((i) => i.status === "paid");
    const sent = invoices.filter((i) => i.status === "sent");
    const overdue = invoices.filter((i) => i.status === "overdue");
    // Sent but past due — not yet swept to "overdue" status
    const lateSent = sent.filter((i) => i.dueDate < today);
    const drafts = invoices.filter((i) => i.status === "draft");

    const settings = await ctx.db.query("paymentSettings").first();
    const settingsConfigured = !!(
      settings &&
      (settings.accountNumber || (settings.methods && settings.methods.length > 0))
    );

    return {
      totals: {
        invoiced: sum(invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled")),
        paid: sum(paid),
        outstanding: sum(sent),
        overdue: sum(overdue) + sum(lateSent),
        draft: sum(drafts),
        count: invoices.length,
      },
      counts: {
        paid: paid.length,
        sent: sent.length,
        overdue: overdue.length + lateSent.length,
        draft: drafts.length,
      },
      needsAttention: [
        ...overdue.map((i) => ({ number: i.number, total: i.total, dueDate: i.dueDate })),
        ...lateSent.map((i) => ({ number: i.number, total: i.total, dueDate: i.dueDate })),
      ],
      settingsConfigured,
      currency: settings?.defaultCurrency ?? null,
    };
  },
});
