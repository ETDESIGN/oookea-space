import { v } from "convex/values";
import { query as q } from "./_generated/server";
import { requireUser } from "./auth";

// ─── Action Queue ───────────────────────────────────────────────
// "Needs your attention" — everything the caller owes a decision or look at.

export const actionQueue = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Client scope
    let clientId = user._id;
    if (user.role === "admin") clientId = null as any;

    const projects = clientId
      ? await ctx.db.query("projects").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect()
      : await ctx.db.query("projects").collect();

    const invoices = clientId
      ? await ctx.db.query("invoices").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect()
      : await ctx.db.query("invoices").collect();

    const threads = clientId
      ? await ctx.db.query("threads").withIndex("by_client", (q) => q.eq("clientId", clientId)).collect()
      : await ctx.db.query("threads").collect();

    type Action = {
      kind: "approval" | "message" | "invoice" | "deadline" | "milestone";
      title: string;
      detail: string;
      link: string;
      urgency: "high" | "medium" | "low";
      createdAt: number;
    };
    const actions: Action[] = [];

    // 1. Deliverables awaiting approval (pending, on active projects)
    for (const project of projects.filter((p) => p.status === "active")) {
      const deliverables = await ctx.db
        .query("deliverables")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const pending = deliverables.filter((d) => !d.approvalStatus && !d.completed);
      if (pending.length > 0 && project.status === "active") {
        // Only surface when studio marked them ready (or no approvals exist yet — gentle nudge)
        actions.push({
          kind: "approval",
          title: `${pending.length} deliverable${pending.length > 1 ? "s" : ""} awaiting review`,
          detail: `${project.title} — your approval keeps things moving`,
          link: `/projects/${project.slug}`,
          urgency: "medium",
          createdAt: project.updatedAt,
        });
      }
    }

    // 2. Unread messages (last message in thread is from the other party)
    for (const thread of threads) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();
      const last = msgs[msgs.length - 1];
      if (last && last.senderId !== user._id) {
        actions.push({
          kind: "message",
          title: `New message — ${thread.subject}`,
          detail: last.body.slice(0, 90),
          link: "/messages",
          urgency: "medium",
          createdAt: last.createdAt,
        });
      }
    }

    // 3. Invoices due (sent/overdue)
    for (const inv of invoices) {
      if (inv.status === "sent" || inv.status === "overdue") {
        const dueIn = Math.ceil((new Date(inv.dueDate).getTime() - now) / DAY);
        actions.push({
          kind: "invoice",
          title: `Invoice ${inv.number} · ${inv.total.toLocaleString()} ${inv.currency}`,
          detail:
            dueIn < 0
              ? `Overdue by ${-dueIn} day${dueIn < -1 ? "s" : ""}`
              : dueIn === 0
                ? "Due today"
                : `Due in ${dueIn} day${dueIn > 1 ? "s" : ""}`,
          link: `/invoices/${inv._id}`,
          urgency: dueIn <= 3 || dueIn < 0 ? "high" : "low",
          createdAt: new Date(inv.dueDate).getTime(),
        });
      }
    }

    // 4. Upcoming deadlines
    for (const project of projects.filter((p) => p.status === "active" && p.deadline)) {
      const dueIn = Math.ceil((new Date(project.deadline!).getTime() - now) / DAY);
      if (dueIn <= 14) {
        actions.push({
          kind: "deadline",
          title: `${project.title}`,
          detail: dueIn < 0 ? `Deadline passed ${-dueIn}d ago` : `Deadline in ${dueIn} day${dueIn > 1 ? "s" : ""}`,
          link: `/projects/${project.slug}`,
          urgency: dueIn <= 3 ? "high" : "medium",
          createdAt: new Date(project.deadline!).getTime(),
        });
      }
    }

    // 5. Milestone celebrations — nearly done projects
    for (const project of projects.filter((p) => p.status === "active" && p.progress >= 90 && p.progress < 100)) {
      actions.push({
        kind: "milestone",
        title: `🎉 ${project.title} is ${project.progress}% complete`,
        detail: "Almost there — the finish line is in sight",
        link: `/projects/${project.slug}`,
        urgency: "low",
        createdAt: project.updatedAt,
      });
    }

    // Sort: urgency (high first), then newest
    const order = { high: 0, medium: 1, low: 2 };
    actions.sort((a, b) => order[a.urgency] - order[b.urgency] || b.createdAt - a.createdAt);

    return { actions: actions.slice(0, 8), total: actions.length };
  },
});
