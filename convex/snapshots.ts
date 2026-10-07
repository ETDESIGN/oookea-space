import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Mission Control: provider snapshot refreshers ────────────────
// Actions (external fetch allowed). Called by "Sync now" buttons and
// by the Convex cron fallback. Credentials come from CONVEX env vars:
//   VERCEL_TOKEN / CLOUDFLARE_GLOBAL_KEY (+ CLOUDFLARE_EMAIL) / GITHUB_TOKEN
// Netlify has no REST pull here (no token yet) — webhooks push instead;
// this action just reports "waiting for credentials" until then.

const CONVEX_TIMEOUT = 15_000;

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONVEX_TIMEOUT);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

function mark(setupMsg: string) {
  return { status: "setup" as const, detail: setupMsg };
}

// ─── Vercel ───────────────────────────────────────────────────────

export const refreshVercel = internalAction({
  args: {},
  handler: async (ctx) => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "vercel",
        ...mark("Waiting for VERCEL_TOKEN (add in Convex dashboard → Settings → Environment Variables)"),
      });
      return { status: "setup" as const, detail: "VERCEL_TOKEN not set" };
    }
    try {
      const r = await fetchJson("https://api.vercel.com/v9/projects?limit=100", {
        Authorization: `Bearer ${token}`,
      });
      if (!r.ok) throw new Error(`Vercel API ${r.status}`);
      const projects = (r.body as { projects?: { name: string; id: string }[] }).projects ?? [];
      const reds = [];
      for (const p of projects.slice(0, 30)) {
        const d = await fetchJson(
          `https://api.vercel.com/v6/deployments?projectId=${p.id}&limit=1&target=production`,
          { Authorization: `Bearer ${token}` }
        );
        const dep = (d.body as { deployments?: { readyState?: string; state?: string }[] })
          .deployments?.[0];
        if (dep && (dep.readyState === "ERROR" || dep.state === "ERROR")) reds.push(p.name);
      }
      const summary = `${projects.length} projects, ${reds.length} failing production deploy${reds.length ? `: ${reds.join(", ")}` : ""}`;
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "vercel",
        status: "ok",
        detail: summary,
      });
      await ctx.runMutation(internal.snapshots.logEvent, {
        provider: "vercel",
        event: "snapshot",
        ok: reds.length === 0,
        summary,
        payload: { projectCount: projects.length, failing: reds },
      });
      return { status: "ok" as const, detail: summary };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "vercel",
        status: "error",
        detail: msg,
      });
      return { status: "error" as const, detail: msg };
    }
  },
});

// ─── Cloudflare (zones / domains / SSL health) ────────────────────

export const refreshCloudflare = internalAction({
  args: {},
  handler: async (ctx) => {
    const key = process.env.CLOUDFLARE_GLOBAL_KEY;
    const email = process.env.CLOUDFLARE_EMAIL;
    if (!key || !email) {
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "cloudflare",
        ...mark("Waiting for CLOUDFLARE_GLOBAL_KEY + CLOUDFLARE_EMAIL env vars"),
      });
      return { status: "setup" as const, detail: "Cloudflare env vars not set" };
    }
    const headers = { "X-Auth-Email": email, "X-Auth-Key": key };
    try {
      const zr = await fetchJson("https://api.cloudflare.com/client/v4/zones?per_page=50", headers);
      if (!zr.ok) throw new Error(`Cloudflare API ${zr.status}`);
      const zones = (zr.body as { result?: { name: string; status: string; paused?: boolean }[] })
        .result ?? [];
      const problems = zones
        .filter((z) => z.status !== "active" || z.paused)
        .map((z) => `${z.name}: ${z.paused ? "paused" : z.status}`);
      const summary = `${zones.length} zones active, ${problems.length} issues`;
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "cloudflare",
        status: problems.length ? "error" : "ok",
        detail: problems.length ? problems.join("; ") : summary,
      });
      await ctx.runMutation(internal.snapshots.logEvent, {
        provider: "cloudflare",
        event: "snapshot",
        ok: problems.length === 0,
        summary: problems.length ? problems.join("; ") : summary,
        payload: { zones: zones.map((z) => ({ name: z.name, status: z.status })) },
      });
      return { status: "ok" as const, detail: summary };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "cloudflare",
        status: "error",
        detail: msg,
      });
      return { status: "error" as const, detail: msg };
    }
  },
});

// ─── GitHub (repo/CI health for watched repos) ────────────────────

export const refreshGithub = internalAction({
  args: {},
  handler: async (ctx) => {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "ETDESIGN";
    if (!token) {
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "github",
        ...mark("Waiting for GITHUB_TOKEN env var"),
      });
      return { status: "setup" as const, detail: "GITHUB_TOKEN not set" };
    }
    try {
      const r = await fetchJson(`https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed`, {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      });
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
      const repos = (r.body as { name: string; open_issues_count: number }[]) ?? [];
      const withIssues = repos
        .filter((x) => x.open_issues_count > 0)
        .map((x) => `${x.name} (${x.open_issues_count})`);
      const summary = `${repos.length} repos, ${withIssues.length} with open issues`;
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "github",
        status: "ok",
        detail: summary,
      });
      await ctx.runMutation(internal.snapshots.logEvent, {
        provider: "github",
        event: "snapshot",
        ok: true,
        summary,
        payload: { withIssues },
      });
      return { status: "ok" as const, detail: summary };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.snapshots.markIntegration, {
        provider: "github",
        status: "error",
        detail: msg,
      });
      return { status: "error" as const, detail: msg };
    }
  },
});

// ─── Netlify (placeholder until token arrives; webhooks push live) ┐

export const refreshNetlify = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.snapshots.markIntegration, {
      provider: "netlify",
      ...mark("No NETLIFY_AUTH_TOKEN yet — deploy webhooks push events here; add token later for history backfill"),
    });
    return { status: "setup" as const, detail: "Netlify token pending" };
  },
});

// ─── Internal write helpers ───────────────────────────────────────

export const markIntegration = internalMutation({
  args: {
    provider: v.string(),
    status: v.union(v.literal("ok"), v.literal("setup"), v.literal("error"), v.literal("unknown")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { provider, status, detail }) => {
    const now = Date.now();
    const integ = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (p) => p.eq("provider", provider))
      .first();
    if (!integ) return;
    await ctx.db.patch(integ._id, {
      status,
      detail: detail ?? integ.detail,
      lastSyncAt: now,
    });
  },
});

export const logEvent = internalMutation({
  args: {
    provider: v.string(),
    event: v.string(),
    ok: v.boolean(),
    summary: v.string(),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, { provider, event, ok, summary, payload }) => {
    const integ = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (p) => p.eq("provider", provider))
      .first();
    if (!integ) return;
    await ctx.db.insert("integrationEvents", {
      integrationId: integ._id,
      provider,
      event,
      ok,
      summary,
      payload,
      createdAt: Date.now(),
    });
    await ctx.db.patch(integ._id, { lastEventAt: Date.now(), lastEventOk: ok });
  },
});
