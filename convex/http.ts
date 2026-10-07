import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Mission Control HTTP endpoints (Convex site) ─────────────────
//   POST /webhook/:provider    — Netlify/Stripe/GitHub-style pushes (secret header)
//   GET|POST /heartbeat/:token — cron dead-man's-switch ping
//   GET|POST /heartbeat/:token/fail — record a FAILED run
// Proxied from the Next.js app at /api/webhook/* and /api/heartbeat/*
// so monitors can ping https://space.oookea.com/api/heartbeat/:token.

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

function extractSecret(req: Request): string | null {
  return (
    req.headers.get("x-oookea-secret") ||
    req.headers.get("x-webhook-secret") ||
    new URL(req.url).searchParams.get("secret")
  );
}

const webhookHandler = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method-not-allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const provider = segments[segments.length - 1];

  const integ = await ctx.runQuery(internal.integrations.getByProviderInternal, { provider });
  if (!integ) {
    return new Response(JSON.stringify({ error: "unknown-provider" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  if (!integ.enabled) {
    return new Response(JSON.stringify({ error: "integration-disabled" }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });
  }
  if (!integ.webhookSecret) {
    return new Response(JSON.stringify({ error: "webhook-not-configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const provided = extractSecret(req);
  if (!provided || !timingSafeEqual(provided, integ.webhookSecret)) {
    return new Response(JSON.stringify({ error: "bad-secret" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }
  const body = (payload ?? {}) as Record<string, unknown>;

  // Provider-specific summaries; generic fallback for anything else.
  let event = "webhook";
  let summary = `${provider} push received`;
  if (provider === "netlify") {
    event = req.headers.get("x-netlify-event") || "netlify_event";
    const state = body.state as string | undefined;
    summary = state ? `Netlify deploy ${state}` : `Netlify ${event}`;
  } else if (provider === "github") {
    event = req.headers.get("x-github-event") || "github_event";
    summary = `GitHub ${event}`;
  } else if (provider === "stripe") {
    event = (body.type as string) || "stripe_event";
    summary = `Stripe ${event}`;
  }

  await ctx.runMutation(internal.integrations.recordEventInternal, {
    provider,
    event,
    ok: true,
    summary,
    payload,
    setStatus: "ok" as const,
  });

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const heartbeatHandler = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  // Path forms: /heartbeat/:token | /heartbeat/:token/fail
  const segments = url.pathname.split("/").filter(Boolean);
  const isFail = segments[segments.length - 1] === "fail";
  const token = isFail ? segments[segments.length - 2] : segments[segments.length - 1];
  const note = url.searchParams.get("note") || undefined;
  const okParam = url.searchParams.get("ok");

  const result = await ctx.runMutation(internal.heartbeats.beatInternal, {
    token,
    ok: isFail ? false : okParam !== "false",
    note: isFail ? note || "reported failure" : note,
  });

  if (!result.ok) {
    return new Response(JSON.stringify(result), {
      status: result.error === "unknown-token" ? 404 : 400,
      headers: { "content-type": "application/json" },
    });
  }
  // Cache-buster: a monitor must never receive a cached 200
  return new Response(
    JSON.stringify({ ok: true, name: result.name, at: Date.now() }),
    {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }
  );
});

const http = httpRouter();

http.route({
  pathPrefix: "/webhook/",
  method: "POST",
  handler: webhookHandler,
});
http.route({
  pathPrefix: "/heartbeat/",
  method: "GET",
  handler: heartbeatHandler,
});
http.route({
  pathPrefix: "/heartbeat/",
  method: "POST",
  handler: heartbeatHandler,
});

export default http;
