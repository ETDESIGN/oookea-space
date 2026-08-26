import { v } from "convex/values";
import { query as q } from "./_generated/server";
import { requireAdmin } from "./auth";

// ─── Admin Analytics ────────────────────────────────────────────
// Revenue snapshot + per-client health scores, all computed server-side.

export const revenueSnapshot = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const invoices = await ctx.db.query("invoices").collect();
    const clients = await ctx.db
      .query("users")
      .filter((qc) => qc.eq(qc.field("role"), "client"))
      .collect();

    // ── Revenue aggregates
    const paid = invoices.filter((i) => i.status === "paid");
    const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const drafts = invoices.filter((i) => i.status === "draft");

    const sum = (arr: typeof invoices) => arr.reduce((s, i) => s + i.total, 0);

    // Aging buckets for outstanding invoices
    const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
    for (const inv of outstanding) {
      const overdueDays = Math.floor((now - new Date(inv.dueDate).getTime()) / DAY);
      if (overdueDays <= 0) aging.current += inv.total;
      else if (overdueDays <= 30) aging.d30 += inv.total;
      else if (overdueDays <= 60) aging.d60 += inv.total;
      else aging.d90 += inv.total;
    }

    // Revenue per client (paid only)
    const perClient = clients.map((c) => {
      const clientPaid = paid.filter((i) => i.clientId === c._id);
      const clientOutstanding = outstanding.filter((i) => i.clientId === c._id);
      return {
        clientId: c._id,
        name: c.name,
        company: c.company,
        paidTotal: clientPaid.reduce((s, i) => s + i.total, 0),
        paidCount: clientPaid.length,
        outstandingTotal: clientOutstanding.reduce((s, i) => s + i.total, 0),
      };
    }).sort((a, b) => b.paidTotal - a.paidTotal);

    // ── Client health
    const threads = await ctx.db.query("threads").collect();
    const messages = await ctx.db.query("messages").collect();

    const health = clients.map((c) => {
      const lastLogin = c.lastLoginAt ?? c.createdAt;
      const daysSinceLogin = Math.floor((now - lastLogin) / DAY);

      // Unanswered = last message in any of their threads is from the admin
      let unanswered = 0;
      for (const t of threads.filter((t) => t.clientId === c._id)) {
        const threadMsgs = messages
          .filter((m) => m.threadId === t._id)
          .sort((a, b) => a.createdAt - b.createdAt);
        const last = threadMsgs[threadMsgs.length - 1];
        if (last && last.senderRole === "admin") unanswered++;
      }
      const overdueCount = outstanding.filter(
        (i) => i.clientId === c._id && new Date(i.dueDate).getTime() < now
      ).length;

      // Score 0-100: 100 = healthy
      let score = 100;
      if (daysSinceLogin > 30) score -= 30;
      else if (daysSinceLogin > 14) score -= 15;
      score -= Math.min(30, unanswered * 10);
      score -= Math.min(30, overdueCount * 15);
      const band = score >= 70 ? "good" : score >= 40 ? "watch" : "risk";

      return {
        clientId: c._id,
        name: c.name,
        company: c.company,
        status: c.status,
        daysSinceLogin,
        unansweredThreads: unanswered,
        overdueInvoices: overdueCount,
        score: Math.max(0, score),
        band,
      };
    }).sort((a, b) => a.score - b.score);

    return {
      totals: {
        paidTotal: sum(paid),
        paidCount: paid.length,
        outstandingTotal: sum(outstanding),
        outstandingCount: outstanding.length,
        draftsTotal: sum(drafts),
        draftsCount: drafts.length,
      },
      aging,
      perClient,
      health,
    };
  },
});
