import { NextRequest, NextResponse } from "next/server";

// POST /api/ga — session-scoped GA4 report proxy for client Analytics
// modules. Forwards {token, propertyId, days} to the Convex HTTP action,
// which validates the portal session and module ownership before touching
// Google Analytics. Same-origin for the browser, no CORS surface.

const CONVEX_SITE = (
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudu-739.convex.cloud"
).replace(".convex.cloud", ".convex.site");

export async function POST(req: NextRequest) {
  try {
    const upstream = await fetch(`${CONVEX_SITE}/ga/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await req.text(),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "upstream-unreachable" }, { status: 502 });
  }
}
