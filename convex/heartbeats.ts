import { v } from "convex/values";
import {
  query as q,
  mutation as m,
  internalMutation,
} from "./_generated/server";
import { requireAdmin } from "./auth";

// ─── Mission Control: Heartbeats (dead-man's-switch for crons) ────
// Crons ping GET/POST /api/heartbeat/:token after each run.
// Missed = silence past expectedIntervalSec + grace → red tile.

/** Create or update a heartbeat monitor (admin). */
export const upsertHeartbeat = m({
  args: {
    token: v.string(), // admin session token
    name: v.string(),
    expectedIntervalSec: v.number(),
  },
  handler: async (ctx, { token, name, expectedIntervalSec }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.insert("heartbeats", {
      name,
      token: crypto.randomUUID().replace(/-/g, ""),
      expectedIntervalSec,
      enabled: true,
      consecutiveMisses: 0,
      status: "waiting",
      createdAt: Date.now(),
    });
  },
});

export const setHeartbeatEnabled = m({
  args: { token: v.string(), id: v.id("heartbeats"), enabled: v.boolean() },
  handler: async (ctx, { token, id, enabled }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, {
      enabled,
      status: enabled ? "waiting" : "paused",
    });
  },
});

export const removeHeartbeat = m({
  args: { token: v.string(), id: v.id("heartbeats") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

/** All heartbeats with computed liveness for the tile grid (admin). */
export const listHeartbeats = q({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("heartbeats").collect();
    const now = Date.now();
    return rows.map((hb) => {
      const graceMs = hb.expectedIntervalSec * 1000 * 1.5 + 60_000;
      let liveStatus = hb.status;
      if (!hb.enabled) liveStatus = "paused";
      else if (hb.lastBeatAt === undefined) liveStatus = "waiting";
      else if (now - hb.lastBeatAt > graceMs) liveStatus = "missed";
      else liveStatus = "ok";
      return {
        _id: hb._id,
        name: hb.name,
        token: hb.token,
        expectedIntervalSec: hb.expectedIntervalSec,
        enabled: hb.enabled,
        lastBeatAt: hb.lastBeatAt,
        lastNote: hb.lastNote,
        lastOk: hb.lastOk,
        consecutiveMisses: hb.consecutiveMisses,
        status: liveStatus,
        createdAt: hb.createdAt,
      };
    });
  },
});

// ─── Internal: called by the HTTP heartbeat endpoint ─────────────

export const beatInternal = internalMutation({
  args: { token: v.string(), ok: v.optional(v.boolean()), note: v.optional(v.string()) },
  handler: async (ctx, { token, ok, note }) => {
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_token", (t) => t.eq("token", token))
      .first();
    if (!hb) return { ok: false, error: "unknown-token" };
    await ctx.db.patch(hb._id, {
      lastBeatAt: Date.now(),
      lastNote: note,
      lastOk: ok ?? true,
      consecutiveMisses: 0,
      status: "ok",
    });
    return { ok: true, name: hb.name };
  },
});

/**
 * Cron fallback sweep: marks silent monitors "missed" and logs the
 * transition once (push pings do the same job in real time; this is
 * the safety net when a machine dies entirely).
 */
export const sweepHeartbeats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("heartbeats").collect();
    let newlyMissed = 0;
    for (const hb of rows) {
      if (!hb.enabled) continue;
      const graceMs = hb.expectedIntervalSec * 1000 * 1.5 + 60_000;
      const isLate = hb.lastBeatAt === undefined || now - hb.lastBeatAt > graceMs;
      if (isLate && hb.status !== "missed") {
        await ctx.db.patch(hb._id, { status: "missed" });
        newlyMissed++;
      } else if (!isLate && hb.status === "missed") {
        await ctx.db.patch(hb._id, { status: "ok" });
      }
    }
    return { checked: rows.length, newlyMissed };
  },
});
