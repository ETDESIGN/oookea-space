import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query as q,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";

// ─── Mission Control: app HTTP probe engine ────────────────────────
// Pings every app that has a URL, records latency + daily rollups for
// the uptime bars. Push-ish: a cron every 15 min + "Ping now" button.

const CONCURRENCY = 6;
const TIMEOUT_MS = 6_000;

async function probe(url: string): Promise<{ ok: boolean; ms: number; status: number }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "OookeaSpace-MissionControl/1.0 (+health check)" },
    });
    const ms = Date.now() - started;
    // 2xx/3xx = healthy; 401/403 = reachable but guarded → still "up";
    // everything else (404, 5xx, timeouts) = down.
    const ok = res.status < 400 || res.status === 401 || res.status === 403;
    return { ok, ms, status: res.status };
  } catch {
    return { ok: false, ms: Date.now() - started, status: 0 };
  } finally {
    clearTimeout(t);
  }
}

function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Probe one app by id (used by "Ping now" on a single card). */
export const pingApp = action({
  args: { token: v.string(), id: v.id("apps") },
  handler: async (ctx, { token, id }): Promise<{ ok: boolean; ms?: number; status?: number; reason?: string }> => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    const app = await ctx.runQuery(internal.pings.getAppById, { id });
    if (!app?.url) return { ok: false, reason: "no-url" };
    const r = await probe(app.url);
    await ctx.runMutation(internal.pings.recordPing, {
      appId: id,
      ok: r.ok,
      ms: r.ms,
      status: r.status,
    });
    return { ok: true, ms: r.ms, status: r.status };
  },
});

type PingAllResult = {
  probed: number;
  up: number;
  down: number;
  flips: number;
  worst: { name: string; ok: boolean; ms: number; status: number }[];
};

/** Probe all apps with URLs (cron + the Fleet "Ping all" button). */
export const pingAllApps = internalAction({
  args: {},
  handler: async (ctx): Promise<PingAllResult> => {
    const apps = (await ctx.runQuery(internal.pings.appsToPing, {})) as {
      _id: unknown;
      name: string;
      url: string;
      lastOk?: boolean;
    }[];
    let up = 0;
    let down = 0;
    let flips = 0;
    const results: { name: string; ok: boolean; ms: number; status: number }[] = [];
    for (let i = 0; i < apps.length; i += CONCURRENCY) {
      const batch = apps.slice(i, i + CONCURRENCY);
      const settled = await Promise.all(
        batch.map(async (a) => ({ app: a, r: await probe(a.url) }))
      );
      for (const { app, r } of settled) {
        if (r.ok) up++;
        else down++;
        results.push({ name: app.name, ok: r.ok, ms: r.ms, status: r.status });
        await ctx.runMutation(internal.pings.recordPing, {
          appId: app._id as never,
          ok: r.ok,
          ms: r.ms,
          status: r.status,
        });
        // Flip detection: previous state known AND different → log + push
        if (app.lastOk !== undefined && app.lastOk !== r.ok) {
          flips++;
          const pushed = r.ok
            ? await pushNtfy(
                `✅ ${app.name} is back up`,
                `Probe OK · ${r.ms}ms · HTTP ${r.status}`,
                "low",
                ["white_check_mark", "oookea"]
              )
            : await pushNtfy(
                `🔴 ${app.name} is DOWN`,
                `Probe failed · ${r.ms}ms · ${r.status === 0 ? "timeout" : `HTTP ${r.status}`}`,
                "high",
                ["rotating_light", "oookea"]
              );
          await logFlip(
            ctx.runMutation.bind(ctx) as (ref: never, args: never) => Promise<unknown>,
            app.name,
            app.lastOk,
            r.ok,
            r.ms,
            pushed === true
          );
        }
      }
    }
    return { probed: apps.length, up, down, flips, worst: results.filter((r) => !r.ok) };
  },
});

/** Admin entry point for the "Ping all now" button. */
export const requestPingAll = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<PingAllResult> => {
    const admin = await ctx.runQuery(internal.integrations.validateAdminInternal, { token });
    if (!admin.ok) throw new Error("FORBIDDEN");
    return (await ctx.runAction(internal.pings.pingAllApps, {})) as PingAllResult;
  },
});

// ─── Internal helpers ──────────────────────────────────────────────

export const appsToPing = internalQuery({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("apps").collect();
    return apps.filter((a) => !!a.url);
  },
});

export const getAppById = internalQuery({
  args: { id: v.id("apps") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const recordPing = internalMutation({
  args: {
    appId: v.id("apps"),
    ok: v.boolean(),
    ms: v.number(),
    status: v.number(),
  },
  handler: async (ctx, { appId, ok, ms, status }) => {
    const now = Date.now();
    const app = await ctx.db.get(appId);
    const hist = (app?.latencyHistory ?? []).slice(-47);
    hist.push({ t: now, ms, ok });
    await ctx.db.patch(appId, {
      lastPingAt: now,
      lastMs: ms,
      lastOk: ok,
      lastStatusCode: status,
      latencyHistory: hist,
      updatedAt: now,
    });
    const day = utcDay(now);
    const rollup = await ctx.db
      .query("appChecks")
      .withIndex("by_app_day", (c) => c.eq("appId", appId).eq("day", day))
      .first();
    if (rollup) {
      await ctx.db.patch(rollup._id, {
        pings: rollup.pings + 1,
        fails: rollup.fails + (ok ? 0 : 1),
        msSum: rollup.msSum + ms,
        lastMs: ms,
      });
    } else {
      await ctx.db.insert("appChecks", {
        appId,
        day,
        pings: 1,
        fails: ok ? 0 : 1,
        msSum: ms,
        lastMs: ms,
      });
    }
  },
});

// ─── Flip detection + push (action layer) ──────────────────────────

const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh/oookea-alerts-e";

async function pushNtfy(title: string, body: string, priority: string, tags: string[]) {
  try {
    await fetch(NTFY_URL, {
      method: "POST",
      headers: { Title: title, Priority: priority, Tags: tags.join(",") },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    return true;
  } catch {
    return false;
  }
}

/** Log a flip into the events feed (self-creates the "internal" tile). */
async function logFlip(
  runMutation: (ref: never, args: never) => Promise<unknown>,
  appName: string,
  from: boolean,
  to: boolean,
  ms: number,
  pushed: boolean
) {
  await runMutation(
    internal.snapshots.markIntegration as never,
    {
      provider: "internal",
      status: "ok",
      detail: "Fleet probe engine",
    } as never
  );
  await runMutation(
    internal.snapshots.logEvent as never,
    {
      provider: "internal",
      event: "probe_flip",
      ok: to,
      summary: `${appName} went ${to ? "UP" : "DOWN"} (${ms}ms)${pushed ? " · pushed" : ""}`,
      payload: { app: appName, from, to, ms, pushed },
    } as never
  );
}

/** Uptime rollups for the last N days, all apps (fleet page). */
export const recentChecks = q({
  args: { token: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { token, days }) => {
    await requireAdmin(ctx, token);
    const window = days ?? 30;
    const cutoff = new Date(Date.now() - window * 86_400_000).toISOString().slice(0, 10);
    const rows = await ctx.db.query("appChecks").collect();
    return rows.filter((r) => r.day >= cutoff);
  },
});
