import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser, requireAdmin, scopeClientId } from "./auth";
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
    const invoice = await ctx.db.get(id);
    await ctx.db.patch(id, { status, updatedAt: Date.now() });

    // Notify the client when an invoice is sent or marked paid
    if (invoice && invoice.status !== status && (status === "sent" || status === "paid")) {
      await ctx.db.insert("notifications", {
        userId: invoice.clientId,
        type: "invoice",
        title:
          status === "sent"
            ? `New invoice ${invoice.number}`
            : `Invoice ${invoice.number} marked as paid`,
        body:
          status === "sent"
            ? `Amount due: ${invoice.total.toLocaleString()} ${invoice.currency}. Due ${invoice.dueDate}.`
            : "Thank you — payment confirmed.",
        link: `/invoices/${id}`,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

