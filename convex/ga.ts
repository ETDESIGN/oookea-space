import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Google Analytics 4 reporting for client-facing Analytics modules.
 *
 * Auth model: the caller's portal session token identifies the client; the
 * report only runs if that client owns an analytics module whose config
 * lists the requested GA4 property. GA access itself is a service-account
 * JWT (RS256, signed with Web Crypto from env GA_SA_JSON) minted per call —
 * no tokens at rest beyond the env var, nothing in the repo.
 */

interface GaSite {
  label: string;
  property: string;
  accent?: string;
}

const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

async function getGaAccessToken(): Promise<string> {
  const env = (globalThis as any).process?.env ?? {};
  const raw = env.GA_SA_JSON as string | undefined;
  if (!raw) throw new Error("GA_SA_JSON not configured");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };

  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const pemBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64urlStr(
    JSON.stringify({
      iss: sa.client_email,
      scope: GA_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const data = new TextEncoder().encode(`${header}.${claims}`);
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data as unknown as ArrayBuffer)
  );
  const jwt = `${header}.${claims}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`ga-token-exchange-${res.status}`);
  const tok = (await res.json()) as { access_token: string };
  return tok.access_token;
}

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
): Promise<any> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`ga-report-${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export const fetchGaReport = action({
  args: { token: v.string(), propertyId: v.string(), days: v.number() },
  handler: async (ctx, { token, propertyId, days }) => {
    // 1. Session → user
    const user = await ctx.runQuery(api.users.getUserBySession as never, { token } as never);
    if (!user) throw new Error("unauthorized");

    // 2. The client must own an analytics module listing this property
    const mods = (await ctx.runQuery(api.misc.listModules as never, {
      token,
      clientId: (user as any)._id,
    } as never)) as any[];
    const mod = (mods ?? []).find(
      (m) =>
        m.config?.type === "analytics" &&
        (m.config.sites ?? []).some((s: GaSite) => s.property === propertyId)
    );
    if (!mod) throw new Error("forbidden");

    const d = Math.min(365, Math.max(1, Math.floor(days) || 7));
    const dateRange = { startDate: `${d}daysAgo`, endDate: "today" };

    // 3. GA access token + reports in parallel
    const accessToken = await getGaAccessToken();
    const [daily, pages, channels, devices, purchases, countries, os, browsers] = await Promise.all([
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "purchaseRevenue" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 3,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "purchase" } },
        },
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 8,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "operatingSystem" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "browser" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
    ]);

    const pick = (r: any, i: number): Array<{ dim: string; val: number }> =>
      (r?.rows ?? []).map((row: any) => ({
        dim: row.dimensionValues?.[0]?.value ?? "",
        val: Number(row.metricValues?.[i]?.value ?? 0),
      }));

    return {
      property: propertyId,
      days: d,
      daily: pick(daily, 0).map((x, i) => ({
        date: x.dim,
        sessions: x.val,
        users: pick(daily, 1)[i]?.val ?? 0,
        views: pick(daily, 2)[i]?.val ?? 0,
        revenue: pick(daily, 3)[i]?.val ?? 0,
      })),
      purchases: pick(purchases, 0),
      pages: pick(pages, 0).map((x, i) => ({ path: x.dim, views: x.val, sessions: pick(pages, 1)[i]?.val ?? 0 })),
      channels: pick(channels, 0).map((x) => ({ channel: x.dim, sessions: x.val })),
      devices: pick(devices, 0).map((x) => ({ device: x.dim, sessions: x.val })),
      countries: pick(countries, 0).map((x) => ({ country: x.dim, users: x.val })),
      os: pick(os, 0).map((x) => ({ os: x.dim, sessions: x.val })),
      browsers: pick(browsers, 0).map((x) => ({ browser: x.dim, sessions: x.val })),
    };
  },
});
