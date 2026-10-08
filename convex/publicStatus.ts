import { v } from "convex/values";
import { query as q } from "./_generated/server";

// ─── Public status pages (/status/:slug) ───────────────────────────
// No auth: renders a branded status page for one client's apps.
// All derivation happens server-side; only sanitized fields are returned.

type Bar = { day: string; color: string; tip: string };

function buildBars(checks: { day: string; pings: number; fails: number }[], days = 30): Bar[] {
  const byDay = new Map(checks.map((c) => [c.day, c]));
  const bars: Bar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const c = byDay.get(d);
    if (!c || c.pings === 0) {
      bars.push({ day: d, color: "grey", tip: `${d} · no data` });
    } else {
      const up = 1 - c.fails / c.pings;
      const color = up >= 0.99 ? "ok" : up >= 0.95 ? "amber" : "red";
      bars.push({ day: d, color, tip: `${d} · ${Math.round(up * 100)}% · ${c.pings} checks` });
    }
  }
  return bars;
}

const LABELS: Record<string, string> = {
  ok: "Operational",
  issue: "Degraded",
  offline: "Outage",
  planned: "Planned",
  waiting: "Pending",
};

export const getPage = q({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_public_slug", (s) => s.eq("publicStatus.slug", slug))
      .collect();
    const enabled = apps.filter((a) => a.publicStatus?.enabled);
    if (enabled.length === 0) return null;

    // Sources for derivation
    const hbs = await ctx.db.query("heartbeats").collect();
    const hbMap = new Map(hbs.map((h) => [h.name, h.status]));
    const events = await ctx.db
      .query("integrationEvents")
      .withIndex("by_created")
      .order("desc")
      .take(60);
    const snap = events.find((e) => e.provider === "vercel" && e.event === "snapshot");
    const vMap = new Map(
      ((snap?.payload as { projects?: { name: string; state: string }[] })?.projects ?? []).map(
        (p) => [p.name, p.state]
      )
    );

    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const allChecks = await ctx.db.query("appChecks").collect();
    const checksByApp = new Map<string, { day: string; pings: number; fails: number }[]>();
    for (const c of allChecks) {
      if (c.day < cutoff) continue;
      const key = c.appId as unknown as string;
      const arr = checksByApp.get(key) ?? [];
      arr.push({ day: c.day, pings: c.pings, fails: c.fails });
      checksByApp.set(key, arr);
    }

    const derive = (a: (typeof enabled)[number]): string => {
      if (a.statusOverride) return a.statusOverride;
      if (a.heartbeatName) {
        const s = hbMap.get(a.heartbeatName);
        if (s === "ok") return "ok";
        if (s === "missed") return "offline";
        return "waiting";
      }
      if (a.vercelProject) {
        const st = vMap.get(a.vercelProject);
        if (st === "ERROR") return "issue";
        if (st === "READY") return "ok";
        if (!st) return "waiting";
        return "ok";
      }
      return "ok";
    };

    const items = enabled
      .sort((a, b) => a.order - b.order)
      .map((a) => {
        const rows = checksByApp.get(a._id as unknown as string) ?? [];
        const pings = rows.reduce((s, r) => s + r.pings, 0);
        const fails = rows.reduce((s, r) => s + r.fails, 0);
        const uptime = pings ? Math.max(0, (1 - fails / pings) * 100) : null;
        return {
          name: a.name,
          description: a.description ?? null,
          url: a.url ?? null,
          status: derive(a),
          statusLabel: LABELS[derive(a)] ?? derive(a),
          uptime30d: uptime,
          bars: buildBars(rows),
          lastMs: a.lastMs ?? null,
          lastOk: a.lastOk ?? null,
          lastPingAt: a.lastPingAt ?? null,
        };
      });

    // Overall banner: worst state wins
    const hasOutage = items.some((i) => i.status === "offline");
    const hasDegraded = items.some((i) => i.status === "issue");
    const overall = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational";

    const brand = enabled[0].publicStatus!;
    return {
      slug,
      brandName: brand.brandName,
      logoUrl: brand.logoUrl ?? null,
      accentColor: brand.accentColor ?? null,
      tagline: brand.tagline ?? null,
      overall,
      apps: items,
      generatedAt: Date.now(),
    };
  },
});
