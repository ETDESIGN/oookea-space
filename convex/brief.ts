import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query as q,
} from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Action Queue + Morning Brief (R3a) ────────────────────────────
// One dismissible queue for everything needing E's attention, plus a
// daily push brief (ntfy) so he doesn't have to open the dashboard.

type QueueItem = {
  _id: unknown;
  kind: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail?: string;
  actionLabel?: string;
  actionUrl?: string;
  source: string;
};

async function pushNtfy(title: string, body: string, priority: string, tags: string[]) {
  // Topic from NTFY_URL env (private channel; the random topic name IS the credential).
  const topic = (process.env.NTFY_URL || "https://ntfy.sh/oookea-alerts-e")
    .replace("https://ntfy.sh/", "")
    .replace(/^\/+|\/+$/g, "");
  try {
    // Header mode. Headers must be latin-1 → strip non-latin1 from the title
    // (emoji go in `tags` as ntfy short-names, rendered client-side; the body
    // is UTF-8 so arrows/emoji are fine there). ntfy's JSON publish mode is
    // currently returning 40024 "body must be valid JSON" — do not use it.
    const safeTitle = title.replace(/[—–]/g, "-").replace(/[^\x20-\x7E]/g, "");
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        Title: safeTitle,
        Priority: priority,
        Tags: tags.join(","),
      },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Queue state (used by the Mission Control UI) ──────────────────

export const listQueue = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    const items = await ctx.db
      .query("actionQueue")
      .withIndex("by_status", (r) => r.eq("status", "open"))
      .collect();
    const now = Date.now();
    return items
      .filter((i) => !i.snoozedUntil || i.snoozedUntil < now)
      .sort((a, b) => {
        const rank = { critical: 0, warning: 1, info: 2 } as const;
        return rank[a.severity] - rank[b.severity] || b.createdAt - a.createdAt;
      }) as QueueItem[];
  },
});

/** Done (manually resolved). */
export const completeItem = mutation({
  args: { token: v.string(), id: v.id("actionQueue") },
  handler: async (ctx, { token, id }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    await ctx.db.patch(id, { status: "done", resolvedAt: Date.now() });
  },
});

/** Snooze until ts (default +4h). */
export const snoozeItem = mutation({
  args: { token: v.string(), id: v.id("actionQueue"), until: v.optional(v.number()) },
  handler: async (ctx, { token, id, until }) => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    await ctx.db.patch(id, {
      status: "snoozed",
      snoozedUntil: until ?? Date.now() + 4 * 3_600_000,
    });
    // Self-wake: flip back to open when the snooze expires (sweep also covers it).
    await ctx.runMutation(internal.brief.wakeSnoozedLater, { id });
  },
});

export const wakeSnoozedLater = internalMutation({
  args: { id: v.id("actionQueue") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "open", snoozedUntil: undefined });
  },
});

// ─── Queue sync: derived from live sources ─────────────────────────

export const collectSignals = internalQuery({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("apps").collect();
    const downApps = apps.filter(
      (a) =>
        a.lastPingAt !== undefined &&
        a.lastOk === false &&
        !a.statusOverride &&
        !a.probeExclude
    );

    const hbs = await ctx.db.query("heartbeats").collect();
    const missedHbs = hbs.filter((h) => h.status === "missed");

    const events = await ctx.db
      .query("integrationEvents")
      .withIndex("by_created")
      .order("desc")
      .take(60);
    const snap = events.find((e) => e.provider === "vercel" && e.event === "snapshot");
    const projects =
      (snap?.payload as { projects?: { name: string; state: string }[] } | undefined)?.projects ??
      [];
    const failing = projects.filter((p) => p.state === "ERROR");

    return { downApps, missedHbs, failing };
  },
});

export const upsertQueued = internalMutation({
  args: {
    dedupeKey: v.string(),
    kind: v.string(),
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
    title: v.string(),
    detail: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("actionQueue")
      .withIndex("by_dedupe", (r) => r.eq("dedupeKey", args.dedupeKey))
      .collect();
    const open = existing.find((r) => r.status === "open" || r.status === "snoozed");
    if (open) {
      // refresh detail, keep dismissals sticky
      if (open.status === "done" || !open) return;
      await ctx.db.patch(open._id, {
        severity: args.severity,
        title: args.title,
        detail: args.detail,
        actionUrl: args.actionUrl,
      });
      return;
    }
    // previously done → condition recurred; open a fresh row
    await ctx.db.insert("actionQueue", {
      kind: args.kind,
      severity: args.severity,
      title: args.title,
      detail: args.detail,
      actionLabel: args.actionLabel,
      actionUrl: args.actionUrl,
      source: args.source,
      status: "open",
      dedupeKey: args.dedupeKey,
      createdAt: Date.now(),
    });
  },
});

export const resolveQueued = internalMutation({
  args: { dedupeKey: v.string() },
  handler: async (ctx, { dedupeKey }) => {
    const rows = await ctx.db
      .query("actionQueue")
      .withIndex("by_dedupe", (r) => r.eq("dedupeKey", dedupeKey))
      .collect();
    for (const r of rows) {
      if (r.status !== "done") {
        await ctx.db.patch(r._id, { status: "done", resolvedAt: Date.now() });
      }
    }
  },
});

type QueueUpsertArgs = {
  dedupeKey: string;
  kind: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail?: string;
  actionLabel?: string;
  actionUrl?: string;
  source: string;
};

/** The reconciler: sources ⇄ queue. Runs every 10 min + on demand. */
export const syncQueue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; resolved: number }> => {
    const { downApps, missedHbs, failing } = (await ctx.runQuery(
      internal.brief.collectSignals,
      {}
    )) as {
      downApps: { _id: unknown; name: string; url?: string; lastStatusCode?: number; lastMs?: number }[];
      missedHbs: { name: string }[];
      failing: { name: string; state: string }[];
    };

    let inserted = 0;
    let resolved = 0;

    const want = new Map<string, QueueUpsertArgs>();
    for (const a of downApps) {
      want.set(`app-down:${a.name}`, {
        dedupeKey: `app-down:${a.name}`,
        kind: "app-down",
        severity: "critical",
        title: `${a.name} is down`,
        detail: a.lastStatusCode === 0 ? "Probe timed out" : `Probe failed (HTTP ${a.lastStatusCode ?? "?"})`,
        actionLabel: "Open app",
        actionUrl: a.url,
        source: "pings",
      });
    }
    for (const h of missedHbs) {
      want.set(`hb-missed:${h.name}`, {
        dedupeKey: `hb-missed:${h.name}`,
        kind: "hb-missed",
        severity: "critical",
        title: `${h.name} heartbeat missed`,
        detail: "No beat past the expected interval — the machine or cron is likely down.",
        source: "heartbeats",
      });
    }
    for (const p of failing) {
      want.set(`vercel-fail:${p.name}`, {
        dedupeKey: `vercel-fail:${p.name}`,
        kind: "vercel-fail",
        severity: "warning",
        title: `Vercel deploy failing: ${p.name}`,
        detail: "Latest production deployment is in ERROR state.",
        actionLabel: "Open Vercel",
        actionUrl: `https://vercel.com/etdesigns-projects/${p.name}/deployments`,
        source: "vercel",
      });
    }

    // Insert/update wanted rows
    for (const args of want.values()) {
      await ctx.runMutation(internal.brief.upsertQueued, args as never);
      inserted++;
    }

    // Auto-resolve open rows whose condition cleared (same source+kind families)
    const open = (await ctx.runQuery(internal.brief.allOpenRows, {})) as {
      _id: unknown;
      dedupeKey?: string;
    }[];
    for (const row of open) {
      const key = row.dedupeKey ?? "";
      if (key.startsWith("app-down:") && !want.has(key)) {
        await ctx.runMutation(internal.brief.resolveQueued, { dedupeKey: key });
        resolved++;
      } else if (key.startsWith("hb-missed:") && !want.has(key)) {
        await ctx.runMutation(internal.brief.resolveQueued, { dedupeKey: key });
        resolved++;
      } else if (key.startsWith("vercel-fail:") && !want.has(key)) {
        await ctx.runMutation(internal.brief.resolveQueued, { dedupeKey: key });
        resolved++;
      }
    }

    return { inserted, resolved };
  },
});

export const allOpenRows = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("actionQueue")
      .withIndex("by_status", (r) => r.eq("status", "open"))
      .collect();
  },
});

// ─── Morning Brief (daily push) ────────────────────────────────────

export const computeBrief = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const open = await ctx.db
      .query("actionQueue")
      .withIndex("by_status", (r) => r.eq("status", "open"))
      .collect();
    const active = open.filter((i) => !i.snoozedUntil || i.snoozedUntil < now);
    const apps = await ctx.db.query("apps").collect();
    const probed = apps.filter((a) => a.lastPingAt !== undefined);
    const up = probed.filter((a) => a.lastOk).length;
    const dayAgo = now - 86_400_000;
    const events = await ctx.db
      .query("integrationEvents")
      .withIndex("by_created")
      .order("desc")
      .take(80);
    const deploys = events.filter(
      (e) => e.provider === "netlify" && e.event === "deploy" && e.createdAt > dayAgo
    ).length;
    return {
      queue: active.map((i) => ({ severity: i.severity, title: i.title })),
      critical: active.filter((i) => i.severity === "critical").length,
      appsUp: up,
      appsProbed: probed.length,
      deploys,
    };
  },
});

/** Daily 8am HKT (00:00 UTC) push: the one message that starts the day. */
export const sendMorningBrief = internalAction({
  args: {},
  handler: async (ctx): Promise<{ pushed: boolean; summary: string }> => {
    const b = (await ctx.runQuery(internal.brief.computeBrief, {})) as {
      queue: { severity: string; title: string }[];
      critical: number;
      appsUp: number;
      appsProbed: number;
      deploys: number;
    };
    const queueLine =
      b.queue.length === 0
        ? "Queue is empty — nothing needs you."
        : b.queue.slice(0, 6).map((q) => `${q.severity === "critical" ? "🔴" : "🟡"} ${q.title}`).join("\n");
    const summary =
      `☀️ Morning brief — ${b.appsUp}/${b.appsProbed} apps up · ` +
      `${b.queue.length} queue item${b.queue.length === 1 ? "" : "s"} (${b.critical} critical) · ` +
      `${b.deploys} deploy${b.deploys === 1 ? "" : "s"} in 24h\n${queueLine}`;
    const pushed = await pushNtfy(
      b.critical > 0 ? `Brief: ${b.critical} critical` : "Morning brief: all quiet",
      summary,
      b.critical > 0 ? "high" : "default",
      b.critical > 0 ? ["rotating_light", "sun"] : ["sun", "white_check_mark"]
    );
    await ctx.runMutation(
      internal.brief.logBrief as never,
      { summary, pushed } as never
    );
    return { pushed, summary };
  },
});

export const logBrief = internalMutation({
  args: { summary: v.string(), pushed: v.boolean() },
  handler: async (ctx, { summary, pushed }) => {
    await ctx.runMutation(internal.snapshots.markIntegration, {
      provider: "internal",
      status: "ok",
      detail: "Brief + queue engine",
    });
    await ctx.runMutation(internal.snapshots.logEvent, {
      provider: "internal",
      event: "morning-brief",
      ok: pushed,
      summary: summary.slice(0, 180),
      payload: { pushed },
    });
  },
});

// Admin entry for a manual "Send brief now" button.
export const requestBrief = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ pushed: boolean; summary: string }> => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    await ctx.runAction(internal.brief.syncQueue, {});
    return (await ctx.runAction(internal.brief.sendMorningBrief, {})) as {
      pushed: boolean;
      summary: string;
    };
  },
});
